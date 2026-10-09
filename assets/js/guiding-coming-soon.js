(function () {
  'use strict';
  var form = document.getElementById('guiding-form');
  var button = form.querySelector('button[type="submit"]');
  var status = form.querySelector('[role="status"]');
  var intent = form.elements.intent;
  var started = false;
  button.disabled = !window.TWT;
  if (!window.TWT) status.textContent = 'The form could not load. Please email corey@talewatersandtides.com.';
  function track(event, params) { if (window.TWT) window.TWT.track(event, params); }
  function updateButton() { button.textContent = intent.value === 'trip' ? 'Send my trip request ↗' : 'Keep me posted ↗'; }
  intent.addEventListener('change', updateButton);
  form.addEventListener('focusin', function () {
    if (!started) { started = true; track('form_start', { form: 'guiding_early' }); }
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (form.elements.name.value.trim().length < 2) { status.textContent = 'Please add your name.'; form.elements.name.focus(); return; }
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.dataset.state = '';
    var requestedIntent = intent.value;
    var message = [
      'Guides early interest — November 2026 launch',
      'Intent: ' + (requestedIntent === 'trip' ? 'Request a November trip' : 'Launch updates'),
      'Preferred water: ' + form.elements.water.value,
      'Notes: ' + form.elements.notes.value.trim(),
      'Consent: email about this request and guided-trip launch; checked at ' + new Date().toISOString(),
      'No payment taken; no booking confirmed.'
    ].join('\n');
    if (!window.TWT) { fail(new Error('The form could not load')); return; }
    window.TWT.intake('lead', {
      source: 'contact', stage: 'guiding-early', looking_for: 'Something else',
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(),
      message: message, company_website: form.elements.company_website.value
    }).then(function (data) {
      if (!data.id) throw new Error('Your request was not saved. Please try again');
      track('generate_lead', { form: 'guiding_early', source: 'guiding', stage: requestedIntent });
      form.reset();
      form.hidden = true;
      var confirmation = document.createElement('div');
      confirmation.className = 'g-form';
      confirmation.setAttribute('role', 'status');
      confirmation.setAttribute('tabindex', '-1');
      var heading = document.createElement('h3'); heading.textContent = "You're on the early list.";
      var text = document.createElement('p'); text.textContent = requestedIntent === 'trip' ? "Your request is saved. Corey will email you to discuss availability, pricing and your day on the water. Your date is not booked yet." : "Your interest is saved. Corey will email you when the guided-trip details are ready.";
      confirmation.appendChild(heading); confirmation.appendChild(text);
      form.parentNode.appendChild(confirmation); confirmation.focus();
    }).catch(fail);
  });
  function fail(err) {
    status.dataset.state = 'error';
    status.textContent = err.message + '. You can also email corey@talewatersandtides.com.';
    button.disabled = false; updateButton();
    track('form_error', { form: 'guiding_early' });
  }
  if ('IntersectionObserver' in window) {
    var sticky = document.querySelector('.g-mobile-cta');
    new IntersectionObserver(function (entries) { sticky.hidden = entries[0].isIntersecting; }, { threshold: 0.05 }).observe(document.getElementById('request'));
  }
})();
