/* LAVA Carrier Portal Training Simulator
   Static / standalone. Works from GitHub Pages or Netlify with no build command. */

const STORAGE = {
  SESSION: 'lava_carrier_session_v3',
  QUOTES: 'lava_carrier_quotes_v3',
  LOGINS: 'lava_carrier_logins_v3',
  THEME: 'lava_carrier_theme_v3',
  DRAFT: 'lava_carrier_draft_v3'
};

const TRAINER_CODE = 'LAVA2026';
const DATA = window.CARRIER_DATA || { carriers: [] };

let state = {
  session: null,
  view: 'dashboard',
  line: null,
  step: 0,
  form: {},
  results: [],
  activeTab: 'all'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const todayISO = () => new Date().toISOString().slice(0,10);
const uid = () => `LVA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

const quoteSchemas = {
  auto: [
    {
      title: 'Policy & Agency Setup',
      desc: 'Carrier portals usually begin with agency, state, effective date, and transaction setup.',
      fields: [
        f('quoteType','Quote Transaction','select',['New Business','Rewrite','Remarket'],true),
        f('agency','Agency / Producer Office','select',DATA.agencies,true),
        f('producerCode','Producer Code','select',DATA.producerCodes,true),
        f('state','Risk State','select',DATA.states,true),
        f('effectiveDate','Policy Effective Date','date',null,true,todayISO()),
        f('term','Policy Term','select',['6 Months','12 Months'],true),
        f('priorCarrier','Current / Prior Carrier','text',null,true,'State Farm'),
        f('priorInsurance','Prior Insurance Status','select',['Active - Continuous','Active - New Purchase','Expired less than 30 days','Lapse 31-60 days','Lapse over 60 days','No prior insurance'],true),
        f('lapseDays','Lapse Days','number',null,false,0,'Use 0 if no lapse.'),
        f('companionPolicy','Companion Home or Renters Policy','select',DATA.yesNo,true)
      ]
    },
    {
      title: 'Named Insured Information',
      desc: 'Enter the customer exactly as it should appear on the quote application.',
      fields: [
        f('firstName','First Name','text',null,true,'Jonathan'),
        f('lastName','Last Name','text',null,true,'Miller'),
        f('dob','Date of Birth','date',null,true,'1987-08-14'),
        f('maritalStatus','Marital Status','select',['Single','Married','Divorced','Widowed','Domestic Partner'],true),
        f('occupation','Occupation','text',null,true,'Operations Manager'),
        f('email','Email Address','email',null,true,'customer@example.com'),
        f('phone','Phone Number','tel',null,true,'555-0148'),
        f('mailingAddress','Mailing Street Address','text',null,true,'1442 Oak Canyon Dr'),
        f('city','City','text',null,true,'Austin'),
        f('zip','ZIP Code','text',null,true,'78701'),
        f('paperless','Paperless Delivery Accepted','select',DATA.yesNo,true),
        f('autopay','AutoPay / EFT Selected','select',DATA.yesNo,true)
      ]
    },
    {
      title: 'Vehicle Information',
      desc: 'Real carrier portals require exact garaging, ownership, use, and vehicle characteristics.',
      fields: [
        f('vin','VIN','text',null,false,'1HGCM82633A004352','Optional in this simulator. Enter 17 characters for best practice.'),
        f('year','Vehicle Year','number',null,true,2021),
        f('make','Make','text',null,true,'Toyota'),
        f('model','Model','text',null,true,'Camry'),
        f('bodyStyle','Body Style','select',DATA.bodyStyles,true),
        f('ownership','Ownership Status','select',['Owned','Financed','Leased'],true),
        f('vehicleUse','Vehicle Use','select',['Pleasure','Commute','Business Use','Farm Use'],true),
        f('annualMileage','Estimated Annual Mileage','number',null,true,11000),
        f('commuteMiles','One-Way Commute Miles','number',null,false,12),
        f('garagingSame','Garaging same as mailing address','select',DATA.yesNo,true,'Yes'),
        f('rideshare','Used for rideshare, delivery, or livery','select',DATA.yesNo,true,'No'),
        f('modified','Modified, salvaged, gray-market, or unrepaired damage','select',DATA.yesNo,true,'No')
      ]
    },
    {
      title: 'Drivers & Household',
      desc: 'Carrier portals require all household residents and regular operators to be disclosed.',
      fields: [
        f('driverLicenseState','Driver License State','select',DATA.states,true),
        f('licenseStatus','License Status','select',['Valid','Permit','Suspended','Expired','Foreign License'],true),
        f('yearsLicensed','Years Licensed','number',null,true,12),
        f('driverCount','Number of Listed Drivers','number',null,true,1),
        f('householdResidents','Any undisclosed household residents age 14+?','select',DATA.yesNo,true,'No'),
        f('excludedDrivers','Any excluded drivers requested?','select',DATA.yesNo,true,'No'),
        f('accidents','At-fault accidents in past 5 years','number',null,true,0),
        f('violations','Moving violations in past 5 years','number',null,true,0),
        f('dui','DUI, reckless, or major violation in past 7 years','select',DATA.yesNo,true,'No'),
        f('sr22','SR-22 / FR filing needed','select',DATA.yesNo,true,'No'),
        f('goodStudent','Good student discount applicable','select',DATA.yesNo,true,'No'),
        f('defensiveDriver','Defensive driver certificate available','select',DATA.yesNo,true,'No')
      ]
    },
    {
      title: 'Coverage Selection',
      desc: 'Select coverage limits the way a VA would review them in a carrier rater.',
      fields: [
        f('biLimit','Bodily Injury Liability','select',['25/50','50/100','100/300','250/500','500/500'],true,'100/300'),
        f('pdLimit','Property Damage Liability','select',['25,000','50,000','100,000','250,000'],true,'100,000'),
        f('umLimit','Uninsured / Underinsured Motorist','select',['Reject','25/50','50/100','100/300','250/500'],true,'100/300'),
        f('medPay','Medical Payments','select',['Reject','1,000','5,000','10,000'],true,'5,000'),
        f('compDed','Comprehensive Deductible','select',['None','250','500','1,000','2,500'],true,'500'),
        f('collDed','Collision Deductible','select',['None','250','500','1,000','2,500'],true,'500'),
        f('rental','Rental Reimbursement','select',['None','30/900','40/1200','50/1500'],true,'40/1200'),
        f('roadside','Roadside Assistance','select',DATA.yesNo,true,'Yes'),
        f('loanLease','Loan / Lease Gap','select',DATA.yesNo,true,'No'),
        f('telematics','Telematics / Snapshot / IntelliDrive Offered','select',DATA.yesNo,true,'Yes')
      ]
    },
    {
      title: 'Underwriting Review & Documents',
      desc: 'Answer truthfully. These responses drive eligibility, referrals, and training flags.',
      fields: [
        f('garagingConfirmed','Garaging address verified with customer','select',DATA.yesNo,true,'Yes'),
        f('allDriversConfirmed','All drivers and household residents confirmed','select',DATA.yesNo,true,'Yes'),
        f('priorLimitsVerified','Prior insurance limits verified','select',DATA.yesNo,true,'Yes'),
        f('registrationMatch','Named insured matches vehicle registration or title','select',DATA.yesNo,true,'Yes'),
        f('paymentPlan','Payment Plan','select',['Pay in full','2 Pay','Monthly EFT','Monthly Direct Bill'],true,'Monthly EFT'),
        f('documentsNeeded','Documents Needed','textarea',null,false,'Prior declarations page and driver license copy.'),
        f('uwNotes','Underwriting Notes','textarea',null,false,'Customer requests same-day effective date. Confirmed no business or delivery use.')
      ]
    }
  ],
  home: [
    {
      title: 'Policy & Agency Setup',
      desc: 'Start with transaction, state, policy form, and effective date.',
      fields: [
        f('quoteType','Quote Transaction','select',['New Business','Rewrite','Remarket'],true),
        f('agency','Agency / Producer Office','select',DATA.agencies,true),
        f('producerCode','Producer Code','select',DATA.producerCodes,true),
        f('state','Risk State','select',DATA.states,true),
        f('effectiveDate','Policy Effective Date','date',null,true,todayISO()),
        f('policyForm','Policy Form','select',['HO3 - Homeowners','HO4 - Renters','HO6 - Condo'],true,'HO3 - Homeowners'),
        f('priorCarrier','Current / Prior Carrier','text',null,true,'Allstate'),
        f('priorInsurance','Prior Insurance Status','select',['Active - Continuous','New Purchase / No Prior Required','Expired less than 30 days','Lapse 31-60 days','Lapse over 60 days'],true),
        f('escrow','Mortgagee / Escrow Billed','select',DATA.yesNo,true,'Yes'),
        f('companionAuto','Companion Auto Policy','select',DATA.yesNo,true,'Yes')
      ]
    },
    {
      title: 'Named Insured & Location',
      desc: 'Validate occupancy, mailing address, and location risk details.',
      fields: [
        f('firstName','First Name','text',null,true,'Sarah'),
        f('lastName','Last Name','text',null,true,'Johnson'),
        f('dob','Date of Birth','date',null,true,'1984-03-22'),
        f('email','Email Address','email',null,true,'customer@example.com'),
        f('phone','Phone Number','tel',null,true,'555-0188'),
        f('propertyAddress','Property Street Address','text',null,true,'810 Maple Ridge Way'),
        f('city','City','text',null,true,'Charlotte'),
        f('zip','ZIP Code','text',null,true,'28202'),
        f('mailingSame','Mailing address same as risk address','select',DATA.yesNo,true,'Yes'),
        f('occupancy','Occupancy','select',['Primary Residence','Secondary / Seasonal','Tenant Occupied','Vacant','Builder Risk'],true,'Primary Residence'),
        f('purchaseDate','Purchase / Closing Date','date',null,false,todayISO()),
        f('monthsOccupied','Months Occupied Per Year','number',null,true,12)
      ]
    },
    {
      title: 'Property Characteristics',
      desc: 'Carrier underwriting depends heavily on construction, roof, updates, protection, and maintenance.',
      fields: [
        f('yearBuilt','Year Built','number',null,true,2012),
        f('squareFeet','Finished Square Feet','number',null,true,2250),
        f('homeType','Home Type','select',DATA.homeTypes,true),
        f('stories','Number of Stories','select',['1','1.5','2','3+'],true),
        f('construction','Construction Type','select',DATA.constructionTypes,true),
        f('roofType','Roof Type','select',DATA.roofTypes,true),
        f('roofYear','Roof Year','number',null,true,2018),
        f('plumbingYear','Plumbing Updated Year','number',null,true,2012),
        f('electricalYear','Electrical Updated Year','number',null,true,2012),
        f('heatingYear','Heating Updated Year','number',null,true,2012),
        f('protectionClass','Protection Class','select',['1','2','3','4','5','6','7','8','9','10'],true,'3'),
        f('fireHydrant','Fire hydrant within 1,000 feet','select',DATA.yesNo,true,'Yes'),
        f('fireStationMiles','Miles to Fire Station','number',null,true,3),
        f('centralAlarm','Central fire/burglar alarm','select',DATA.yesNo,true,'Yes'),
        f('smartHome','Water leak detection / smart home protection','select',DATA.yesNo,true,'No')
      ]
    },
    {
      title: 'Coverage Selection',
      desc: 'Use replacement cost and coverage limits appropriate for the training customer.',
      fields: [
        f('coverageA','Coverage A - Dwelling','number',null,true,425000),
        f('coverageB','Coverage B - Other Structures %','select',['0%','5%','10%','20%'],true,'10%'),
        f('coverageC','Coverage C - Personal Property %','select',['25%','50%','70%','75%'],true,'50%'),
        f('coverageD','Coverage D - Loss of Use %','select',['10%','20%','30%','40%'],true,'20%'),
        f('liability','Personal Liability','select',['100,000','300,000','500,000','1,000,000'],true,'300,000'),
        f('medPay','Medical Payments','select',['1,000','2,000','5,000','10,000'],true,'5,000'),
        f('aopDed','All Other Perils Deductible','select',['500','1,000','2,500','5,000'],true,'1,000'),
        f('windDed','Wind/Hail Deductible','select',['None','1%','2%','5%'],true,'1%'),
        f('waterBackup','Water Backup Limit','select',['None','5,000','10,000','25,000','50,000'],true,'10,000'),
        f('replacementCost','Personal Property Replacement Cost','select',DATA.yesNo,true,'Yes'),
        f('ordinanceLaw','Ordinance or Law Coverage','select',['10%','25%','50%'],true,'25%')
      ]
    },
    {
      title: 'Loss History & Risk Hazards',
      desc: 'These questions commonly trigger carrier eligibility decisions or referrals.',
      fields: [
        f('claims3','Property claims in past 3 years','number',null,true,0),
        f('waterClaims','Water, mold, or roof claims in past 5 years','number',null,true,0),
        f('businessOnPremises','Business, daycare, or client visits on premises','select',DATA.yesNo,true,'No'),
        f('animals','Dogs, exotic animals, or bite history','select',['No','Dog - no bite history','Dog with bite history','Exotic animal'],true,'No'),
        f('pool','Pool, diving board, or trampoline','select',['No','Pool - fenced','Pool with diving board','Trampoline'],true,'No'),
        f('woodStove','Wood stove or solid fuel heating','select',DATA.yesNo,true,'No'),
        f('shortTermRental','Short-term rental / Airbnb exposure','select',DATA.yesNo,true,'No'),
        f('vacantRenovation','Vacant, under renovation, or unrepaired damage','select',DATA.yesNo,true,'No'),
        f('floodZone','Flood zone / coastal exposure disclosed','select',['No','Yes - preferred zone','Yes - high-risk zone','Unknown'],true,'No'),
        f('mortgagee','Mortgagee Name / Loan Number','text',null,false,'ABC Mortgage / Loan 438291'),
        f('inspectionNotes','Inspection / Underwriting Notes','textarea',null,false,'Home appears well maintained. Roof updated in 2018. Alarm certificate available.')
      ]
    }
  ]
};

function f(name, label, type='text', options=null, required=false, value='', help='') {
  return { name, label, type, options, required, value, help };
}

function init() {
  document.body.dataset.theme = localStorage.getItem(STORAGE.THEME) || 'light';
  bindLogin();
  bindShell();
  const session = readStore(STORAGE.SESSION, null);
  if (session?.name) openPortal(session); else showLogin();
}

document.addEventListener('DOMContentLoaded', init);

function bindLogin() {
  $$('input[name="role"]').forEach(r => r.addEventListener('change', () => {
    $('#trainerPassWrap').classList.toggle('hidden', $('input[name="role"]:checked').value !== 'Trainer');
  }));
  $('#demoLoginBtn').addEventListener('click', () => {
    $('#loginName').value = 'Demo VA Trainee';
    $('#loginEmail').value = 'demo@lavatraining.com';
    $('#loginBatch').value = 'PL Carrier Portal Practice';
    $('#loginForm').requestSubmit();
  });
  $('#loginForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#loginName').value.trim();
    const email = $('#loginEmail').value.trim();
    const batch = $('#loginBatch').value.trim() || 'General Training';
    const role = $('input[name="role"]:checked').value;
    if (role === 'Trainer' && $('#trainerPass').value.trim() !== TRAINER_CODE) {
      showToast('Trainer code is incorrect. Use VA Trainee login or enter the correct code.');
      return;
    }
    const session = { name, email, batch, role, loginAt: new Date().toISOString() };
    writeStore(STORAGE.SESSION, session);
    const logs = readStore(STORAGE.LOGINS, []);
    logs.unshift({ ...session, id: uid() });
    writeStore(STORAGE.LOGINS, logs.slice(0, 500));
    openPortal(session);
  });
}

function bindShell() {
  $$('.nav-list button').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $('#logoutBtn').addEventListener('click', () => { localStorage.removeItem(STORAGE.SESSION); showLogin(); });
  $('#themeToggle').addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    localStorage.setItem(STORAGE.THEME, next);
  });
  $('#printBtn').addEventListener('click', () => window.print());
}

function showLogin() {
  state.session = null;
  $('#loginScreen').classList.remove('hidden');
  $('#portalShell').classList.add('hidden');
}

function openPortal(session) {
  state.session = session;
  $('#loginScreen').classList.add('hidden');
  $('#portalShell').classList.remove('hidden');
  $('#sideUserName').textContent = session.name;
  $('#sideUserMeta').textContent = `${session.role} • ${session.batch || 'Training'}`;
  setView('dashboard');
}

function setView(view) {
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  $$('.nav-list button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const titles = {
    dashboard: ['Dashboard', 'Carrier Training Dashboard'],
    newQuote: ['New Business Quote', 'Quote Application Intake'],
    workQueue: ['Quote Work Queue', 'Saved Quotes & Activity'],
    appetite: ['Carrier Appetite', 'Market Appetite Guide'],
    trainer: ['Trainer Dashboard', 'VA Login & Training Review'],
    guide: ['Training Guide', 'How to Use the Simulator']
  };
  $('#breadcrumb').textContent = titles[view][0];
  $('#pageTitle').textContent = titles[view][1];
  renderCurrentView();
}

function renderCurrentView() {
  if (state.view === 'dashboard') renderDashboard();
  if (state.view === 'newQuote') renderNewQuoteStart();
  if (state.view === 'workQueue') renderWorkQueue();
  if (state.view === 'appetite') renderAppetite();
  if (state.view === 'trainer') renderTrainer();
  if (state.view === 'guide') renderGuide();
}

function sessionQuotes(all=false) {
  const quotes = readStore(STORAGE.QUOTES, []);
  if (all || state.session?.role === 'Trainer') return quotes;
  return quotes.filter(q => q.session?.name === state.session?.name);
}

function renderDashboard() {
  const quotes = sessionQuotes();
  const completed = quotes.filter(q => q.status === 'Completed');
  const auto = completed.filter(q => q.line === 'auto').length;
  const home = completed.filter(q => q.line === 'home').length;
  const bindable = completed.filter(q => q.results?.some(r => r.status === 'Bindable')).length;
  const avg = completed.length ? Math.round(completed.reduce((sum,q)=>sum+(q.bestPremium||0),0)/completed.length) : 0;
  $('#dashboardView').innerHTML = `
    <div class="grid grid-4">
      ${metric('Completed Quotes', completed.length, 'Saved quote applications')}
      ${metric('Auto Quotes', auto, 'Personal auto submissions')}
      ${metric('Home Quotes', home, 'Homeowners submissions')}
      ${metric('Average Best Premium', avg ? money(avg) : '$0', 'Based on best carrier option')}
    </div>

    <div class="section-title"><div><h2>Start New Business</h2><p>Choose a product line and complete a realistic carrier-style intake.</p></div></div>
    <div class="product-picker">
      ${productCard('auto','Personal Auto Quote','Driver, household, vehicle, coverage, MVR, prior insurance, and underwriting verification.','Auto policy workflow')}
      ${productCard('home','Homeowners Quote','Property, occupancy, roof/system updates, coverage limits, loss history, and hazard review.','HO3 / HO4 / HO6 workflow')}
    </div>

    <div class="section-title"><div><h2>Recent Quote Activity</h2><p>Latest saved applications from this browser session.</p></div><button class="secondary-btn" onclick="setView('workQueue')">View Work Queue</button></div>
    ${recentQuoteTable(quotes.slice(0,5))}
  `;
  $$('.product-card').forEach(card => card.addEventListener('click', () => startQuote(card.dataset.line)));
}

function metric(label, value, sub) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;
}
function productCard(line, title, desc, badge) {
  return `<article class="product-card" data-line="${line}"><span class="badge blue">${badge}</span><h3>${title}</h3><p>${desc}</p><button class="primary-btn" type="button">Start ${line === 'auto' ? 'Auto' : 'Home'} Quote</button></article>`;
}

function renderNewQuoteStart() {
  $('#newQuoteView').innerHTML = `
    <div class="card">
      <div class="section-title" style="margin-top:0"><div><h2>Select Product Line</h2><p>No easy/normal/hard scenarios. This portal uses direct carrier-style application questions only.</p></div></div>
      <div class="product-picker">
        ${productCard('auto','Personal Auto New Business','Complete policy setup, insured information, vehicle, drivers, coverage, discounts, and underwriting questions.','Auto')}
        ${productCard('home','Homeowners New Business','Complete policy setup, insured information, risk location, property details, coverage, loss history, and risk hazards.','Home')}
      </div>
    </div>
  `;
  $$('.product-card', $('#newQuoteView')).forEach(card => card.addEventListener('click', () => startQuote(card.dataset.line)));
}

function startQuote(line) {
  state.line = line;
  state.step = 0;
  state.results = [];
  state.form = {};
  quoteSchemas[line].forEach(step => step.fields.forEach(field => { state.form[field.name] = field.value ?? ''; }));
  renderQuoteWorkflow();
  setView('newQuote');
  renderQuoteWorkflow();
}

function renderQuoteWorkflow() {
  const schema = quoteSchemas[state.line];
  if (!schema) return renderNewQuoteStart();
  const step = schema[state.step];
  $('#newQuoteView').innerHTML = `
    <div class="workflow">
      <aside class="step-list">
        ${schema.map((s,i)=>`<button class="step-pill ${i===state.step?'active':''} ${i<state.step?'complete':''}" onclick="goStep(${i})">${i+1}. ${s.title}</button>`).join('')}
      </aside>
      <section class="card">
        <div class="form-header"><span class="badge blue">${state.line === 'auto' ? 'Personal Auto' : 'Homeowners'} New Business</span><h2>${safe(step.title)}</h2><p>${safe(step.desc)}</p></div>
        <form id="quoteForm" class="form-grid" novalidate>${step.fields.map(renderField).join('')}</form>
        <div class="wizard-actions">
          <div class="inline-actions">
            <button class="secondary-btn" type="button" onclick="saveDraft()">Save Draft</button>
            <button class="ghost-btn" type="button" onclick="resetQuote()">Reset</button>
          </div>
          <div class="inline-actions">
            ${state.step > 0 ? '<button class="secondary-btn" type="button" onclick="prevStep()">Back</button>' : ''}
            <button class="primary-btn" type="button" onclick="nextStep()">${state.step === schema.length-1 ? 'Rate Carriers' : 'Continue'}</button>
          </div>
        </div>
      </section>
    </div>
  `;
  $('#quoteForm').addEventListener('input', captureForm);
  $('#quoteForm').addEventListener('change', captureForm);
}

function renderField(field) {
  const val = state.form[field.name] ?? '';
  const required = field.required ? '<span class="req">*</span>' : '';
  const help = field.help ? `<small>${safe(field.help)}</small>` : '';
  const error = `<div class="error-text">This field is required.</div>`;
  if (field.type === 'select') {
    return `<div class="field" data-field="${field.name}"><label for="${field.name}">${safe(field.label)} ${required}</label><select id="${field.name}" name="${field.name}" ${field.required?'required':''}><option value="">Select...</option>${(field.options||[]).map(opt=>`<option ${String(val)===String(opt)?'selected':''}>${safe(opt)}</option>`).join('')}</select>${help}${error}</div>`;
  }
  if (field.type === 'textarea') {
    return `<div class="field full-row" data-field="${field.name}"><label for="${field.name}">${safe(field.label)} ${required}</label><textarea id="${field.name}" name="${field.name}" ${field.required?'required':''}>${safe(val)}</textarea>${help}${error}</div>`;
  }
  return `<div class="field" data-field="${field.name}"><label for="${field.name}">${safe(field.label)} ${required}</label><input id="${field.name}" name="${field.name}" type="${field.type}" value="${safe(val)}" ${field.required?'required':''} />${help}${error}</div>`;
}

function captureForm() {
  const form = $('#quoteForm');
  if (!form) return;
  const fd = new FormData(form);
  for (const [key, value] of fd.entries()) state.form[key] = value;
}

function validateStep() {
  captureForm();
  let ok = true;
  const schema = quoteSchemas[state.line][state.step];
  schema.fields.forEach(field => {
    const wrap = $(`[data-field="${field.name}"]`);
    const value = state.form[field.name];
    const missing = field.required && (value === undefined || value === null || String(value).trim() === '');
    wrap?.classList.toggle('error', missing);
    if (missing) ok = false;
  });
  if (!ok) showToast('Please complete all required carrier questions before continuing.');
  return ok;
}

function nextStep() {
  if (!validateStep()) return;
  const schema = quoteSchemas[state.line];
  if (state.step < schema.length - 1) {
    state.step += 1;
    renderQuoteWorkflow();
  } else {
    rateQuote();
  }
}
function prevStep() { if (state.step > 0) { captureForm(); state.step -= 1; renderQuoteWorkflow(); } }
function goStep(i) { captureForm(); state.step = i; renderQuoteWorkflow(); }
function resetQuote() { if (confirm('Reset this quote application?')) renderNewQuoteStart(); }
function saveDraft() {
  captureForm();
  writeStore(STORAGE.DRAFT, { line: state.line, step: state.step, form: state.form, savedAt: new Date().toISOString(), session: state.session });
  showToast('Draft saved in this browser.');
}

function rateQuote() {
  captureForm();
  const results = state.line === 'auto' ? rateAuto(state.form) : rateHome(state.form);
  state.results = results;
  const customerName = `${state.form.firstName || ''} ${state.form.lastName || ''}`.trim() || 'Unnamed Customer';
  const best = results.filter(r => r.status !== 'Declined').sort((a,b)=>a.premium-b.premium)[0];
  const quote = {
    id: uid(),
    line: state.line,
    status: 'Completed',
    customerName,
    createdAt: new Date().toISOString(),
    effectiveDate: state.form.effectiveDate,
    state: state.form.state,
    bestCarrier: best?.carrier || 'No Eligible Carrier',
    bestPremium: best?.premium || 0,
    session: state.session,
    form: { ...state.form },
    results
  };
  const quotes = readStore(STORAGE.QUOTES, []);
  quotes.unshift(quote);
  writeStore(STORAGE.QUOTES, quotes.slice(0,500));
  renderQuoteResults(quote);
}

function rateAuto(form) {
  const flags = [];
  let base = 1060;
  const year = Number(form.year || 2020);
  const mileage = Number(form.annualMileage || 12000);
  const lapse = Number(form.lapseDays || 0);
  const accidents = Number(form.accidents || 0);
  const violations = Number(form.violations || 0);
  const yearsLicensed = Number(form.yearsLicensed || 1);
  if (year >= 2022) base += 120; else if (year < 2012) base -= 80;
  if (mileage > 18000) { base *= 1.16; flags.push('High annual mileage requires review.'); }
  if (form.vehicleUse === 'Business Use') { base *= 1.18; flags.push('Business use exposure disclosed.'); }
  if (form.rideshare === 'Yes') { base *= 1.35; flags.push('Rideshare or delivery exposure is not standard personal auto.'); }
  if (form.modified === 'Yes') { base *= 1.25; flags.push('Modified/salvage/unrepaired damage concern.'); }
  if (lapse > 30 || form.priorInsurance?.includes('Lapse')) { base *= 1.18; flags.push('Prior insurance lapse may affect eligibility.'); }
  if (accidents) { base *= (1 + accidents * .18); flags.push(`${accidents} at-fault accident(s) disclosed.`); }
  if (violations) { base *= (1 + violations * .10); flags.push(`${violations} moving violation(s) disclosed.`); }
  if (form.dui === 'Yes') { base *= 1.55; flags.push('Major violation / DUI disclosed.'); }
  if (form.sr22 === 'Yes') { base *= 1.22; flags.push('Financial responsibility filing needed.'); }
  if (yearsLicensed < 3) { base *= 1.14; flags.push('Driver has limited licensing experience.'); }
  if (form.companionPolicy === 'Yes') base *= .93;
  if (form.autopay === 'Yes') base *= .97;
  if (form.telematics === 'Yes') base *= .95;
  if (form.goodStudent === 'Yes') base *= .97;
  if (form.defensiveDriver === 'Yes') base *= .98;
  if (form.biLimit === '250/500' || form.biLimit === '500/500') base *= 1.10;
  if (form.compDed === '1,000' || form.collDed === '1,000') base *= .95;
  return DATA.carriers.map(c => carrierResult(c, 'auto', base, flags, form));
}

function rateHome(form) {
  const flags = [];
  let base = Math.max(Number(form.coverageA || 350000) * 0.0042, 900);
  const yearBuilt = Number(form.yearBuilt || 1995);
  const roofYear = Number(form.roofYear || 2010);
  const roofAge = new Date().getFullYear() - roofYear;
  const claims = Number(form.claims3 || 0);
  const waterClaims = Number(form.waterClaims || 0);
  const pc = Number(form.protectionClass || 5);
  if (yearBuilt < 1950) { base *= 1.18; flags.push('Older home requires system update verification.'); }
  if (roofAge > 15) { base *= 1.18; flags.push('Roof age over 15 years may require inspection or ACV roof review.'); }
  if (form.roofType === 'Wood Shake') { base *= 1.20; flags.push('Wood shake roof is a carrier concern.'); }
  if (pc >= 8) { base *= 1.14; flags.push('Protection class is less favorable.'); }
  if (claims) { base *= (1 + claims * .14); flags.push(`${claims} property claim(s) disclosed.`); }
  if (waterClaims) { base *= (1 + waterClaims * .22); flags.push('Water/mold/roof claim history disclosed.'); }
  if (form.occupancy !== 'Primary Residence') { base *= 1.16; flags.push('Non-primary occupancy requires review.'); }
  if (form.businessOnPremises === 'Yes') { base *= 1.12; flags.push('Business exposure on premises.'); }
  if (form.animals === 'Dog with bite history' || form.animals === 'Exotic animal') { base *= 1.25; flags.push('Animal liability concern.'); }
  if (form.pool === 'Pool with diving board' || form.pool === 'Trampoline') { base *= 1.12; flags.push('Pool/trampoline hazard disclosed.'); }
  if (form.shortTermRental === 'Yes') { base *= 1.35; flags.push('Short-term rental exposure is outside standard appetite.'); }
  if (form.vacantRenovation === 'Yes') { base *= 1.40; flags.push('Vacant/renovation/unrepaired damage concern.'); }
  if (form.floodZone === 'Yes - high-risk zone') { base *= 1.10; flags.push('High-risk flood zone disclosed; separate flood quote may be needed.'); }
  if (form.companionAuto === 'Yes') base *= .92;
  if (form.centralAlarm === 'Yes') base *= .96;
  if (form.smartHome === 'Yes') base *= .98;
  if (form.aopDed === '2,500' || form.aopDed === '5,000') base *= .94;
  return DATA.carriers.map(c => carrierResult(c, 'home', base, flags, form));
}

function carrierResult(carrier, line, base, flags, form) {
  let premium = base * (line === 'auto' ? carrier.autoFactor : carrier.homeFactor);
  const carrierFlags = [...flags];
  let status = 'Bindable';
  if (line === 'auto') {
    if (carrier.code === 'BAM') { status = 'Referral'; carrierFlags.push('Carrier is home-focused; auto shown only for training comparison.'); premium *= 1.1; }
    if (form.dui === 'Yes' && ['TRV','ERI','MER'].includes(carrier.code)) status = 'Declined';
    if (form.rideshare === 'Yes' && ['TRV','ERI','MER','BAM'].includes(carrier.code)) status = 'Referral';
    if (Number(form.accidents||0) + Number(form.violations||0) >= 4 && carrier.code !== 'NGIC') status = 'Referral';
    if (form.sr22 === 'Yes' && carrier.code !== 'NGIC') status = 'Referral';
  } else {
    if (carrier.code === 'PROG') premium *= 1.04;
    if (carrier.code === 'BAM') premium *= .96;
    if (form.vacantRenovation === 'Yes' && ['TRV','SAF','ERI','BAM'].includes(carrier.code)) status = 'Declined';
    if (form.animals === 'Dog with bite history' && ['TRV','SAF','ERI'].includes(carrier.code)) status = 'Referral';
    if (Number(form.claims3||0) >= 3 && carrier.code !== 'NGIC') status = 'Referral';
    if (form.shortTermRental === 'Yes' && carrier.code !== 'NGIC') status = 'Referral';
  }
  if (status !== 'Declined' && carrierFlags.length >= 4) status = 'Referral';
  if (status === 'Declined') premium = 0;
  const down = premium ? Math.max(120, premium * .18) : 0;
  return {
    carrier: carrier.name,
    code: carrier.code,
    tier: carrier.tier,
    status,
    premium: Math.round(premium),
    monthly: premium ? Math.round((premium - down) / 10) : 0,
    down: Math.round(down),
    flags: carrierFlags.slice(0,5),
    note: status === 'Bindable' ? 'Eligible to present for training review.' : status === 'Referral' ? 'Needs underwriter or trainer review before presenting.' : 'Not eligible based on disclosed risk details.'
  };
}

function renderQuoteResults(quote) {
  $('#newQuoteView').innerHTML = `
    <div class="card">
      <div class="section-title" style="margin-top:0">
        <div><span class="badge green">Quote Saved</span><h2>Carrier Rating Results</h2><p>Quote ID ${quote.id} • ${safe(quote.customerName)} • ${quote.line.toUpperCase()}</p></div>
        <div class="inline-actions"><button class="secondary-btn" onclick="window.print()">Print / Save PDF</button><button class="primary-btn" onclick="startQuote('${quote.line}')">Start Another ${quote.line === 'auto' ? 'Auto' : 'Home'} Quote</button></div>
      </div>
      <div class="quote-summary">
        <div class="soft-card">
          <h3>Application Summary</h3>
          <div class="summary-list">
            ${summaryRow('Customer', quote.customerName)}
            ${summaryRow('State', quote.state)}
            ${summaryRow('Effective Date', quote.effectiveDate)}
            ${summaryRow('Best Carrier', quote.bestCarrier)}
            ${summaryRow('Best Annual Premium', quote.bestPremium ? money(quote.bestPremium) : 'No eligible option')}
          </div>
        </div>
        <div class="soft-card">
          <h3>Training Reminder</h3>
          <ul class="list"><li>Review referral and decline notes before presenting.</li><li>Confirm all household drivers, occupancy, and prior insurance answers.</li><li>Use Print / Save PDF for coaching documentation.</li></ul>
        </div>
      </div>
      <div class="section-title"><div><h2>Carrier Comparison</h2><p>Training rating result based on the answers entered.</p></div></div>
      <div class="carrier-results">${quote.results.map(resultCard).join('')}</div>
    </div>
  `;
}
function summaryRow(label, value){ return `<div class="summary-row"><span>${safe(label)}</span><strong>${safe(value)}</strong></div>`; }
function resultCard(r) {
  const badgeClass = r.status === 'Bindable' ? 'green' : r.status === 'Referral' ? 'orange' : 'red';
  return `<article class="carrier-card"><div class="carrier-head"><div><div class="carrier-name">${safe(r.carrier)}</div><small>${safe(r.tier)}</small></div><span class="badge ${badgeClass}">${safe(r.status)}</span></div><div class="premium">${r.premium ? money(r.premium) : 'N/A'} ${r.premium ? '<small>/ annual</small>' : ''}</div><div class="summary-list">${summaryRow('Down Payment', r.down ? money(r.down) : 'N/A')}${summaryRow('Monthly Estimate', r.monthly ? money(r.monthly) : 'N/A')}</div><p>${safe(r.note)}</p><ul class="flag-list">${(r.flags.length?r.flags:['No major training flags.']).map(x=>`<li>${safe(x)}</li>`).join('')}</ul></article>`;
}

function renderWorkQueue() {
  const quotes = sessionQuotes(true);
  const filtered = state.activeTab === 'all' ? quotes : quotes.filter(q => q.line === state.activeTab);
  $('#workQueueView').innerHTML = `
    <div class="section-title" style="margin-top:0"><div><h2>Quote Work Queue</h2><p>Stored locally in this browser. Trainer role can review all saved quotes.</p></div><div class="inline-actions"><button class="secondary-btn" onclick="exportQuotesCSV()">Export CSV</button><button class="danger-btn" onclick="clearQuotes()">Clear Quotes</button></div></div>
    <div class="tabs"><button class="tab-btn ${state.activeTab==='all'?'active':''}" onclick="setQueueTab('all')">All</button><button class="tab-btn ${state.activeTab==='auto'?'active':''}" onclick="setQueueTab('auto')">Auto</button><button class="tab-btn ${state.activeTab==='home'?'active':''}" onclick="setQueueTab('home')">Home</button></div>
    ${recentQuoteTable(filtered, true)}
  `;
}
function setQueueTab(tab){ state.activeTab = tab; renderWorkQueue(); }
function recentQuoteTable(quotes, actions=false) {
  if (!quotes.length) return `<div class="card empty">No saved quotes yet. Start a new business quote to populate the work queue.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Quote ID</th><th>Customer</th><th>Line</th><th>Best Carrier</th><th>Premium</th><th>VA</th><th>Date</th>${actions?'<th>Actions</th>':''}</tr></thead><tbody>${quotes.map(q=>`<tr><td>${safe(q.id)}</td><td>${safe(q.customerName)}</td><td><span class="badge blue">${q.line.toUpperCase()}</span></td><td>${safe(q.bestCarrier)}</td><td>${q.bestPremium?money(q.bestPremium):'N/A'}</td><td>${safe(q.session?.name || 'Unknown')}</td><td>${new Date(q.createdAt).toLocaleString()}</td>${actions?`<td><button class="secondary-btn" onclick="openQuoteModal('${q.id}')">Review</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function openQuoteModal(id) {
  const q = readStore(STORAGE.QUOTES, []).find(x => x.id === id);
  if (!q) return;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="modal"><div class="modal-head"><div><h2>${safe(q.customerName)}</h2><p class="breadcrumb">${safe(q.id)} • ${q.line.toUpperCase()}</p></div><button class="close-btn" onclick="this.closest('.modal-backdrop').remove()">×</button></div><div class="quote-summary"><div class="soft-card"><h3>Quote Summary</h3>${summaryRow('VA', q.session?.name || 'Unknown')}${summaryRow('State', q.state)}${summaryRow('Effective Date', q.effectiveDate)}${summaryRow('Best Carrier', q.bestCarrier)}${summaryRow('Best Premium', q.bestPremium?money(q.bestPremium):'N/A')}</div><div class="soft-card"><h3>Important Answers</h3>${Object.entries(q.form).slice(0,16).map(([k,v])=>summaryRow(labelize(k), v)).join('')}</div></div><div class="section-title"><div><h2>Carrier Results</h2></div></div><div class="carrier-results">${q.results.map(resultCard).join('')}</div></div>`;
  document.body.appendChild(modal);
}

function renderAppetite() {
  $('#appetiteView').innerHTML = `<div class="grid grid-2">${DATA.carriers.map(c=>`<article class="card appetite-card"><div class="carrier-head"><div><h3>${safe(c.name)}</h3><span class="badge blue">${safe(c.tier)}</span></div><strong>${safe(c.code)}</strong></div><p><b>Auto:</b> ${safe(c.appetite.auto)}</p><p><b>Home:</b> ${safe(c.appetite.home)}</p><div class="grid grid-2"><div><h4>Strengths</h4><ul class="list">${c.strengths.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></div><div><h4>Cautions</h4><ul class="list">${c.cautions.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></div></div></article>`).join('')}</div>`;
}

function renderTrainer() {
  const logs = readStore(STORAGE.LOGINS, []);
  const quotes = readStore(STORAGE.QUOTES, []);
  const isTrainer = state.session?.role === 'Trainer';
  $('#trainerView').innerHTML = `
    <div class="grid grid-4">
      ${metric('Login Sessions', logs.length, 'Stored in this browser')}
      ${metric('Total Quotes', quotes.length, 'All saved quote records')}
      ${metric('Unique VAs', new Set(logs.map(l=>l.name)).size, 'Based on login name')}
      ${metric('Trainer Mode', isTrainer ? 'Active' : 'Locked', isTrainer ? 'Full local review access' : 'Login as Trainer to review all VA activity')}
    </div>
    <div class="section-title"><div><h2>VA Login Log</h2><p>Used for training attendance and activity review.</p></div><button class="secondary-btn" onclick="exportLoginsCSV()">Export Login CSV</button></div>
    ${logs.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Batch</th><th>Role</th><th>Login Time</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${safe(l.name)}</td><td>${safe(l.email||'')}</td><td>${safe(l.batch||'')}</td><td>${safe(l.role)}</td><td>${new Date(l.loginAt).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>` : '<div class="card empty">No login records yet.</div>'}
  `;
}

function renderGuide() {
  $('#guideView').innerHTML = `
    <div class="card"><h2>How the VA Should Use This Carrier Portal Simulator</h2><p>This is a training portal built to feel like a real personal-lines carrier rater. It is intentionally standalone so it can be uploaded directly to GitHub and deployed on Netlify without build errors.</p></div>
    <div class="section-title"><div><h2>Training Flow</h2><p>Recommended classroom workflow for new VAs.</p></div></div>
    <div class="grid grid-3 guide-grid">
      <div class="guide-step"><h3>Login as VA</h3><p>Enter trainee name, email, and batch. Login records are saved locally for trainer review.</p></div>
      <div class="guide-step"><h3>Start New Business</h3><p>Choose Auto or Home. Complete every required field exactly as if entering a real carrier rater.</p></div>
      <div class="guide-step"><h3>Answer UW Questions</h3><p>Disclose prior insurance, household drivers, property hazards, claims, roof/system updates, and documents.</p></div>
      <div class="guide-step"><h3>Rate Carriers</h3><p>The simulator returns carrier results, referral notes, decline reasons, and training flags.</p></div>
      <div class="guide-step"><h3>Review Work Queue</h3><p>Open saved quotes, print to PDF, export CSV, and discuss errors or missing information with the trainer.</p></div>
      <div class="guide-step"><h3>Coach Accuracy</h3><p>Trainer/TL can review login activity and quote history from the same browser session.</p></div>
    </div>
  `;
}

function exportQuotesCSV() {
  const quotes = readStore(STORAGE.QUOTES, []);
  const rows = [['Quote ID','Line','Customer','State','Effective Date','Best Carrier','Best Premium','VA','Created At'], ...quotes.map(q=>[q.id,q.line,q.customerName,q.state,q.effectiveDate,q.bestCarrier,q.bestPremium,q.session?.name||'',q.createdAt])];
  downloadCSV(rows, 'lava-carrier-quotes.csv');
}
function exportLoginsCSV() {
  const logs = readStore(STORAGE.LOGINS, []);
  const rows = [['Name','Email','Batch','Role','Login Time'], ...logs.map(l=>[l.name,l.email,l.batch,l.role,l.loginAt])];
  downloadCSV(rows, 'lava-va-login-log.csv');
}
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function clearQuotes() {
  if (!confirm('Clear all saved quotes in this browser?')) return;
  localStorage.removeItem(STORAGE.QUOTES);
  renderWorkQueue();
  showToast('Quote history cleared.');
}
function labelize(key) { return key.replace(/([A-Z])/g,' $1').replace(/^./, s=>s.toUpperCase()); }

window.startQuote = startQuote;
window.setView = setView;
window.goStep = goStep;
window.prevStep = prevStep;
window.nextStep = nextStep;
window.saveDraft = saveDraft;
window.resetQuote = resetQuote;
window.setQueueTab = setQueueTab;
window.openQuoteModal = openQuoteModal;
window.exportQuotesCSV = exportQuotesCSV;
window.exportLoginsCSV = exportLoginsCSV;
window.clearQuotes = clearQuotes;
