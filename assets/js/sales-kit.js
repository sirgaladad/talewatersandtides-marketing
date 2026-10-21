// /sales-kit/ — PFG partner field playbook. No dependencies.
// Edit the data blocks (TODOS, DECISIONS, KINDS, STEPS, OBJ, ROUTE) to change the content;
// the page renders from them. Status, notes and scores live in this browser's localStorage only.
(function () {
  'use strict';

  var KEY = 'twt-sales-kit-v2';
  var PFG = 'https://www.pocketfishinguide.com';
  var REPO = 'https://github.com/sirgaladad/pocket-fishing-guide';
  var S = {};
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (err) { S = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (err) { /* private mode */ } }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function today() { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function toast(t) {
    var e = $('#toast');
    e.textContent = t || 'Copied';
    e.classList.add('on');
    setTimeout(function () { e.classList.remove('on'); }, 1300);
  }
  function copy(text, msg) {
    if (!navigator.clipboard) { toast('Copy not available'); return; }
    navigator.clipboard.writeText(text).then(function () { toast(msg); });
  }
  function issueUrl(title, body) {
    return REPO + '/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
  }

  // ------------------------------------------------------------------
  // DATA
  // ------------------------------------------------------------------

  // Every to-do carries the action that completes it. `owner` is corey | build.
  var TODOS = [
    { id: 'fix-1', owner: 'build', t: 'Ship invite-offer: pricing.published=false; planWords reads "your price is on your invite"; offer on partner_invites (annual, term, lock, expires); offer card after acceptance and on the Guide view; sponsorship-desk reads it later.',
      actions: [{ l: 'Open the issue', h: issueUrl('[Feature] invite-offer: hide price; per-invite offer', '## Why\nNo price on any public surface. A business sees its price only on its invite, after "Yes, this is us", or in its own dashboard.\n\n## Scope\n- `pricing.published=false` in program settings (default false)\n- `planWords` returns "Sponsored - your price is on your invite" wherever a price literal rendered; showcase "I want this" stays a lead\n- payback calculator takes the partner\'s own trip rate\n- `partner_invites.offer` {annual_cents, monthly_cents?, term_months, lock_months, expires_at, note}, set in the admin when the invite is made, defaulted from a private `pricing.offers[kind]` table\n- offer card renders on the invite page after acceptance and on the Guide view for a tied account\n- `sponsorship-desk` reads the offer for the Payment Link later\n- rebuild /partners/guide PDF\n\n## Checks\ntsc, eslint, vitest; a test that no visitor-facing surface prints a price when published=false.') }] },
    { id: 'fix-2', owner: 'corey', t: 'Console copy: rack_card_line = "Free listing. Sponsored seats for founding partners. Text Corey." Rewrite shows_up_line (it still says Today\'s Spotlight).',
      actions: [{ l: 'Open /admin/program', h: PFG + '/admin/program' }, { l: 'Copy rack line', c: 'Free listing. Sponsored seats for founding partners. Text Corey.' }, { l: 'Copy shows-up line', c: 'Every partner gets a page and a card on every water they work. Sponsored partners add their photo, logo and river note across those waters.' }] },
    { id: 'fix-3', owner: 'build', t: 'Rebuild the leave-behind PDF after invite-offer ships so no page carries a number.',
      actions: [{ l: 'Copy command', c: 'npm run guide:pdf' }, { l: 'Current PDF', h: PFG + '/partners/guide' }] },
    { id: 'fix-4', owner: 'corey', t: 'Set the rate card in the partner manager, not on paper: offer by kind and market, the founding lock, the floor. The console is the only place a price lives; once invite-offer ships it is pricing.offers[kind] there. Same number for neighbours on the same river.',
      actions: [{ l: 'Open the partner manager', h: PFG + '/admin/program' }, { l: 'Copy the kinds to set', c: 'Ozarks North Central: solo guide / dock or resort / lodge / shop / marina. Floor (never below). Founding: locked 24 months, first 25, through Mar 31 2027.' }] },
    { id: 'fix-5', owner: 'corey', t: 'Make the invite for The White River Inn; set an offer on all four invites once invite-offer ships.',
      actions: [{ l: 'Open leads', h: PFG + '/admin/partners/leads' }] },
    { id: 'fix-6', owner: 'corey', t: 'Archive the Riley\'s inbound lead (they are published; the open row is noise).',
      actions: [{ l: 'Open housekeeping', h: PFG + '/admin/housekeeping' }] },
    { id: 'fix-7', owner: 'corey', t: 'Order 250 rack cards, 4x9 in, three fronts (north-central, little-red, beaver), one back, no price line. Spec on the Pack tab.',
      actions: [{ l: 'Open Canva brand kit', h: 'https://www.canva.com/brand/' }, { l: 'Copy QR targets', c: PFG + '/partners?src=rackcard-north-central\n' + PFG + '/partners?src=rackcard-little-red\n' + PFG + '/partners?src=rackcard-beaver' }] },
    { id: 'fix-8', owner: 'corey', t: 'Set PARTNER_FEEDS_SECRET on Vercel and as a repo Actions secret (same value, 16+ characters). The hourly open-days job exits "not set" until then.',
      actions: [{ l: 'Vercel env vars', h: 'https://vercel.com/twt-0b357db0/pfg/settings/environment-variables' }, { l: 'Actions secrets', h: REPO + '/settings/secrets/actions' }] },
    { id: 'fix-9', owner: 'build', t: 'Media Kit 2026 PDF is stale. Nothing printed goes to a bank until it is regenerated from program settings.',
      actions: [{ l: 'Open the issue', h: issueUrl('[Chore] Regenerate the media kit from program settings', 'The Media Kit 2026 PDF predates the premium sheet and the hidden-price decision. Regenerate it from `pfg_media_kit_source.html` reading program settings, with no price literal.') }] },
  ];

  var DECISIONS = [
    { id: 'dec-1', t: 'Private rate card: offer by kind and market in North Central, the founding lock, the floor. Note the revenue consequence of the level before committing; the path to the monthly target may run through regional sponsors, not seats.' },
    { id: 'dec-2', t: '"Beat or meet": matching what they pay a chamber or booking platform today? If so, ask what they pay; the offer never goes below the floor regardless.' },
    { id: 'dec-3', t: 'One-page agreement from terms v1, or the console terms page plus "Yes, this is us" is the agreement for free listings and a signature is only for Sponsored.' },
    { id: 'dec-4', t: 'Rack card: three fronts, one back, same print run.' },
    { id: 'dec-5', t: 'Who may upload brand assets; the 2 MB cap (blocks brand-assets-step).' },
    { id: 'dec-6', t: 'Regional seats are quoted in the proposal only, never on a page. The platinum conversation waits for 10 partners and 3 months of partner_hits.' },
    { id: 'dec-7', t: 'Is sponsorship taxable in Arkansas? Ask the accountant before the first Payment Link.' },
    { id: 'dec-8', t: 'Warm-water list (bass and crappie guides, Capital and Ouachitas): after North Central, before Beaver.' },
  ];

  var KINDS = {
    'Solo guide': { o: 'I guide the White too. I built the page anglers see when they check the dam before they book.', v: 'You are not one of forty names. On the Bull Shoals page you are the guide, with Text to book and the day already filled in.', c: 'Free page today. Sponsored puts your face on the dam card; your price is on your invite and the first 25 lock it two years.' },
    'Resort / dock': { o: 'Your renters call you about generation. I put that on your page, live, next to your boats.', v: 'Reserve a boat, Check dates, Call: every one is counted and I send you the number Monday.', c: 'You have the most doors of anyone on the river. Sponsored is the plan for you; I will put your price on the invite tonight. The page itself is free.' },
    'Lodge': { o: 'Someone planning a trout trip picks the water first. Your cabins show up beside it.', v: 'Three midweek nights pays the year.', c: 'Free page now. Sponsored when I can send you stay requests as rows, not texts. I will tell you when.' },
    'Fly / tackle shop': { o: 'Directions is a door. I count the walk-ins the app sends you.', v: 'And your customers want this card: generation before they drive. Put a stack by the register.', c: 'Free listing. If you also guide, Sponsored puts you on the species pages where the search traffic lands; price comes with the invite.' },
    'Marina': { o: 'Reserve a boat with the day and the put-in already filled in.', v: 'Weather no-shows drop when they saw the water before they came.', c: 'Sponsored. Your price is on the invite; the water chip on your page is live right now.' },
    'Paddle outfitter': { o: 'The Buffalo as a colour band, green, yellow, red, with your shuttle as the door.', v: 'That is the Riverline feature; it is next on the roadmap, and I would like you on the page before it ships.', c: 'Free listing today; we will talk again when the band is live.' },
    'Bank / insurer': { o: 'Every angler on the White checks the Reports tab. You are Presented by on every one in your market.', v: 'A quote door that carries the boat and the water to your form. Not a logo, a lead.', c: 'Three seats per category in North Central, annual. I will bring a proposal with your number and a quarterly numbers call.' },
    'Dealer / retailer': { o: 'You are already in the AGFC guidebook. This is the same angler, the morning they decide.', v: 'A quote door that carries the boat and the water to your form. Not a logo, a lead.', c: 'Annual seat; proposal with your number; media kit follows the meeting.' },
    'Chamber': { o: 'Free listing for every member who guides, rents or sleeps anglers. I will build their page; you tell them it exists.', v: 'Rack cards for your counter: generation before they drive.', c: 'Ten minutes at the next breakfast; I will bring the cards.' },
  };

  var STEPS = [
    ['Walk in as a customer', 'Buy something small: flies, a jig, a drink. Ask what the water did this morning. Thirty seconds.'],
    ['Open', '"You the owner? I am Corey, I guide the White out of Mountain Home and I built the app anglers use to check Bull Shoals generation before they drive. I put a page together for you from your site. Can I show you on my phone? Takes a minute."'],
    ['Hand them the phone', 'Open their draft preview. Say nothing for ten seconds. Then: "Those are your rates as posted. Tell me what is wrong." Every correction is a yes.'],
    ['Water now and open days', '"That is live USGS and the dam schedule. When somebody is deciding whether to come up Thursday, this is the screen, and this is where your name is."'],
    ['The ask', '"The page is free. I would like you on it this week. Sponsored, your photo and logo on the dam card and the species pages, is a second step, and your price is on your invite, set for you, locked two years as a founding partner. Either way, I will switch the page on today if you tell me it is right."'],
    ['Close the free one', 'Tie their account from the admin on your phone, or hand them the invite card with the code written on it. Set the offer before you leave the lot. Photo of their business card. Leave rack cards for the counter.'],
  ];

  var OBJ = [
    ['I am on Facebook, that is where my customers are.', 'Keep it. Facebook is where you post the fish. This is where they decide the day. Your Facebook link is a counted door on the page.', 'Their social door on the draft'],
    ['I am booked solid through spring.', 'Then the free page costs you nothing and your open-days calendar says "full", which is the best ad you have. Paste your calendar address once and it stays right.', 'The open-days feed'],
    ['How many people use this?', 'About 500 a month right now, almost all Arkansas, and the Bull Shoals page is the busiest. Small and honest; that is why the first 25 lock their price. I send you your own numbers Monday; you will not have to take my word for it.', 'The "This week" line on Riley\'s'],
    ['What does Sponsored cost?', 'It is set for you, not posted. It is on your invite, and it is locked two years. It is under one platform booking fee a year; two booked days covers it. (Say the number out loud if they press; never write it anywhere but the invite.)', 'The offer card on the invite'],
    ['Why is the price not on the site?', 'Because it is not one price. A dock with four doors and a solo guide with one are not the same seat, and I would rather set it with you than post a number that is wrong for half the river.', ''],
    ['I already pay FishingBooker or Guidesly.', 'Good, that is your booking engine, and we deep-link to it. We never take a cut of the trip. We send the angler to your door.', 'Book online door'],
    ['Who sees my rates? I do not want them scraped.', 'They are already on your site; I copied them with the date. You confirm or change them. Order on every list is river distance then name; nobody buys a higher spot.', 'The "rates as of" line'],
    ['I do not do computers. My wife does the website.', 'You do not touch a thing. I built it; you tell me what is wrong, I fix it on my phone. Your dashboard is for the phone, and I am a text away.', 'You, editing their draft live'],
    ['What is in it for you?', 'I guide the White on this same platform, same rules, labelled "our guide service", never sponsored. The business is sponsorships and regional sponsors, banks and dealers, not your bookings.', 'TWT Guides page'],
    ['Can you guarantee bookings?', 'No. I guarantee the counts are real and that you can see them. Nobody honest guarantees bookings on this river.', 'Terms, section 7'],
    ['Let me think about it.', 'Do. The page is built either way. I will text you the link now; look at it after your trip and tell me what is wrong.', 'Invite link, sent before you leave the lot'],
    ['What about email or text notifications?', 'In-app today; text when the carrier registration clears; email next. I will tell you the week each lands.', ''],
  ];

  // Prospects by route day. d = draft/invite state. Phone numbers are the businesses' published numbers.
  var ROUTE = [
    { day: 'Day 1', title: 'Little Rock, no driving', note: 'Console fixes, print run ordered, three calls.', biz: [
      { n: 'Fish On Set Hook Guide Service', t: 'Heber Springs', p: '501-270-0169', w: 'https://fishonsethook.com/', k: 'guide', s: 'Pontoon spin and bait, family focus, summer full-day blackout (flow-driven). Tripadvisor 4.9.' },
      { n: 'Red River Trout Dock Resort', t: 'Heber Springs', p: '501-362-2197', w: 'http://www.redrivertroutdock.com/', k: 'dock', s: 'Boat and kayak rentals online, cabins, RV, bait. Self-drive renters need generation most.' },
      { n: 'The Ozark Angler, Little Rock shop', t: 'Little Rock', p: '', w: '', k: 'shop', s: 'Walk in. Same company as the Heber shop; est. 1989.' },
    ] },
    { day: 'Day 2', title: 'Cotter, Gassville, Lakeview', note: 'One loop, six to eight stops. Drafts exist for the starred rows.', biz: [
      { n: 'Flys and Guides (White River Fly Shop)', t: 'Lakeview', p: '870-321-3890', w: 'https://flysandguides.com/', k: 'shop', d: 'invite made', s: 'Best conditions fit: monthly reports, flow-dependent trips, drift boat rentals, online booking.' },
      { n: 'The White River Inn', t: 'Cotter', p: '870-430-2233', w: 'https://thewhiteriverinn.com/', k: 'lodge', d: 'needs invite', s: 'Orvis lodge, high ticket, guides unnamed. Lodge angle.' },
      { n: 'Cotter Trout Lodge / Natural State Fly Shop', t: 'Cotter', p: '870-435-2400', w: 'https://www.cottertroutlodge.com/', k: 'shop', s: 'Courtney Blank, Henry Seay. Lodge line 870-435-3000. Clear rate card, online booking. Rack cards at the shop.' },
      { n: 'Cranor\'s White River Lodge', t: 'Cotter', p: '870-430-5484', w: 'https://whiterivertroutfishing.net/', k: 'dock', s: 'Eight guides, live webcams, "catch trout or 100% refund". Rates page unread; ask.' },
      { n: 'White River Fly Anglers', t: 'Cotter', p: '417-429-6530', w: 'https://whiteriverflyanglers.com/', k: 'guide', s: 'Jet boat and drift; conditions-minded; fishing report page.' },
      { n: 'Gaston\'s White River Resort', t: 'Lakeview', p: '870-431-5202', w: 'https://www.gastons.com', k: 'dock', s: 'Largest guide program (8 guides, 70+ boats), phone reservations only. Ask for the office manager.' },
      { n: 'Ember Shoals Outdoor Resort', t: 'Cotter', p: '870-425-3333', w: 'https://embershoals.com', k: 'lodge', s: '11 cabins, 42 RV sites, fly shop and lounge. Free only.' },
      { n: 'Woodard Fly Fishing', t: 'Cotter', p: '870-260-1976', w: 'https://woodardflyfishing.com', k: 'guide', s: 'Sold through Yellow Dog; site has placeholders. Strong turnkey case.' },
    ] },
    { day: 'Day 3', title: 'Salesville, Norfork, Mountain Home', note: 'The boat is here.', biz: [
      { n: 'Gene\'s Trout Fishing Resort', t: 'Salesville', p: '870-499-5381', w: 'https://www.genestroutfishingresort.com/', k: 'dock', d: 'invite made', s: 'Ask for Scooter (800-526-3625). Live river cams, jon boats, tackle. Confirm who owns what after the upper-portion sale.' },
      { n: 'Norfork Resort and Trout Dock + Rose\'s', t: 'Norfork', p: '870-499-5500', w: 'https://norforkresort.com/', k: 'dock', s: 'One conversation, one site. Rose\'s 870-499-5311. Phone-only booking.' },
      { n: 'Ron Yarborough\'s White River Fly Guide', t: 'Mountain Home', p: '870-688-1755', w: 'https://whiteriverflyguide.com/', k: 'guide', s: 'Owner-operator who talks tailwater levels on his own site. Likely an easy yes.' },
      { n: 'Rising River Guides', t: 'Cotter', p: '', w: 'https://risingriverguides.com/', k: 'guide', s: 'Contact form only; find a number on the site. Norfork page with hatch guidance.' },
      { n: 'Mountain Home Area Chamber', t: 'Mountain Home', p: '', w: 'https://enjoymountainhome.com/', k: 'chamber', s: 'Ask for a ten-minute slot; leave 50 rack cards. Not a sale.' },
    ] },
    { day: 'Day 4', title: 'Calico Rock, Buffalo City', note: '', biz: [
      { n: 'Calico Rock Trout Dock', t: 'Calico Rock', p: '870-297-8131', w: 'https://calicorocktroutdock.com', k: 'dock', s: '"Now locally owned": ask who. YouTube live river cam; call-only booking.' },
      { n: 'White Buffalo Resort', t: 'Buffalo City', p: '870-425-8555', w: 'https://whitebuffaloresort.com', k: 'dock', s: 'Buffalo mouth, 40+ years. Best match for that reach.' },
      { n: 'Jenkins Fishing Service and Motel', t: 'Calico Rock', p: '870-297-8181', w: 'https://jenkinsfishingandmotel.com', k: 'dock', s: 'Est. 1958, veteran-owned, max 3 per guide. Motel 870-297-8987.' },
    ] },
    { day: 'Day 5', title: 'Heber Springs, half day from Little Rock', note: '', biz: [
      { n: 'The Ozark Angler, Heber shop', t: 'Heber Springs', p: '', w: '', k: 'shop', s: 'Same company as the Little Rock shop.' },
      { n: 'Little Red Fly Fishing Trips', t: 'Heber Springs', p: '', w: 'https://littleredflyfishingtrips.com/', k: 'guide', s: 'Already links Corps and SWPA pages. Memorial on the site; call first, ask who runs it.' },
      { n: 'Friday Fly Fishing (Triple F)', t: 'Heber Springs', p: '501-944-9426', w: 'http://www.triplefoutfitters.com/', k: 'guide', s: 'Solo fly guide, partners for groups.' },
      { n: 'Sore Lip \'Em All Guide Service', t: 'Searcy', p: '501-230-0730', w: 'https://sorelipemall.com', k: 'guide', s: 'Trout Magnet specialist, beginner friendly. Two numbers on the site; confirm.' },
      { n: 'Reel Good Fishing Guide Service', t: 'Little Rock', p: '501-213-8973', w: 'https://reelgoodfishingar.com/', k: 'guide', s: 'Central Arkansas fly guide who drives to the Little Red. Mayfly Project.' },
      { n: 'Fin and Feather Fly Fishing', t: 'Heber Springs (unconfirmed)', p: '870-565-8872', w: 'https://finandfeatherflyfishing.com', k: 'guide', s: 'Online-first, Shopify booking. The 870 number suggests a White River base; confirm.' },
    ] },
    { day: 'Phone', title: 'Beaver (NW), phone and text', note: 'Phone-and-text market until Riverline ships.', biz: [
      { n: 'Busch Mountain Fishing Guide Service', t: 'Eureka Springs', p: '479-244-0039', w: 'https://www.buschmountainfishing.net/', k: 'guide', d: 'invite made', s: 'Austin Kennedy. Publishes tailwater reports and has its own app; expect a sharp conversation. Lead with counted doors and Text to book.' },
      { n: 'Float Eureka', t: 'Eureka Springs', p: '479-981-2689', w: 'https://www.floateurekasprings.com/', k: 'paddle', s: 'For Riverline later. On Peek.' },
      { n: 'Beaver Dam Store', t: 'Eureka Springs', p: '', w: '', k: 'shop', s: 'Ownership change announced; re-verify before outreach.' },
    ] },
  ];
  var STATUS = ['Not visited', 'Called', 'Visited', 'Published', 'Sponsored', 'No / later'];
  var STATUS_CLS = { 'Not visited': '', Called: 'chip-warn', Visited: 'chip-warn', Published: 'chip-ok', Sponsored: 'chip-gold', 'No / later': 'chip-bad' };

  var SCORE = [['Doors knocked / calls', 25], ['Pages published', 12], ['Sponsored sold (of 25 founding)', 4], ['Monday lines sent on time, %', 100], ['partner_hits this week', 0]];

  // ------------------------------------------------------------------
  // TABS
  // ------------------------------------------------------------------
  var panels = $$('.panel');
  var tabBar = $('#kit-tabs');
  panels.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = p.getAttribute('data-title');
    b.addEventListener('click', function () { show(p.id, true); });
    tabBar.appendChild(b);
  });
  // byUser is true only from a tab button: the initial render neither scrolls nor records a click.
  function show(id, byUser) {
    panels.forEach(function (p) { p.classList.toggle('on', p.id === id); });
    $$('button', tabBar).forEach(function (b, i) { b.setAttribute('aria-selected', String(panels[i].id === id)); });
    S.tab = id;
    save();
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (!byUser) return;
    var top = $('#kit-tabs').getBoundingClientRect().top + window.pageYOffset - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    if (window.TWT) window.TWT.track('click', { event_category: 'engagement', event_label: 'saleskit_tab_' + id });
  }
  var initial = (location.hash || '').slice(1);
  show(panels.some(function (p) { return p.id === initial; }) ? initial : S.tab || 'today', false);

  // ------------------------------------------------------------------
  // TO-DO LISTS (actionable)
  // ------------------------------------------------------------------
  function actionHtml(a) {
    if (a.h) return '<a class="btn btn-ghost" href="' + esc(a.h) + '" target="_blank" rel="noopener">' + esc(a.l) + '</a>';
    return '<button class="btn btn-ghost" type="button" data-copy="' + esc(a.c) + '">' + esc(a.l) + '</button>';
  }
  function renderTodos(host, items, withNote) {
    var done = items.filter(function (i) { return S[i.id] && S[i.id].done; }).length;
    var stats = host.previousElementSibling;
    if (stats && stats.classList.contains('todo-stats')) stats.textContent = done + ' of ' + items.length + ' done';
    host.innerHTML = items.map(function (i) {
      var st = S[i.id] || {};
      return '<li' + (st.done ? ' class="done"' : '') + '>' +
        '<input type="checkbox" id="' + i.id + '" data-todo="' + i.id + '"' + (st.done ? ' checked' : '') + ' aria-label="Done">' +
        '<div><label class="todo-t" for="' + i.id + '">' + esc(i.t) + '</label>' +
        '<div class="todo-meta">' + (i.owner ? '<span class="chip chip-owner">' + esc(i.owner) + '</span>' : '') +
        (i.actions || []).map(actionHtml).join('') +
        '<span class="todo-when">' + (st.at ? 'done ' + esc(st.at) : '') + '</span></div>' +
        (withNote ? '<textarea class="input" rows="2" data-note="' + i.id + '" placeholder="Write the decision here, with the date">' + esc(st.note || '') + '</textarea>' : '') +
        '</div></li>';
    }).join('');
    $$('input[data-todo]', host).forEach(function (c) {
      c.addEventListener('change', function () {
        var id = c.getAttribute('data-todo');
        S[id] = S[id] || {};
        S[id].done = c.checked;
        S[id].at = c.checked ? today() : '';
        save();
        renderTodos(host, items, withNote);
      });
    });
    $$('textarea[data-note]', host).forEach(function (t) {
      t.addEventListener('input', function () {
        var id = t.getAttribute('data-note');
        S[id] = S[id] || {};
        S[id].note = t.value;
        save();
      });
    });
  }
  renderTodos($('#todo-fix'), TODOS, false);
  renderTodos($('#todo-dec'), DECISIONS, true);
  $('#copy-decisions').addEventListener('click', function () {
    var lines = DECISIONS.map(function (d) {
      var st = S[d.id] || {};
      return '- [' + (st.done ? 'x' : ' ') + '] ' + d.t + (st.note ? '\n    Decision: ' + st.note.replace(/\n/g, ' ') : '');
    });
    copy('## Open decisions (' + new Date().toISOString().slice(0, 10) + ')\n\n' + lines.join('\n'), 'Decisions copied as markdown');
  });
  $$('.pack-check').forEach(function (host) {
    $$('input[type="checkbox"]', host).forEach(function (c) {
      var k = c.getAttribute('data-k');
      c.checked = !!(S[k] && S[k].done);
      c.parentElement.classList.toggle('done', c.checked);
      c.addEventListener('change', function () {
        S[k] = { done: c.checked, at: c.checked ? today() : '' };
        c.parentElement.classList.toggle('done', c.checked);
        save();
      });
    });
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) copy(b.getAttribute('data-copy'), 'Copied');
    var q = e.target.closest('.quote');
    if (q) {
      // Static cards carry their line in a .say element; the "Tap to copy" caption is never copied.
      var say = q.querySelector('.say') || q.querySelector('p');
      copy(q.getAttribute('data-say') || (say ? say.innerText : q.innerText), 'Line copied');
    }
  });

  // ------------------------------------------------------------------
  // SCRIPTS
  // ------------------------------------------------------------------
  var kseg = $('#kind-seg');
  Object.keys(KINDS).forEach(function (k) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = k;
    b.addEventListener('click', function () { kind(k); });
    kseg.appendChild(b);
  });
  function kind(k) {
    S.kind = k;
    save();
    $$('button', kseg).forEach(function (b) { b.setAttribute('aria-pressed', String(b.textContent === k)); });
    var d = KINDS[k];
    $('#script-out').innerHTML = [['Opener', d.o], ['Value line', d.v], ['Close', d.c]].map(function (r) {
      return '<div class="quote" data-say="' + esc(r[1]) + '"><small>' + r[0] + ' · tap to copy</small><p class="say">' + esc(r[1]) + '</p></div>';
    }).join('');
  }
  kind(KINDS[S.kind] ? S.kind : 'Solo guide');

  var vs = $('#visit');
  STEPS.forEach(function (s, i) {
    var d = document.createElement('div');
    d.className = 'step';
    d.innerHTML = '<p class="label">Step ' + (i + 1) + ' of ' + STEPS.length + ' · ' + esc(s[0]) + '</p><p>' + esc(s[1]) + '</p>';
    vs.appendChild(d);
  });
  var si = 0;
  function step(n) {
    si = Math.max(0, Math.min(STEPS.length - 1, si + n));
    $$('.step', vs).forEach(function (e, i) { e.classList.toggle('on', i === si); });
    $('#step-n').textContent = si + 1 + ' / ' + STEPS.length;
  }
  $('#step-back').addEventListener('click', function () { step(-1); });
  $('#step-next').addEventListener('click', function () { step(1); });
  step(0);

  // ------------------------------------------------------------------
  // OBJECTIONS
  // ------------------------------------------------------------------
  function filterObj() {
    var q = ($('#obj-q').value || '').toLowerCase();
    $('#obj-list').innerHTML = OBJ.filter(function (o) { return !q || o.join(' ').toLowerCase().indexOf(q) !== -1; }).map(function (o) {
      return '<details><summary>' + esc(o[0]) + '</summary><div class="body"><div class="quote" data-say="' + esc(o[1]) + '"><small>You say · tap to copy</small><p>' + esc(o[1]) + '</p></div>' +
        (o[2] ? '<p class="show">Show: ' + esc(o[2]) + '</p>' : '') + '</div></details>';
    }).join('');
  }
  $('#obj-q').addEventListener('input', filterObj);
  filterObj();

  // ------------------------------------------------------------------
  // ROUTE
  // ------------------------------------------------------------------
  var dseg = $('#day-seg');
  ROUTE.forEach(function (d, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = d.day;
    b.addEventListener('click', function () { day(i); });
    dseg.appendChild(b);
  });
  function bid(n) { return 'b:' + n.replace(/[^a-z0-9]+/gi, '-').toLowerCase(); }
  function day(i) {
    S.day = i;
    save();
    $$('button', dseg).forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
    var d = ROUTE[i];
    var html = '<h3 class="h3">' + esc(d.day) + ' · ' + esc(d.title) + '</h3>' + (d.note ? '<p class="day-note">' + esc(d.note) + '</p>' : '');
    html += d.biz.map(function (b) {
      var id = bid(b.n);
      var st = S[id] || {};
      var status = st.s || 'Not visited';
      var tel = b.p ? '<a class="btn" href="tel:' + b.p.replace(/\D/g, '') + '">Call ' + esc(b.p) + '</a>' : '<span class="chip chip-warn">find number</span>';
      var web = b.w ? '<a class="btn btn-ghost" href="' + esc(b.w) + '" target="_blank" rel="noopener">Site</a>' : '';
      return '<div class="biz"><div class="biz-top"><div><h4>' + esc(b.n) + '</h4><div class="biz-town">' + esc(b.t) +
        ' <span class="chip">' + esc(b.k) + '</span>' + (b.d ? ' <span class="chip chip-gold">' + esc(b.d) + '</span>' : '') + '</div></div>' +
        '<span class="chip ' + (STATUS_CLS[status] || '') + '">' + esc(status) + '</span></div>' +
        '<p class="biz-notes">' + esc(b.s) + '</p><div class="btn-row">' + tel + web + '</div>' +
        '<div class="biz-ctl"><select data-status="' + id + '" aria-label="Status">' + STATUS.map(function (s) { return '<option' + (s === status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<span class="biz-when">' + esc(st.at || '') + '</span></div>' +
        '<textarea class="input" rows="2" data-bnote="' + id + '" placeholder="Who you spoke to · what they corrected · next date">' + esc(st.n || '') + '</textarea></div>';
    }).join('');
    var host = $('#route-out');
    host.innerHTML = html;
    $$('select[data-status]', host).forEach(function (sel) {
      sel.addEventListener('change', function () {
        var id = sel.getAttribute('data-status');
        S[id] = S[id] || {};
        S[id].s = sel.value;
        S[id].at = today();
        save();
        day(S.day || 0);
      });
    });
    $$('textarea[data-bnote]', host).forEach(function (t) {
      t.addEventListener('input', function () {
        var id = t.getAttribute('data-bnote');
        S[id] = S[id] || {};
        S[id].n = t.value;
        save();
      });
    });
  }
  day(typeof S.day === 'number' && ROUTE[S.day] ? S.day : 0);
  $('#export-log').addEventListener('click', function () {
    var rows = [['Business', 'Town', 'Kind', 'Status', 'Date', 'Note']];
    ROUTE.forEach(function (d) {
      d.biz.forEach(function (b) {
        var st = S[bid(b.n)] || {};
        if (st.s || st.n) rows.push([b.n, b.t, b.k, st.s || '', st.at || '', (st.n || '').replace(/\n/g, ' ')]);
      });
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    copy(csv, rows.length - 1 + ' rows copied as CSV');
  });
  $('#reset-device').addEventListener('click', function () {
    if (window.confirm('Clear all status, notes and scores saved on this device?')) {
      try { localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
      location.reload();
    }
  });

  // ------------------------------------------------------------------
  // SCORECARD
  // ------------------------------------------------------------------
  var sc = $('#score');
  SCORE.forEach(function (s, i) {
    var v = S['sc' + i] === undefined ? '' : S['sc' + i];
    var d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = '<p class="label">' + esc(s[0]) + (s[1] ? ' · target ' + s[1] : '') + '</p>' +
      '<input class="input" type="number" min="0" inputmode="numeric" value="' + esc(v) + '" aria-label="' + esc(s[0]) + '">' +
      (s[1] ? '<div class="bar"><i></i></div>' : '');
    sc.appendChild(d);
    var input = $('input', d);
    var bar = $('.bar i', d);
    var paint = function () { if (bar) bar.style.width = Math.min(100, Math.round((+input.value || 0) / s[1] * 100)) + '%'; };
    input.addEventListener('input', function () { S['sc' + i] = input.value; save(); paint(); });
    paint();
  });
})();
