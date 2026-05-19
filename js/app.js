(() => {
  const KEY = 'lava_carrierops_enterprise_v1';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const rules = window.CARRIER_RULES || {};

  const baseState = {
    session: null,
    policies: [],
    quotes: [],
    payments: [],
    endorsements: [],
    cancellations: [],
    remarketing: [],
    tasks: [],
    audit: [],
    logins: [],
    qaReviews: [],
    settings: { dark: false },
    counters: { auto: 0, home: 0, quote: 0, task: 0 }
  };

  let state = loadState();
  let currentRoute = 'dashboard';
  let currentLine = 'auto';
  let currentStep = 0;
  let currentQuote = blankQuote('auto');
  let lastQuoteResult = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindLogin();
    bindShellEvents();
    bindModuleForms();
    renderSession();
    renderQuoteCenter();
    if (state.session) showApp();
    else showLogin();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return mergeDeep(structuredClone(baseState), saved || {});
    } catch (e) {
      return structuredClone(baseState);
    }
  }
  function saveState() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function mergeDeep(target, source) {
    Object.keys(source || {}).forEach(k => {
      if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        target[k] = mergeDeep(target[k] || {}, source[k]);
      } else target[k] = source[k];
    });
    return target;
  }

  function showLogin() {
    $('#loginScreen').classList.remove('hidden');
    $('#appShell').classList.add('hidden');
  }
  function showApp() {
    $('#loginScreen').classList.add('hidden');
    $('#appShell').classList.remove('hidden');
    $('#appShell').classList.toggle('dark', !!state.settings.dark);
    renderSession();
    renderAll();
  }

  function bindLogin() {
    $('#loginRole').addEventListener('change', e => {
      $('#trainerCodeRow').classList.toggle('hidden', e.target.value !== 'Trainer');
    });
    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#loginName').value.trim();
      const role = $('#loginRole').value;
      const code = $('#trainerCode').value.trim();
      const team = $('#loginTeam').value.trim();
      if (!name) return notice('Please enter trainee name.', 'warning');
      if (role === 'Trainer' && code !== rules.trainerCode) return notice('Invalid Trainer/TL access code.', 'danger');
      state.session = { name, role, team, loginAt: new Date().toISOString() };
      state.logins.unshift({ name, role, team, loginAt: new Date().toISOString() });
      addAudit('Login', `${name} entered as ${role}${team ? ` (${team})` : ''}.`);
      saveState();
      showApp();
      notice(`Welcome, ${name}. Portal is ready.`, 'success');
    });
  }

  function bindShellEvents() {
    $$('.nav-item').forEach(btn => btn.addEventListener('click', () => openRoute(btn.dataset.route)));
    document.body.addEventListener('click', e => {
      const routeBtn = e.target.closest('[data-open-route]');
      if (routeBtn) {
        openRoute(routeBtn.dataset.openRoute);
        if (routeBtn.dataset.guideTarget) setTimeout(() => highlightGuide(routeBtn.dataset.guideTarget), 60);
      }
    });
    $('#logoutBtn').addEventListener('click', () => {
      if (state.session) addAudit('Logout', `${state.session.name} logged out.`);
      state.session = null;
      saveState();
      showLogin();
    });
    $('#darkModeBtn').addEventListener('click', () => {
      state.settings.dark = !state.settings.dark;
      saveState();
      $('#appShell').classList.toggle('dark', state.settings.dark);
    });
    $('#globalSearchBtn').addEventListener('click', () => {
      const q = $('#globalSearchInput').value.trim();
      openRoute('policy-search');
      $('#policySearchInput').value = q;
      searchPolicies(q);
    });
    $('#globalSearchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#globalSearchBtn').click();
    });
    $('#policySearchBtn').addEventListener('click', () => searchPolicies($('#policySearchInput').value.trim()));
    $('#policySearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#policySearchBtn').click(); });
    $('#showAllPoliciesBtn').addEventListener('click', () => searchPolicies(''));
    $('#clearAuditBtn').addEventListener('click', () => {
      if (confirm('Clear audit trail in this browser?')) {
        state.audit = [];
        saveState();
        renderDashboard();
      }
    });
    $('#queueFilter').addEventListener('change', renderWorkQueue);
    $('#queueSearch').addEventListener('input', renderWorkQueue);
    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#exportJsonBtn').addEventListener('click', exportJsonBackup);
    $('#importJsonInput').addEventListener('change', importJsonBackup);
    $('#downloadTrainerReportBtn').addEventListener('click', exportTrainerReport);
  }

  function bindModuleForms() {
    $('#paymentForm').addEventListener('submit', savePayment);
    $('#endorsementForm').addEventListener('submit', saveEndorsement);
    $('#cancellationForm').addEventListener('submit', saveCancellation);
    $('#remarketingForm').addEventListener('submit', saveRemarketing);
    $('#qaReviewForm').addEventListener('submit', saveQaReview);
    $('#loadIdPolicyBtn').addEventListener('click', loadIdPolicy);
    $('#generateIdCardBtn').addEventListener('click', generateIdCard);
    $('#printIdCardBtn').addEventListener('click', () => window.print());
  }

  function openRoute(route) {
    currentRoute = route;
    $$('.route').forEach(r => r.classList.remove('active-route'));
    $('#' + route).classList.add('active-route');
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.route === route));
    const titles = {
      dashboard: 'Carrier Operations Dashboard',
      'policy-search': 'Policy Search',
      'quote-center': 'New Business Quote Center',
      'id-cards': 'Auto Insurance ID Card Generator',
      payments: 'Payment Center',
      endorsements: 'Endorsement Processing',
      cancellations: 'Policy Cancellation Workflow',
      remarketing: 'Quoting & Remarketing',
      'work-queue': 'Work Queue',
      'trainer-center': 'Trainer Center',
      'sop-guide': 'SOP Guide'
    };
    $('#pageTitle').textContent = titles[route] || 'CarrierOps';
    $('#activeModuleLabel').textContent = route.replace(/-/g, ' ');
    renderAll();
  }

  function renderAll() {
    renderSession();
    renderDashboard();
    renderPolicySearchDefault();
    renderPaymentHistory();
    renderEndorsementHistory();
    renderCancellationHistory();
    renderRemarketingHistory();
    renderWorkQueue();
    renderTrainerCenter();
    renderIdPolicyOptions();
  }

  function renderSession() {
    if (!state.session) return;
    $('#sessionUserName').textContent = state.session.name;
    $('#sessionUserRole').textContent = state.session.role;
    $('#sessionUserInitials').textContent = initials(state.session.name);
    $$('.trainer-only').forEach(el => el.classList.toggle('hidden', state.session.role !== 'Trainer'));
  }

  function notice(msg, type = 'info') {
    const bar = $('#noticeBar');
    bar.textContent = msg;
    bar.className = `notice ${type}`;
    bar.classList.remove('hidden');
    clearTimeout(window.__noticeTimer);
    window.__noticeTimer = setTimeout(() => bar.classList.add('hidden'), 5200);
  }

  function addAudit(type, message) {
    state.audit.unshift({ id: uid('AUD'), type, message, user: state.session?.name || 'System', at: new Date().toISOString() });
    state.audit = state.audit.slice(0, 200);
    saveState();
  }
  function addTask(type, reference, insured, description, status = 'Open') {
    state.counters.task += 1;
    const task = { id: `TASK-${String(state.counters.task).padStart(5, '0')}`, type, reference, insured, description, status, owner: state.session?.name || 'Unassigned', createdAt: new Date().toISOString() };
    state.tasks.unshift(task);
    saveState();
    return task;
  }

  function renderDashboard() {
    const activePolicies = state.policies.filter(p => p.status === 'Active').length;
    const openTasks = state.tasks.filter(t => t.status !== 'Closed' && t.status !== 'Completed').length;
    const pendingEnd = state.endorsements.filter(e => !/Approved|Declined/.test(e.status)).length;
    const stats = [
      ['Active Policies', activePolicies],
      ['Saved Quotes', state.quotes.length],
      ['Open Queue', openTasks],
      ['Pending Endorsements', pendingEnd]
    ];
    $('#dashboardStats').innerHTML = stats.map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const open = state.tasks.filter(t => t.status !== 'Closed' && t.status !== 'Completed').slice(0, 8);
    $('#dashboardQueue').innerHTML = open.length ? table(['Type','Reference','Insured','Status'], open.map(t => [t.type, t.reference || '-', t.insured || '-', statusPill(t.status)])) : empty('No open training tasks yet. Create a quote, payment, endorsement, cancellation, or remarketing task.');
    $('#dashboardAudit').innerHTML = state.audit.slice(0, 15).map(a => `<div class="timeline-item"><strong>${a.type}</strong><span>${escapeHtml(a.message)}</span><small>${formatDateTime(a.at)} · ${escapeHtml(a.user)}</small></div>`).join('') || empty('No activity yet.');
  }

  function renderPolicySearchDefault() {
    if (currentRoute !== 'policy-search') return;
    if (!$('#policySearchResults').innerHTML.trim()) searchPolicies('');
  }
  function searchPolicies(query) {
    const q = (query || '').toLowerCase();
    const results = state.policies.filter(p => !q || p.policyNo.toLowerCase().includes(q) || p.insuredName.toLowerCase().includes(q));
    const container = $('#policySearchResults');
    $('#policyDetailPanel').classList.add('hidden');
    if (!results.length) {
      container.innerHTML = empty('No policies found. This portal has no sample customer data. Create and bind a training quote first.');
      return;
    }
    container.innerHTML = results.map(policyCard).join('');
    $$('.view-policy-btn', container).forEach(btn => btn.addEventListener('click', () => showPolicyDetail(btn.dataset.policy)));
    $$('.service-policy-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.service;
        const p = findPolicy(btn.dataset.policy);
        openRoute(target);
        prefillServicePolicy(target, p?.policyNo || '');
      });
    });
  }

  function policyCard(p) {
    return `<article class="result-card">
      <h4>${escapeHtml(p.insuredName)}</h4>
      <div class="premium">${escapeHtml(p.policyNo)}</div>
      <div class="meta-row"><span class="pill info">${p.lineLabel}</span>${statusPill(p.status)}<span class="pill">Eff ${formatDate(p.effectiveDate)}</span></div>
      <p class="muted">Premium: ${money(p.premium)} · Exp: ${formatDate(p.expirationDate)}</p>
      <div class="actions-row">
        <button class="secondary-btn view-policy-btn" data-policy="${p.policyNo}">View</button>
        ${p.line === 'auto' ? `<button class="ghost-btn service-policy-btn" data-service="id-cards" data-policy="${p.policyNo}">ID Card</button>` : ''}
        <button class="ghost-btn service-policy-btn" data-service="payments" data-policy="${p.policyNo}">Payment</button>
        <button class="ghost-btn service-policy-btn" data-service="endorsements" data-policy="${p.policyNo}">Endorse</button>
        <button class="danger-ghost service-policy-btn" data-service="cancellations" data-policy="${p.policyNo}">Cancel</button>
      </div>
    </article>`;
  }

  function showPolicyDetail(policyNo) {
    const p = findPolicy(policyNo);
    if (!p) return;
    const panel = $('#policyDetailPanel');
    panel.classList.remove('hidden');
    const data = p.data || {};
    panel.innerHTML = `<div class="panel-header"><div><p class="eyebrow">Policy Detail</p><h3>${escapeHtml(p.policyNo)} · ${escapeHtml(p.insuredName)}</h3></div><button class="secondary-btn" id="printPolicyDetailBtn">Print</button></div>
      <div class="summary-grid">
        ${summaryItem('Line', p.lineLabel)}${summaryItem('Status', p.status)}${summaryItem('Effective', formatDate(p.effectiveDate))}${summaryItem('Expiration', formatDate(p.expirationDate))}${summaryItem('Premium', money(p.premium))}${summaryItem('Phone', data.insured?.phone || '-')}${summaryItem('Email', data.insured?.email || '-')}${summaryItem('Address', mailingAddress(data))}
      </div>
      <h4>Risk Snapshot</h4>
      ${riskSnapshot(p)}
      <h4>Related Activity</h4>
      ${relatedActivityTable(p.policyNo)}`;
    $('#printPolicyDetailBtn').addEventListener('click', () => window.print());
  }

  function riskSnapshot(p) {
    if (p.line === 'auto') {
      const d = p.data || {};
      return `<div class="summary-grid">${summaryItem('Drivers', (d.drivers || []).length)}${summaryItem('Vehicles', (d.vehicles || []).length)}${summaryItem('BI Limit', d.coverage?.bodilyInjury || '-')}${summaryItem('PD Limit', d.coverage?.propertyDamage || '-')}</div>`;
    }
    const d = p.data || {};
    return `<div class="summary-grid">${summaryItem('Year Built', d.property?.yearBuilt || '-')}${summaryItem('Roof Year', d.construction?.roofYear || '-')}${summaryItem('Dwelling', money(Number(d.coverage?.dwelling || 0)))}${summaryItem('Deductible', d.coverage?.deductible || '-')}</div>`;
  }
  function relatedActivityTable(policyNo) {
    const rows = [
      ...state.payments.filter(x => x.policyNo === policyNo).map(x => ['Payment', x.paymentType, money(Number(x.amount)), formatDateTime(x.createdAt)]),
      ...state.endorsements.filter(x => x.policyNo === policyNo).map(x => ['Endorsement', x.endorsementType, x.status, formatDateTime(x.createdAt)]),
      ...state.cancellations.filter(x => x.policyNo === policyNo).map(x => ['Cancellation', x.reason, x.status, formatDateTime(x.createdAt)]),
      ...state.remarketing.filter(x => x.policyNo === policyNo).map(x => ['Remarketing', x.reason, x.status, formatDateTime(x.createdAt)])
    ];
    return rows.length ? table(['Activity','Type','Status/Amount','Date'], rows) : empty('No servicing activity recorded yet.');
  }

  function prefillServicePolicy(route, policyNo) {
    const map = {
      payments: '#paymentForm [name="policyNo"]', endorsements: '#endorsementForm [name="policyNo"]', cancellations: '#cancellationForm [name="policyNo"]', remarketing: '#remarketingForm [name="policyNo"]', 'id-cards': '#idPolicyNo'
    };
    const input = $(map[route]);
    if (input) input.value = policyNo;
  }

  function renderQuoteCenter() {
    $$('.segment').forEach(btn => btn.addEventListener('click', () => {
      gatherQuoteForm();
      currentLine = btn.dataset.quoteLine;
      currentStep = 0;
      currentQuote = blankQuote(currentLine);
      lastQuoteResult = null;
      $$('.segment').forEach(b => b.classList.toggle('active', b === btn));
      $('#quoteResultPanel').classList.add('hidden');
      buildQuoteForm();
    }));
    buildQuoteForm();
  }

  function blankQuote(line) {
    return { line, account: {}, insured: {}, address: {}, property: {}, construction: {}, prior: {}, drivers: [], vehicles: [], coverage: {}, hazards: {}, uw: {}, docs: {}, notes: '' };
  }

  function buildQuoteForm() {
    const steps = rules.quoteSteps[currentLine];
    $('#quoteStepper').innerHTML = steps.map((s, i) => `<button class="step-btn ${i === currentStep ? 'active' : ''}" data-step="${i}"><span>${i+1}</span>${s.label}</button>`).join('');
    $('#quoteForm').innerHTML = currentLine === 'auto' ? autoFormHtml() : homeFormHtml();
    bindQuoteFormEvents();
    showStep(currentStep);
  }

  function bindQuoteFormEvents() {
    $$('.step-btn').forEach(btn => btn.addEventListener('click', () => { gatherQuoteForm(); showStep(Number(btn.dataset.step)); }));
    $$('.prev-step').forEach(btn => btn.addEventListener('click', () => { gatherQuoteForm(); showStep(Math.max(0, currentStep - 1)); }));
    $$('.next-step').forEach(btn => btn.addEventListener('click', () => { gatherQuoteForm(); showStep(Math.min(rules.quoteSteps[currentLine].length - 1, currentStep + 1)); }));
    $$('.rate-quote-btn').forEach(btn => btn.addEventListener('click', rateQuote));
    $$('.reset-quote-btn').forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Clear current blank quote form?')) { currentQuote = blankQuote(currentLine); lastQuoteResult = null; buildQuoteForm(); $('#quoteResultPanel').classList.add('hidden'); }
    }));
    $$('.add-driver-btn').forEach(btn => btn.addEventListener('click', () => { gatherQuoteForm(); currentQuote.drivers.push({}); buildQuoteForm(); showStepByKey('drivers'); }));
    $$('.add-vehicle-btn').forEach(btn => btn.addEventListener('click', () => { gatherQuoteForm(); currentQuote.vehicles.push({}); buildQuoteForm(); showStepByKey('vehicles'); }));
    $$('.remove-entry').forEach(btn => btn.addEventListener('click', () => {
      gatherQuoteForm();
      currentQuote[btn.dataset.collection].splice(Number(btn.dataset.index), 1);
      buildQuoteForm(); showStepByKey(btn.dataset.collection);
    }));
    $('#quoteForm').addEventListener('input', debounce(() => gatherQuoteForm(), 250));
  }

  function showStep(index) {
    currentStep = index;
    $$('.step-section').forEach((sec, i) => sec.classList.toggle('active', i === index));
    $$('.step-btn').forEach((btn, i) => btn.classList.toggle('active', i === index));
  }
  function showStepByKey(key) {
    const idx = rules.quoteSteps[currentLine].findIndex(s => s.key === key);
    showStep(Math.max(0, idx));
  }

  function field(label, path, type = 'text', options = null, placeholder = '', required = false) {
    const val = getPath(currentQuote, path) ?? '';
    const req = required ? 'required' : '';
    if (options) return `<label>${label}${required ? ' *' : ''}<select data-path="${path}" ${req}><option value="">Select</option>${options.map(o => `<option ${String(val) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
    if (type === 'textarea') return `<label>${label}${required ? ' *' : ''}<textarea data-path="${path}" rows="4" placeholder="${placeholder}" ${req}>${escapeHtml(val)}</textarea></label>`;
    return `<label>${label}${required ? ' *' : ''}<input data-path="${path}" type="${type}" value="${escapeAttr(val)}" placeholder="${placeholder}" ${req}></label>`;
  }
  function yesNo(label, path) { return field(label, path, 'text', ['No','Yes'], '', true); }
  function check(label, path) {
    const val = !!getPath(currentQuote, path);
    return `<label><input data-path="${path}" type="checkbox" ${val ? 'checked' : ''}> ${label}</label>`;
  }
  function wizardActions(isLast = false) {
    return `<div class="wizard-actions"><button type="button" class="ghost-btn prev-step">Back</button><div class="actions-row"><button type="button" class="danger-ghost reset-quote-btn">Clear Form</button>${isLast ? '<button type="button" class="primary-btn rate-quote-btn">Run Carrier Rating</button>' : '<button type="button" class="primary-btn next-step">Continue</button>'}</div></div>`;
  }
  function section(key, title, desc, content, isLast = false) {
    return `<section class="step-section" data-step-key="${key}"><div class="section-title"><div><h4>${title}</h4><p>${desc}</p></div></div>${content}${wizardActions(isLast)}</section>`;
  }

  function autoFormHtml() {
    const states = rules.states || [];
    return [
      section('account','Account Setup','Carrier transaction and agency workflow information.', `<div class="form-grid three">${field('Transaction Type','account.transactionType','text',['New Business Quote','Rewrite','Remarket Quote'],'',true)}${field('Requested Effective Date','account.effectiveDate','date',null,'',true)}${field('Policy Term','account.term','text',['6 Months','12 Months'],'',true)}${field('Agency Code','account.agencyCode','text',null,'Example: LAVA-PL','')}${field('Producer / CSR','account.producer','text',null,'Producer or VA name','')}${field('Quote Source','account.source','text',['Phone','Email','Website','Renewal Review','Walk-in'],'',true)}</div>`),
      section('insured','Named Insured','Enter the person/entity that will be listed on the policy.', `<div class="form-grid three">${field('First Name','insured.firstName','text',null,'',true)}${field('Last Name','insured.lastName','text',null,'',true)}${field('Date of Birth','insured.dob','date',null,'',true)}${field('Email','insured.email','email',null,'insured@email.com',true)}${field('Phone','insured.phone','tel',null,'',true)}${field('Marital Status','insured.maritalStatus','text',['Single','Married','Divorced','Widowed'],'',true)}${field('Occupation','insured.occupation','text',null,'')}${field('Residence Type','insured.residenceType','text',['Own Home','Rent','Live with Family','Condo Owner'],'')}${field('Credit / Insurance Score Tier','insured.scoreTier','text',['Preferred','Standard','Needs Review','Unknown'],'')}</div>`),
      section('address','Mailing and Garaging Address','Carrier systems usually require a mailing address and garaging location.', `<div class="form-grid three">${field('Mailing Street','address.mailingStreet','text',null,'',true)}${field('City','address.city','text',null,'',true)}${field('State','address.state','text',states,'',true)}${field('ZIP','address.zip','text',null,'',true)}${field('County','address.county','text',null,'')}${field('Is garaging address same as mailing?','address.garageSame','text',['Yes','No'],'',true)}${field('Garaging Street','address.garageStreet','text',null,'Required if different')}${field('Garaging City','address.garageCity','text',null,'')}${field('Garaging ZIP','address.garageZip','text',null,'')}</div>`),
      section('prior','Prior Insurance','Ask exact carrier-style prior policy and lapse questions.', `<div class="form-grid three">${field('Currently Insured?','prior.currentlyInsured','text',['Yes','No'],'',true)}${field('Current / Prior Carrier','prior.currentCarrier','text',null,'',true)}${field('Prior Policy Number','prior.priorPolicyNo','text',null,'')}${field('Years Continuous Insurance','prior.continuousYears','number',null,'0',true)}${field('Lapse Days','prior.lapseDays','number',null,'0',true)}${field('Prior BI Limits','prior.priorBI','text',['State Minimum','25/50','50/100','100/300','250/500','Unknown'],'',true)}${yesNo('Prior cancellation or non-renewal?','prior.cancelNonRenewal')}${yesNo('Cancelled for non-payment in last 36 months?','prior.cancelNonPay')}${yesNo('Any coverage gap within last 12 months?','prior.coverageGap')}</div>`),
      section('drivers','Drivers / Household Members','Add all licensed drivers and household members required by carrier underwriting.', `${driverEntriesHtml()}<div class="inline-table-actions"><button type="button" class="secondary-btn add-driver-btn">Add Driver / Household Member</button></div>`),
      section('vehicles','Vehicles','Add each vehicle and required garaging/usage details.', `${vehicleEntriesHtml()}<div class="inline-table-actions"><button type="button" class="secondary-btn add-vehicle-btn">Add Vehicle</button></div>`),
      section('coverage','Coverage Selection','Select requested limits, deductibles, and optional coverages.', `<div class="form-grid three">${field('Bodily Injury Liability','coverage.bodilyInjury','text',rules.autoCoverages.bodilyInjury,'',true)}${field('Property Damage Liability','coverage.propertyDamage','text',rules.autoCoverages.propertyDamage,'',true)}${field('Uninsured / Underinsured Motorist','coverage.umUim','text',rules.autoCoverages.uninsuredMotorist,'',true)}${field('Medical Payments','coverage.medPay','text',rules.autoCoverages.medPay,'',true)}${field('Comprehensive Deductible','coverage.compDeductible','text',rules.autoCoverages.deductibles,'',true)}${field('Collision Deductible','coverage.collDeductible','text',rules.autoCoverages.deductibles,'',true)}${field('Rental Reimbursement','coverage.rental','text',['Reject','30/900','40/1200','50/1500'],'',true)}${field('Roadside Assistance','coverage.roadside','text',['Reject','Accept'],'',true)}${field('Paperless / AutoPay Discount','coverage.billingDiscount','text',['None','Paperless','AutoPay','Paperless + AutoPay'],'')}</div>`),
      section('uw','Carrier Underwriting Questions','These questions drive referral, decline, and training QA flags.', `<div class="inline-checks">${check('Any driver has DUI, reckless driving, or major violation in last 5 years','uw.majorViolation')}${check('Any driver requires SR-22 / FR-44 filing','uw.sr22')}${check('Any suspended, revoked, or international-only license','uw.licenseIssue')}${check('Vehicle used for delivery, rideshare, or livery','uw.deliveryRideshare')}${check('Business use beyond commuting','uw.businessUse')}${check('Any excluded driver requested','uw.excludedDriver')}${check('Any undisclosed household member','uw.undisclosedHousehold')}${check('Any vehicle with salvage, rebuilt, or branded title','uw.salvageTitle')}${check('Any custom equipment over $2,500','uw.customEquipment')}${check('Any prior fraud, material misrepresentation, or policy voidance','uw.fraudConcern')}</div><div class="checklist-box"><strong>Required Documents</strong>${check('Current declarations page collected','docs.decPage')}${check('Driver license information verified','docs.driverLicense')}${check('VIN verified','docs.vinVerified')}${check('Signed UM/UIM rejection if applicable','docs.umRejection')}${check('Payment method discussed','docs.paymentDiscussed')}</div>${field('Underwriting Notes','notes','textarea',null,'Write details that a CSR would document in the carrier portal.')}`, true),
      section('review','Review & Rate','Review missing data and run simulated carrier rating.', `<div id="quoteReviewBox">${quoteReviewHtml()}</div>`, true)
    ].join('');
  }

  function driverEntriesHtml() {
    if (!currentQuote.drivers.length) return `<div class="empty">No drivers added yet. Real carrier portals require at least one rated driver.</div>`;
    return currentQuote.drivers.map((d, i) => `<div class="entry-card"><div class="entry-card-header"><strong>Driver / Household Member ${i+1}</strong><button type="button" class="remove-entry" data-collection="drivers" data-index="${i}">Remove</button></div><div class="form-grid three">
      ${collField('First Name','drivers',i,'firstName','text','',true)}${collField('Last Name','drivers',i,'lastName','text','',true)}${collField('DOB','drivers',i,'dob','date','',true)}${collSelect('Relationship','drivers',i,'relationship',['Named Insured','Spouse','Child','Parent','Roommate','Other Household Member'],true)}${collSelect('License Status','drivers',i,'licenseStatus',['Valid','Permit','Suspended','Revoked','International','Unlicensed Household Member'],true)}${collField('License State','drivers',i,'licenseState','text','',true)}${collField('Years Licensed','drivers',i,'yearsLicensed','number','0',true)}${collField('Accidents Last 5 Years','drivers',i,'accidents','number','0',true)}${collField('Violations Last 5 Years','drivers',i,'violations','number','0',true)}${collSelect('Driver Type','drivers',i,'driverType',['Rated','Excluded','Non-Driver','Deferred'],true)}${collSelect('Good Student','drivers',i,'goodStudent',['No','Yes','N/A'])}${collSelect('Defensive Driver','drivers',i,'defensiveDriver',['No','Yes'])}
    </div></div>`).join('');
  }
  function vehicleEntriesHtml() {
    if (!currentQuote.vehicles.length) return `<div class="empty">No vehicles added yet. Add a vehicle to rate an Auto quote.</div>`;
    return currentQuote.vehicles.map((v, i) => `<div class="entry-card"><div class="entry-card-header"><strong>Vehicle ${i+1}</strong><button type="button" class="remove-entry" data-collection="vehicles" data-index="${i}">Remove</button></div><div class="form-grid three">
      ${collField('VIN','vehicles',i,'vin','text','17-character VIN',true)}${collField('Year','vehicles',i,'year','number','',true)}${collField('Make','vehicles',i,'make','text','',true)}${collField('Model','vehicles',i,'model','text','',true)}${collSelect('Vehicle Use','vehicles',i,'usage',['Pleasure','Commute','Business','Farm','Delivery/Rideshare'],true)}${collField('Annual Mileage','vehicles',i,'annualMiles','number','',true)}${collSelect('Ownership','vehicles',i,'ownership',['Owned','Financed','Leased'],true)}${collField('Lienholder / Lessor','vehicles',i,'lienholder','text','If applicable')}${collSelect('Comprehensive/Collision','vehicles',i,'physicalDamage',['Liability Only','Comp Only','Comp + Collision'],true)}${collSelect('Anti-Theft','vehicles',i,'antiTheft',['None','Factory','Passive Alarm','Tracking Device'])}${collSelect('Garaging Confirmation','vehicles',i,'garagingConfirmed',['Yes','No'],true)}${collField('Primary Driver','vehicles',i,'primaryDriver','text','Driver name')}
    </div></div>`).join('');
  }

  function homeFormHtml() {
    const states = rules.states || [];
    return [
      section('account','Account Setup','Carrier transaction and policy term details.', `<div class="form-grid three">${field('Transaction Type','account.transactionType','text',['New Business Quote','Rewrite','Remarket Quote'],'',true)}${field('Requested Effective Date','account.effectiveDate','date',null,'',true)}${field('Policy Form','account.form','text',['HO3 Owner Occupied','HO5 Enhanced','HO6 Condo','DP3 Rental Dwelling'],'',true)}${field('Agency Code','account.agencyCode','text',null,'Example: LAVA-HO','')}${field('Producer / CSR','account.producer','text',null,'')}${field('Quote Source','account.source','text',['Phone','Email','Website','Renewal Review','Referral'],'',true)}</div>`),
      section('insured','Named Insured','Enter customer contact and underwriting information.', `<div class="form-grid three">${field('First Name','insured.firstName','text',null,'',true)}${field('Last Name','insured.lastName','text',null,'',true)}${field('Date of Birth','insured.dob','date',null,'',true)}${field('Email','insured.email','email',null,'insured@email.com',true)}${field('Phone','insured.phone','tel',null,'',true)}${field('Marital Status','insured.maritalStatus','text',['Single','Married','Divorced','Widowed'],'',true)}${field('Occupation','insured.occupation','text',null,'')}${field('Insurance Score Tier','insured.scoreTier','text',['Preferred','Standard','Needs Review','Unknown'],'')}${field('Years at Current Residence','insured.yearsAtResidence','number',null,'0')}</div>`),
      section('property','Property Location','Enter risk address and occupancy details.', `<div class="form-grid three">${field('Property Street','property.street','text',null,'',true)}${field('City','property.city','text',null,'',true)}${field('State','property.state','text',states,'',true)}${field('ZIP','property.zip','text',null,'',true)}${field('County','property.county','text',null,'')}${field('Occupancy','property.occupancy','text',['Primary Residence','Secondary Residence','Seasonal','Tenant Occupied','Vacant'],'',true)}${field('Purchase Date','property.purchaseDate','date')}${field('Purchase Price','property.purchasePrice','number')}${field('Is mailing address same as property?','property.mailingSame','text',['Yes','No'],'',true)}</div>`),
      section('construction','Property Characteristics','Carrier rating questions for construction, roof, and protection class.', `<div class="form-grid three">${field('Year Built','construction.yearBuilt','number',null,'',true)}${field('Square Footage','construction.squareFeet','number',null,'',true)}${field('Construction Type','construction.type','text',['Frame','Masonry','Brick Veneer','Superior Construction','Manufactured Home'],'',true)}${field('Roof Year','construction.roofYear','number',null,'',true)}${field('Roof Type','construction.roofType','text',['Composition Shingle','Metal','Tile','Slate','Wood Shake','Flat / Tar'],'',true)}${field('Electrical Updated Year','construction.electricalYear','number')}${field('Plumbing Updated Year','construction.plumbingYear','number')}${field('HVAC Updated Year','construction.hvacYear','number')}${field('Protection Class','construction.protectionClass','text',['1','2','3','4','5','6','7','8','9','10','Unknown'],'',true)}${field('Distance to Fire Hydrant','construction.hydrantDistance','text',['Under 500 ft','501-1000 ft','Over 1000 ft','Unknown'],'',true)}${field('Distance to Fire Station','construction.stationDistance','text',['Under 5 miles','5-10 miles','Over 10 miles','Unknown'],'',true)}${field('Foundation','construction.foundation','text',['Slab','Crawlspace','Basement','Pier and Beam','Other'],'')}</div>`),
      section('prior','Prior Insurance & Claims','Carrier questions for prior home insurance and loss history.', `<div class="form-grid three">${field('Currently Insured?','prior.currentlyInsured','text',['Yes','No'],'',true)}${field('Current / Prior Carrier','prior.currentCarrier','text',null,'',true)}${field('Prior Policy Number','prior.priorPolicyNo','text')}${field('Years Continuous Insurance','prior.continuousYears','number',null,'0',true)}${field('Lapse Days','prior.lapseDays','number',null,'0',true)}${field('Claims Last 5 Years','prior.claimCount','number',null,'0',true)}${field('Total Claim Amount','prior.claimAmount','number',null,'0')}${yesNo('Prior cancellation or non-renewal?','prior.cancelNonRenewal')}${yesNo('Mortgagee escrow billed?','prior.escrowBilled')}</div>`),
      section('coverage','Coverage Selection','Coverage limits, deductible, and endorsements.', `<div class="form-grid three">${field('Coverage A - Dwelling','coverage.dwelling','text',rules.homeCoverages.dwelling,'',true)}${field('Other Structures %','coverage.otherStructures','text',['10%','20%','30%'],'',true)}${field('Personal Property %','coverage.personalProperty','text',['50%','60%','70%','75%'],'',true)}${field('Loss of Use %','coverage.lossOfUse','text',['20%','30%','40%'],'',true)}${field('Personal Liability','coverage.liability','text',rules.homeCoverages.liability,'',true)}${field('Medical Payments','coverage.medPay','text',['1,000','2,000','5,000','10,000'],'',true)}${field('All Other Perils Deductible','coverage.deductible','text',rules.homeCoverages.deductible,'',true)}${field('Wind / Hail Deductible','coverage.windDeductible','text',['Same as AOP','1%','2%','5%','Excluded'],'',true)}${field('Water Backup','coverage.waterBackup','text',['Reject','5,000','10,000','25,000','50,000'],'',true)}</div><div class="inline-checks">${check('Replacement Cost Contents','coverage.replacementCostContents')}${check('Equipment Breakdown','coverage.equipmentBreakdown')}${check('Service Line Coverage','coverage.serviceLine')}${check('Scheduled Personal Property','coverage.scheduledProperty')}</div>`),
      section('hazards','Risk Hazards','Property hazards that can trigger referral or ineligibility.', `<div class="inline-checks">${check('Swimming pool on premises','hazards.pool')}${check('Pool is unfenced or has diving board/slide','hazards.poolUnsafe')}${check('Trampoline on premises','hazards.trampoline')}${check('Dog or animal exposure','hazards.dog')}${check('Dog breed requiring underwriting review','hazards.dogBreedConcern')}${check('Wood stove / solid fuel heat','hazards.woodStove')}${check('Business conducted from home','hazards.business')}${check('Short-term rental / Airbnb exposure','hazards.shortTermRental')}${check('Vacant or undergoing renovation','hazards.vacantRenovation')}${check('Prior sinkhole/flood/earth movement concern','hazards.earthMovement')}</div>`),
      section('uw','Carrier Underwriting Questions','Additional carrier questions and documents.', `<div class="inline-checks">${check('Property has open claims or unrepaired damage','uw.openDamage')}${check('Roof shows age, damage, or unknown condition','uw.roofConcern')}${check('Home has knob-and-tube, aluminum wiring, or fuse panel','uw.electricalConcern')}${check('Polybutylene plumbing or major plumbing issue','uw.plumbingConcern')}${check('Applicant has prior fraud or misrepresentation concern','uw.fraudConcern')}${check('Mortgagee/lender clause needs to be added','uw.mortgageeRequired')}</div><div class="checklist-box"><strong>Required Documents</strong>${check('Replacement cost estimator completed','docs.rce')}${check('Photos or inspection documents collected','docs.photos')}${check('Current declarations page collected','docs.decPage')}${check('Mortgagee information verified','docs.mortgagee')}${check('Loss history/claims reviewed','docs.lossHistory')}</div>${field('Underwriting Notes','notes','textarea',null,'Document roof details, updates, claims, hazards, and follow-up items.')}`, true),
      section('review','Review & Rate','Review missing data and run simulated carrier rating.', `<div id="quoteReviewBox">${quoteReviewHtml()}</div>`, true)
    ].join('');
  }

  function collField(label, collection, index, fieldName, type='text', placeholder='', required=false) {
    const val = currentQuote[collection]?.[index]?.[fieldName] ?? '';
    return `<label>${label}${required ? ' *' : ''}<input data-collection="${collection}" data-index="${index}" data-field="${fieldName}" type="${type}" value="${escapeAttr(val)}" placeholder="${placeholder}" ${required ? 'required' : ''}></label>`;
  }
  function collSelect(label, collection, index, fieldName, options, required=false) {
    const val = currentQuote[collection]?.[index]?.[fieldName] ?? '';
    return `<label>${label}${required ? ' *' : ''}<select data-collection="${collection}" data-index="${index}" data-field="${fieldName}" ${required ? 'required' : ''}><option value="">Select</option>${options.map(o => `<option ${String(val) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`;
  }

  function gatherQuoteForm() {
    const form = $('#quoteForm');
    if (!form) return currentQuote;
    $$('[data-path]', form).forEach(input => {
      setPath(currentQuote, input.dataset.path, input.type === 'checkbox' ? input.checked : input.value);
    });
    $$('[data-collection]', form).forEach(input => {
      const c = input.dataset.collection;
      const i = Number(input.dataset.index);
      const f = input.dataset.field;
      if (!currentQuote[c]) currentQuote[c] = [];
      if (!currentQuote[c][i]) currentQuote[c][i] = {};
      currentQuote[c][i][f] = input.type === 'checkbox' ? input.checked : input.value;
    });
    return currentQuote;
  }

  function quoteReviewHtml() {
    const req = requiredMissing(currentQuote, currentLine);
    return `<div class="summary-grid">${summaryItem('Line', currentLine === 'auto' ? 'Personal Auto' : 'Homeowners')}${summaryItem('Named Insured', insuredName(currentQuote) || 'Not entered')}${summaryItem('Effective Date', currentQuote.account.effectiveDate || 'Not entered')}${summaryItem('Missing Required Items', req.length)}</div>${req.length ? `<div class="risk-flags">${req.slice(0,10).map(r => `<div class="flag">Missing: ${escapeHtml(r)}</div>`).join('')}</div>` : '<div class="risk-flags"><div class="flag clean">Required training data looks complete enough to rate.</div></div>'}`;
  }

  function rateQuote() {
    gatherQuoteForm();
    const missing = requiredMissing(currentQuote, currentLine);
    if (missing.length) {
      $('#quoteResultPanel').classList.remove('hidden');
      $('#quoteResultPanel').innerHTML = `<div class="panel-header"><div><p class="eyebrow">Rating Validation</p><h3>Carrier cannot rate yet</h3></div></div><p class="muted">Complete the required fields below before rating.</p><div class="risk-flags">${missing.map(m => `<div class="flag">${escapeHtml(m)}</div>`).join('')}</div>`;
      notice('Please complete required rating fields.', 'warning');
      return;
    }
    const result = currentLine === 'auto' ? rateAuto(currentQuote) : rateHome(currentQuote);
    lastQuoteResult = result;
    renderQuoteResult(result);
    addAudit('Quote Rated', `${insuredName(currentQuote)} rated as ${result.status} with risk score ${result.riskScore}.`);
    saveState();
  }

  function requiredMissing(q, line) {
    const missing = [];
    const need = (label, value) => { if (value === undefined || value === null || String(value).trim() === '') missing.push(label); };
    need('Effective date', q.account?.effectiveDate);
    need('First name', q.insured?.firstName);
    need('Last name', q.insured?.lastName);
    need('Email', q.insured?.email);
    need('Phone', q.insured?.phone);
    if (line === 'auto') {
      need('Mailing street', q.address?.mailingStreet); need('City', q.address?.city); need('State', q.address?.state); need('ZIP', q.address?.zip);
      need('Currently insured answer', q.prior?.currentlyInsured); need('Years continuous insurance', q.prior?.continuousYears); need('Lapse days', q.prior?.lapseDays);
      if (!q.drivers?.length) missing.push('At least one driver');
      q.drivers?.forEach((d,i)=>{ need(`Driver ${i+1} first name`, d.firstName); need(`Driver ${i+1} last name`, d.lastName); need(`Driver ${i+1} DOB`, d.dob); need(`Driver ${i+1} license status`, d.licenseStatus); });
      if (!q.vehicles?.length) missing.push('At least one vehicle');
      q.vehicles?.forEach((v,i)=>{ need(`Vehicle ${i+1} VIN`, v.vin); need(`Vehicle ${i+1} year`, v.year); need(`Vehicle ${i+1} make`, v.make); need(`Vehicle ${i+1} model`, v.model); need(`Vehicle ${i+1} use`, v.usage); });
      need('BI limit', q.coverage?.bodilyInjury); need('PD limit', q.coverage?.propertyDamage);
    } else {
      need('Property street', q.property?.street); need('Property city', q.property?.city); need('Property state', q.property?.state); need('Property ZIP', q.property?.zip); need('Occupancy', q.property?.occupancy);
      need('Year built', q.construction?.yearBuilt); need('Square footage', q.construction?.squareFeet); need('Roof year', q.construction?.roofYear); need('Roof type', q.construction?.roofType);
      need('Currently insured answer', q.prior?.currentlyInsured); need('Claims last 5 years', q.prior?.claimCount);
      need('Dwelling coverage', q.coverage?.dwelling); need('Liability', q.coverage?.liability); need('Deductible', q.coverage?.deductible);
    }
    return missing;
  }

  function rateAuto(q) {
    let score = 0; const flags = [];
    const lapse = Number(q.prior.lapseDays || 0);
    const years = Number(q.prior.continuousYears || 0);
    if (q.prior.currentlyInsured === 'No') { score += 18; flags.push(['Referral','No current prior insurance.']); }
    if (lapse > 30) { score += 25; flags.push(['Referral','Insurance lapse over 30 days.']); }
    else if (lapse > 0) { score += 10; flags.push(['Review','Insurance lapse disclosed.']); }
    if (years >= 3) score -= 8;
    if (q.prior.cancelNonPay === 'Yes' || q.prior.cancelNonRenewal === 'Yes') { score += 18; flags.push(['Referral','Prior cancellation/non-payment disclosed.']); }
    (q.drivers || []).forEach(d => {
      score += Number(d.accidents || 0) * 12 + Number(d.violations || 0) * 9;
      if (d.licenseStatus && d.licenseStatus !== 'Valid') { score += 20; flags.push(['Referral', `${d.firstName || 'Driver'} license status is ${d.licenseStatus}.`]); }
      const age = ageFromDob(d.dob);
      if (age && age < 21) { score += 12; flags.push(['Review', `${d.firstName || 'Driver'} is youthful operator.`]); }
      if (d.driverType === 'Excluded') flags.push(['Review', 'Excluded driver request requires signed exclusion form.']);
    });
    (q.vehicles || []).forEach(v => {
      if (v.usage === 'Business') { score += 12; flags.push(['Referral', `${v.year || ''} ${v.make || ''} business use.`]); }
      if (v.usage === 'Delivery/Rideshare') { score += 35; flags.push(['Decline','Delivery/rideshare exposure requires specialty market.']); }
      if (Number(v.annualMiles || 0) > 20000) { score += 10; flags.push(['Review','High annual mileage.']); }
      if ((v.vin || '').length && (v.vin || '').length !== 17) { score += 8; flags.push(['Review','VIN length is not 17 characters. Verify VIN.']); }
    });
    Object.entries(q.uw || {}).forEach(([k, v]) => { if (v) score += ['majorViolation','sr22','licenseIssue','fraudConcern'].includes(k) ? 35 : 14; });
    if (q.uw.majorViolation) flags.push(['Decline','Major violation / DUI question answered Yes.']);
    if (q.uw.sr22) flags.push(['Referral','SR-22 / FR-44 filing requires underwriting review.']);
    if (q.uw.salvageTitle) flags.push(['Referral','Salvage/rebuilt title disclosed.']);
    if (q.coverage.bodilyInjury === '25/50') score += 5;
    if (q.coverage.bodilyInjury === '250/500' || q.coverage.bodilyInjury === '500 CSL') score -= 5;
    return buildCarrierResults('auto', Math.max(0, score), flags, q);
  }

  function rateHome(q) {
    let score = 0; const flags = [];
    const year = Number(q.construction.yearBuilt || 0);
    const roofYear = Number(q.construction.roofYear || 0);
    const currentYear = new Date().getFullYear();
    const roofAge = roofYear ? currentYear - roofYear : 99;
    const claims = Number(q.prior.claimCount || 0);
    if (q.prior.currentlyInsured === 'No') { score += 15; flags.push(['Referral','No current home insurance.']); }
    if (Number(q.prior.lapseDays || 0) > 30) { score += 25; flags.push(['Referral','Lapse over 30 days.']); }
    if (claims >= 2) { score += 25; flags.push(['Referral','Two or more claims in last 5 years.']); }
    else if (claims === 1) { score += 12; flags.push(['Review','Prior claim disclosed.']); }
    if (year && currentYear - year > 60) { score += 15; flags.push(['Review','Older home requires updates review.']); }
    if (roofAge > 20) { score += 30; flags.push(['Referral','Roof age over 20 years.']); }
    else if (roofAge > 15) { score += 15; flags.push(['Review','Roof age over 15 years.']); }
    if (['9','10','Unknown'].includes(q.construction.protectionClass)) { score += 18; flags.push(['Referral','High or unknown protection class.']); }
    Object.entries(q.hazards || {}).forEach(([k, v]) => { if (v) score += ['poolUnsafe','dogBreedConcern','shortTermRental','vacantRenovation','earthMovement'].includes(k) ? 25 : 10; });
    Object.entries(q.uw || {}).forEach(([k, v]) => { if (v) score += ['openDamage','fraudConcern','electricalConcern','plumbingConcern'].includes(k) ? 35 : 15; });
    if (q.hazards.shortTermRental) flags.push(['Decline','Short-term rental exposure may be ineligible for standard homeowners.']);
    if (q.uw.openDamage) flags.push(['Decline','Open/unrepaired damage disclosed.']);
    if (q.hazards.dogBreedConcern) flags.push(['Referral','Animal exposure requires underwriting review.']);
    if (q.uw.electricalConcern) flags.push(['Referral','Electrical system concern disclosed.']);
    if (Number(q.coverage.dwelling || 0) > 750000) { score += 8; flags.push(['Review','High-value dwelling may require separate market.']); }
    return buildCarrierResults('home', Math.max(0, score), flags, q);
  }

  function buildCarrierResults(line, riskScore, flags, q) {
    const hasDecline = flags.some(f => f[0] === 'Decline') || riskScore >= 85;
    const hasReferral = flags.some(f => f[0] === 'Referral') || riskScore >= 45;
    const status = hasDecline ? 'Declined / Specialty Review' : hasReferral ? 'Referral Required' : riskScore <= 18 ? 'Preferred Eligible' : 'Standard Eligible';
    const carriers = rules.carriers.map((c, idx) => {
      const base = line === 'auto' ? c.autoBase : c.homeBase;
      const tierLoad = idx * 0.09;
      const premium = Math.round(base * (1 + riskScore / 100 + tierLoad));
      let carrierStatus = status;
      if (idx === 0 && riskScore > 25) carrierStatus = 'Not Preferred';
      if (idx === 1 && riskScore > 55) carrierStatus = 'Referral Required';
      if (hasDecline && idx < 3) carrierStatus = 'Declined';
      return { ...c, premium, monthly: Math.round(premium / 12), down: Math.round(premium * 0.18), carrierStatus };
    });
    return { quoteId: uid('QT'), line, lineLabel: line === 'auto' ? 'Personal Auto' : 'Homeowners', insuredName: insuredName(q), riskScore, status, flags, carriers, createdAt: new Date().toISOString(), q: structuredClone(q) };
  }

  function renderQuoteResult(result) {
    const panel = $('#quoteResultPanel');
    panel.classList.remove('hidden');
    const flagHtml = result.flags.length ? result.flags.map(([level, text]) => `<div class="flag ${level === 'Decline' ? 'decline' : ''}"><strong>${level}:</strong> ${escapeHtml(text)}</div>`).join('') : '<div class="flag clean">No major referral flags detected in this training scenario.</div>';
    panel.innerHTML = `<div class="panel-header"><div><p class="eyebrow">Carrier Rating Result</p><h3>${escapeHtml(result.insuredName)} · ${result.lineLabel}</h3></div><div class="actions-row"><button class="secondary-btn" id="saveQuoteBtn">Save Quote</button><button class="primary-btn" id="bindPolicyBtn">Bind / Issue Training Policy</button></div></div>
      <div class="summary-grid">${summaryItem('Quote Status', result.status)}${summaryItem('Risk Score', result.riskScore)}${summaryItem('Line', result.lineLabel)}${summaryItem('Created', formatDateTime(result.createdAt))}</div>
      <h4>Carrier Indications</h4><div class="carrier-grid">${result.carriers.map(c => `<article class="carrier-card"><h4>${c.name}</h4><div class="meta-row"><span class="pill info">${c.tier}</span>${statusPill(c.carrierStatus)}</div><div class="premium">${money(c.premium)}</div><p class="muted">Monthly est. ${money(c.monthly)} · Down payment est. ${money(c.down)}</p><small>${escapeHtml(c.appetite)}</small></article>`).join('')}</div>
      <h4>Underwriting Flags</h4><div class="risk-flags">${flagHtml}</div>`;
    $('#saveQuoteBtn').addEventListener('click', saveCurrentQuote);
    $('#bindPolicyBtn').addEventListener('click', bindCurrentPolicy);
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveCurrentQuote() {
    if (!lastQuoteResult) return notice('Run rating first.', 'warning');
    const quote = structuredClone(lastQuoteResult);
    state.counters.quote += 1;
    quote.quoteNo = `QTE-${new Date().getFullYear()}-${String(state.counters.quote).padStart(6,'0')}`;
    state.quotes.unshift(quote);
    addTask('Quote', quote.quoteNo, quote.insuredName, `${quote.lineLabel} quote saved. Status: ${quote.status}.`, 'Open');
    addAudit('Quote Saved', `${quote.quoteNo} saved for ${quote.insuredName}.`);
    saveState();
    renderAll();
    notice(`Quote saved: ${quote.quoteNo}`, 'success');
  }

  function bindCurrentPolicy() {
    if (!lastQuoteResult) return notice('Run rating first.', 'warning');
    if (/Declined/.test(lastQuoteResult.status)) return notice('Training carrier cannot bind a declined risk. Use remarketing/specialty review.', 'danger');
    const q = lastQuoteResult.q;
    const line = lastQuoteResult.line;
    state.counters[line] += 1;
    const prefix = line === 'auto' ? 'AUP' : 'HOP';
    const policyNo = `${prefix}-${new Date().getFullYear()}-${String(state.counters[line]).padStart(6,'0')}`;
    const premium = lastQuoteResult.carriers.find(c => c.carrierStatus !== 'Declined')?.premium || lastQuoteResult.carriers[0].premium;
    const effective = q.account.effectiveDate || todayIso();
    const policy = { id: uid('POL'), policyNo, line, lineLabel: line === 'auto' ? 'Personal Auto' : 'Homeowners', insuredName: insuredName(q), effectiveDate: effective, expirationDate: addYear(effective), premium, status: 'Active', data: structuredClone(q), result: structuredClone(lastQuoteResult), createdBy: state.session?.name || 'Training User', createdAt: new Date().toISOString() };
    state.policies.unshift(policy);
    addTask('Policy Issued', policyNo, policy.insuredName, `${policy.lineLabel} training policy issued.`, 'Completed');
    addAudit('Policy Issued', `${policyNo} issued for ${policy.insuredName}.`);
    saveState();
    renderAll();
    notice(`Training policy issued: ${policyNo}`, 'success');
    searchPolicies(policyNo);
    openRoute('policy-search');
  }

  function savePayment(e) {
    e.preventDefault();
    const data = formObject(e.target);
    const p = findPolicy(data.policyNo);
    if (!p) return notice('Policy number not found. Create/bind a policy first.', 'warning');
    const checklist = checks(e.target, 'paymentChecklist');
    const payment = { id: uid('PAY'), policyNo: p.policyNo, insured: p.insuredName, ...data, checklist, createdBy: state.session?.name, createdAt: new Date().toISOString() };
    state.payments.unshift(payment);
    addTask('Payment', p.policyNo, p.insuredName, `${data.paymentType} posted for ${money(Number(data.amount))}.`, 'Completed');
    addAudit('Payment Posted', `${money(Number(data.amount))} posted to ${p.policyNo}.`);
    e.target.reset(); saveState(); renderAll(); notice('Training payment posted.', 'success');
  }
  function saveEndorsement(e) {
    e.preventDefault();
    const data = formObject(e.target); const p = findPolicy(data.policyNo);
    if (!p) return notice('Policy number not found. Search or issue policy first.', 'warning');
    const item = { id: uid('END'), policyNo: p.policyNo, insured: p.insuredName, ...data, checklist: checks(e.target,'endorsementChecklist'), createdBy: state.session?.name, createdAt: new Date().toISOString() };
    state.endorsements.unshift(item);
    addTask('Endorsement', p.policyNo, p.insuredName, `${data.endorsementType}: ${data.status}.`, /Approved|Declined/.test(data.status) ? 'Completed' : 'Open');
    addAudit('Endorsement Saved', `${data.endorsementType} saved for ${p.policyNo}.`);
    e.target.reset(); saveState(); renderAll(); notice('Endorsement activity saved.', 'success');
  }
  function saveCancellation(e) {
    e.preventDefault();
    const data = formObject(e.target); const p = findPolicy(data.policyNo);
    if (!p) return notice('Policy number not found.', 'warning');
    const item = { id: uid('CAN'), policyNo: p.policyNo, insured: p.insuredName, ...data, checklist: checks(e.target,'cancelChecklist'), status: 'Pending Cancellation Review', createdBy: state.session?.name, createdAt: new Date().toISOString() };
    state.cancellations.unshift(item); p.status = 'Pending Cancellation';
    addTask('Cancellation', p.policyNo, p.insuredName, `${data.reason} cancellation requested.`, 'Open');
    addAudit('Cancellation Requested', `${p.policyNo} marked Pending Cancellation.`);
    e.target.reset(); saveState(); renderAll(); notice('Cancellation request recorded.', 'success');
  }
  function saveRemarketing(e) {
    e.preventDefault();
    const data = formObject(e.target); const p = findPolicy(data.policyNo);
    if (!p) return notice('Policy number not found.', 'warning');
    const item = { id: uid('RMK'), policyNo: p.policyNo, insured: p.insuredName, ...data, checklist: checks(e.target,'remarketChecklist'), status: 'Open Remarketing Review', createdBy: state.session?.name, createdAt: new Date().toISOString() };
    state.remarketing.unshift(item);
    addTask('Remarketing', p.policyNo, p.insuredName, `${data.reason} remarketing task created.`, 'Open');
    addAudit('Remarketing Created', `${p.policyNo} remarketing task created.`);
    e.target.reset(); saveState(); renderAll(); notice('Remarketing task created.', 'success');
  }
  function saveQaReview(e) {
    e.preventDefault();
    const data = formObject(e.target);
    const item = { id: uid('QA'), ...data, reviewer: state.session?.name || 'Trainer', createdAt: new Date().toISOString() };
    state.qaReviews.unshift(item);
    addAudit('QA Review', `QA score ${data.score} saved for ${data.reference}.`);
    e.target.reset(); saveState(); renderTrainerCenter(); notice('QA review saved.', 'success');
  }

  function renderPaymentHistory() { renderHistory('#paymentHistory', ['Policy','Insured','Type','Amount','Method','Date'], state.payments.map(x => [x.policyNo, x.insured, x.paymentType, money(Number(x.amount)), x.method, formatDateTime(x.createdAt)])); }
  function renderEndorsementHistory() { renderHistory('#endorsementHistory', ['Policy','Insured','Type','Effective','Status','Date'], state.endorsements.map(x => [x.policyNo, x.insured, x.endorsementType, formatDate(x.effectiveDate), statusPill(x.status), formatDateTime(x.createdAt)])); }
  function renderCancellationHistory() { renderHistory('#cancellationHistory', ['Policy','Insured','Reason','Cancel Date','Status','Date'], state.cancellations.map(x => [x.policyNo, x.insured, x.reason, formatDate(x.cancelDate), statusPill(x.status), formatDateTime(x.createdAt)])); }
  function renderRemarketingHistory() { renderHistory('#remarketingHistory', ['Policy','Insured','Reason','Target Date','Status','Date'], state.remarketing.map(x => [x.policyNo, x.insured, x.reason, formatDate(x.targetDate), statusPill(x.status), formatDateTime(x.createdAt)])); }
  function renderHistory(sel, headers, rows) { const el = $(sel); if (el) el.innerHTML = rows.length ? table(headers, rows) : empty('No records yet.'); }

  function renderWorkQueue() {
    const type = $('#queueFilter')?.value || 'all';
    const q = ($('#queueSearch')?.value || '').toLowerCase();
    let rows = state.tasks;
    if (type !== 'all') rows = rows.filter(t => t.type === type);
    if (q) rows = rows.filter(t => [t.type,t.reference,t.insured,t.status,t.description,t.owner].join(' ').toLowerCase().includes(q));
    $('#workQueueTable').innerHTML = rows.length ? table(['Task ID','Type','Reference','Insured','Description','Status','Owner','Created'], rows.map(t => [t.id, t.type, t.reference || '-', t.insured || '-', escapeHtml(t.description), statusPill(t.status), t.owner, formatDateTime(t.createdAt)])) : empty('No queue items yet.');
  }

  function renderTrainerCenter() {
    const el = $('#trainerStats'); if (!el) return;
    const avgScore = state.qaReviews.length ? Math.round(state.qaReviews.reduce((a,b)=>a+Number(b.score||0),0)/state.qaReviews.length) : 0;
    const stats = [['VA Logins', state.logins.length], ['QA Reviews', state.qaReviews.length], ['Avg QA Score', avgScore], ['Total Audit Events', state.audit.length]];
    el.innerHTML = stats.map(([label,value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('#qaReviewsTable').innerHTML = state.qaReviews.length ? table(['Reference','Score','Feedback','Reviewer','Date'], state.qaReviews.map(x => [x.reference, `${x.score}%`, escapeHtml(x.feedback), x.reviewer, formatDateTime(x.createdAt)])) : empty('No QA reviews yet.');
  }

  function renderIdPolicyOptions() {
    const sel = $('#idVehicleSelect'); if (!sel) return;
    const policyNo = $('#idPolicyNo')?.value.trim();
    const p = findPolicy(policyNo);
    if (!p || p.line !== 'auto') { sel.innerHTML = '<option value="">Select policy first</option>'; return; }
    const vehicles = p.data.vehicles || [];
    sel.innerHTML = vehicles.length ? vehicles.map((v,i) => `<option value="${i}">${escapeHtml([v.year,v.make,v.model].filter(Boolean).join(' '))} · ${escapeHtml(v.vin || '')}</option>`).join('') : '<option value="">No vehicles found</option>';
  }
  function loadIdPolicy() {
    const policyNo = $('#idPolicyNo').value.trim(); const p = findPolicy(policyNo);
    if (!p) return notice('Policy not found.', 'warning');
    if (p.line !== 'auto') return notice('ID cards can only be generated for Auto policies.', 'warning');
    renderIdPolicyOptions(); notice('Auto policy loaded for ID card generation.', 'success');
  }
  function generateIdCard() {
    const policyNo = $('#idPolicyNo').value.trim(); const p = findPolicy(policyNo);
    if (!p || p.line !== 'auto') return notice('Load an active Auto policy first.', 'warning');
    const idx = Number($('#idVehicleSelect').value || 0); const v = (p.data.vehicles || [])[idx] || {};
    $('#idCardOutput').innerHTML = `<div class="id-card"><div class="id-card-top"><div><h3>TRAINING AUTO INSURANCE ID CARD</h3><p class="muted">CarrierOps Simulator · Not valid proof of insurance</p></div><strong>${escapeHtml(p.policyNo)}</strong></div><div class="id-card-grid">
      <div><strong>Named Insured</strong>${escapeHtml(p.insuredName)}</div><div><strong>Policy Period</strong>${formatDate(p.effectiveDate)} to ${formatDate(p.expirationDate)}</div>
      <div><strong>Vehicle</strong>${escapeHtml([v.year,v.make,v.model].filter(Boolean).join(' '))}</div><div><strong>VIN</strong>${escapeHtml(v.vin || '-')}</div>
      <div><strong>Carrier</strong>LAVA Training Carrier</div><div><strong>Agency</strong>${escapeHtml(p.data.account?.agencyCode || 'Training Agency')}</div>
    </div><p class="fineprint">This card is generated for VA training only and is not a real insurance document.</p></div>`;
    addAudit('ID Card Generated', `Training ID card generated for ${p.policyNo}.`); saveState();
  }

  function findPolicy(policyNo) { return state.policies.find(p => p.policyNo.toLowerCase() === String(policyNo || '').toLowerCase()); }
  function formObject(form) { const fd = new FormData(form); const obj = {}; fd.forEach((v,k)=>{ if (!obj[k]) obj[k]=v; }); return obj; }
  function checks(form, name) { return $$(`input[name="${name}"]:checked`, form).map(x => x.value); }

  function exportCsv() {
    const rows = [['Type','Reference','Insured','Status','Owner','Description','Created'], ...state.tasks.map(t => [t.type,t.reference,t.insured,t.status,t.owner,t.description,t.createdAt])];
    downloadText('carrierops-work-queue.csv', rows.map(r => r.map(csvEscape).join(',')).join('\n'));
  }
  function exportTrainerReport() {
    const rows = [['Reference','Score','Feedback','Reviewer','Date'], ...state.qaReviews.map(x => [x.reference,x.score,x.feedback,x.reviewer,x.createdAt])];
    downloadText('trainer-qa-report.csv', rows.map(r => r.map(csvEscape).join(',')).join('\n'));
  }
  function exportJsonBackup() { downloadText('carrierops-backup.json', JSON.stringify(state, null, 2)); }
  function importJsonBackup(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { state = mergeDeep(structuredClone(baseState), JSON.parse(reader.result)); saveState(); renderAll(); notice('Backup imported successfully.', 'success'); }
      catch (err) { notice('Invalid JSON backup file.', 'danger'); }
    };
    reader.readAsText(file);
  }
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function highlightGuide(target) {
    $$('.guide-card').forEach(c => c.classList.remove('highlight'));
    const card = $(`#guide-${target}`); if (card) { card.classList.add('highlight'); card.scrollIntoView({behavior:'smooth', block:'center'}); }
  }
  function summaryItem(label, value) { return `<div class="summary-item"><strong>${escapeHtml(label)}</strong>${escapeHtml(value ?? '-')}</div>`; }
  function table(headers, rows) { return `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
  function empty(msg) { return `<div class="empty">${escapeHtml(msg)}</div>`; }
  function statusPill(status) {
    const s = String(status || 'Open');
    const cls = /Active|Preferred|Completed|Approved|Eligible/.test(s) ? 'success' : /Declined|Cancel|Ineligible|Closed/.test(s) ? 'danger' : /Referral|Pending|Review|Open|Not Preferred/.test(s) ? 'warning' : 'info';
    return `<span class="pill ${cls}">${escapeHtml(s)}</span>`;
  }
  function insuredName(q) { return [q.insured?.firstName, q.insured?.lastName].filter(Boolean).join(' ').trim(); }
  function mailingAddress(d) {
    const a = d.address || d.property || {};
    return [a.mailingStreet || a.street, a.city, a.state, a.zip].filter(Boolean).join(', ') || '-';
  }
  function getPath(obj, path) { return String(path).split('.').reduce((o,k)=>o?.[k], obj); }
  function setPath(obj, path, value) { const parts = String(path).split('.'); let cur = obj; while (parts.length > 1) { const p = parts.shift(); cur[p] = cur[p] || {}; cur = cur[p]; } cur[parts[0]] = value; }
  function initials(name) { return String(name || 'VA').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'VA'; }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }
  function todayIso() { return new Date().toISOString().slice(0,10); }
  function addYear(dateStr) { const d = new Date(dateStr + 'T00:00:00'); d.setFullYear(d.getFullYear()+1); return d.toISOString().slice(0,10); }
  function formatDate(d) { if (!d) return '-'; const x = new Date(String(d).includes('T') ? d : d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString(); }
  function formatDateTime(d) { if (!d) return '-'; const x = new Date(d); return isNaN(x) ? d : x.toLocaleString(); }
  function money(n) { return Number(n || 0).toLocaleString(undefined, { style:'currency', currency:'USD', maximumFractionDigits:0 }); }
  function csvEscape(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function escapeAttr(v) { return escapeHtml(v).replace(/'/g, '&#039;'); }
  function debounce(fn, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), delay); }; }
  function ageFromDob(dob) { if (!dob) return null; const d = new Date(dob); if (isNaN(d)) return null; const now = new Date(); let age = now.getFullYear() - d.getFullYear(); const m = now.getMonth()-d.getMonth(); if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--; return age; }
})();
