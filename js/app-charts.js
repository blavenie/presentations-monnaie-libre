(function( root, factory ) {
  if( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( function() {
      root.AppCharts = factory();
      return root.AppCharts;
    } );
  } else if( typeof exports === 'object' ) {
    // Node. Does not work with strict CommonJS.
    module.exports = factory();
  } else {
    // Browser globals.
    root.AppCharts = factory();
  }
}( this, function() {

  'use strict';

  var AppCharts;

  const defaultChartOptions = {
    responsive: true,
    tooltips: {
      enabled: false
    }
  }

  const namedActors = [
    {
      label: 'Marcel',
      birthday: 0,
      balance: 50
    },
    {
      label: 'Sophie',
      birthday: 0,
      balance: 210
    },
    {
      label: 'Fanny',
      birthday: 0,
      balance: 370
    }
  ];
  const allActors = [
    {
      label: 'Marcel',
      birthday: -70,
      balance: 50
    },
    {
      label: 'Sophie',
      birthday: -60,
      balance: 210
    },
    {
      label: 'Fanny',
      birthday: -50,
      balance: 370
    }
  ]
  .concat([-40,-30,-20,-10,0,10,20,30,40,50,60,70,80,90,100,110,120].map(birthday => ({birthday, label: '', balance: 0})));

  const scaleFillColors = AppColors.scale.custom(10, 0.35);
  const scaleLineColors = AppColors.scale.custom(10, 1);

  function trm(opts) {
    const name = opts && opts.name || '';
    const type = opts && opts.type || 'line';
    const startYear = opts && opts.startYear || 1;
    const duration = opts && opts.duration || 80;
    const endYear = opts && opts.endYear || (startYear + duration);
    const actors = opts && opts.actors || namedActors;
    const walletCount = opts && opts.walletCount || actors.length;
    const relative = opts && opts.relative === false ? false : true;
    const yearLabels = opts && opts.yearLabels === false ? false : true;
    const exchanges = opts && opts.exchanges || [];

    opts = {
      type,
      startYear,
      endYear,
      actors,
      walletCount,
      relative,
      yearLabels,
      exchanges,
      ...opts
    }


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
        color: 'white'
      }
    };
    if (name) console.debug('[app-chart] Generating chart data \'' + name + '\' [OK]', result);

    return result;
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

    const actors = opts && opts.actors || namedActors;
    const walletCount = opts && opts.walletCount || actors.length;
    return actors
      .filter((actor, i) => i < walletCount)
      .map(actor => actor.label);
  }

  function getDataSets(opts, i) {
    let startYear = opts && opts.startYear;
    let endYear = opts && opts.endYear;
    const nbYears = endYear - startYear;
    const actors = opts && opts.actors || namedActors;
    const walletCount = opts && opts.walletCount || actors.length;
    const relative = opts && opts.relative === false ? false : true;
    const yearLabels = opts && opts.yearLabels === false ? false : true;

    // Copy actors into wallets
    const wallets = actors
      .filter((actor, i) => i < walletCount)
      .map((actor, i) => Object.assign({}, actor));

    let du = relative ? previousDu(wallets) : undefined;
    if (yearLabels) {
      // Init dataset
      const balancesByWallet = [];
      for (let i = 0; i < wallets.length; i++) {
        balancesByWallet.push([])
      }
      for (let yearIndex = 0; yearIndex < nbYears; yearIndex++) {
        // Save balance to datasets
        for (let i = 0; i < wallets.length; i++) {
          const balance = relative ? wallets[i].balance / du : wallets[i].balance;
          balancesByWallet[i].push(balance);
        }
        // Compute then add the dividend
        du = dividends(wallets, yearIndex) || du;

        // Make exchanges
        makeExchanges(wallets, yearIndex, opts);
      }
      return wallets.map((wallet, i) => {
        return {
          data: balancesByWallet[i],
          label: wallet.label,
          ...getSerieDefault(opts, i)
        };
      });
    }
    else {
      // Init dataset
      const balancesByYear = [];
      for (let yearIndex = 0; yearIndex < nbYears; yearIndex++) {
        balancesByYear.push([])
      }
      for (let yearIndex = 0; yearIndex < nbYears; yearIndex++) {
        // Save balance to datasets
        for (let i = 0; i < wallets.length; i++) {
          const balance = relative ? wallets[i].balance / du : wallets[i].balance;
          balancesByYear[yearIndex].push(balance);
        }
        // Compute then add the dividend
        du = dividends(wallets, yearIndex) || du;
      }
      return balancesByYear.map((balances, i) => {
        const label = startYear + i;
        return {
          data: balances,
          label,
          ...getSerieDefault(opts, i)
        };
      }).reverse();
    }
  }

  function getSerieDefault(opts, i){
    const type = opts && opts.type || 'line';
    if (type === 'pie') {
      const noBorder = opts.duration && opts.duration > 20;
      const backgroundColor = scaleFillColors.slice(0, opts.walletCount);
      return {
        backgroundColor,
        fill: false,
        borderWidth: noBorder ? 0.25 : 1,
        pointRadius: 0
      };
    }
    else {
      i = i || 0;
      const hasExchanges = opts && opts.exchanges && opts.exchanges.length > 0 || false;
      const manyWallets = opts && opts.walletCount > 3;
      const fill = hasExchanges || manyWallets ? false : true;
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

  function filterAlives(wallets, yearIndex){
    return (wallets || [])
      .filter(wallet => {
        const age = yearIndex - wallet.birthday;
        return age >= 0 && age < 80;
      });
  }

  function previousDu(wallets, yearIndex) {
    yearIndex = yearIndex || 0;
    const activeWallets = filterAlives(wallets, yearIndex);
    const M = activeWallets
      .reduce((res, wallet) => res + (wallet.balance || 0), 0);
    const N = activeWallets.length;
    if (N <= 0) {
      throw new Error('Cannot compute the DU!');
    }
    const previousM = M / 1.1;
    const mOverN = previousM / N;
    const previousDu = mOverN * 0.1;
    //console.debug('Previous DU = ' + previousDu);
    return previousDu;
  }

  function dividends(wallets, yearIndex) {
    const activeWallets = filterAlives(wallets, yearIndex);

    if (yearIndex > 80) {
      console.debug('Wallet for age : ' + yearIndex, activeWallets);
    }
    const M = activeWallets
      .reduce((res, wallet) => res + (wallet.balance || 0), 0);
    const N = activeWallets.length;
    if (N > 0) {
      const mOverN = M / N;
      const du = mOverN * 0.1;

      activeWallets.forEach(wallet => {
        wallet.balance += du;
      });

      return du;
    }
    return undefined;
  }

  function makeExchanges(wallets, yearIndex, opts) {
    const activeWallets = filterAlives(wallets, yearIndex);

    const exchanges = opts && opts.exchanges || [];
    if (exchanges.length > 0 && yearIndex == 20) {
      console.debug('[app-charts] TODO: check exchanges');
      if (exchanges.includes(yearIndex) && activeWallets.length > 1) {
        const fromWallet = activeWallets[2];
        const toWallet = activeWallets[0];
        console.debug('[app-charts] Make an exchange from \'' + fromWallet.label + '\' to \'' + toWallet.label + '\'');
        const amount = fromWallet.balance / 2;
        toWallet.balance += amount;
        fromWallet.balance -= amount;
      }
    }
  }

  function demo() {
    return {
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

  AppCharts = {
    demo,

    // TRM A1
    trmA1_1: (opts) => trm({relative: false, walletCount: 3, ...opts}),
    trmA1_2: (opts) => trm({relative: false, walletCount: 3, duration: 10, ...opts}),
    trmA1_3: (opts) => trm({relative: true, walletCount: 3, duration: 80, ...opts}),
    trmA1_3_2: (opts) => trm({relative: true,  walletCount: 3, duration: 160, ...opts}),
    trmA1_4: (opts) => trm({type: 'pie', relative: true,  walletCount: 3, duration: 10, yearLabels: false, ...opts}),
    trmA1_5: (opts) => trm({type: 'pie', relative: true,  walletCount: 3, duration: 80, yearLabels: false, ...opts}),

    // TRM B1
    trmB1_1: (opts) => trm({relative: false, walletCount: 3, exchanges: [20, 60], ...opts}),
    trmB1_2: (opts) => trm({relative: true, walletCount: 3, exchanges: [20, 60], ...opts}),

    trmC1_1: (opts) => trm({relative: false, walletCount: 20, duration: 160, actors: allActors, ...opts}),
    trmC1_2: (opts) => trm({relative: true, walletCount: 20, duration: 160, actors: allActors, ...opts}),

  };

  return AppCharts;

}));
