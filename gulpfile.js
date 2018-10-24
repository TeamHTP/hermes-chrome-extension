const package = require('./package.json');
const gulp = require('gulp');
const webpack = require('webpack');
const gulpWebpack = require('webpack-stream');
const del = require('del');
const bump = require('gulp-bump');

gulp.task('clean', () => {
  return del(['dist']);
});

gulp.task('chromium-common', () => {
  return gulp.src('src/common/*')
    .pipe(gulp.dest('dist/chromium'));
});

gulp.task('chromium-assets', () => {
  return gulp.src('assets/*')
    .pipe(gulp.dest('dist/chromium/assets'));
});

gulp.task('chromium-spec', () => {
  return gulp.src('src/chromium/*')
    .pipe(gulp.dest('dist/chromium'));
});

gulp.task('chromium-manifest-version', () => {
  return gulp.src('src/chromium/manifest.json')
    .pipe(bump({ version: package.version }))
    .pipe(gulp.dest('dist/chromium'));
});

gulp.task('chromium-webpack', () => {
  return gulp.src('src/common/crypto.js')
    .pipe(gulpWebpack({
      mode: 'production',
      target: 'web',
      output: {
        library: 'HermesCrypto',
        filename: 'crypto.js'
      }
    }, webpack))
    .pipe(gulp.dest('dist/chromium'));
});

gulp.task('build-chromium', gulp.series('chromium-common', 'chromium-assets', 'chromium-spec', 'chromium-manifest-version', 'chromium-webpack'));
gulp.task('clean-build-chromium', gulp.series('clean', 'build-chromium'));
