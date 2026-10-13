const drainMs = Number(process.env.TEST_DRAIN_MS || 0);

process.on('SIGTERM', () => {
  if (process.env.TEST_IGNORE_SIGTERM) {
    console.log('worker: ignoring SIGTERM');
    return;
  }
  console.log('worker: draining');
  setTimeout(() => {
    console.log('worker: drained');
    process.exit(0);
  }, drainMs);
});

setInterval(() => undefined, 1000);
console.log('worker: ready');
