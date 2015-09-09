'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    run: {
      reloadWorkers: {
        exec: 'pkill -hup -x appserver_cp'
      }
    }
  });

  grunt.loadNpmTasks('grunt-run');

  // Default task(s).
  grunt.registerTask('default', ['run']);
};