/**
 * clusterprocess module
 *
 * @author deyhle@entrecode.de
 *
 * Used for startup and managing worker processes.
 * Loosely based on https://gist.github.com/dickeyxxx/0f535be1ada0ea964cae – more info:
 *   http://blog.carbonfive.com/2014/06/02/node-js-in-production/
 *
 * This script will boot a given app.js with the number of available CPUs or NODE_CLUSTER_MAX_WORKER.
 *   The master will respond to SIGHUP, which will trigger restarting all the workers and reloading
 *   the app.
 */
const cluster = require('cluster');
const os = require('os');
const path = require('path');

let numWorker = os.cpus().length;
let logger = console;

if (process.env.NODE_CLUSTER_MAX_WORKER) {
  numWorker = Number.parseInt(process.env.NODE_CLUSTER_MAX_WORKER, 10);
}

const ClusterProcess = {
  run(executable, name) {
    if (!executable) {
      logger.error('No executable specified (first parameter)');
      process.exit(1);
    }

    let processname = name;

    if (!processname) {
      const packageJsonOfParentProject = require(path.resolve(__dirname, '../../package'));
      if (packageJsonOfParentProject.name) {
        processname = packageJsonOfParentProject.name;
      } else {
        logger.error('No project name found. Specify as second parameter or as "name" in your project\'s package.json');
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
    }

    process.title = `${processname}_cp`;

    // Defines what each worker needs to run
    cluster.setupMaster({ exec: path.resolve(path.dirname(module.parent.filename), executable) });

    // Gets the count of active workers
    function numWorkers() {
      return Object.keys(cluster.workers).length;
    }

    let stopping = false;

    // Forks off the workers unless the server is stopping
    function forkNewWorkers(worker) {
      if (!stopping) {
        const timeout = worker && !worker.exitedAfterDisconnect ? 2000 : 0;
        setTimeout(() => {
          for (let i = numWorkers(); i < numWorker; i += 1) {
            cluster.fork();
          }
        }, timeout);
      }
    }

    // A list of workers queued for a restart
    let workersToStop = [];

    // Stops a single worker
    // Gives 10 seconds after SIGTERM before SIGTERM
    function stopWorker(worker) {
      logger.info('stopping worker', worker.process.pid);
      worker.kill('SIGTERM');
      const killTimer = setTimeout(() => {
        worker.kill('SIGKILL');
      }, 10000);

      // Ensure we don't stay up just for this setTimeout
      killTimer.unref();
    }

    // Tell the next worker queued to restart to disconnect
    // This will allow the process to finish it's work
    // for 20 seconds before sending SIGTERM
    function stopNextWorker() {
      const i = workersToStop.pop();

      if (cluster.workers[i]) {
        stopWorker(cluster.workers[i]);
      }
    }

    // Stops all the works at once
    function stopAllWorkers() {
      stopping = true;
      logger.info('stopping all workers');
      Object.keys(cluster.workers).forEach((id) => {
        stopWorker(cluster.workers[id]);
      });
    }

    // Worker is now listening on a port
    // Once it is ready, we can signal the next worker to restart
    cluster.on('listening', stopNextWorker);

    // A worker has disconnected either because the process was killed
    // or we are processing the workersToStop array restarting each process
    // In either case, we will fork any workers needed
    // cluster.on('disconnect', forkNewWorkers);
    cluster.on('exit', forkNewWorkers); // only after disconnect AND exit have fired, the worker
    // count is correct. So better safe than sorry

    // HUP signal sent to the master process to start restarting all the workers sequentially
    process.on('SIGHUP', () => {
      logger.info('restarting all workers');
      workersToStop = Object.keys(cluster.workers);
      stopNextWorker();
    });

    // Kill all the workers at once
    process.on('SIGTERM', stopAllWorkers);

    // Fork off the initial workers
    forkNewWorkers();
    logger.info(
      `${process.title} booted. pid is ${process.pid} scheduling is ${
        cluster.schedulingPolicy === cluster.SCHED_RR ? 'round-robin' : 'off (system)'
      }`,
    );
    return this;
  },

  setLogger(loggingInstance) {
    if (
      typeof loggingInstance.log === 'function' &&
      typeof loggingInstance.info === 'function' &&
      typeof loggingInstance.warn === 'function' &&
      typeof loggingInstance.error === 'function'
    ) {
      logger = loggingInstance;
      return this;
    }

    logger.error('Could not attach new logger because of missing methods.');
    return this;
  },

  handleSignals(cleanFunc) {
    const func = cleanFunc || (() => undefined);

    if (typeof func !== 'function') {
      throw new Error('cleanFunc must be a function');
    }

    process.on('SIGHUP', () => {
      logger.info(`${process.pid} got SIGHUP`);
      func();
    });

    process.on('SIGINT', () => {
      logger.info(`${process.pid} got SIGINT`);
      func();
    });

    process.on('SIGTERM', () => {
      logger.info(`${process.pid} got SIGTERM`);
      func();
    });

    return this;
  },
};

module.exports = ClusterProcess;
