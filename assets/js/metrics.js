// Renders the progress dashboard payload from the `metrics` Edge Function.
// Shared by /admin/metrics/ and /partners/progress/. No dependencies: charts are
// inline SVG sized to their container, with a hover crosshair and a table view.
//
//   window.TWTMetrics.render(rootEl, payload)

(function () {
  'use strict';

  var SERIES = {
    visitors: { pfg: ['Visitors per week', 'Unique visitors to pocketfishinguide.com'], twt: ['Sessions per week', 'Google Analytics sessions on talewatersandtides.com'], kind: 'line' },
    pageviews: { title: 'Pageviews per week', sub: 'Pages viewed on pocketfishinguide.com', kind: 'line' },
    signups: { title: 'New angler accounts per week', sub: 'Accounts created in Pocket Fishing Guide', kind: 'bar' },
    leads: { title: 'Leads per week', sub: 'Contact form and readiness check, spam excluded', kind: 'bar' },
    search_clicks: { title: 'Google search clicks per week', sub: 'Search Console', kind: 'line' },
  };
  var BREAKDOWNS = {
    referrers: ['Where visitors come from', 'Visitors by referring site, last 30 days or the window shown'],
    channels: ['Where sessions come from', 'Google Analytics default channel groups'],
    lead_sources: ['Which channel brought each lead', 'From the UTM tag or referrer captured on the form'],
    lead_pages: ['Which page each lead came from', 'Where the form was sent from'],
  };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function fmt(n) { return n == null ? '–' : Number(n).toLocaleString('en-US'); }
  function wk(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var m = [1, 2, 2.5, 5, 10].find(function (s) { return s * p >= v; });
    return m * p;
  }

  // One weekly series. The last point is the week in progress and is drawn faded.
  function weeklyChart(box, points, kind, unit) {
    var w = Math.max(280, box.clientWidth || 520);
    var h = 190, padL = 34, padR = 10, padT = 10, padB = 24;
    var max = niceMax(Math.max.apply(null, points.map(function (p) { return p.value; })) || 1);
    var step = (w - padL - padR) / points.length;
    var x = function (i) { return padL + step * i + step / 2; };
    var y = function (v) { return padT + (h - padT - padB) * (1 - v / max); };
    var s = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img' });

    var grid = svg('g', { class: 'grid' });
    [0, 0.5, 1].forEach(function (f) {
      var v = max * f;
      grid.appendChild(svg('line', { x1: padL, x2: w - padR, y1: y(v), y2: y(v) }));
      var t = svg('text', { x: padL - 6, y: y(v) + 4, 'text-anchor': 'end' });
      t.textContent = fmt(Math.round(v));
      grid.appendChild(t);
    });
    s.appendChild(grid);

    var everyN = Math.ceil(points.length / Math.max(2, Math.floor((w - padL) / 70)));
    points.forEach(function (p, i) {
      if (i % everyN !== 0 && i !== points.length - 1) return;
      var t = svg('text', { x: x(i), y: h - 6, 'text-anchor': 'middle' });
      t.textContent = wk(p.week);
      s.appendChild(t);
    });

    var last = points.length - 1;
    if (kind === 'bar') {
      var bw = Math.max(4, Math.min(28, step - 6));
      points.forEach(function (p, i) {
        if (!p.value) return;
        var top = y(p.value), base = y(0);
        var r = Math.min(4, bw / 2, base - top);
        var d = 'M' + (x(i) - bw / 2) + ',' + base + 'V' + (top + r) + 'q0,-' + r + ' ' + r + ',-' + r +
          'H' + (x(i) + bw / 2 - r) + 'q' + r + ',0 ' + r + ',' + r + 'V' + base + 'Z';
        s.appendChild(svg('path', { d: d, class: 'bar' + (i === last ? ' partial' : '') }));
      });
    } else {
      var full = points.slice(0, last);
      var line = full.map(function (p, i) { return (i ? 'L' : 'M') + x(i) + ',' + y(p.value); }).join('');
      if (full.length) {
        s.appendChild(svg('path', { d: line + 'L' + x(full.length - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z', class: 'area' }));
        s.appendChild(svg('path', { d: line, class: 'line' }));
        s.appendChild(svg('path', { d: 'M' + x(last - 1) + ',' + y(points[last - 1].value) + 'L' + x(last) + ',' + y(points[last].value), class: 'line partial' }));
        s.appendChild(svg('circle', { cx: x(last - 1), cy: y(points[last - 1].value), r: 4, class: 'dot' }));
      }
    }

    // Hover layer: a crosshair and tooltip per week, with targets wider than the marks.
    var hair = svg('line', { y1: padT, y2: h - padB, class: 'xhair', visibility: 'hidden' });
    s.appendChild(hair);
    var tip = el('div', { class: 'm-tip', hidden: '' });
    points.forEach(function (p, i) {
      var r = svg('rect', { x: padL + step * i, y: 0, width: step, height: h, class: 'hit' });
      var show = function () {
        hair.setAttribute('x1', x(i)); hair.setAttribute('x2', x(i)); hair.setAttribute('visibility', 'visible');
        tip.textContent = 'Week of ' + wk(p.week) + ': ' + fmt(p.value) + ' ' + unit + (i === last ? ' (so far)' : '');
        var scale = box.clientWidth / w;
        tip.style.left = Math.min(Math.max(x(i) * scale, 70), box.clientWidth - 70) + 'px';
        tip.style.top = (y(p.value) * scale + 40) + 'px';
        tip.hidden = false;
      };
      r.addEventListener('mouseenter', show);
      r.addEventListener('touchstart', show, { passive: true });
      r.addEventListener('mouseleave', function () { hair.setAttribute('visibility', 'hidden'); tip.hidden = true; });
      s.appendChild(r);
    });
    var total = points.reduce(function (a, p) { return a + p.value; }, 0);
    s.setAttribute('aria-label', unit + ' per week, ' + points.length + ' weeks, ' + fmt(total) + ' in total');
    return [s, tip];
  }

  function table(head, rows) {
    var t = el('table');
    t.appendChild(el('thead', null, [el('tr', null, head.map(function (h) { return el('th', { text: h }); }))]));
    t.appendChild(el('tbody', null, rows.map(function (r) {
      return el('tr', null, r.map(function (c) { return el('td', { text: String(c) }); }));
    })));
    return el('details', { class: 'm-table' }, [el('summary', { text: 'Show as a table' }), el('div', { class: 'tw' }, [t])]);
  }

  function seriesCard(bizKey, key, points) {
    var cfg = SERIES[key] || { title: key, sub: '', kind: 'line' };
    var title = cfg[bizKey] ? cfg[bizKey][0] : cfg.title;
    var sub = cfg[bizKey] ? cfg[bizKey][1] : cfg.sub;
    var unit = key === 'pageviews' ? 'pageviews' : key === 'leads' ? 'leads' : key === 'signups' ? 'accounts' : key === 'search_clicks' ? 'clicks' : bizKey === 'twt' ? 'sessions' : 'visitors';
    var card = el('figure', { class: 'm-chart' }, [el('h3', { text: title }), el('p', { class: 'sub', text: sub })]);
    var box = el('div');
    card.appendChild(box);
    var draw = function () {
      box.textContent = '';
      weeklyChart(box, points, cfg.kind, unit).forEach(function (n) { box.appendChild(n); });
    };
    card.appendChild(el('p', { class: 'm-note', text: 'The faded last week is still in progress.' }));
    card.appendChild(table(['Week of', unit], points.map(function (p) { return [p.week, p.value]; })));
    card._draw = draw;
    return card;
  }

  function breakdownCard(key, items) {
    var cfg = BREAKDOWNS[key] || [key, ''];
    var top = items.slice(0, 7);
    var max = Math.max.apply(null, top.map(function (i) { return i.value; })) || 1;
    var list = el('ul', { class: 'm-bars' }, top.map(function (i) {
      var pct = Math.max(2, Math.round((i.value / max) * 100));
      return el('li', null, [
        el('span', { class: 'nm', text: i.name, title: i.name }),
        el('span', { class: 'tr' }, [el('span', { class: 'fl', style: 'width:' + pct + '%' })]),
        el('span', { class: 'nv', text: fmt(i.value) }),
      ]);
    }));
    return el('figure', { class: 'm-chart' }, [
      el('h3', { text: cfg[0] }), el('p', { class: 'sub', text: cfg[1] }), list,
      table(['Source', 'Count'], items.map(function (i) { return [i.name, i.value]; })),
    ]);
  }

  function kpiTile(k) {
    var d = el('span', { class: 'dlt' });
    if (k.prev != null && k.value != null) {
      if (k.prev > 0) {
        var pct = Math.round(((k.value - k.prev) / k.prev) * 100);
        d.textContent = pct >= 200
          ? Math.round(k.value / k.prev) + ' times the 4 weeks before'
          : (pct >= 0 ? '+' : '') + pct + '% vs the 4 weeks before';
        d.className = 'dlt ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : '');
      } else {
        d.textContent = 'none in the 4 weeks before';
      }
    } else if (k.hint) {
      d.textContent = k.hint;
    }
    return el('div', { class: 'm-kpi' }, [el('span', { class: 'lbl', text: k.label }), el('span', { class: 'val', text: fmt(k.value) }), d]);
  }

  function business(bizKey, b) {
    var sec = el('section', { class: 'm-biz', id: 'biz-' + bizKey, 'aria-labelledby': 'h-' + bizKey });
    sec.appendChild(el('h2', { id: 'h-' + bizKey, text: b.name }));
    var story = el('ul', { class: 'm-story', 'aria-label': 'What the numbers say' }, b.story.map(function (s) {
      return el('li', { text: s, class: /not connected|failed to load/.test(s) ? 'gap' : '' });
    }));
    if (!b.story.length) story.appendChild(el('li', { class: 'gap', text: 'No data has loaded for this business yet.' }));
    sec.appendChild(el('div', { class: 'm-head' }, [story, el('div', { class: 'm-kpis' }, b.kpis.map(kpiTile))]));
    var charts = el('div', { class: 'm-charts' });
    var drawn = [];
    ['visitors', 'pageviews', 'signups', 'leads', 'search_clicks'].forEach(function (k) {
      if (!b.series[k]) return;
      var c = seriesCard(bizKey, k, b.series[k]);
      drawn.push(c);
      charts.appendChild(c);
    });
    ['referrers', 'channels', 'lead_pages', 'lead_sources'].forEach(function (k) {
      if (b.breakdowns[k] && b.breakdowns[k].length) charts.appendChild(breakdownCard(k, b.breakdowns[k]));
    });
    if (charts.children.length) sec.appendChild(charts);
    sec._charts = drawn;
    return sec;
  }

  var SOURCE_NAMES = {
    pfg_web: 'PFG traffic (Vercel)',
    pfg_app: 'PFG accounts and bookings',
    twt_leads: 'TWT leads',
    google: 'Google Analytics (TWT)',
    search: 'Google Search Console',
  };

  function render(root, p) {
    root.textContent = '';
    var gen = new Date(p.generated_at);
    var top = el('header', { class: 'm-top' }, [
      el('div', null, [
        el('div', { class: 'm-eyebrow', text: p.scope === 'partner' ? 'Partner progress report' : 'Tale Waters and Tides · admin' }),
        el('h1', { class: 'm-title', text: 'Progress across both businesses' }),
      ]),
      el('div', { class: 'm-meta' }, [
        el('span', { text: 'Weeks of ' + wk(p.range.since) + ' to ' + wk(p.range.until) }),
        el('span', { text: 'Updated ' + gen.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) }),
      ]),
    ]);
    root.appendChild(top);
    if (p.sample) {
      root.appendChild(el('p', { class: 'm-banner', text: 'Sample data. These numbers are made up to show the layout; sign in for the real figures.' }));
    }

    var sw = el('div', { class: 'm-switch', role: 'group', 'aria-label': 'Show business' });
    var secs = { pfg: business('pfg', p.businesses.pfg), twt: business('twt', p.businesses.twt) };
    [['both', 'Both'], ['pfg', 'Pocket Fishing Guide'], ['twt', 'Tale Waters and Tides']].forEach(function (o) {
      var b = el('button', { type: 'button', 'aria-pressed': o[0] === 'both' ? 'true' : 'false', text: o[1] });
      b.addEventListener('click', function () {
        sw.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        secs.pfg.hidden = o[0] === 'twt';
        secs.twt.hidden = o[0] === 'pfg';
        drawAll();
      });
      sw.appendChild(b);
    });
    root.appendChild(sw);
    root.appendChild(secs.pfg);
    root.appendChild(secs.twt);

    var src = el('div', { class: 'm-sources' }, [el('span', { text: 'Sources:' })]);
    Object.keys(p.sources).forEach(function (k) {
      var st = p.sources[k].status;
      src.appendChild(el('span', {
        class: 'm-pill ' + (st === 'ok' ? 'good' : st === 'error' ? 'bad' : 'muted'),
        text: (SOURCE_NAMES[k] || k) + (st === 'ok' ? '' : st === 'error' ? ': failed' : ': not connected'),
      }));
    });
    root.appendChild(src);

    function drawAll() {
      [secs.pfg, secs.twt].forEach(function (s) { if (!s.hidden) s._charts.forEach(function (c) { c._draw(); }); });
    }
    drawAll();
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(drawAll, 150); });
  }

  window.TWTMetrics = { render: render };
})();
