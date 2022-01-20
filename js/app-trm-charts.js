(function( root, factory ) {
  if( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( function() {
      root.AppTrmCharts = factory();
      return root.AppTrmCharts;
    } );
  } else if( typeof exports === 'object' ) {
    // Node. Does not work with strict CommonJS.
    module.exports = factory();
  } else {
    // Browser globals.
    root.AppTrmCharts = factory();
  }
}( this, function() {

  'use strict';

  var AppTrmCharts;

  const DATA_TRM_CHART_ATTR = "data-trm-chart";
  const CHART_SELECTOR = "[data-trm-chart]";
  const DEFAULT_EV = 80;
  const ACTOR_NAMES = Object.freeze(['Marcel', 'Sophie', 'Fanny']);
  const scaleFillColors = AppColors.scale.custom(20, 0.35);
  const scaleLineColors = AppColors.scale.custom(20, 1);

  const defaultChartOptions = {
    responsive: true,
    tooltips: {
      enabled: false
    }
  }


  function initialize() {

    // Init charts found outside a <script> tag
    $(CHART_SELECTOR).each((i, chart) => {
      initChartCanvas(chart);
    });

    // Init charts included inside a <script> tag
    $('script[type="text/template"]').each((i, script) => {
      // Copy script content into a  hidden DIV
      const div = $('<div class="hidden"/>').appendTo('body');
      const id = 'script-template' + i;
      div.attr('id', id);
      div.html($(script).html());

      // Generate chart data
      $("#" + id + " " + CHART_SELECTOR).each((i, canvas) => {
        initChartCanvas(canvas);
      });

      // Replace <script> content with DIV content
      $(script).html(div.html());

      // Remove the temp DIV
      div.remove();
    })
  }

  function initChartCanvas(canvas) {
    const attrValue = $(canvas).attr(DATA_TRM_CHART_ATTR);
    const chartName = attrValue && attrValue.startsWith('trm') ? attrValue : 'trm';

    // Read options, from HTML comments
    let opts = {};
    $(canvas).comments().each((i,c) => {
      const comment = $(c).html().trim();
      if (comment.startsWith('{')) {
        try {
          const commentObj = JSON.parse(comment);
          opts = {
            ...opts,
            ...commentObj
          };
        }
        catch(err) {
          console.error("[app-trm-charts] Invalid JSON options (will be ignored): \n" + comment, err);
        }
      }
    })

    opts.name = opts.name || chartName;
    if (!opts.type && !attrValue.startsWith('trm')) {
      opts.type = attrValue;
    }
    let data = AppTrmCharts[chartName];
    if (typeof data == "function") {
      data = data(opts);
    }
    else {
      console.debug('[app-trm-charts] Getting TRM chart data \'' + chartName + '\'', opts);
    }
    if (data) {
      $(canvas).attr('data-chart', data.type || 'line');
      $(canvas).html("\n<!--\n" + JSON.stringify(data) + "\n-->\n");
    }
    else {
      console.error('[app-trm-charts] Cannot found chart with name \'' + chartName + '\'!');
    }
  }

  function trm(opts) {
    const name = opts && opts.name || 'trm';
    const type = opts && opts.type || 'line';
    const N = opts && opts.N || ACTOR_NAMES.length;
    const ev = opts && opts.ev || DEFAULT_EV;
    const duration = opts && opts.duration || ev;
    const startYear = opts && opts.startYear || 0;
    const endYear = opts && opts.endYear || (startYear + duration);
    const relative = !(opts && opts.relative === false);
    const yearLabels = !(opts && opts.yearLabels === false || type === 'pie');
    const exchanges = opts && opts.exchanges || [];
    const deaths = !!(opts && opts.deaths);
    const deathsPeriod = deaths ? (opts && opts.deathsPeriod > 0 ? opts.deathsPeriod : Math.round(duration / N)) : 0;
    const stacked = (opts && opts.stacked === true) && type !== 'pie';
    const chartOptions = {
      ...(stacked ? { "scales": { "x": { "stacked": true }, "y": { "stacked": true } } } : {}),
      ...(opts && opts.options)
    };

    opts = {
      type,
      startYear,
      endYear,
      relative,
      yearLabels,
      exchanges,
      deaths,
      deathsPeriod,
      ...opts
    }
    opts.actors = getActors(opts);

    if (name) console.debug('[app-chart] Generating chart data \'' + name + '\'...', opts);

    const labels = yearLabels ? getYearLabels(opts) : getActorLabels(opts);
    const datasets =  getDataSets(opts);
    const result = {
      type,
      data: {
        labels,
        datasets
      },
      options: {
        ...defaultChartOptions,
        color: 'white',
        ...chartOptions
      }
    };
    if (name) console.debug('[app-chart] Generating chart data \'' + name + '\' [OK]', result);

    return result;
  }

  function getActors(opts) {
    const deathsPeriod = opts && opts.deathsPeriod;
    const ev = opts && opts.ev || DEFAULT_EV;
    const duration = opts && opts.duration || ev;
    const N = opts && opts.N || ACTOR_NAMES.length;

    // Create initial actors
    const actors = [];
    for (let i=0; i < N; i++) {
      actors.push({
        label: ACTOR_NAMES[i] || ('I'+i),
        age: 0,
        birthday: 0
      });
    }

    // Add young actor, after each death
    if (deathsPeriod > 0) {
      let deathIndex = 0;
      for (let yearIndex=0; yearIndex < duration ; yearIndex++) {
        const hasDeath = yearIndex > 0 && yearIndex % deathsPeriod === 0;
        if (hasDeath) {
          const deadYear = yearIndex;
          const deadActor = actors[deathIndex];
          if (deadActor.age === 0) {
            deadActor.age = ev - deadYear;
            deadActor.birthday = -1 * (ev - deadYear);
            // Add a new actor
            const newActor = {
              label: 'I' + actors.length,
              age: -1 * (deadYear),
              birthday: deadYear,
              balance: 0
            };
            actors.push(newActor);
            deathIndex++;
          }
          else {
            // Force stop
            yearIndex = duration;
          }
        }
      }
    }
    return actors;
  }

  function getYearLabels(opts) {
    const startYear = opts && opts.startYear;
    const endYear = opts && opts.endYear;
    const labels = [];
    for (let i = startYear; i < endYear; i++) {
      labels.push(i);
    }
    return labels;
  }

  function getActorLabels(opts) {
    return opts && opts.actors && opts.actors.map(actor => actor.label)
      || ACTOR_NAMES;
  }

  function getDataSets(opts, i) {
    const startYear = opts.startYear || 0;
    const ev = opts.ev  || DEFAULT_EV;
    const duration = opts.duration || ev;
    const actors = opts.actors;
    const relative = opts.relative !== false;
    const type = opts.type || 'line';
    const yearLabels = (!(opts.yearLabels === false || (opts.yearLabels === undefined && type === 'pie')));
    const debug = !!(opts && opts.debug);

    // Copy actors into wallets
    const wallets = actors
      .map((actor, i) => Object.assign({}, actor));

    // Init balance of active wallets
    getActiveWallets(wallets, ev).forEach((wallet, i) => wallet.balance = 100 * i);

    // X axis = YEAR
    if (yearLabels) {
      // Init dataset
      const balancesByWallet = wallets.map(_ => []);
      for (let yearIndex = 0; yearIndex < duration; yearIndex++) {
        if (debug) console.debug('---- year #'+ yearIndex);

        // Alive wallets
        const activeWallets = getActiveWallets(wallets, ev);

        // Compute then add the dividend
        const DU = dividends(wallets, activeWallets.length /*N*/, opts);

        // Make exchanges
        makeExchanges(activeWallets, yearIndex, opts);

        // Save balance to datasets
        wallets.forEach((wallet, i) => {
          if (debug && wallet.label) console.debug( " wallet #" + i  + " age=" + wallet.age + ' balance='+wallet.balance + " alive=" + activeWallets.includes(wallet));
          // Convert in relative, if need
          const balance = relative ? wallet.balance / DU : wallet.balance;
          balancesByWallet[i].push(balance);
        });

        // Add the new DU to active wallets
        activeWallets.forEach(wallet => {
          wallet.balance += DU;
        });

        // Increment age
        wallets.forEach(wallet => {
          wallet.age += 1;
        });
      }
      return wallets.map((wallet, i) => {
        return {
          data: balancesByWallet[i],
          label: wallet.label,
          ...getSerieDefault(opts, i)
        };
      });
    }

    // X axis = WALLET (.e.g for 'pie' chart)
    else {
      // Init dataset
      const balancesByYear = [];
      for (let yearIndex = 0; yearIndex < duration; yearIndex++) {
        balancesByYear.push([])
      }
      for (let yearIndex = 0; yearIndex < duration; yearIndex++) {
        if (debug) console.debug('---- year #'+ yearIndex);

        // Alive wallets
        const activeWallets = getActiveWallets(wallets, ev);

        // Compute then add the dividend
        const DU = dividends(wallets, activeWallets.length /*N*/, opts);

        // Make exchanges
        makeExchanges(activeWallets, yearIndex, opts);

        // Save balance to datasets
        wallets.forEach((wallet, i) => {
          if (debug && wallet.label) console.debug( " wallet #" + i  + " age=" + wallet.age + ' balance='+wallet.balance + " alive=" + activeWallets.includes(wallet));
          // Convert in relative, if need
          const balance = relative ? wallets[i].balance / DU : wallets[i].balance;
          balancesByYear[yearIndex].push(balance);
        });

        // Add the new DU to active wallets
        activeWallets.forEach(wallet => {
          wallet.balance += DU;
        });

        // Increment age
        wallets.forEach(wallet => {
          wallet.age += 1;
        });
      }
      const datasets = balancesByYear.map((balances, i) => {
        const label = startYear + i;
        return {
          data: balances,
          label,
          ...getSerieDefault(opts, i)
        };
      });
      if (opts.type === 'pie') {
        return datasets.reverse();
      }
      return datasets;
    }
  }

  function getSerieDefault(opts, i){
    const type = opts && opts.type || 'line';
    const duration = opts && opts.duration || DEFAULT_EV;
    if (type === 'pie') {
      const noBorder = duration > 20;
      const backgroundColor = scaleFillColors.length >= opts.N
        ? scaleFillColors.slice(0, opts.N)
        : AppColors.scale.custom(Math.max(10, opts.N), 0.35);
      const fill = !(opts && opts.fill === false);
      return {
        backgroundColor,
        fill,
        borderWidth: noBorder ? 0.25 : 1,
        pointRadius: 0
      };
    }
    else {
      i = i || 0;
      const hasExchanges = opts && opts.exchanges && opts.exchanges.length > 0 || false;
      const manyWallets = opts && opts.N > 3;
      const fill = !(opts && opts.fill === false) && (opts && opts.fill === true || !(hasExchanges || manyWallets));
      const borderWidth = fill ? 2 : 4;
      const pointRadius = fill ? 2 : 0;
      const borderColor = fill ? scaleFillColors[i] : scaleLineColors[i];
      const backgroundColor = scaleFillColors[i];
      return {
        fill,
        borderWidth,
        pointRadius,
        pointHitRadius: 4,
        pointHoverRadius: 3,
        borderColor,
        borderDash: [],
        borderDashOffset: 0,
        backgroundColor,
        pointBackgroundColor: borderColor,
        pointBorderColor: borderColor,
        pointHoverBackgroundColor: borderColor,
        pointHoverBorderColor: borderColor || AppColors.rgba.white()
      };
    }
  }

  function getActiveWallets(wallets, ev){
    ev = ev || DEFAULT_EV;
    return (wallets || [])
      .filter(wallet => (wallet.age >= 0 && wallet.age < ev));
  }

  function dividends(wallets, N, opts) {
    const debug = !!(opts && opts.debug);
    const M = wallets
      .reduce((res, wallet) => res + (wallet.balance || 0), 0);
    if (N > 0) {
      const mOverN = Math.round(M / N);
      const DU = mOverN / 10;
      if (debug) console.debug(' M=' + M + ' N=' + N + ' DU=' + DU);

      return DU;
    }
    else {
      console.error('Cannot compute the DU, because N=0');
    }
    return undefined;
  }

  function makeExchanges(wallets, yearIndex, opts) {

    const exchanges = opts && opts.exchanges || [];
    if (exchanges.length > 0 && exchanges.includes(yearIndex) && wallets.length > 1) {
      const toWallet = wallets[0];
      const fromWallet = wallets[wallets.length - 1];
      console.debug('[app-charts] Make an exchange from \'' + fromWallet.label + '\' to \'' + toWallet.label + '\'');
      const amount = fromWallet.balance / 2;
      toWallet.balance += amount;
      fromWallet.balance -= amount;
    }
  }

  function demo1() {
    return {
      "type": "line",
      "data": {
        "labels": ["January"," February"," March"," April"," May"," June"," July"],
        "datasets":[
          {
            "data":[65,59,80,81,56,55,40],
            "label":"My first dataset",
            "backgroundColor":"rgba(20,220,220,.8)"
          },
          {
            "data":[28,48,40,19,86,27,90],
            "label":"My second dataset",
            "backgroundColor":"rgba(220,120,120,.8)"
          }
        ],
        "options": { "scales": { "x": { "stacked": true }, "y": { "stacked": true } } }
      }
    };
  }

  AppTrmCharts = {

    initialize,

    trm,

    // TRM A1
    trmA1_1: (opts) => trm({relative: false, ...opts}),
    trmA1_2: (opts) => trm({relative: false, duration: 10, ...opts}),
    trmA1_3: (opts) => trm({relative: true, ...opts}),
    trmA1_3_2: (opts) => trm({relative: true, duration: 160, ...opts}),
    trmA1_4: (opts) => trm({type: 'pie', relative: true, duration: 10, ...opts}),
    trmA1_5: (opts) => trm({type: 'pie', relative: true, duration: 80, ...opts}),

    // TRM B1
    trmB1_1: (opts) => trm({relative: false, exchanges: [20, 60], ...opts}),
    trmB1_2: (opts) => trm({relative: true, exchanges: [20, 60], ...opts}),

    trmC1_1: (opts) => trm({relative: false, N: 20, duration: 160, ...opts}),
    trmC1_2: (opts) => trm({relative: true, N: 20, duration: 160, ...opts}),

    // Demo
    demo1
  };

  return AppTrmCharts;

}));
