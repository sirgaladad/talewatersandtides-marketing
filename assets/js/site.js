// Shared behaviour for the services site: mobile menu, GA events, UTM capture,
// and the intake client (Supabase Edge Function `intake`, see
// supabase/functions/intake/README.md). No dependencies.
(function () {
  'use strict';

  // Public anon key: safe to ship. The function verifies it, and the leads
  // tables have no anon access; only the function's service role writes them.
  var INTAKE_URL = 'https://feldynpqhzvstpssztra.supabase.co/functions/v1/intake';
  var ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbGR5bnBxaHp2c3Rwc3N6dHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzA5NzMsImV4cCI6MjA5NTkwNjk3M30.fs2YJDZEyJ_FLe524kKpul8uTitrZa6VYCmEe69ahzQ';
  var loadedAt = Date.now();

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  // ---- mobile menu ----
  var btn = document.querySelector('[data-menu-btn]');
  var panel = document.getElementById('menu-panel');
  if (btn && panel) {
    var setOpen = function (open) {
      panel.dataset.open = String(open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', function () {
      setOpen(panel.dataset.open !== 'true');
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.dataset.open === 'true') {
        setOpen(false);
        btn.focus();
      }
    });
  }

  // ---- GA: click + section views (same event names as the previous site) ----
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-ga]');
    if (el) track('click', { event_category: 'engagement', event_label: el.getAttribute('data-ga'), link_url: el.href || '' });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (n) {
          if (!n.isIntersecting) return;
          track('section_view', { event_category: 'scroll', event_label: n.target.getAttribute('data-ga-section') });
          io.unobserve(n.target);
        });
      },
      { threshold: 0.3 }
    );
    document.querySelectorAll('[data-ga-section]').forEach(function (s) { io.observe(s); });
  }

  // ---- UTM capture (first touch, this session) ----
  function utm() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
    var stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('twt_utm') || '{}'); } catch (err) { stored = {}; }
    var q = new URLSearchParams(location.search);
    var fresh = {};
    keys.forEach(function (k) { if (q.get(k)) fresh[k] = q.get(k); });
    if (Object.keys(fresh).length && !Object.keys(stored).length) {
      stored = fresh;
      try { sessionStorage.setItem('twt_utm', JSON.stringify(stored)); } catch (err) { /* private mode */ }
    }
    if (!stored.ref && document.referrer && document.referrer.indexOf(location.host) === -1) {
      stored.ref = document.referrer.slice(0, 120);
    }
    return stored;
  }
  utm();

  // ---- intake client ----
  function intake(route, body) {
    var payload = Object.assign({}, body, {
      page: location.pathname,
      utm: utm(),
      elapsed_ms: Date.now() - loadedAt,
    });
    return fetch(INTAKE_URL + '/' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ANON_KEY, apikey: ANON_KEY },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
        return data;
      });
    });
  }

  // ---- routed contact form (home) ----
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    // Links like "Request a workshop" pre-select the routing option.
    document.querySelectorAll('[data-looking-for]').forEach(function (a) {
      a.addEventListener('click', function () { form.elements.looking_for.value = a.dataset.lookingFor; });
    });
    var pre = new URLSearchParams(location.search).get('looking_for');
    if (pre && Array.prototype.some.call(form.elements.looking_for.options, function (o) { return o.value === pre; })) {
      form.elements.looking_for.value = pre;
    }
    var status = form.querySelector('[data-status]');
    var submit = form.querySelector('button[type="submit"]');
    var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    var validate = function () {
      var ok = true;
      [['name', function (v) { return v.trim().length > 1; }, 'Add your name.'],
        ['email', function (v) { return EMAIL_RE.test(v.trim()); }, 'Add a valid email.']].forEach(function (rule) {
        var input = form.elements[rule[0]];
        var err = form.querySelector('[data-err="' + rule[0] + '"]');
        var valid = rule[1](input.value);
        input.setAttribute('aria-invalid', String(!valid));
        if (err) err.textContent = valid ? '' : rule[2];
        if (!valid && ok) { input.focus(); ok = false; }
      });
      return ok;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.dataset.state = '';
      status.textContent = '';
      var f = form.elements;
      intake('lead', {
        source: 'contact',
        looking_for: f.looking_for.value,
        name: f.name.value,
        email: f.email.value,
        company: f.company.value,
        message: f.message.value,
        company_website: f.company_website.value,
      })
        .then(function () {
          track('generate_lead', { form: 'contact', looking_for: f.looking_for.value });
          form.reset();
          status.dataset.state = 'ok';
          status.textContent = "Got it. You'll hear back from Corey directly.";
          submit.textContent = 'Sent';
        })
        .catch(function (err) {
          status.dataset.state = 'error';
          status.textContent = err.message + '. Or email corey@talewatersandtides.com.';
          submit.disabled = false;
          submit.textContent = 'Send';
        });
    });
  }

  window.TWT = { intake: intake, track: track };
})();
