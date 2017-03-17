const chai = require('chai');
const cluster = require('cluster');
const os = require('os');
const clusterProcess = require('../clusterprocess');

const cpus = os.cpus().length;
const expect = chai.expect;

describe('cluster process', () => {
  it('should start #-of-cpus worker', (done) => {
    clusterProcess.run('worker.js', 'test');
    setTimeout(() => {
      expect(Object.keys(cluster.workers).length).to.be.equal(cpus);
      process.kill(process.pid, 'SIGTERM');
      return done();
    }, 500);
  });
  it.skip('should start 2 worker', (done) => {
    // TODO how can we test this?
    process.env.EC_CLUSTER_MAX_WORKER = 2;

    process.kill(process.pid, 'SIGHUP');
    setTimeout(() => {
      expect(Object.keys(cluster.workers).length).to.be.equal(2);
      return done();
    }, 1500);

    delete process.env.EC_CLUSTER_MAX_WORKER;
  });
});
