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

const DEFAULT_KILL_TIMEOUT = 10000;

function resolveKillTimeout(optionValue) {
  const candidates = [optionValue, process.env.NODE_CLUSTER_KILL_TIMEOUT];
  for (let i = 0; i < candidates.length; i += 1) {
    const value = Number.parseInt(candidates[i], 10);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return DEFAULT_KILL_TIMEOUT;
}

const ClusterProcess = {
  run(executable, name, options = {}) {
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

    // Time a worker gets after SIGTERM before it is killed with SIGKILL
    const killTimeout = resolveKillTimeout(options.killTimeout);

    // Defines what each worker needs to run
    cluster.setupMaster({ exec: path.resolve(__dirname, '../../', executable) });

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
          // the master may have been stopped while waiting
          for (let i = numWorkers(); i < numWorker && !stopping; i += 1) {
            cluster.fork();
          }
        }, timeout);
      }
    }

    // A list of workers queued for a restart
    let workersToStop = [];

    // Stops a single worker
    // Gives killTimeout ms after SIGTERM before SIGKILL
    function stopWorker(worker) {
      logger.info('stopping worker', worker.process.pid);
      worker.kill('SIGTERM');
      const killTimer = setTimeout(() => {
        logger.warn('worker did not stop in time, killing it', worker.process.pid);
        worker.kill('SIGKILL');
      }, killTimeout);

      // Ensure we don't stay up just for this setTimeout
      killTimer.unref();
    }

    // Tell the next worker queued to restart to stop
    // This will allow the process to finish its work
    // for killTimeout ms before it is killed
    function stopNextWorker() {
      const i = workersToStop.pop();

      if (cluster.workers[i]) {
        stopWorker(cluster.workers[i]);
      }
    }

    // Runs options.onStop once all workers are gone, then exits the master
    let stopped = false;
    function finishStop() {
      if (stopped || typeof options.onStop !== 'function' || numWorkers() > 0) {
        return;
      }
      stopped = true;
      Promise.resolve()
        .then(() => options.onStop())
        .catch((error) => logger.error('onStop failed', error))
        // eslint-disable-next-line no-process-exit
        .then(() => process.exit(0));
    }

    // Stops all the works at once
    function stopAllWorkers() {
      if (stopping) {
        return;
      }
      stopping = true;
      logger.info('stopping all workers');
      Object.keys(cluster.workers).forEach((id) => {
        stopWorker(cluster.workers[id]);
      });
      finishStop();
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
    cluster.on('exit', () => {
      if (stopping) {
        finishStop();
      }
    });

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
