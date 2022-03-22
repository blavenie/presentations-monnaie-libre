'use strict';

const gulp = require('gulp'),
  fs = require("fs"),
  useref = require('gulp-useref'),
  filter = require('gulp-filter'),
  uglify = require('gulp-uglify-es').default,
  sourcemaps = require('gulp-sourcemaps'),
  lazypipe = require('lazypipe'),
  gulpif = require('gulp-if'),
  zip = require('gulp-zip'),
  minifyCss = require('gulp-clean-css'),
  merge = require('merge2'),
  csso = require('gulp-csso'),
  replace = require('gulp-replace'),
  log = require('fancy-log'),
  del = require('del'),
  colors = require('ansi-colors'),
  {argv} = require('yargs'),
  browserSync = require('browser-sync').create();


const uglifyBaseOptions = {
  toplevel: true,
  warnings: true,
  mangle: {
    reserved: ['App']
  },
  compress: {
    global_defs: {
      "@console.log": "alert"
    },
    passes: 2
  },
  output: {
    beautify: false,
    preamble: "/* minified */",
    max_line_len: 120000
  }
};

/* --------------------------------------------------------------------------
   -- Serve
   --------------------------------------------------------------------------*/

function watch() {

  // Watch resources
  gulp.watch(['src/images*/**/*', 'src/data*/**/*'], appCopyResources);

  // Watch html
  gulp.watch('src/*.html', appHtml);
}


function serve(cb) {
  // Launch browser
  browserSync.init({
    watch: true,
    server: "./dist",
    watchOptions: {
      ignoreInitial: true
    }
  });
  cb();
}

/* --------------------------------------------------------------------------
   -- Build the web (ZIP) artifact
   --------------------------------------------------------------------------*/

function parsePackage() {
  return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
}


function appClean() {
  return del([
    'dist/'
  ]);
}
function appCopyResources() {

  log(colors.green('Copy resources files...'));
  // Copy files to dist
  return  gulp.src([
        'src/images*/**/*',
        'src/data*/**/*'
      ])
      .pipe(gulp.dest('dist'))
      .pipe(browserSync.stream());;
}

function appCopyExternalResources() {

  log(colors.green('Copy external resources files...'));
  return merge(

    // Copy files to dist
    gulp.src([
      'node_modules/katex/dist/*fonts/**',
      'node_modules/reveal.js-plugins/menu/menu.css',
      'node_modules/reveal.js-plugins/menu/font-awesome*/**/*'
    ])
    .pipe(gulp.dest('dist')),

    // Copy to dist/lib
    gulp.src([
      'node_modules/reveal.js-plugins/chalkboard/img*/*',
    ])
    .pipe(gulp.dest('dist/lib')),

    // Copy dist/css
    gulp.src([
      'node_modules/reveal.js/dist/theme/fonts/source-sans-pro/**',
      'node_modules/reveal.js/dist/theme*/*.css'
    ])
    .pipe(gulp.dest('dist/css'))
  );
}

function appHtml() {
  const enableUglify = true; // argv.release || argv.uglify || false;
  const version = parsePackage().version;

  if (enableUglify) {

    log(colors.green('Minify JS and CSS files...'));

    const indexFilter = filter('**/index.html', {restore: true});

    // Process index.html
    return gulp.src('src/*.html')
      .pipe(useref())  // Concatenate with gulp-useref
      .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))  // Concatenate with gulp-useref

      // Process JS
      .pipe(gulpif('vendor.js', uglify())) // Minify javascript files

      // Process CSS
      .pipe(gulpif('*.css', csso())) // Minify any CSS sources
      //.pipe(gulpif('*.css', minifyCss())) // Minify any CSS sources

      // Add version to file path
      .pipe(indexFilter)
      .pipe(replace(/"(js\/[a-zA-Z0-9]+).js"/g, '"$1.js?v=' + version + '"'))
      .pipe(replace(/"(css\/default).css"/g, '"$1.css" id="theme"'))
      .pipe(replace(/"(css\/[a-zA-Z0-9]+).css"/g, '"$1.css?v=' + version + '"'))
      .pipe(indexFilter.restore)

      .pipe(sourcemaps.write('maps'))

      .pipe(gulp.dest('dist'))
      .pipe(browserSync.stream());
  }
  else {
    return Promise.resolve();
  }
}


function appZip() {
  const packageObj = parsePackage();
  const projectName = packageObj.name;
  const version = packageObj.version;

  return gulp.src(['dist/**/*.*', '!dist/*.zip'])
    .pipe(zip(projectName + '-v'+version+'.zip'))
    .pipe(gulp.dest('dist'));
}

function buildSuccess(done) {
  const packageObj = parsePackage();
  const projectName = packageObj.name;
  const version = packageObj.version;
  log(colors.green("Archive created at: 'dist/"+ projectName +"-v" + version + ".zip'"));
  if (done) done();
}

function help() {
  log(colors.green("Usage: gulp {clean|build} OPTIONS"));
  log(colors.green(""));
  log(colors.green("NAME"));
  log(colors.green(""));
  log(colors.green("  clean                       Clean build directory"));
  log(colors.green("  build                       Build from sources (HTML, CSS and JS)"));
  log(colors.green(""));
  log(colors.green("OPTIONS"));
  log(colors.green(""));
  log(colors.green("  --release                   Release build (with uglify and sourcemaps)"));
  log(colors.green("  --uglify                    Build using uglify plugin"));
}

/* --------------------------------------------------------------------------
   -- Define public tasks
   --------------------------------------------------------------------------*/

const prepare = gulp.parallel(appCopyResources, appCopyExternalResources);
const compile = gulp.series(prepare, appHtml);
const build = gulp.series(appClean, compile, appZip, buildSuccess);

exports.help = help;
exports.build = build;
exports.compile = compile;
exports.serve =  gulp.series(compile, serve, watch)

exports.default = compile;

