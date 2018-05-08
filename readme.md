# node-clusterprocess

> Wrapper around Node.js' cluster module for zero-downtime deployment of Node.js Apps. By entrecode.

[![npm version][npm-image]][npm-url]

## What is this and what does it do?
This module supports node's clustering to utilize multi-core systems.
It can be used by basically any Node.js Application to enable zero-downtime deployments.

## Usage

*server.js:*

```js
require('node-clusterprocess').run('app.js', 'myApp');
```


This should be a separate Node.js script, and it should be specified as `main` executable in your project's `package.json`. When you start your Application, you will call `node server.js` from now on instead of `node app.js`. 

### Zero-Downtime Reloading

You can trigger zero-downtime reloads of your application by sending `HUP`:

```sh
kill -hup <pid>
```

… where `<pid>` should be the PID of the cluster process. Alternatively, you can use

```sh
pkill -hup -x myApp_cp
```

… where `myApp_cp` is the title of the cluster process (consisting of your provided processName and the suffix _cp). 

## API

ClusterProcess offers the following methods:

### run(executable[, processName])

`executable` is the name of your main script that should be executed as worker. As path the directory of the requiring module is assumed automatically (`path.dirname(module.parent.filename)`).

`processName` is optional. If omitted, the process name is taken from your `package.json` `title` property.
It will be used as process title. It should not be too long according to the [Node.js Documentation](http://nodejs.org/api/process.html#process_process_title). Note that the master process will be called `processName_cp` and the worker processes should be named `processName-w` by your code.

### setLogger(loggingInstance)

ClusterProcess uses console logging by default for nicer logging to stdout/console (with timestamps and colors). You can overwrite this with another (e.g. global) logging instance using this method.
The logging class is required to provide methods `log`, `info`, `warn` and `error`. 

### handleSignals([cleanFunc = noop [, timeout = 2000]])

ClusterProcess can handle signals `SIGHUP`, `SIGINT`, and `SIGTERM`. An optional `cleanFunc` can be provided and ClusterProcess will call this function prior to exiting the process. Default timeout for exit is 2000ms but can be overwritten by `timeout`.

ClusterProcess' methods are chainable, so you can set a logger, call `handleSignals()`, and call `run()` in one line.

## Changelog

## 1.1.0

* changed stop behavior when receiving SIGTERM, will send SIGINT to worker, after 10 seconds will send SIGTERM

#### 1.0.2

* fix handling of term signal

#### 1.0.1

* use logger instance instead of console logging

### 1.0.0

* initial public release of node-clusterprocess

[npm-image]: https://badge.fury.io/js/node-clusterprocess.svg
[npm-url]: https://www.npmjs.com/package/node-clusterprocess
[travis-image]: https://travis-ci.org/entrecode/node-clusterprocess.svg?branch=master
[travis-url]: https://travis-ci.org/entrecode/node-clusterprocess
[cover-image]: https://coveralls.io/repos/github/entrecode/node-clusterprocess/badge.svg?branch=master
[cover-url]: https://coveralls.io/github/entrecode/node-clusterprocess?branch=master
