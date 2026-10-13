const { spawn } = require('child_process');
const path = require('path');
const { expect } = require('chai');

// Starts a master with one worker, sends SIGTERM once the worker is ready and collects the output.
function stopCluster(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve(__dirname, 'fixtures/master.js')], {
      env: { ...process.env, NODE_CLUSTER_MAX_WORKER: '1', ...env },
    });
    const lines = [];
    let signalledAt;
    const collect = (chunk) => {
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => {
          lines.push(line);
          if (line === 'worker: ready' && !signalledAt) {
            signalledAt = Date.now();
            child.kill('SIGTERM');
          }
        });
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, lines, stopMs: Date.now() - signalledAt }));
  });
}

describe('stopping on SIGTERM', function () {
  this.timeout(10000);

  it('waits for a worker that is still draining', async () => {
    const { lines, stopMs } = await stopCluster({ TEST_KILL_TIMEOUT: '3000', TEST_DRAIN_MS: '1000' });

    expect(lines).to.include('worker: drained');
    expect(stopMs).to.be.at.least(1000);
  });

  it('kills a worker after killTimeout', async () => {
    const { lines, stopMs } = await stopCluster({ TEST_KILL_TIMEOUT: '500', TEST_IGNORE_SIGTERM: '1' });

    expect(lines).to.include('worker: ignoring SIGTERM');
    expect(lines.some((line) => line.includes('did not stop in time'))).to.equal(true);
    expect(stopMs).to.be.below(3000);
  });

  it('reads the kill timeout from NODE_CLUSTER_KILL_TIMEOUT', async () => {
    const { lines } = await stopCluster({ NODE_CLUSTER_KILL_TIMEOUT: '500', TEST_IGNORE_SIGTERM: '1' });

    expect(lines.some((line) => line.includes('did not stop in time'))).to.equal(true);
  });

  it('calls onStop after all workers are gone and exits', async () => {
    const { code, lines } = await stopCluster({ TEST_ON_STOP: '1', TEST_DRAIN_MS: '200' });

    expect(code).to.equal(0);
    expect(lines.indexOf('master: onStop')).to.be.greaterThan(lines.indexOf('worker: drained'));
  });
});
