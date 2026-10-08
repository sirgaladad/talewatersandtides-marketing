// /readiness/ — one-page intake with a real site scan, a deliberately
// "elusive" reading that sharpens as answers land, and a result page with a
// dated plan. Score and stage stay hidden until the visitor gives an email.
// Scoring weights and stage thresholds are a first pass; tune them here.
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  };

  // ---------- option sets (must match supabase/functions/intake/scan.ts) ----------
  var FACTS = [
    ['industry', 'Industry', ['Clinic / practice', 'Salon / studio', 'Trades / field service', 'Professional services', 'Retail / hospitality', 'Agency / marketing team']],
    ['size', 'Team size', ['1–4', '5–15', '16–50', '50+']],
    ['locations', 'Locations', ['1', '2–3', '4+']],
    ['crm', 'Customer records', ['CRM', 'Booking software', 'Spreadsheets', 'Unclear']],
  ];
  var TOOLCATS = [
    ['Office', ['Google Workspace', 'Microsoft 365']],
    ['Customers', ['HubSpot / Salesforce / Zoho', 'Booking or practice software', 'Spreadsheets as the CRM']],
    ['Marketing', ['Mailchimp / Klaviyo / Constant Contact', 'Social scheduler', 'Website builder (Wix, Squarespace, WordPress)']],
    ['Money', ['QuickBooks / Xero', 'Square / Toast / Shopify']],
    ['Team', ['Slack / Teams', 'Project tool (Asana, Trello, Monday)']],
    ['AI', ['ChatGPT / Claude / Copilot seats', 'AI inside a tool we already use']],
  ];
  var LEAKS = [['inquiries', 'Answering inquiries'], ['followup', 'Follow-up and reminders'], ['scheduling', 'Scheduling'], ['writing', 'Proposals, posts, emails'], ['reporting', 'Reporting and admin'], ['hiring', 'Hiring and onboarding']];
  var IMPACTS = [['hours', 'Team hours'], ['leads', 'Missed leads'], ['cash', 'Slow cash / late invoices'], ['churn', 'Customers slipping'], ['quality', 'Mistakes and rework'], ['morale', 'Burnout'], ['growth', "Can't take on more"]];
  var AI = [['none', 'Nobody', 0], ['solo', 'A few people, on their own', 1], ['norules', 'Several of us, no shared rules', 2], ['shared', 'Yes, with a shared approach', 4]];
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  var S = {
    url: '', scanState: 'idle', scan: null, facts: {}, tools: [], toolsOther: '', leaks: [], impacts: [], pain: '',
    ai: null, name: '', email: '', role: 'owner', startDate: '', slot: 'Tuesday 9:00', optional: {}, sent: null,
    captured: null, submitting: false,
  };
  var form = $('[data-rc-form]');
  if (!form) return;

  var nameOf = function (list, k) { var f = list.find(function (x) { return x[0] === k; }); return f ? f[1] : ''; };
  var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var domainOf = function (u) { return u.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase(); };

  // ---------- derived model (pure; mirrors the design's logic) ----------
  function model() {
    var facts = S.facts;
    var toolsAll = S.tools.concat(S.toolsOther.trim() ? [S.toolsOther.trim()] : []);
    var has = function (re) { return S.tools.some(function (t) { return re.test(t); }); };
    var toolMaturity = (has(/^HubSpot/) ? 2 : has(/^Booking/) ? 1.5 : 0) + (has(/^Mailchimp|^Social/) ? 0.5 : 0) + (has(/^AI inside|^ChatGPT/) ? 1 : 0) + (has(/^Slack|^Project/) ? 0.5 : 0);
    var emailOk = EMAIL_RE.test(S.email.trim());
    var scanned = S.scanState === 'done' || S.scanState === 'manual';
    var have = { site: scanned, tools: toolsAll.length > 0, leaks: S.leaks.length > 0, ai: S.ai != null, contact: emailOk && S.name.trim().length > 1 };
    var filled = Object.keys(have).filter(function (k) { return have[k]; }).length;
    var depth = (S.impacts.length ? 1 : 0) + (S.pain.trim().length > 15 ? 1 : 0);

    var aiScore = (AI.find(function (a) { return a[0] === S.ai; }) || [0, 0, 0])[2];
    var dataScore = facts.crm === 'CRM' ? 4 : facts.crm === 'Booking software' ? 3 : facts.crm === 'Spreadsheets' ? 2 : 1;
    var toolScore = Math.min(4, toolMaturity);
    var sizeScore = { '1–4': 1, '5–15': 2, '16–50': 3, '50+': 3 }[facts.size] || 2;
    var d = {
      people: (sizeScore / 4) * 0.6 + (S.role === 'leader' ? 0.4 : S.role === 'owner' ? 0.3 : 0.15),
      data: dataScore / 4, adoption: aiScore / 4, stack: toolScore / 4,
    };
    var total = Math.round(d.people * 25 + d.data * 25 + d.adoption * 30 + d.stack * 20);
    var stage =
      total < 25 ? { name: 'Aware', headline: 'You know it matters. Nothing runs yet.', body: 'The right place to start. One workflow, one owner, written rules before AI touches a customer.' }
      : total < 50 ? { name: 'Exploring', headline: 'People are trying things. Nobody owns it.', body: 'The risk now is drift: three tools, no rules, no one accountable. We name an owner and pick two workflows.' }
      : total < 75 ? { name: 'Piloting', headline: 'Something works. It depends on one person.', body: 'We make it survive without them: runbook, approval gate, a second trained person, then a second workflow.' }
      : { name: 'Operating', headline: 'It runs. Time to make it compound.', body: 'Fractional lead territory: extend to the next use cases, clean the data that blocks them, report numbers upward.' };
    var isLeader = S.role === 'leader' || facts.size === '50+' || (facts.size === '16–50' && total >= 50);
    var buildIn = S.tools.find(function (t) { return /^HubSpot|^Booking/.test(t); }) || S.tools.find(function (t) { return /^Google|^Microsoft/.test(t); }) || S.toolsOther.trim() || 'your current tools';
    return { toolsAll: toolsAll, toolScore: toolScore, emailOk: emailOk, scanned: scanned, have: have, filled: filled, depth: depth, aiScore: aiScore, d: d, total: total, stage: stage, isLeader: isLeader, buildIn: buildIn };
  }

  // ---------- page 1 render ----------
  function chip(label, on, onClick, extra) {
    var b = el('button', { type: 'button', class: 'chip' + (extra ? ' ' + extra : ''), 'aria-pressed': String(on) }, label);
    b.addEventListener('click', onClick);
    return b;
  }
  function toggle(key, v, max) {
    var arr = S[key];
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1);
    else if (!max || arr.length < max) arr.push(v);
    render();
  }

  function renderFacts() {
    var box = $('[data-facts]');
    box.textContent = '';
    FACTS.forEach(function (f) {
      var g = el('div', { class: 'rc-fact', role: 'group', 'aria-label': f[1] });
      g.appendChild(el('div', { class: 'rc-fact-k' }, f[1]));
      var row = el('div', { class: 'chips chips-xs' });
      f[2].forEach(function (o) {
        row.appendChild(chip(o, S.facts[f[0]] === o, function () { S.facts[f[0]] = o; render(); }));
      });
      g.appendChild(row);
      box.appendChild(g);
    });
  }

  function renderStatic() {
    var tools = $('[data-tools]');
    TOOLCATS.forEach(function (c) {
      var g = el('div', { class: 'rc-toolcat', role: 'group', 'aria-label': c[0] });
      g.appendChild(el('div', { class: 'label' }, c[0]));
      c[1].forEach(function (t) {
        var lab = el('label', { class: 'rc-check' });
        var cb = el('input', { type: 'checkbox', value: t });
        cb.addEventListener('change', function () { toggle('tools', t); });
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(t));
        g.appendChild(lab);
      });
      tools.appendChild(g);
    });
  }

  function renderChips() {
    var leaks = $('[data-leaks]'); leaks.textContent = '';
    LEAKS.forEach(function (l) {
      var on = S.leaks.indexOf(l[0]) >= 0;
      leaks.appendChild(chip(l[1], on, function () { toggle('leaks', l[0], 2); }, !on && S.leaks.length >= 2 ? 'chip-dim' : ''));
    });
    var imp = $('[data-impacts]'); imp.textContent = '';
    IMPACTS.forEach(function (l) { imp.appendChild(chip(l[1], S.impacts.indexOf(l[0]) >= 0, function () { toggle('impacts', l[0]); })); });
    var ai = $('[data-ai]'); ai.textContent = '';
    AI.forEach(function (a) { ai.appendChild(chip(a[1], S.ai === a[0], function () { S.ai = a[0]; render(); })); });
  }

  var PATHS = ['M0 60 C50 60 100 60 150 60 S250 60 300 60', 'M0 62 C50 58 100 66 150 58 S250 66 300 56', 'M0 66 C50 50 100 72 150 50 S250 70 300 46', 'M0 70 C50 42 100 76 150 40 S250 72 300 36', 'M0 74 C50 34 100 80 150 30 S250 76 300 24', 'M0 78 C50 26 100 84 150 20 S250 80 300 14'];
  var LABELS = ['Faint', 'Faint', 'Forming', 'Forming', 'Clear', 'Locked in'];
  var HINTS = ['Paste your site to start the reading.', 'Each answer sharpens the line.', 'Two more and the pattern shows.', 'Almost there. Add where to send it.', 'Add your email to unlock the stage and plan.', 'Everything needed. Get the reading.'];

  function renderReading(m) {
    var f = m.filled;
    $('[data-signal-label]').textContent = LABELS[f];
    $('[data-signal-hint]').textContent = HINTS[f];
    $('[data-signal-line]').setAttribute('d', PATHS[f]);
    $('[data-signal-fill]').setAttribute('d', PATHS[f] + ' V90 H0 Z');
    $('[data-signal-line]').style.opacity = String(0.35 + f * 0.13);
    $('[data-signal-fill]').style.opacity = String(0.35 + f * 0.13);
    Array.prototype.forEach.call($('[data-bars]').children, function (b, i) { b.classList.toggle('on', i < f); });

    var facts = S.facts;
    var leak = nameOf(LEAKS, S.leaks[0]);
    var impactText = S.impacts.slice(0, 2).map(function (k) { return nameOf(IMPACTS, k); }).join(' and ').toLowerCase();
    var lock = function (label, text) { return { label: label, text: text, open: false }; };
    var open = function (label, text, strong) { return { label: label, text: text, open: true, strong: !!strong }; };
    var items = [
      m.have.site ? open('Shape', facts.industry + ', ' + facts.size + ' people, ' + facts.locations + ' location' + (facts.locations === '1' ? '' : 's') + '. Records in ' + String(facts.crm || 'unknown').toLowerCase() + '.') : lock('Shape', 'Industry, team size and where records live'),
      m.have.leaks ? open('First workflow', m.have.tools ? leak + ', built inside ' + m.buildIn + '.' : leak + '. Where it gets built depends on your tools.', m.have.tools) : lock('First workflow', 'Picked from where it hurts'),
      m.have.leaks && m.depth > 0
        ? open('Cost', m.depth === 2 ? 'Showing up as ' + impactText + '. Your note points at the real trigger; that becomes the day-90 metric.' : S.impacts.length ? 'Showing up as ' + impactText + '. One sentence on last week sharpens this.' : 'Your note gives the trigger. Tag what it costs to sharpen this.')
        : lock('Cost', 'What the leak is costing, and the metric we track'),
      m.have.ai && m.have.leaks ? open('Pattern', m.aiScore === 0 ? 'Clean slate: rules and an owner before any tool.' : m.aiScore < 3 ? 'Scattered use. The fix is ownership, not more tools.' : 'Shared practice already. Next is making it compound.', true) : lock('Pattern', 'Unlocks with questions 3 and 4'),
      m.filled >= 4 ? open('Fit', m.isLeader ? 'Fractional AI / MarTech lead, one quarter.' : '90-day owner engagement, two workflows.', true) : lock('Fit', 'Engagement shape and your time per week'),
      m.have.contact && m.filled === 5 ? open('Stage', 'Ready. Your score and dated plan are one tap away.', true) : lock('Stage', 'Score, stage and a dated 90-day plan, sent to you'),
    ];
    var ul = $('[data-insights]'); ul.textContent = '';
    items.forEach(function (it) {
      var li = el('li', { class: 'insight' + (it.open ? ' open' : '') + (it.strong ? ' strong' : '') });
      li.appendChild(el('span', { class: 'insight-mark', 'aria-hidden': 'true' }, it.open ? '›' : '·'));
      var body = el('div');
      body.appendChild(el('div', { class: 'insight-k' }, it.label + (it.open ? '' : ' · locked')));
      body.appendChild(el('div', { class: 'insight-v', 'aria-hidden': it.open ? 'false' : 'true' }, it.text));
      li.appendChild(body);
      ul.appendChild(li);
    });

    var submit = $('[data-submit]');
    var ready = m.filled === 5;
    submit.setAttribute('aria-disabled', String(!ready));
    submit.textContent = ready ? 'Get my reading' : (5 - m.filled) + ' step' + (5 - m.filled === 1 ? '' : 's') + ' to unlock';
    $('[data-email]').setAttribute('aria-invalid', String(!!S.email && !m.emailOk));
  }

  function render() {
    var m = model();
    var scanBtn = $('[data-scan]');
    scanBtn.disabled = !S.url.trim() || S.scanState === 'scanning';
    scanBtn.textContent = S.scanState === 'scanning' ? 'Scanning…' : m.scanned ? 'Rescan' : 'Scan my site';
    $('[data-found]').hidden = !m.scanned;
    $('[data-manual-wrap]').hidden = S.scanState !== 'idle';
    if (m.scanned) {
      $('[data-domain]').textContent = S.scanState === 'manual' ? 'entered by hand' : (S.scan && S.scan.domain) || domainOf(S.url);
      var sum = $('[data-summary]');
      sum.hidden = !(S.scan && S.scan.summary);
      if (S.scan && S.scan.summary) sum.textContent = S.scan.summary;
      renderFacts();
    }
    renderChips();
    renderReading(m);
  }

  // ---------- scan ----------
  function scan() {
    var url = S.url.trim();
    if (!url) return;
    var domain = domainOf(url);
    var lines = ['Fetching ' + domain, 'Reading services, locations, hours', 'Checking booking, chat, forms', 'Looking for review profiles', 'Estimating team size from staff and roles'];
    var log = $('[data-scan-log]');
    var err = $('[data-scan-err]');
    err.hidden = true;
    log.hidden = false;
    log.textContent = '';
    S.scanState = 'scanning';
    render();
    var i = 0;
    var addLine = function () {
      if (i >= lines.length || S.scanState !== 'scanning') return;
      var row = el('div');
      row.appendChild(el('span', { class: 'gold' }, '› '));
      row.appendChild(document.createTextNode(lines[i++]));
      log.appendChild(row);
    };
    addLine();
    var timer = setInterval(addLine, 900);
    window.TWT.intake('scan', { url: url })
      .then(function (res) {
        S.scan = { domain: res.domain, source: res.source, summary: res.summary, signals: res.signals || [] };
        S.facts = Object.assign({}, res.facts);
        S.scanState = 'done';
        window.TWT.track('readiness_scan', { source: res.source });
      })
      .catch(function (e) {
        S.scan = null;
        S.facts = { industry: 'Professional services', size: '5–15', locations: '1', crm: 'Unclear' };
        S.scanState = 'manual';
        err.textContent = "Couldn't read that site (" + e.message + '). Pick the basics below instead.';
        err.hidden = false;
      })
      .then(function () {
        clearInterval(timer);
        log.hidden = true;
        render();
      });
  }

  // ---------- wiring ----------
  renderStatic();
  $('[data-url]').addEventListener('input', function (e) { S.url = e.target.value; render(); });
  $('[data-url]').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); scan(); } });
  $('[data-scan]').addEventListener('click', scan);
  $('[data-manual]').addEventListener('click', function () {
    S.scanState = 'manual';
    S.facts = { industry: 'Professional services', size: '5–15', locations: '1', crm: 'Unclear' };
    render();
  });
  $('[data-tools-other]').addEventListener('input', function (e) { S.toolsOther = e.target.value; render(); });
  $('[data-pain]').addEventListener('input', function (e) { S.pain = e.target.value; render(); });
  $('[data-name]').addEventListener('input', function (e) { S.name = e.target.value; render(); });
  $('[data-email]').addEventListener('input', function (e) { S.email = e.target.value; render(); });
  $('[data-role]').addEventListener('change', function (e) { S.role = e.target.value; render(); });

  var d0 = new Date();
  d0.setDate(d0.getDate() + ((9 - d0.getDay()) % 7 || 7) + 7);
  S.startDate = iso(d0);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var m = model();
    var err = $('[data-submit-err]');
    if (m.filled < 5) {
      err.hidden = false;
      err.textContent = !m.have.site ? 'Start with question 1: scan your site or fill the basics by hand.'
        : !m.have.tools ? 'Question 2: check at least one tool, or type one in.'
        : !m.have.leaks ? 'Question 3: pick where it hurts.'
        : !m.have.ai ? 'Question 4: how is AI used today?'
        : 'Question 5: add your name and a valid work email.';
      return;
    }
    // One request at a time: a double click or an impatient second click must not create a second lead.
    if (S.submitting) return;
    S.submitting = true;
    err.hidden = true;
    var btn = $('[data-submit]');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    btn.setAttribute('aria-disabled', 'true');
    // Snapshot what is stored, so the result page shows what Corey actually has.
    S.captured = { kickoff: S.startDate, slot: S.slot };
    window.TWT.intake('lead', leadPayload(m))
      .then(function () { S.sent = true; window.TWT.track('generate_lead', { form: 'readiness', stage: m.stage.name }); })
      .catch(function (ex) { S.sent = ex.message; })
      .then(function () {
        S.submitting = false;
        btn.disabled = false;
        showResult();
      });
  });

  function leadPayload(m) {
    return {
      source: 'readiness', name: S.name, email: S.email, role: S.role,
      website: S.scanState === 'done' ? domainOf(S.url) : null,
      facts: S.facts, tools: S.tools, tools_other: S.toolsOther,
      stack_maturity: ['none', 'basic', 'connected', 'connected', 'mature'][Math.round(m.toolScore)],
      hurts: S.leaks.map(function (k) { return nameOf(LEAKS, k); }),
      impacts: S.impacts.map(function (k) { return nameOf(IMPACTS, k); }),
      pain_note: S.pain, ai_today: nameOf(AI, S.ai), score: m.total, stage: m.stage.name,
      fit: m.isLeader ? 'fractional_lead' : 'owner_90day', kickoff: S.startDate, slot: S.slot,
      scan: S.scan, company_website: $('[data-hp]').value,
    };
  }

  // ---------- page 2 ----------
  function schedule(m) {
    var leak0 = nameOf(LEAKS, S.leaks[0]);
    var leak1 = nameOf(LEAKS, S.leaks[1]);
    var WEEKS = m.isLeader
      ? [['Assess', 'Audit stack and workload', 'Interviews, CRM and data audit, ranked use cases.', 2, '2 × 60 min'], ['Implement', 'Ship the first two', (leak0 || 'Workflow one') + (leak1 ? ' and ' + leak1.toLowerCase() : '') + ', with approval gates.', 3, 'weekly 45 min'], ['Train', 'Enable the team', 'Role sessions on live work; prompt library; office hours.', 2, '2 sessions + office hours'], ['Run', 'Operate and extend', 'Weekly ops review; use cases three and four.', 4, 'weekly 45 min'], ['Improve', 'Report to leadership', 'Numbers, roadmap, extend or hand off.', 2, '1 readout']]
      : [['Assess', 'Find the two workflows', 'Half-day on site. Start with ' + (leak0 || 'the biggest leak').toLowerCase() + '.', 2, '2 × 45 min'], ['Implement', 'Build it in your tools', 'Draft-and-approve inside ' + m.buildIn + '; a named owner.', 2, 'weekly 45 min'], ['Train', 'Train on real work', 'Two 90-minute sessions on the team’s own inbox.', 2, '2 × 90 min'], ['Run', 'Run it with you', 'Weekly review of drafts vs. edits; fix prompts.', 4, 'weekly 45 min'], ['Improve', 'Read the numbers', 'Hours saved, misses, keep or stop.', 3, '1 review']];
    var cursor = new Date(S.startDate + 'T12:00:00');
    var ol = $('[data-schedule]'); ol.textContent = '';
    WEEKS.forEach(function (w, i) {
      var s = new Date(cursor), e = new Date(cursor);
      e.setDate(e.getDate() + w[3] * 7 - 1);
      cursor = new Date(e); cursor.setDate(cursor.getDate() + 1);
      var isOpt = i === 2 && m.total >= 75;
      var skipped = isOpt && S.optional[i];
      var li = el('li', { class: 'week' + (skipped ? ' week-skipped' : '') });
      var top = el('div', { class: 'week-top' });
      top.appendChild(el('span', { class: 'week-when' }, fmt(s) + ' – ' + fmt(e)));
      top.appendChild(el('span', { class: 'label' }, w[0]));
      li.appendChild(top);
      li.appendChild(el('h3', { class: 'h3' }, w[1]));
      li.appendChild(el('p', { class: 'week-focus' }, w[2]));
      var get = el('p', { class: 'week-get' });
      get.appendChild(el('span', {}, 'Check-ins:'));
      get.appendChild(document.createTextNode(' ' + w[4] + ', ' + S.slot));
      li.appendChild(get);
      if (isOpt) {
        var b = el('button', { type: 'button', class: 'rc-linkbtn', 'aria-pressed': String(!!skipped) }, skipped ? 'Skipped. Restore it.' : 'Optional at your stage. Skip it.');
        b.addEventListener('click', function () { S.optional[i] = !S.optional[i]; renderResult(); });
        li.appendChild(b);
      }
      ol.appendChild(li);
    });
    var end = new Date(cursor); end.setDate(end.getDate() - 1);
    $('[data-run-range]').textContent = fmt(new Date(S.startDate + 'T12:00:00')) + ' – ' + fmt(end);
  }

  function renderResult() {
    var m = model();
    var domain = S.scanState === 'done' ? domainOf(S.url) : S.facts.industry;
    $('[data-result-eyebrow]').textContent = S.name.trim().split(' ')[0] + ' · ' + (domain || '');
    $('[data-stage-headline]').textContent = m.stage.headline;
    $('[data-stage-body]').textContent = m.stage.body;
    $('[data-fit]').textContent = m.isLeader ? 'Fractional AI / MarTech lead' : '90-day owner engagement';
    $('[data-workflows]').textContent = S.leaks.map(function (k) { return nameOf(LEAKS, k); }).join(' + ') || '—';
    $('[data-stage-name]').textContent = m.stage.name;
    $('[data-score]').textContent = String(m.total);
    var dims = $('[data-dims]'); dims.textContent = '';
    [['people', 'People', 'Size, role and who would own it.'], ['data', 'Data', 'Where customer records live.'], ['adoption', 'Adoption', 'How AI is used today.'], ['stack', 'Stack maturity', 'CRM, marketing, AI seats: what we can build inside.']].forEach(function (x) {
      var v = Math.round(m.d[x[0]] * 100);
      var dEl = el('div', { class: 'dim' });
      var row = el('div', { class: 'dim-row' }); row.appendChild(el('span', {}, x[1])); row.appendChild(el('span', {}, String(v)));
      dEl.appendChild(row);
      var bar = el('div', { class: 'dim-bar' }); var fill = el('div'); fill.style.width = v + '%'; bar.appendChild(fill);
      dEl.appendChild(bar);
      dEl.appendChild(el('p', {}, x[2]));
      dims.appendChild(dEl);
    });
    $('[data-your-time]').textContent = m.isLeader ? '1 hr/wk you · 4–6 team' : '2–3 hrs/wk';
    $('[data-scope]').textContent = m.isLeader ? '4 use cases · quarter' : '2 workflows · 90 days';
    $('[data-start]').value = S.startDate;
    $('[data-slot]').value = S.slot;
    schedule(m);

    var warn = $('[data-send-warn]');
    warn.hidden = S.sent === true;
    if (S.sent !== true) warn.textContent = "Your reading is below, but it didn't reach Corey (" + S.sent + '). Use the kickoff button to email it.';

    var p = leadPayload(m);
    var rows = [['name', p.name], ['email', p.email], ['role', p.role], ['website', p.website || '—'], ['industry', S.facts.industry], ['team_size', S.facts.size], ['locations', S.facts.locations], ['records_in', S.facts.crm], ['stack', m.toolsAll.join(', ') || '—'], ['stack_maturity', p.stack_maturity], ['hurts', p.hurts.join(', ') || '—'], ['impacts', p.impacts.join(', ') || '—'], ['pain_note', p.pain_note.trim() ? '"' + p.pain_note.trim().slice(0, 90) + (p.pain_note.trim().length > 90 ? '…' : '') + '"' : '—'], ['ai_today', p.ai_today || '—'], ['score', p.score + ' · ' + p.stage], ['fit', p.fit], ['kickoff', S.captured ? S.captured.kickoff : S.startDate], ['slot', S.captured ? S.captured.slot : S.slot], ['scan_note', S.scan ? (S.scan.source + (S.scan.signals.length ? ': ' + S.scan.signals.slice(0, 3).join('; ') : '')) : 'manual entry']];
    var dl = $('[data-lead-rows]'); dl.textContent = '';
    rows.forEach(function (r) { dl.appendChild(el('dt', {}, r[0])); dl.appendChild(el('dd', {}, String(r[1] == null ? '—' : r[1]))); });

    var changed = S.captured && (S.captured.kickoff !== S.startDate || S.captured.slot !== S.slot);
    $('[data-plan-changed]').hidden = !changed;
    var body = (changed ? 'Updated plan (differs from my form submission)\n' : '') + 'Kickoff: ' + S.startDate + ', ' + S.slot + '\nStage: ' + m.stage.name + ' (' + m.total + ')\nWorkflows: ' + ($('[data-workflows]').textContent) + '\n';
    $('[data-book]').href = 'mailto:corey@talewatersandtides.com?subject=' + encodeURIComponent('Kickoff call: ' + (S.name.trim() || 'readiness check')) + '&body=' + encodeURIComponent(body);
  }

  function showResult() {
    $('#rc-form').hidden = true;
    $('#rc-result').hidden = false;
    renderResult();
    window.scrollTo(0, 0);
    $('[data-stage-headline]').focus();
  }

  $('[data-start]').addEventListener('change', function (e) { if (e.target.value) { S.startDate = e.target.value; renderResult(); } });
  $('[data-slot]').addEventListener('change', function (e) { S.slot = e.target.value; renderResult(); });
  $('[data-edit]').addEventListener('click', function () {
    $('#rc-result').hidden = true;
    $('#rc-form').hidden = false;
    render();
    window.scrollTo(0, 0);
  });

  render();
})();
