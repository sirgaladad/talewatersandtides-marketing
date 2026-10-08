// Home: 90-day plan tabs (owner / leader), door pre-selection, and the
// kickoff date that turns "Weeks 1–2" labels into real date ranges.
// Both plans are in the HTML so they stay crawlable; JS only toggles them.
(function () {
  'use strict';

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var kickoff = document.querySelector('[data-kickoff]');
  if (!tabs.length) return;

  function select(name, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () {
      select(t.dataset.tab);
      if (window.TWT) window.TWT.track('plan_toggle', { plan: t.dataset.tab });
    });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
    });
  });

  document.querySelectorAll('[data-plan]').forEach(function (door) {
    door.addEventListener('click', function () { select(door.dataset.plan); });
  });

  // Default kickoff: the Tuesday after next, as in the design.
  function defaultKickoff() {
    var d = new Date();
    d.setDate(d.getDate() + ((9 - d.getDay()) % 7 || 7) + 7);
    return d;
  }
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

  function redate() {
    if (!kickoff.value) return;
    document.querySelectorAll('.plan').forEach(function (plan) {
      var cursor = new Date(kickoff.value + 'T12:00:00');
      plan.querySelectorAll('.week').forEach(function (w) {
        var n = Number(w.dataset.weeks) || 2;
        var s = new Date(cursor);
        var e = new Date(cursor);
        e.setDate(e.getDate() + n * 7 - 1);
        cursor = new Date(e);
        cursor.setDate(cursor.getDate() + 1);
        w.querySelector('[data-when]').textContent = fmt(s) + ' – ' + fmt(e);
      });
    });
  }

  if (kickoff) {
    kickoff.value = iso(defaultKickoff());
    kickoff.addEventListener('change', redate);
    redate();
  }
  select('owner');
})();
