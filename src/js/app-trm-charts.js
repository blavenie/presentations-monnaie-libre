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
    const type = $(canvas).attr(DATA_TRM_CHART_ATTR);

    // Read options, from HTML comments
    let opts = { type };
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

    let data = AppTrmCharts.createData(opts);
    if (data) {
      $(canvas).attr('data-chart', type || data.type || 'line');
      $(canvas).html("\n<!--\n" + JSON.stringify(data) + "\n-->\n");
    }
    else {
      console.error('[app-trm-charts] Cannot found chart with name \'' + chartName + '\'!');
    }
  }

  function createData(opts) {
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
    const stacked = (opts && opts.stacked === true) && type !== 'pie';
    const chartOptions = {
      ...(stacked ? { "scales": { "x": { "stacked": true }, "y": { "stacked": true } } } : {}),
      ...(opts && opts.options)
    };
    const debug = !!(opts && opts.debug);

    opts = {
      type,
      ev,
      duration,
      N,
      startYear,
      endYear,
      relative,
      yearLabels,
      exchanges,
      deaths,
      stacked,
      debug,
      ...opts
    }
    opts.deathsPeriod = getDeathsPeriod(opts);
    opts.actors = getActors(opts);
    opts.scaleColors = getScaleColors(opts);

    if (debug) console.debug('[app-trm-chart] Generating data for \'' + type + '\'...', opts);

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
    if (debug) console.debug('[app-trm-chart] Generating data for \'' + type + '\' [OK]', result);

    return result;
  }

  function getDeathsPeriod(opts) {
    if (!opts.deaths) return undefined;
    if (opts.deathsPeriod > 0) return opts.deathsPeriod;

    const ev = opts.ev;
    const N = opts.N;

    // Auto compute deaths period
    // Make sure death period is a multiple of ev / N
    let deathsPeriod = Math.round(ev / N );
    while (deathsPeriod > 2 && ev % deathsPeriod % N > 0) {
      deathsPeriod--;
    }

    if (opts.debug) console.debug('[app-trm-chart] Best deathsPeriod=' + deathsPeriod);
    return deathsPeriod;

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
        label: ACTOR_NAMES[i],
        age: 0,
        birthday: 0,
        balance: 0
      });
    }

    // Add young actor, after each death
    if (deathsPeriod > 0) {
      let deathIndex = 0;
      for (let yearIndex=0; yearIndex < duration ; yearIndex++) {
        const hasDeath = yearIndex > 0 && yearIndex % deathsPeriod === 0;
        if (hasDeath) {
          const deadYear = yearIndex;
          let deadActor = actors[deathIndex];

          // Debug
          if (opts.debug) console.debug('[app-trm-chart] Death at year=' + yearIndex + ' - wallet #' + deathIndex);

          // Dead actor not exists yet: create it
          if (deadActor.age < 0) {
            const addDeadActor = (yearIndex + deadActor.age) >= 80
            if (addDeadActor) {
              /*deadActor = {
                balance: 0,
                //age: -1 * (yearIndex - ev)
              };
              if (opts.debug) console.debug('[app-trm-chart] Inserting missing actor, for death at year=' + yearIndex);
              actors.splice(deathIndex, 0, deadActor);*/
              //deathIndex++;
              // Add a new actor
              const bornActor = {
                age: -1 * (deadYear),
                birthday: deadYear,
                balance: 0
              };
              actors.push(bornActor);
            }
            else {
              console.debug('[app-trm-chart] Skipping death at year=' + deathIndex);
            }
          }
          else {
            deadActor.age = ev - deadYear;
            deadActor.birthday = -1 * (ev - deadYear);
            deathIndex++;
            // Add a new actor
            const bornActor = {
              age: -1 * (deadYear),
              birthday: deadYear,
              balance: 0
            };
            actors.push(bornActor);
          }
        }
      }

      // Generate missing labels
      actors.forEach((actor, i) => {
        actor.label = actor.label || ('I'+(i+1));
      });
    }
    return actors;
  }

  function getScaleColors(opts) {
    const colorCount = Math.max(10, opts.actors.length);

    return {
      fillColors: AppColors.scale.custom(colorCount, 0.35), // Fill colors have opacity < 1
      lineColors: AppColors.scale.custom(colorCount, 1) // Fill colors have opacity=1
    }
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
    const yearLabels = opts.yearLabels;
    const debug = !!(opts && opts.debug);

    // Copy actors into wallets
    const wallets = actors
      .map((actor, i) => Object.assign({}, actor));

    // Init balance of active wallets
    const initialWallets = getActiveWallets(wallets, ev);
    const minBalance = initialWallets.length > 1 ? 0 : 100; // If only one wallet: force a minium, instead of zero
    initialWallets.forEach((wallet, i) => wallet.balance = Math.max(minBalance, 100 * i));

    // X axis = years
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
          if (debug && wallet.label) console.debug( " wallet #" + i  + " age=" + wallet.age + ' balance='+ Math.round(wallet.balance) + " alive=" + activeWallets.includes(wallet));
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
          ...getDatasetStyle(opts, i)
        };
      });
    }

    // X axis = actors (.e.g for 'pie' chart)
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
          ...getDatasetStyle(opts, i)
        };
      });
      if (opts.type === 'pie') {
        return datasets.reverse();
      }
      return datasets;
    }
  }

  function getDatasetStyle(opts, i){
    const duration = opts && opts.duration || DEFAULT_EV;
    const scaleColors = opts.scaleColors;
    const yearLabels = opts.yearLabels;
    // X axis = years
    if (yearLabels) {
      i = i || 0;
      const hasExchanges = opts && opts.exchanges && opts.exchanges.length > 0 || false;
      const manyWallets = opts && opts.N > 3;
      const fill = !(opts && opts.fill === false) && (opts && opts.fill === true || !(hasExchanges || manyWallets));
      const borderWidth = fill ? 2 : 4;
      const pointRadius = fill ? 2 : 0;
      const borderColor = fill ? scaleColors.fillColors[i] : scaleColors.lineColors[i];
      const backgroundColor = scaleColors.fillColors[i];
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
    // X axis = actors
    else {
      const noBorder = duration > 20;
      const actorsCount = opts.actors.length;
      const backgroundColor = scaleColors.fillColors.slice(0, actorsCount);
      const fill = !(opts && opts.fill === false);
      return {
        backgroundColor,
        fill,
        borderWidth: noBorder ? 0.25 : 1,
        pointRadius: 0
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
    const c = opts.c || 0.1
    const M = wallets
      .reduce((res, wallet) => res + (wallet.balance || 0), 0);
    if (N > 0) {
      const mOverN = Math.round(M / N);
      const DU = mOverN * c;
      if (debug) console.debug(' c=' + c + ' M=' + M + ' N=' + N + ' DU=' + DU);

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

  AppTrmCharts = {

    initialize,
    createData
  };

  return AppTrmCharts;

}));
