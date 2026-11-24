/* /neptune/ — entry page interactions. No dependencies.
   Every number drawn here also sits in the page's HTML tables, so the page reads
   the same with scripts off. Figures and their sources: README "Facts used on the site". */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- the name wink: PocketFish[In]Guide ---- */
  var wink = document.getElementById('np-in');
  if (wink) {
    wink.addEventListener('click', function () {
      var on = wink.getAttribute('aria-pressed') !== 'true';
      wink.setAttribute('aria-pressed', String(on));
      wink.setAttribute('aria-label', on ? 'In stands for Intelligence. Tap to shorten' : 'Show what the In stands for');
    });
  }

  /* ---- the loop: three tabs on a ring ---- */
  var tabs = [].slice.call(document.querySelectorAll('.np-node'));
  var run = document.getElementById('np-ring-run');
  // The gold arc covers one third of the ring and rotates to sit behind the selected node.
  var ANGLES = [-150, -30, 90];
  function selectTab(i, focus) {
    tabs.forEach(function (t, n) {
      var on = n === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (run) run.style.transform = 'rotate(' + ANGLES[i] + 'deg)';
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(i, false); });
    t.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); selectTab((i + 1) % tabs.length, true); }
      if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); selectTab((i + tabs.length - 1) % tabs.length, true); }
    });
  });

  /* ---- the tide chart ---- */
  var CHARTS = {
    built: {
      title: 'Changes merged per month, 2026',
      story: 'Two surges: June, when the app moved to accounts and a database, and October, when clubs, events and the partner program shipped. 562 changes in one month, by one person with AI.',
      rows: [['Feb', 65], ['Mar', 36], ['Apr', 10], ['May', 24], ['Jun', 327], ['Jul', 111], ['Aug', 11], ['Sep', 8], ['Oct', 562], ['Nov', 58]]
    },
    reached: {
      title: 'U.S. visitors per month, 2026',
      story: 'In-person outreach to guides and outfitters began on October 21. U.S. visitors went from 63 in September to 843 in the first 23 days of November.',
      rows: [['Sep', 63], ['Oct', 425], ['Nov 1 to 23', 843]]
    }
  };
  var chart = document.getElementById('np-chart');
  var chartTitle = document.getElementById('np-chart-title');
  var chartStory = document.getElementById('np-chart-story');
  var chartSeen = false;
  var current = 'built';

  function fmt(n) { return n.toLocaleString('en-US'); }

  function draw(key) {
    var c = CHARTS[key];
    if (!chart || !c) return;
    current = key;
    var max = Math.max.apply(null, c.rows.map(function (r) { return r[1]; }));
    chart.textContent = '';
    c.rows.forEach(function (r) {
      var bar = document.createElement('div');
      bar.className = 'np-bar' + (r[1] === max ? ' is-peak' : '');
      var v = document.createElement('span'); v.className = 'np-bar-v'; v.textContent = fmt(r[1]);
      var f = document.createElement('span'); f.className = 'np-bar-fill';
      f.setAttribute('data-h', String(Math.max(1.5, (r[1] / max) * 82)));
      var l = document.createElement('span'); l.className = 'np-bar-l'; l.textContent = r[0];
      bar.appendChild(v); bar.appendChild(f); bar.appendChild(l);
      chart.appendChild(bar);
    });
    if (chartTitle) chartTitle.textContent = c.title;
    if (chartStory) chartStory.textContent = c.story;
    if (chartSeen) grow();
  }
  function grow() {
    var fills = chart.querySelectorAll('.np-bar-fill');
    var set = function () { [].forEach.call(fills, function (f) { f.style.height = f.getAttribute('data-h') + '%'; }); };
    if (reduce) set(); else requestAnimationFrame(function () { requestAnimationFrame(set); });
  }
  [].forEach.call(document.querySelectorAll('.np-tog'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.np-tog'), function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      draw(b.getAttribute('data-chart'));
    });
  });
  draw(current);

  /* ---- flip cards ---- */
  [].forEach.call(document.querySelectorAll('.np-flip'), function (card) {
    card.addEventListener('click', function () {
      card.setAttribute('aria-pressed', String(card.getAttribute('aria-pressed') !== 'true'));
    });
  });

  /* ---- printing: the page doubles as the entry PDF, so open the tables first ---- */
  window.addEventListener('beforeprint', function () {
    [].forEach.call(document.querySelectorAll('details.np-table'), function (d) { d.open = true; });
  });

  /* ---- reveal on scroll: chart bars and the 2018 / 2019 wait bars ---- */
  var waits = document.getElementById('np-waits');
  function showWaits() {
    [].forEach.call(waits.querySelectorAll('i[data-w]'), function (i) { i.style.width = i.getAttribute('data-w') + '%'; });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target === chart) { chartSeen = true; grow(); }
        if (e.target === waits) showWaits();
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    if (chart) io.observe(chart);
    if (waits) io.observe(waits);
  } else {
    chartSeen = true; if (chart) grow();
    if (waits) showWaits();
  }
})();
