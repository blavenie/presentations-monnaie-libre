/*!
 * reveal.js
 * http://lab.hakim.se/reveal-js
 * MIT licensed
 *
 * Copyright (C) 2017 Hakim El Hattab, http://hakim.se
 */
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

    var dependencies = [
        { src: 'lib/js/classList.js', condition: function() { return !document.body.classList; } },
        // Zoom in and out with Alt+click
        { src: 'plugin/zoom-js/zoom.js', async: true },
        { src: 'plugin/markdown/marked.js' },
        { src: 'plugin/markdown/markdown.js' },
        { src: 'plugin/notes/notes.js', async: true },
        { src: 'plugin/highlight/highlight.js', async: true, callback: function() { hljs.initHighlightingOnLoad(); } },
        { src: 'plugin/search/search.js', async: true },
        { src: 'plugin/menu/menu.js' },
        { src: 'plugin/chartjs/Chart.min.js' },
        { src: 'plugin/chartjs/charted.js' }
    ]

    function initialize() {
        console.debug('[app] Initialize');

        var isServerLivePresentation = false;


        // More info https://github.com/hakimel/reveal.js#configuration
        var config = {

            controls: true,
            controlsTutorial: true,
            fragments: true,
            showNotes:true,

            controlsLayout: 'edges',
            keyboard: true,
            history: true,
            center: false,
            mouseWheel: true,
            transition: 'fade',
            touch: true,
            controlsBackArrows: 'faded',
            pdfMaxPagesPerSlide: 1,
            help: true,

            menu: { // Menu works best with font-awesome installed: sudo apt-get install fonts-font-awesome
                //themes: true,
                transitions: false, // TODO: fix some section transition, to be be able to change here
                markers: true,
                hideMissingTitles: true,
                titleSelector: 'menu-title',
                keyboard: true,
                openButton: true,

                // Specifies the themes that will be available in the themes
                // menu panel. Set to 'false' to hide themes panel.
                themes: [
                    { name: 'Black', theme: 'css/theme/black.css' },
                    { name: 'White', theme: 'css/theme/white.css' },
                    { name: 'League', theme: 'css/theme/league.css' },
                    { name: 'Sky', theme: 'css/theme/sky.css' },
                    { name: 'Beige', theme: 'css/theme/beige.css' },
                    { name: 'Simple', theme: 'css/theme/simple.css' },
                    { name: 'Serif', theme: 'css/theme/serif.css' },
                    { name: 'Blood', theme: 'css/theme/blood.css' },
                    { name: 'Night', theme: 'css/theme/night.css' },
                    { name: 'Moon', theme: 'css/theme/moon.css' },
                    { name: 'Solarized', theme: 'css/theme/solarized.css' }
                ],
                custom: [
                    { title: 'Aide', icon: '<i class="fa fa-question-circle"></i>',
                        content: '<ul class="slide-menu-items">' +
                            '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="RevealMenu.toggle();Reveal.toggleHelp();" href="#">Raccourcis clavier (?)</a>'+
                            '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.showNotes()" href="#">Ouvrir la vue présentateur (S)</a>'+
                            '<a class="slide-menu-item" style="text-decoration: none;" data-transition="none" onclick="App.showControls()" href="#">Afficher les contrôles</a>'+
                            '</ul>' }
                ]
            },

            chart: {
                path : "", // Optional path to Chart.js
                items : [
                    chartLine("#chart-frame-1"),
                    chartBar("#chart-frame-2"),
                ]
            },

            // More info https://github.com/hakimel/reveal.js#dependencies
            dependencies: dependencies
        };

        Reveal.initialize(config);

        Reveal.addEventListener("slidechanged",function(){
            setTimeout(function(){ // Timeout required to load the plugin
                // the RevealChart has iframe ids as properties
                // (replacing "-" with "_")
                //console.log(RevealChart);
                Chart.defaults.global.responsive = true;

            },500);
        },false);
    }

    function showNotes() {
        RevealMenu.toggle();
        RevealNotes.open();
        Reveal.configure({
            controls:false,
            menu: {
                openButton: false
            }
        });
        var elements = document.getElementsByClassName('slide-menu-button');
        elements[0].classList.add('hidden');
    }

    function showControls() {
        RevealMenu.toggle();
        Reveal.configure({
            controls:true
        });
        var elements = document.getElementsByClassName('slide-menu-button');
        elements[0].classList.remove('hidden');
    }

    function chartLine(eleId) {
        return {
            selector : eleId,
            type : "line",
            data : {
                labels: ["January", "February", "March", "April", "May", "June", "July"],
                datasets: [
                    {
                        label: "My First dataset",
                        fillColor: "rgba(220,220,220,0.2)",
                        strokeColor: "rgba(220,220,220,1)",
                        pointColor: "rgba(220,220,220,1)",
                        pointStrokeColor: "#fff",
                        pointHighlightFill: "#fff",
                        pointHighlightStroke: "rgba(220,220,220,1)",
                        data: [65, 59, 80, 81, 56, 55, 40]
                    },
                    {
                        label: "My Second dataset",
                        fillColor: "rgba(151,187,205,0.2)",
                        strokeColor: "rgba(151,187,205,1)",
                        pointColor: "rgba(151,187,205,1)",
                        pointStrokeColor: "#fff",
                        pointHighlightFill: "#fff",
                        pointHighlightStroke: "rgba(151,187,205,1)",
                        data: [28, 48, 40, 19, 86, 27, 90]
                    }
                ]
            },
            options : {
                responsive:true
            },
            // optional
            canvas : {
                // width of iframe -> canvas element.
                // default : 250px
                width : "450px",
                // height of iframe -> canvas element.
                // default : 150px
                height : "450px"
            }
        }
    }

    function chartBar(eleId) {
        console.debug('[app] Creating histogram chart ' + eleId);
        return {
            selector: eleId,

            // type can be pie/doughtnut/line/bar/radar/polararea
            type: 'bar',
            data: {
                labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
                datasets: [{
                    label: '# of Votes',
                    data: [12, 19, 3, 5, 2, 3],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            },
            // optional
            canvas : {
                // width of iframe -> canvas element.
                // default : 250px
                width : "450px",
                // height of iframe -> canvas element.
                // default : 150px
                height : "350px"
            }
        };
    }

    App = {
        initialize: initialize,
        showNotes: showNotes,
        showControls: showControls
    };

    return App;

}));