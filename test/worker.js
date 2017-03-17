const http = require('http');

const cluster = require('cluster');
const clusterProcess = require('../clusterprocess');

clusterProcess.handleSignals(() => {
  if (cluster.worker) {
    cluster.worker.disconnect();
  }
});

process.title = 'test-w';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.write('Hello World.');
  res.end();
});

server.listen(0, () => console.info(`${process.title} ${process.pid} started and listening on port ${server.address().port}`));
