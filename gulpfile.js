const gulp = require('gulp');
const webpack = require('webpack');
const gulpWebpack = require('webpack-stream');
const del = require('del');
const bump = require('gulp-bump');
const eslint = require('gulp-eslint');
const packageJSON = require('./package.json');

gulp.task('clean', () => del(['dist']));

gulp.task('lint', () => gulp.src(['**/*.s', '!node_modules/**'])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError()));

gulp.task('chromium-common', () => gulp.src('src/common/*')
  .pipe(gulp.dest('dist/chromium')));

gulp.task('chromium-assets', () => gulp.src('assets/*')
  .pipe(gulp.dest('dist/chromium/assets')));

gulp.task('chromium-spec', () => gulp.src('src/chromium/*')
  .pipe(gulp.dest('dist/chromium')));

gulp.task('chromium-manifest-version', () => gulp.src('src/chromium/manifest.json')
  .pipe(bump({ version: packageJSON.version }))
  .pipe(gulp.dest('dist/chromium')));

gulp.task('chromium-webpack', () => gulp.src('src/common/crypto.js')
  .pipe(gulpWebpack({
    mode: 'production',
    target: 'web',
    output: {
      library: 'HermesCrypto',
      filename: 'crypto.js',
    },
  }, webpack))
  .pipe(gulp.dest('dist/chromium')));

gulp.task('build-chromium', gulp.series('chromium-common', 'chromium-assets', 'chromium-spec', 'chromium-manifest-version', 'chromium-webpack'));
gulp.task('clean-build-chromium', gulp.series('clean', 'build-chromium'));

gulp.task('build', gulp.series('build-chromium'));
gulp.task('clean-build', gulp.series('clean', 'build'));
