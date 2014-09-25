'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    run: {
      commands: {
        exec: 'pkill -hup -x appserver',
      }
    }
  });

  grunt.loadNpmTasks('grunt-run');

  // Default task(s).
  grunt.registerTask('default', ['run']);
};