const express = require('express');
const app = express();

function block(ms) {
  const until = new Date().getTime() + ms;
  do {
  } while (new Date().getTime() < until);
}

app.get('/', (req, res) => {
  res.send(`Hello World! I'm ${process.pid} - (${new Date().toISOString()})\n`);
});

app.get('/block', (req, res) => {
  block(10000);
  res.send(`I blocked... I'm ${process.pid} - (${new Date().toISOString()})\n`);
});

app.listen(3000, () => {
  console.log(`process ${process.pid} listening on port 3000!`);
});
