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
  merge = require('merge2'),
  csso = require('gulp-csso'),
  replace = require('gulp-replace'),
  log = require('fancy-log'),
  del = require('del'),
  colors = require('ansi-colors'),
  {argv} = require('yargs'),
  browserSync = require('browser-sync').create(),
  header = require('gulp-header'),
  footer = require('gulp-footer'),
  exec = require('gulp-exec');

//const plantumlVersion = '1.2023.9'; // FIXME: generate bad encoding
const plantumlVersion = '1.2022.7';
const uglifyBaseOptions = {
  toplevel: true,
  warnings: true,
  mangle: {
    reserved: ['App', 'AppTrmCharts']
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

const folders = ['architecture','use-case'];
const folders_svg = ['architecture','use-case'];
const paths = {
  resources: ['src/images*/**/*', 'src/data*/**/*'],
  src_md: folders.map(dir => dir + '*/**/*.*').concat('src/**/*.md'),
  src_html: ['src/**/*.html', "!src/about.html"],
  src_html_static: ['src/about.html'],
  src_css: ['src/css/*.css'],
  src_js: ['src/**/*.js'],
  src_layout: ['src/layout/*.html'],
  src_plantuml: folders_svg.map(dir => dir + '*/**/*.puml'),
  src_svg: folders_svg.map(dir => dir + '*/**/*.svg')
};

function watch() {

  // Watch resources
  gulp.watch(paths.resources.concat(paths.src_md), appCopyResources);

  // Watch JS + html
  gulp.watch([...paths.src_html, ...paths.src_js, ...paths.src_css, ...paths.src_layout], appHtml);

  // Watch PUML files
  gulp.watch(paths.src_plantuml, svg);
}


function serve(done) {
  // Launch browser
  browserSync.init({
    watch: true,
    server: "./dist",
    watchOptions: {
      ignoreInitial: true
    }
  });
  done();
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
  return  gulp.src(paths.resources
      .concat(paths.src_md)
      .concat(paths.src_html_static))
  .pipe(gulp.dest('dist'))
  .pipe(browserSync.stream());
}

function appCopyExternalResources() {

  log(colors.green('Copy external resources files...'));
  return merge(

    // Copy files to dist
    gulp.src([
      'node_modules/katex/dist/*fonts/**',
      'node_modules/reveal.js-menu/menu.css',
      'node_modules/reveal.js-menu/font-awesome*/**/*'
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
function appGenerateSvg(done) {

  log(colors.green('Generating SVG...'));
  var options = {
    continueOnError: false, // default = false, true means don't emit error event
    pipeStdout: false, // default = false, true means stdout is written to file.contents
  };
  return gulp.src(folders_svg)
      .pipe(exec((file) => `java -jar lib/plantuml-${plantumlVersion}.jar -tsvg "${file.path}/**.puml" -charset UTF-8 -progress -duration -nometadata`, options))
      .on('end', done);
}

function appCopySvg() {

  log(colors.green('Copy SVG files...'));
  return  gulp.src(paths.src_svg)
      .pipe(gulp.dest('dist'))
      .pipe(browserSync.stream());
}

function appHtml() {
  const enableUglify = argv.release || argv.uglify || false;
  const pkg = parsePackage();

  log(colors.green('Processing HTML files...'));

  const htmlPaths = [...paths.src_html, '!src/layout/**/*.*'];
  const htmlFilter = filter(htmlPaths, {restore: true});

  const layoutFilter = filter([...paths.src_html, '!src/le-sou.html', '!src/slides/**/*.html', '!src/about.html'], {restore: true});
  const compatLayoutFilter = filter('src/le-sou.html', {restore: true});
  const minifiedFiles = [];

  // Process index.html
  return gulp.src(htmlPaths)

    .pipe(layoutFilter)
    .pipe(header(fs.readFileSync('src/layout/header.html', 'utf8'), {title: pkg.description}))
    .pipe(footer(fs.readFileSync('src/layout/footer.html', 'utf8'), {version: pkg.version}))
    .pipe(layoutFilter.restore)

    .pipe(compatLayoutFilter)
    .pipe(header(fs.readFileSync('src/layout/header-compat.html', 'utf8'), {title: pkg.description}))
    .pipe(footer(fs.readFileSync('src/layout/footer.html', 'utf8'), {version: pkg.version}))
    .pipe(compatLayoutFilter.restore)

    // Concatenate JS and CSS files (using gulp-useref)
    .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })))

      // Minify JS files
    .pipe(gulpif((file) => {
      if (!enableUglify || !file.path.endsWith('.js') || file.path.endsWith('.min.js')) return false; // Skip
      if (minifiedFiles.includes(file.path)) return false; // Skip: already exists

      minifiedFiles.push(file.path);
      log(colors.grey('Minifying ' + colors.bold(file.path) + '... '));

      file.path = file.path.replace('.js', '.min.js');
      return true;
    }, uglify(uglifyBaseOptions)))

    // Process CSS
    .pipe(gulpif('*.css', csso())) // Minify any CSS sources

    .pipe(htmlFilter)
      // Use minified JS files
    .pipe(gulpif(enableUglify,replace(/"(lib\/[a-zA-Z0-9.]+)\.js"/g, '"$1.min.js"')))
      // Add version to JS files (to force the browser to refresh, after a new version)
    .pipe(replace(/"(lib\/[a-zA-Z0-9.]+)\.js"/g, '"$1.js?v=' + pkg.version + '"'))
    .pipe(replace(/"(css\/default)\.css"/g, '"$1.css" id="theme"'))
    .pipe(replace(/"(css\/[a-zA-Z0-9]+)\.css"/g, '"$1.css?v=' + pkg.version + '"'))
    .pipe(htmlFilter.restore)

    .pipe(sourcemaps.write('maps'))

    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
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

const svg = gulp.series(appGenerateSvg, appCopySvg);
const prepare = gulp.parallel(appCopyResources, appCopyExternalResources);
const compile = gulp.series(prepare, gulp.parallel(appHtml, svg));
const build = gulp.series(appClean, compile, appZip, buildSuccess);

exports.help = help;
exports.clean = appClean;
exports.svg = svg;
exports.build = build;
exports.compile = compile;
exports.serve =  gulp.series(compile, serve, watch)

exports.default = compile;

