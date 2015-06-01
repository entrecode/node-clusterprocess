'use strict';
/**
 * clusterprocess module
 * 
 * @author deyhle@entrecode.de
 * @version v0.1.2-dev
 *
 * Used for startup and managing worker processes.
 * Loosely based on https://gist.github.com/dickeyxxx/0f535be1ada0ea964cae – more info: http://blog.carbonfive.com/2014/06/02/node-js-in-production/
 *
 */
process.chdir(__dirname);

// This script will boot a given app.js with the number of available CPUs.
//
// The master will respond to SIGHUP, which will trigger
// restarting all the workers and reloading the app.
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var workerCount = numCPUs;
var path = require('path');

var winston = require('winston');
var logger = winston;
winston.remove(winston.transports.Console).add(winston.transports.Console, {
  colorize: true,
  timestamp: true
});


var ClusterProcess = {

  run: function(executable, processname) {
    if (!executable) {
      logger.error('No executable specified (first parameter)');
      process.exit(1);
    }

    if (!processname) {
      var packageJsonOfParentProject = require('../../package');
      if (packageJsonOfParentProject.name) {
        processname = packageJsonOfParentProject.name;
      } else {
        logger.error('No project name found. Specify as second parameter or as "name" in your project\'s package.json');
        process.exit(1);
      }
    }

    process.title = processname+'_cp';
    // Defines what each worker needs to run
    cluster.setupMaster({ exec: path.resolve('../../'+executable) });

    // Gets the count of active workers
    function numWorkers() { 
       return Object.keys(cluster.workers).length; 
    }

    var stopping = false;

    // Forks off the workers unless the server is stopping
    function forkNewWorkers() {
      if (!stopping) {
        for (var i = numWorkers(); i < workerCount; i++) { 
          cluster.fork(); 
        }
      }
    }

    // A list of workers queued for a restart
    var workersToStop = [];

    // Stops a single worker
    // Gives 20 seconds after disconnect before SIGTERM
    function stopWorker(worker) {
      logger.info('stopping worker', worker.process.pid);
      worker.disconnect();
      var killTimer = setTimeout(function() {
        worker.kill();
      }, 20000);

      // Ensure we don't stay up just for this setTimeout
      killTimer.unref();
    }

    // Tell the next worker queued to restart to disconnect
    // This will allow the process to finish it's work
    // for 60 seconds before sending SIGTERM
    function stopNextWorker() {
      var i = workersToStop.pop();
      var worker = cluster.workers[i];
      if (worker) stopWorker(worker);
    }

    // Stops all the works at once
    function stopAllWorkers() {
      stopping = true;
      logger.info('stopping all workers');
      for (var id in cluster.workers) {
        stopWorker(cluster.workers[id]);
      }
    }

    // Worker is now listening on a port
    // Once it is ready, we can signal the next worker to restart
    cluster.on('listening', stopNextWorker);

    // A worker has disconnected either because the process was killed
    // or we are processing the workersToStop array restarting each process
    // In either case, we will fork any workers needed
    cluster.on('disconnect', forkNewWorkers);
    cluster.on('exit', forkNewWorkers); // only after disconnect AND exit have fired, the worker count is correct. So
                                        // better safe than sorry

    // HUP signal sent to the master process to start restarting all the workers sequentially
    process.on('SIGHUP', function() {
      logger.info('restarting all workers');
      workersToStop = Object.keys(cluster.workers);
      stopNextWorker();
    });

    // Kill all the workers at once
    process.on('SIGTERM', stopAllWorkers);

    // Fork off the initial workers
    forkNewWorkers();
    logger.info(process.title, 'booted. pid is', process.pid);
    return this;
  },

  setLogger: function(loggingInstance) {
    if(typeof loggingInstance.log === 'function' && typeof loggingInstance.info === 'function' && typeof loggingInstance.warn === 'function' && typeof loggingInstance.error === 'function') {
      logger = loggingInstance;
      return this;
    } else {
      logger.error('Could not attach new logger because of missing methods.');
      return 'Could not attach new logger because of missing methods.';
    }
  }
};

// export the class
module.exports = ClusterProcess;

