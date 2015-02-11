var gulp = require('gulp');
var pkg = require('./package.json');

var minifyHTML = require('gulp-minify-html');
var imagemin = require('gulp-imagemin');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var plumber = require('gulp-plumber');
var header = require('gulp-header');
var sass = require('gulp-ruby-sass');
var minifyCSS = require('gulp-minify-css');
var del = require('del');
var zip = require('gulp-zip');
var runSequence = require('run-sequence');

gulp.task('config', function() {
   gulp.src('./src/**/*.json')
      .pipe(gulp.dest('./dist'));
   console.log('config file copied.');
});

gulp.task('html', function() {
   gulp.src('./src/**/*.html')
      .pipe(minifyHTML({conditionals : true}))
      .pipe(gulp.dest('./dist'));
   console.log('html minified.');
});

gulp.task('img', function() {
   gulp.src('./src/img/*')
      .pipe(imagemin())
      .pipe(gulp.dest('./dist/img'));
   console.log('image minified.');
});

gulp.task('js', function() {
   gulp.src('./src/**/*.js')
      .pipe(plumber())
      .pipe(concat('all.min.js'))
      .pipe(uglify())
      .pipe(header('/* copyright (c)tearoom6 2015 */'))
      .pipe(gulp.dest('./dist/script'));
   console.log('js minified.');
});

gulp.task('js-ng', function() {
   gulp.src('./src/**/*.js')
      .pipe(plumber())
      .pipe(concat('all.min.js'))
      .pipe(ngAnnotate())
      .pipe(uglify())
      .pipe(header('/* copyright (c)tearoom6 2015 */'))
      .pipe(gulp.dest('./dist/script'));
   console.log('js minified.');
});

gulp.task('js-dev', function() {
   gulp.src('./src/**/*.js')
      .pipe(plumber())
      .pipe(concat('all.min.js'))
      .pipe(header('/* copyright (c)tearoom6 2015 */'))
      .pipe(gulp.dest('./dist/script'));
   console.log('js concated.');
});

gulp.task('sass', function () {
   gulp.src('./src/**/*.scss')
      .pipe(plumber())
      .pipe(sass({style : 'expanded', check : true, noCache : true, 'sourcemap=none' : true}))
      .pipe(minifyCSS())
      .pipe(header('/* copyright (c)tearoom6 2015 */'))
      .pipe(gulp.dest('./dist'));
   console.log('sass compiled.');
});

gulp.task('zip', function() {
   gulp.src('./dist/**/*')
      .pipe(zip(pkg.name + '-' + pkg.version + '.zip'))
      .pipe(gulp.dest('./compiled'));
   console.log('package compressed.');
});

gulp.task('clean', function(callback) {
   del(['dist', '.tmp', 'compiled'], callback);
   console.log('cleaned.');
});

gulp.task('build', function(callback) {
   return runSequence(
      'clean',
      ['config', 'html', 'img', 'js-ng', 'sass'], // Angular.js用
      callback
   );
   console.log('build successful.');
});

gulp.task('watch', function() {
   gulp.watch('./src/**/*.html', ['html']);
   gulp.watch('./src/**/*.js', ['js-dev']);
   gulp.watch('./src/**/*.scss', ['sass']);
});

gulp.task('default', ['build']);
