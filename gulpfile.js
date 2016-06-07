'use strict';

var path = require('path');

var gulp = require('gulp');
var webpack = require('webpack');

gulp.task('bundle', function(cb) {
  webpack({
    entry: {
      ui: './build/ui',
      background: './build/background'
    },
    output: {
      path: path.join(__dirname, './dist'),
      filename: '[name].bundle.js'
    },
    module: {
      loaders: [
        { test: /\.json$/, loader: "json" },,
        { test: /\.jsx$/, loader: 'jsx-loader?harmony=true' },
        { test: /\.css$/, loader: 'style-loader!css-loader' }
      ]
    },
    plugins: [
      // new webpack.IgnorePlugin(/^serialport$/, /.*/)
    ],
    externals: {
      repl: 'repl'
    },
    resolveLoader: {
      // this is a workaround for loaders being applied
      // to linked modules
      root: path.join(__dirname, 'node_modules')
    },
    resolve: {
      // this is a workaround for aliasing a top level dependency
      // inside a symlinked subdependency
      root: path.join(__dirname, 'node_modules'),
      alias: {
        // replacing `fs` with a browser-compatible version
        net: 'chrome-net',
        serialport: 'browser-serialport',
        "graceful-fs": 'browser-serialport',
        dgram: 'chrome-dgram'
      }
    }
  }, cb);
});

gulp.task('copy', function() {
  return gulp.src(['./*.png', './manifest.json', './*.html', './*.css', './node_modules/avrgirl-arduino/junk/**'])
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['bundle', 'copy']);
