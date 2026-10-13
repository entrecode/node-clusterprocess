const path = require('path');
const clusterProcess = require('../../clusterprocess');

const options = {};
if (process.env.TEST_KILL_TIMEOUT) {
  options.killTimeout = Number(process.env.TEST_KILL_TIMEOUT);
}
if (process.env.TEST_ON_STOP) {
  options.onStop = () => console.log('master: onStop');
}

clusterProcess.run(path.resolve(__dirname, 'worker.js'), 'fixture', options);
