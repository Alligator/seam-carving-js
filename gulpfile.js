var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var browserify = require('browserify');
var source = require('vinyl-source-stream');

gulp.task('browserify', function() {
    return browserify('./demo/javascript/src/demo.js')
        .bundle()
        .pipe(source('demo.js'))
        .pipe(gulp.dest('./demo/javascript/build/'));
});

gulp.task('test', function() {
    return gulp.src('test.js', {read: false})
        .pipe(mocha({reporter: 'spec'}))
        .on('error', gutil.log);
});

gulp.task('default', function() {
    gulp.watch(['./**/*.js', './*.js'], ['browserify', 'test']);
});
