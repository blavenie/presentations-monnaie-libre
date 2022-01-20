(function( root, factory ) {
  if( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( function() {
      root.App = factory();
      return root.App;
    } );
  } else if( typeof exports === 'object' ) {
    // Node. Does not work with strict CommonJS.
    module.exports = factory();
  } else {
    // Browser globals.
    root.App = factory();
  }
}( this, function() {

  'use strict';

  var App;
  var menu, notes;

  function initialize() {
    chainByCallback([
      $(document).ready,
      loadExternalFiles,
      insertChartData,
      initReveal,
      onRevealReady,
      () => console.info('[app] App is ready!')
    ]);
  }

  function chainByCallback(jobs) {
    let result;
    for (let i=jobs.length-1; i>=0; i--) {
      const job = jobs[i];
      const callback = result || undefined;
      if (callback) {
        result = () => job(callback);
      }
      else {
        result = job
      }
    }
    return result();
  }

  function loadExternalFiles(callback) {
    console.debug('[app] Loading external sources files');
    var sections = $("section[data-src$='.html']");
    if (sections.length === 0) {
      callback();
      return;
    }

    var loadedSections = 0;
    var checkIfLoaded = () => {
      loadedSections++;
      if (loadedSections === sections.length) {
        callback();
      }
    }
    sections.each((i, section) => {
      var source = section.getAttribute('data-src');
      $(section).load(source, () => checkIfLoaded());
    });
  }

  function insertChartData(callback) {
    console.debug('[app] Inserting TRM graph data...');
    AppTrmCharts.initialize();
    callback();
  }

  function initReveal(callback) {

    console.debug('[app] Initialize Reveal...');

    // Full list of configuration options available here:
    // https://github.com/hakimel/reveal.js#configuration
    Reveal.initialize({
      controls: true,
      progress: true,
      history: true,
      center: true,
      mouseWheel: true,
      slideNumber: true,
      keyboard: true,
      fragments: true,
      //showNotes:true,

      // Background

      controlsBackArrows: 'faded',
      pdfMaxPagesPerSlide: 1,
      hideInactiveCursor: true,

      markdown: {

      },
      customcontrols: {
        controls: [
          {
            icon: '<i class="fa fa-pen-square"></i>',
            title: 'Toggle chalkboard (B)',
            action: 'RevealChalkboard.toggleChalkboard();'
          },
          {
            icon: '<i class="fa fa-pen"></i>',
            title: 'Toggle notes canvas (C)',
            action: 'RevealChalkboard.toggleNotesCanvas();'
          },
          {
            icon: '<i class="fa fa-eraser"></i>',
            title: 'Clear chalkboard (Suppr)',
            action: 'RevealChalkboard.clear();'
          }
        ]
      },
      chart: {
        defaults: {
          color: 'lightgray', // color of labels
          scale: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "lightgray" } , // color of grid lines
          },
        },
        line: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ], "borderDash": [ [5,10], [0,0] ] },
        bar: { backgroundColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]},
        pie: { backgroundColor: [ ["rgba(0,0,0,.8)" , "rgba(220,20,20,.8)", "rgba(20,220,20,.8)", "rgba(220,220,20,.8)", "rgba(20,20,220,.8)"] ]},
        radar: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]},
      },
      katex: { // Formula
        local: 'node_modules/katex',
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\(', right: '\\)', display: false},
          {left: '\\[', right: '\\]', display: true}
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      },
      menu: { // Menu works best with font-awesome installed: sudo apt-get install fonts-font-awesome
        transitions: false,
        markers: true,
        hideMissingTitles: true,
        themes: [
          { name: 'Défaut', theme: 'css/default.css' },
          { name: 'Black', theme: 'node_modules/reveal.js/dist/theme/black.css' },
          { name: 'White', theme: 'node_modules/reveal.js/dist/theme/white.css' },
          { name: 'League', theme: 'node_modules/reveal.js/dist/theme/league.css' },
          { name: 'Sky', theme: 'node_modules/reveal.js/dist/theme/sky.css' },
          { name: 'Beige', theme: 'node_modules/reveal.js/dist/theme/beige.css' },
          { name: 'Simple', theme: 'node_modules/reveal.js/dist/theme/simple.css' },
          { name: 'Serif', theme: 'node_modules/reveal.js/dist/theme/serif.css' },
          { name: 'Blood', theme: 'node_modules/reveal.js/dist/theme/blood.css' },
          { name: 'Night', theme: 'node_modules/reveal.js/dist/theme/night.css' },
          { name: 'Moon', theme: 'node_modules/reveal.js/dist/theme/moon.css' },
          { name: 'Solarized', theme: 'node_modules/reveal.js/dist/theme/solarized.css' }
        ],
        custom: [
          { title: 'Aide', icon: '<i class="fa fa-question-circle"></i>',
            content: '<ul class="slide-menu-items">' +
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="RevealMenu.toggle();Reveal.toggleHelp();" href="#">Raccourcis clavier (?)</a>'+
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.showNotes()" href="#">Ouvrir la vue présentateur (S)</a>'+
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.showControls()" href="#">Afficher les contrôles</a>'+
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.showChalkboard()" href="#">Afficher le tableau (B)</a>'+
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.writeToSlide()" href="#">Ecrire sur les diapos (C)</a>'+
              '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.clearChalkboard()" href="#">Nettoyer le tableau (Suppr)</a>'+
              '</ul>'
          },
          { title: 'A propos', icon: '<i class="fa fa-info"></i>', src: 'about.html' }
        ]
      },
      chalkboard: { // font-awesome.min.css must be available
        //src: "chalkboard/chalkboard.json",
        storage: "chalkboard-monnaie-libre",
        colorButtons: 5
      },
      plugins: [
        RevealMarkdown,
        RevealMenu,
        RevealNotes,
        RevealHighlight,
        RevealChart,
        RevealMath.KaTeX,
        RevealChalkboard,
        RevealCustomControls
      ],
    });

    Reveal.on( 'ready', callback);
  }

  function onRevealReady(callback){
    var plugins = Reveal.getPlugins();
    menu = plugins.menu;
    notes = plugins.notes;

    // Add header/footer
    var header = $('#header').html();
    if (header) {
      if (window.location.search.match( /print-pdf/gi ) ) {
        Reveal.addEventListener( 'ready', function( event ) {
          $('.slide-background').append(header);
          callback();
        });
      }
      else {
        $('div.reveal').append(header);
        callback();
      }
    }
    else {
      callback();
    }
  }

  function showNotes() {
    menu.toggle();
    notes.open();
    Reveal.configure({
      controls:false,
      menu: {
        openButton: false
      }
    });
    var elements = document.getElementsByClassName('slide-menu-button');
    elements[0].classList.add('hidden');

    var customcontrolsDiv = document.getElementById('customcontrols');
    customcontrolsDiv.classList.add('hidden');

  }

  function showControls() {
    menu.toggle();
    Reveal.configure({
      controls:true
    });
    var elements = document.getElementsByClassName('slide-menu-button');
    elements[0].classList.remove('hidden');

    var customcontrolsDiv = document.getElementById('customcontrols');
    customcontrolsDiv.classList.remove('hidden');
  }

  function showChalkboard() {
    RevealChalkboard.resetAll();
    RevealChalkboard.toggleChalkboard();
    return false;
  }

  function clearChalkboard() {
    RevealChalkboard.clear();
  }

  function writeToSlide() {
    console.log(RevealChalkboard);
  }

  function createChartData() {
    return
  }

  App = {
    initialize,
    showNotes,
    showControls,
    showChalkboard,
    clearChalkboard,
    writeToSlide
  };

  return App;

}));
