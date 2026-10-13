const { spawn } = require('child_process');
const path = require('path');
const { expect } = require('chai');

describe('cluster process', function () {
  this.timeout(10000);

  it('starts NODE_CLUSTER_MAX_WORKER workers', (done) => {
    const child = spawn(process.execPath, [path.resolve(__dirname, 'fixtures/master.js')], {
      env: { ...process.env, NODE_CLUSTER_MAX_WORKER: '2' },
    });
    let ready = 0;
    child.stdout.on('data', (chunk) => {
      ready += chunk.toString().split('\n').filter((line) => line === 'worker: ready').length;
      if (ready === 2) {
        child.kill('SIGTERM');
      }
    });
    child.on('exit', () => {
      expect(ready).to.equal(2);
      done();
    });
  });
});
