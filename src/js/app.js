(function( root, factory ) {
  if( typeof exports === 'object' ) {
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

  function initialize(opts) {
    chainByCallback([
      $(document).ready,
      loadExternalFiles,
      insertChartData,
      (done) => initReveal(opts, done),
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

  function initReveal(opts, callback) {

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
      controlsBackArrows: 'faded',
      pdfMaxPagesPerSlide: 1,
      hideInactiveCursor: true,
      touch: true,

      ...opts,

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
        line: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ] },
        bar: { backgroundColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]},
        pie: { backgroundColor: [ ["rgba(0,0,0,.8)" , "rgba(220,20,20,.8)", "rgba(20,220,20,.8)", "rgba(220,220,20,.8)", "rgba(20,20,220,.8)"] ]},
        radar: { borderColor: [ "rgba(20,220,220,.8)" , "rgba(220,120,120,.8)", "rgba(20,120,220,.8)" ]},
      },
      katex: { // Formula
        local: '',
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
        themes: true,
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
    const plugins = Reveal.getPlugins();
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
