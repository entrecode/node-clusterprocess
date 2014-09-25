# ec.node-clusterprocess

Wrapper around Node.js' cluster module for zero-downtime deployment of Node.js Apps. By entrecode.

## What is this and what does it do?
This module supports node's clustering to utilize multi-core systems.
It can be used by basically any Node.js Application to enable zero-downtime deployments.

## Usage

*server.js:*

    require('ec.node-clusterprocess').run('app.js', 'myApp');


This should be a separate Node.js script, and it should be specified as `main` executable in your project's `package.json`. When you start your Application, you will call 

  node server.js
  
from now on instead of `node app.js`. 

### Zero-Downtime Reloading

You can trigger zero-downtime reloads of your application by sending `HUP`:

  kill -hup <pid>
  
... where <pid> should be the PID of the cluster process. Alternatively, you can use

  pkill -hup -x myApp_cp

... where myApp_cp is the title of the cluster process (consisting of your provided processName and the suffix _cp). 

#### Grunt Integration
See `Gruntfile.example.js` for an example Gruntfile for reloading, utilizing the `grunt-run` Grunt-Task.

## API

ClusterProcess has exactly one available method:

### run(executable[, processName])

`executable` is the name of your main script that should be executed as worker. As path your main directory (`'../../'` from ClusterProcess' directory) is assumed automatically. 

`processName` is optional. If omitted, the process name is taken from your `package.json` `title` property.
It will be used as process title (what is displayed in 'ps'). 
It should not be too long according to the [Node.js Documentation](http://nodejs.org/api/process.html#process_process_title). Note that the master process will be called `processName_cp` and the worker processes `processName`. 