// Renders the leads inbox at /admin/leads/ from the `leads` Edge Function's list payload.
// No dependencies. Lead text is only ever set with textContent, never parsed as HTML.
//
//   window.TWTLeads.render(rootEl, payload, api)
//   api.update(id, { status, note })              -> Promise<{ lead } | { error }>
//   api.send(id, { business, kind, note })        -> Promise<{ lead } | { error }>

(function () {
  'use strict';

  var STATUS = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'];
  var STATUS_WORD = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost', spam: 'Spam' };
  var STATUS_TONE = { new: 'warn', contacted: '', qualified: 'good', won: 'good', lost: 'muted', spam: 'muted' };
  var OPEN = ['new', 'contacted', 'qualified'];
  var FORM_WORD = { readiness: 'Readiness check', guiding: 'Guide trip interest', contact: 'Contact form' };
  var PFG_KINDS = [['guide', 'Guide'], ['outfitter', 'Outfitter'], ['tackle', 'Tackle shop'], ['lodging', 'Lodging'], ['marina', 'Marina'], ['dealer', 'Dealer']];
  var PFG_LEADS = 'https://www.pocketfishinguide.com/admin/partners/leads?source=twt%3Awebsite';
  // Field order and labels for the detail view; empty fields are skipped.
  var FIELDS = [
    ['email', 'Email'], ['company', 'Company'], ['role', 'Role'], ['website', 'Website'], ['looking_for', 'Looking for'],
    ['message', 'Message'], ['pain_note', 'In their words'], ['score', 'Readiness score'], ['stage', 'Stage'], ['fit', 'Fit'],
    ['facts', 'About the business'], ['tools', 'Tools'], ['tools_other', 'Other tools'], ['stack_maturity', 'Stack'],
    ['hurts', 'Where it hurts'], ['impacts', 'What it costs'], ['ai_today', 'AI today'], ['kickoff', 'Wants to start'],
    ['slot', 'Preferred time'], ['page', 'Sent from'], ['utm', 'Campaign'],
  ];

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function formOf(l) {
    if (l.source === 'readiness') return 'readiness';
    return /^guiding/.test(l.stage || '') ? 'guiding' : 'contact';
  }
  function ago(iso, now) {
    var h = (now - Date.parse(iso)) / 3600000;
    if (h < 1) return 'just now';
    if (h < 24) return Math.round(h) + 'h ago';
    var d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
  function day(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function wk(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  function valueText(v) {
    if (Array.isArray(v)) return v.join(', ');
    if (v && typeof v === 'object') return Object.keys(v).map(function (k) { return k.replace(/_/g, ' ') + ': ' + v[k]; }).join(' · ');
    return String(v);
  }
  function empty(v) {
    return v == null || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  }
  function pill(status) {
    return el('span', { class: 'm-pill ' + (STATUS_TONE[status] || ''), text: STATUS_WORD[status] || status });
  }
  function table(head, rows) {
    var t = el('table');
    t.appendChild(el('thead', null, [el('tr', null, head.map(function (h) { return el('th', { text: h }); }))]));
    t.appendChild(el('tbody', null, rows.map(function (r) {
      return el('tr', null, r.map(function (c) { return el('td', { text: String(c) }); }));
    })));
    return el('details', { class: 'm-table' }, [el('summary', { text: 'Show as a table' }), el('div', { class: 'tw' }, [t])]);
  }

  // ------------------------------------------------------------ charts

  // Funnel: one bar per stage, with the share that made it from the stage before.
  function funnelCard(funnel) {
    var top = funnel[0].n || 1;
    var list = el('ol', { class: 'l-funnel' }, funnel.map(function (s, i) {
      var pct = Math.max(s.n ? 3 : 0, Math.round((s.n / top) * 100));
      var prev = i ? funnel[i - 1].n : null;
      var step = i && prev ? Math.round((s.n / prev) * 100) + '% of ' + funnel[i - 1].stage.toLowerCase() : '';
      return el('li', null, [
        el('span', { class: 'nm', text: s.stage }),
        el('span', { class: 'tr' }, [el('span', { class: 'fl', style: 'width:' + pct + '%' })]),
        el('span', { class: 'nv', text: String(s.n) }),
        el('span', { class: 'cv', text: step }),
      ]);
    }));
    return el('figure', { class: 'm-chart' }, [
      el('h3', { text: 'From first touch to won' }),
      el('p', { class: 'sub', text: 'Real leads only. A lead counts at every stage it has reached, even if it was later lost.' }),
      list,
      table(['Stage', 'Leads'], funnel.map(function (s) { return [s.stage, s.n]; })),
    ]);
  }

  // Weekly leads, stacked by which form they came from. The last week is in progress.
  function weeklyCard(weekly) {
    var keys = ['readiness', 'contact', 'guiding'];
    var box = el('div');
    var card = el('figure', { class: 'm-chart' }, [
      el('h3', { text: 'Leads per week, by form' }),
      el('p', { class: 'sub', text: 'Last 12 weeks, spam left out' }),
      el('ul', { class: 'l-legend' }, keys.map(function (k) {
        return el('li', null, [el('span', { class: 'sw s-' + k }), FORM_WORD[k]]);
      })),
      box,
      el('p', { class: 'm-note', text: 'The faded last week is still in progress.' }),
      table(['Week of', 'Readiness', 'Contact', 'Guide trips'], weekly.map(function (w) { return [w.week, w.readiness, w.contact, w.guiding]; })),
    ]);
    card._draw = function () {
      box.textContent = '';
      var w = Math.max(280, box.clientWidth || 520), h = 170, padL = 26, padR = 6, padT = 8, padB = 22;
      var totals = weekly.map(function (x) { return x.readiness + x.contact + x.guiding; });
      var max = Math.max(4, Math.max.apply(null, totals));
      var step = (w - padL - padR) / weekly.length;
      var bw = Math.max(4, Math.min(26, step - 6));
      var y = function (v) { return padT + (h - padT - padB) * (1 - v / max); };
      var s = svg('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img' });
      var g = svg('g', { class: 'grid' });
      [0, max / 2, max].forEach(function (v) {
        g.appendChild(svg('line', { x1: padL, x2: w - padR, y1: y(v), y2: y(v) }));
        var t = svg('text', { x: padL - 6, y: y(v) + 4, 'text-anchor': 'end' });
        t.textContent = String(Math.round(v));
        g.appendChild(t);
      });
      s.appendChild(g);
      var everyN = Math.ceil(weekly.length / Math.max(2, Math.floor((w - padL) / 64)));
      weekly.forEach(function (x, i) {
        var cx = padL + step * i + step / 2, base = 0;
        keys.forEach(function (k) {
          if (!x[k]) return;
          var r = svg('rect', { x: cx - bw / 2, y: y(base + x[k]), width: bw, height: y(base) - y(base + x[k]), class: 's-' + k + (i === weekly.length - 1 ? ' partial' : '') });
          var tt = svg('title', {});
          tt.textContent = 'Week of ' + wk(x.week) + ': ' + x[k] + ' ' + FORM_WORD[k].toLowerCase();
          r.appendChild(tt);
          s.appendChild(r);
          base += x[k];
        });
        if (i % everyN === 0 || i === weekly.length - 1) {
          var t = svg('text', { x: cx, y: h - 6, 'text-anchor': 'middle' });
          t.textContent = wk(x.week);
          s.appendChild(t);
        }
      });
      var total = totals.reduce(function (a, b) { return a + b; }, 0);
      s.setAttribute('aria-label', 'Leads per week by form, ' + weekly.length + ' weeks, ' + total + ' in total');
      box.appendChild(s);
    };
    return card;
  }

  function kpi(label, value, hint) {
    return el('div', { class: 'm-kpi' }, [el('span', { class: 'lbl', text: label }), el('span', { class: 'val', text: value }), el('span', { class: 'dlt', text: hint || '' })]);
  }
  function hours(h) {
    if (h == null) return '–';
    if (h < 1) return '<1h';
    return h < 48 ? Math.round(h) + 'h' : Math.round(h / 24) + 'd';
  }

  // ------------------------------------------------------------ one lead

  function leadCard(l, ctx) {
    var form = formOf(l);
    var title = l.name + (l.company ? ' · ' + l.company : '');
    var head = el('summary', { class: 'l-sum' }, [
      el('span', { class: 'l-who' }, [el('b', { text: title }), el('small', { text: FORM_WORD[form] + ' · ' + ago(l.created_at, ctx.now) + (l.sent_to_pfg_at ? ' · sent to PFG' : '') })]),
      pill(l.status),
    ]);
    var body = el('div', { class: 'l-body' });
    var card = el('details', { class: 'l-lead', id: 'lead-' + l.id }, [head, body]);

    var dl = el('dl', { class: 'l-fields' });
    dl.appendChild(el('dt', { text: 'Came in' }));
    dl.appendChild(el('dd', { text: day(l.created_at) }));
    FIELDS.forEach(function (f) {
      var v = l[f[0]];
      if (empty(v)) return;
      dl.appendChild(el('dt', { text: f[1] }));
      if (f[0] === 'email') {
        var subject = form === 'guiding' ? 'Your guide trip on the White' : 'Tale Waters and Tides';
        dl.appendChild(el('dd', null, [el('a', { href: 'mailto:' + v + '?subject=' + encodeURIComponent(subject), text: v })]));
      } else {
        dl.appendChild(el('dd', { text: valueText(v) }));
      }
    });
    body.appendChild(dl);

    // Status and a note in one save, so a call can be logged with its outcome.
    var msg = el('p', { class: 'm-msg', role: 'status' });
    var sel = el('select', { 'aria-label': 'Status' }, STATUS.map(function (s) {
      return el('option', { value: s, text: STATUS_WORD[s], selected: s === l.status });
    }));
    var note = el('textarea', { rows: '2', maxlength: '2000', placeholder: 'Note: what happened, what is next', 'aria-label': 'Note' });
    var save = el('button', { class: 'm-btn', type: 'submit', text: 'Save' });
    var upd = el('form', { class: 'l-act' }, [el('label', { class: 'l-lbl', text: 'Move to' }), sel, note, save]);
    upd.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = sel.value !== l.status ? sel.value : null;
      if (!status && !note.value.trim()) { msg.textContent = 'Pick a new status or write a note.'; return; }
      save.disabled = true; msg.textContent = 'Saving…';
      ctx.api.update(l.id, { status: status, note: note.value }).then(function (r) {
        save.disabled = false;
        if (r.error) { msg.textContent = r.error; return; }
        ctx.replace(r.lead, l.id);
      });
    });
    body.appendChild(upd);
    body.appendChild(msg);

    // Send to Pocket Fishing Guide partner Leads, for fishing businesses.
    if (l.sent_to_pfg_at) {
      body.appendChild(el('p', { class: 'l-sent' }, [
        'Sent to Pocket Fishing Guide partner Leads on ' + day(l.sent_to_pfg_at) + '. ',
        el('a', { href: PFG_LEADS, target: '_blank', rel: 'noopener', text: 'Open PFG Leads' }),
      ]));
    } else if (l.status !== 'spam') {
      var biz = el('input', { value: l.company || l.name, maxlength: '160', required: true, 'aria-label': 'Business name' });
      var kind = el('select', { required: true, 'aria-label': 'Kind of business' }, [el('option', { value: '', text: 'Kind of business', disabled: true, selected: true })].concat(
        PFG_KINDS.map(function (k) { return el('option', { value: k[0], text: k[1] }); })
      ));
      var why = el('input', { maxlength: '1000', placeholder: 'Note for the PFG lead (optional)', 'aria-label': 'Note for the PFG lead' });
      var go = el('button', { class: 'm-btn ghost', type: 'submit', text: 'Send to PFG Leads', disabled: !ctx.pfgConnected });
      var smsg = el('p', { class: 'm-msg', role: 'status', text: ctx.pfgConnected ? '' : 'Pocket Fishing Guide is not connected yet. See the setup steps in the PR.' });
      var send = el('form', { class: 'l-act' }, [el('label', { class: 'l-lbl', text: 'Fishing business?' }), biz, kind, why, go]);
      send.addEventListener('submit', function (e) {
        e.preventDefault();
        go.disabled = true; smsg.textContent = 'Sending…';
        ctx.api.send(l.id, { business: biz.value, kind: kind.value, note: why.value }).then(function (r) {
          go.disabled = false;
          if (r.error) { smsg.textContent = r.error; return; }
          ctx.replace(r.lead, l.id);
        });
      });
      body.appendChild(el('details', { class: 'l-fold' }, [
        el('summary', { text: 'Send to Pocket Fishing Guide partner Leads' }),
        el('p', { class: 'l-help', text: 'For a guide, outfitter, shop, lodge, marina or dealer. It lands in PFG Leads as source twt:website, ready to convert to a draft listing there. This lead moves to qualified.' }),
        send, smsg,
      ]));
    }

    // History: notes and every status change, oldest first.
    var hist = (l.events || []).map(function (e) {
      var what = e.kind === 'status' ? STATUS_WORD[e.from_status] + ' → ' + STATUS_WORD[e.to_status] : e.kind === 'sent_to_pfg' ? 'Sent to PFG' : 'Note';
      return el('li', null, [el('small', { text: day(e.created_at) + ' · ' + what }), e.note ? el('span', { text: e.note }) : null]);
    });
    if (hist.length) body.appendChild(el('div', null, [el('h4', { text: 'History' }), el('ul', { class: 'l-hist' }, hist)]));
    else if (l.notes) body.appendChild(el('div', null, [el('h4', { text: 'Notes' }), el('p', { class: 'l-notes', text: l.notes })]));
    return card;
  }

  // ------------------------------------------------------------ page

  function render(root, p, api) {
    var now = Date.now();
    var leads = p.leads.slice();
    var filter = { status: 'open', form: 'all', q: '' };
    var s = p.summary;
    root.querySelectorAll('[data-render]').forEach(function (n) { n.remove(); });
    var page = el('div', { class: 'l-page', 'data-render': '' });

    page.appendChild(el('header', { class: 'm-top' }, [
      el('div', null, [el('div', { class: 'm-eyebrow', text: 'Tale Waters and Tides · admin' }), el('h1', { class: 'm-title', text: 'Leads inbox' })]),
      el('nav', { class: 'l-nav', 'aria-label': 'Admin pages' }, [
        el('a', { href: '/admin/metrics/', text: 'Progress dashboard' }),
        el('a', { href: PFG_LEADS, target: '_blank', rel: 'noopener', text: 'PFG partner Leads' }),
      ]),
    ]));

    var story = el('ul', { class: 'm-story', 'aria-label': 'What the numbers say' }, s.story.map(function (t) { return el('li', { text: t }); }));
    var kpis = el('div', { class: 'm-kpis' }, [
      kpi('New, not yet worked', String(s.counts.new), s.waiting ? s.waiting + ' waiting over a day' : 'none waiting over a day'),
      kpi('Open', String(s.counts.new + s.counts.contacted + s.counts.qualified), 'new, contacted or qualified'),
      kpi('Median first contact', hours(s.first_contact_hours), 'from arrival to first move'),
      kpi('Won', String(s.counts.won), s.counts.lost + ' lost'),
    ]);
    page.appendChild(el('section', { class: 'm-head', 'aria-label': 'Summary' }, [story, kpis]));
    var weekly = weeklyCard(s.weekly);
    page.appendChild(el('div', { class: 'm-charts' }, [funnelCard(s.funnel), weekly]));

    // Filters: status chips with counts, a form picker and a search box.
    var chips = el('div', { class: 'm-switch l-chips', role: 'group', 'aria-label': 'Status' });
    var list = el('div', { class: 'l-list' });
    var count = function (st) {
      return leads.filter(function (l) { return st === 'all' ? true : st === 'open' ? OPEN.indexOf(l.status) >= 0 : l.status === st; }).length;
    };
    function drawChips() {
      chips.textContent = '';
      [['open', 'Open']].concat(STATUS.map(function (x) { return [x, STATUS_WORD[x]]; }), [['all', 'All']]).forEach(function (c) {
        var b = el('button', { type: 'button', 'aria-pressed': String(filter.status === c[0]), text: c[1] + ' ' + count(c[0]) });
        b.addEventListener('click', function () { filter.status = c[0]; drawChips(); drawList(); });
        chips.appendChild(b);
      });
    }
    var formSel = el('select', { 'aria-label': 'Form' }, [['all', 'Every form']].concat(Object.keys(FORM_WORD).map(function (k) { return [k, FORM_WORD[k]]; })).map(function (o) {
      return el('option', { value: o[0], text: o[1] });
    }));
    formSel.addEventListener('change', function () { filter.form = formSel.value; drawList(); });
    var search = el('input', { type: 'search', placeholder: 'Search name, email, company, message', 'aria-label': 'Search leads' });
    search.addEventListener('input', function () { filter.q = search.value.trim().toLowerCase(); drawList(); });

    var ctx = {
      now: now, api: api, pfgConnected: !!p.pfg_connected,
      replace: function (lead, id) {
        var i = leads.findIndex(function (x) { return x.id === id; });
        if (i < 0 || !lead) return;
        api.refresh().then(function (fresh) {
          if (fresh) return render(root, fresh, api);
          leads[i] = Object.assign({}, leads[i], lead);
          drawChips(); drawList(id);
        });
      },
    };

    function drawList(openId) {
      list.textContent = '';
      var shown = leads.filter(function (l) {
        if (filter.status === 'open' && OPEN.indexOf(l.status) < 0) return false;
        if (filter.status !== 'open' && filter.status !== 'all' && l.status !== filter.status) return false;
        if (filter.form !== 'all' && formOf(l) !== filter.form) return false;
        if (!filter.q) return true;
        return [l.name, l.email, l.company, l.message, l.looking_for, l.notes].join(' ').toLowerCase().indexOf(filter.q) >= 0;
      });
      if (!shown.length) list.appendChild(el('p', { class: 'm-msg', text: filter.status === 'open' ? 'Nothing open. New website leads land here.' : 'No leads match.' }));
      shown.forEach(function (l) {
        var c = leadCard(l, ctx);
        if (l.id === openId) c.open = true;
        list.appendChild(c);
      });
    }

    page.appendChild(el('section', { class: 'l-inbox', 'aria-labelledby': 'inbox-h' }, [
      el('h2', { id: 'inbox-h', text: 'Inbox' }),
      el('div', { class: 'l-filters' }, [chips, formSel, search]),
      list,
    ]));
    page.appendChild(el('p', { class: 'm-note', text: 'Updated ' + new Date(s.generated_at).toLocaleString('en-US') + '. Network and browser details are never shown here.' }));
    root.appendChild(page);

    drawChips();
    // A link from the alert email (#lead-<id>) opens that lead, whatever its status.
    var hashId = (location.hash.match(/^#lead-([0-9a-f-]{36})$/) || [])[1];
    if (hashId && leads.some(function (l) { return l.id === hashId; })) {
      filter.status = 'all';
      drawChips();
    }
    drawList(hashId);
    if (hashId) { var t = document.getElementById('lead-' + hashId); if (t) t.scrollIntoView({ block: 'start' }); }
    current = weekly;
    weekly._draw();
  }

  // One resize listener for the page; it redraws whichever chart the latest render made.
  var current = null, tm;
  window.addEventListener('resize', function () {
    clearTimeout(tm);
    tm = setTimeout(function () { if (current) current._draw(); }, 150);
  });

  window.TWTLeads = { render: render };
})();
