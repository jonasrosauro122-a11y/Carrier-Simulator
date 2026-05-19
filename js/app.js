/* LAVA Carrier Portal Pro - standalone static app for GitHub + Netlify */
const STORAGE = {
  SESSION:'lava_carrier_pro_session_v1',
  QUOTES:'lava_carrier_pro_quotes_v1',
  LOGS:'lava_carrier_pro_logs_v1',
  LOGINS:'lava_carrier_pro_logins_v1',
  THEME:'lava_carrier_pro_theme_v1'
};
const TRAINER_CODE = 'LAVA2026';
const DATA = window.LAVA_CARRIER_DATA;
const QB = window.LAVA_QUESTION_BANK;
const ENGINE = window.LAVA_RATING_ENGINE;
const $ = (sel,root=document) => root.querySelector(sel);
const $$ = (sel,root=document) => [...root.querySelectorAll(sel)];
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => Number(v || 0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const nowISO = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0,10);
const uid = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
const clone = obj => JSON.parse(JSON.stringify(obj));
const read = (key,fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key,value) => localStorage.setItem(key, JSON.stringify(value));

let state = {
  session: read(STORAGE.SESSION, null),
  view: 'dashboard',
  wizard: null,
  queueFilter: 'all',
  selectedQuoteId: null
};

function init(){
  document.body.classList.toggle('dark', read(STORAGE.THEME, 'light') === 'dark');
  bindBaseEvents();
  if(state.session) openPortal();
}

function bindBaseEvents(){
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#demoLoginBtn').addEventListener('click', demoLogin);
  $$('input[name="role"]').forEach(r => r.addEventListener('change', () => $('#trainerCodeBox').classList.toggle('hidden', getRole() !== 'Trainer')));
  $('#logoutBtn').addEventListener('click', logout);
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#printBtn').addEventListener('click', () => window.print());
  $('#mainNav').addEventListener('click', e => {
    const btn = e.target.closest('button[data-view]');
    if(!btn) return;
    setView(btn.dataset.view);
  });
  document.addEventListener('click', handleAction);
  document.addEventListener('input', handleFieldInput);
  document.addEventListener('change', handleFieldInput);
}

function getRole(){ return $('input[name="role"]:checked')?.value || 'VA'; }

function handleLogin(e){
  e.preventDefault();
  const role = getRole();
  if(role === 'Trainer' && $('#trainerCode').value.trim() !== TRAINER_CODE){
    toast('Trainer code is incorrect.');
    return;
  }
  const session = {
    id: uid('SESSION'),
    name: $('#loginName').value.trim(),
    email: $('#loginEmail').value.trim(),
    team: $('#loginTeam').value.trim() || 'Training Batch',
    shift: $('#loginShift').value,
    role,
    loginAt: nowISO()
  };
  state.session = session;
  write(STORAGE.SESSION, session);
  saveLogin(session);
  logAction('login', `${session.name} opened the portal as ${session.role}.`);
  openPortal();
}

function demoLogin(){
  $('#loginName').value = 'Demo VA Trainee';
  $('#loginEmail').value = 'demo.va@lavatraining.com';
  $('#loginTeam').value = 'PL Rater Practice Batch';
  $('input[name="role"][value="VA"]').checked = true;
  $('#trainerCodeBox').classList.add('hidden');
  $('#loginForm').requestSubmit();
}

function openPortal(){
  $('#loginScreen').classList.add('hidden');
  $('#portalShell').classList.remove('hidden');
  $('#sessionName').textContent = state.session.name;
  $('#sessionMeta').textContent = `${state.session.role} • ${state.session.team}`;
  render();
}

function logout(){
  if(state.session) logAction('logout', `${state.session.name} logged out.`);
  localStorage.removeItem(STORAGE.SESSION);
  state.session = null;
  state.wizard = null;
  $('#portalShell').classList.add('hidden');
  $('#loginScreen').classList.remove('hidden');
  toast('Logged out.');
}

function toggleTheme(){
  const dark = !document.body.classList.contains('dark');
  document.body.classList.toggle('dark', dark);
  write(STORAGE.THEME, dark ? 'dark' : 'light');
}

function setView(view){
  state.view = view;
  $$('#mainNav button').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${view}View`)?.classList.add('active');
  const titles = {
    dashboard:['Command Center','Carrier Training Command Center'],
    newQuote:['New Business','New Business Quote Workflow'],
    queue:['Work Queue','Quote Work Queue'],
    matrix:['Carrier Matrix','Carrier Appetite & Eligibility Matrix'],
    trainer:['Trainer Review','Trainer/TL Review Dashboard'],
    guide:['SOP Guide','Carrier Portal SOP Guide'],
    admin:['Admin Tools','Local Data & Export Tools']
  };
  $('#breadcrumb').textContent = titles[view]?.[0] || 'Portal';
  $('#pageTitle').textContent = titles[view]?.[1] || 'Portal';
  render();
}

function render(){
  renderDashboard();
  renderNewQuote();
  renderQueue();
  renderMatrix();
  renderTrainer();
  renderGuide();
  renderAdmin();
}

function getQuotes(){ return read(STORAGE.QUOTES, []); }
function setQuotes(quotes){ write(STORAGE.QUOTES, quotes); }
function getLogs(){ return read(STORAGE.LOGS, []); }
function setLogs(logs){ write(STORAGE.LOGS, logs.slice(0,500)); }
function saveLogin(session){ const logins = read(STORAGE.LOGINS, []); logins.unshift(session); write(STORAGE.LOGINS, logins.slice(0,200)); }
function logAction(type, detail, quoteId=''){
  const logs = getLogs();
  logs.unshift({id:uid('LOG'),type,detail,quoteId,user:state.session?.name || 'System',role:state.session?.role || 'System',time:nowISO()});
  setLogs(logs);
}
function toast(message){ const t = $('#toast'); t.textContent = message; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2600); }
function fmtDate(iso){ if(!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(); }
function customerName(form){ return `${form?.applicant?.firstName || ''} ${form?.applicant?.lastName || ''}`.trim() || 'Unnamed Applicant'; }
function lineLabel(line){ return QB[line]?.label || line; }
function statusBadge(status){
  const cls = status === 'Rated' || status === 'Preferred' || status === 'Standard' ? 'green' : status === 'Referral' || status === 'Pending Review' || status === 'Draft' ? 'orange' : status === 'Declined' ? 'red' : 'blue';
  return `<span class="badge ${cls}">${safe(status)}</span>`;
}
function roleLocked(){ return state.session?.role !== 'Trainer'; }

function renderDashboard(){
  const quotes = getQuotes();
  const logs = getLogs();
  const rated = quotes.filter(q => q.status !== 'Draft').length;
  const referrals = quotes.filter(q => q.status === 'Referral' || q.status === 'Pending Review').length;
  const avgQa = quotes.length ? Math.round(quotes.reduce((s,q)=>s+(q.qaScore || 0),0)/quotes.length) : 0;
  const avgRisk = quotes.length ? Math.round(quotes.reduce((s,q)=>s+(q.riskScore || 0),0)/quotes.length) : 0;
  const byStatus = countBy(quotes, 'status');
  const recent = quotes.slice(0,5);
  $('#dashboardView').innerHTML = `
    <div class="grid-4">
      <div class="metric"><span>Total Quotes</span><strong>${quotes.length}</strong><small>Drafts, rated quotes, referrals, and declined outcomes.</small></div>
      <div class="metric"><span>Rated Quotes</span><strong>${rated}</strong><small>Quotes that reached carrier comparison.</small></div>
      <div class="metric"><span>Referral Queue</span><strong>${referrals}</strong><small>Needs underwriter or trainer review.</small></div>
      <div class="metric"><span>Average QA</span><strong>${avgQa}%</strong><small>Based on verification and attention-to-detail checks.</small></div>
    </div>
    <div class="section-title">
      <div><h2>Quote Operations</h2><p>Start a carrier workflow or continue an existing quote from the work queue.</p></div>
      <div class="inline-actions"><button class="primary-btn" data-action="view" data-view="newQuote">Start New Quote</button><button class="secondary-btn" data-action="view" data-view="queue">Open Queue</button></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <h3>Status Distribution</h3>
        ${renderBars(byStatus, quotes.length || 1)}
      </div>
      <div class="card score-card">
        <h3>Training Risk Snapshot</h3>
        <div class="score-number">${avgRisk}</div>
        <div class="risk-meter"><div class="risk-fill" style="width:${avgRisk}%"></div></div>
        <p class="muted">Average risk score across saved quotes. Lower score means cleaner simulated risk.</p>
      </div>
    </div>
    <div class="section-title"><div><h2>Recent Work Queue</h2><p>Latest saved quote files.</p></div></div>
    ${renderQuoteTable(recent, true)}
    <div class="section-title"><div><h2>Recent Activity</h2><p>Audit log of key trainee actions.</p></div></div>
    ${renderTimeline(logs.slice(0,6))}
  `;
}

function renderBars(counts,total){
  const keys = Object.keys(counts).length ? Object.keys(counts) : ['No Data'];
  return keys.map(k=>{
    const value = counts[k] || 0;
    const pct = Math.round((value/total)*100);
    return `<div class="bar-row"><strong>${safe(k)}</strong><div class="bar"><div style="width:${pct}%"></div></div><span>${value}</span></div>`;
  }).join('');
}
function countBy(rows,key){ return rows.reduce((acc,row)=>{ const k = row[key] || 'Unknown'; acc[k]=(acc[k]||0)+1; return acc; },{}); }
function renderTimeline(items){
  if(!items.length) return `<div class="empty card">No activity yet.</div>`;
  return `<div class="card timeline">${items.map(log=>`<div class="timeline-item"><strong>${fmtDate(log.time)}</strong><span><b>${safe(log.user)}</b> • ${safe(log.detail)}</span></div>`).join('')}</div>`;
}

function renderNewQuote(){
  const el = $('#newQuoteView');
  if(!state.wizard){
    const drafts = getQuotes().filter(q => q.status === 'Draft');
    el.innerHTML = `
      <div class="helper-banner"><b>Carrier-style workflow:</b> The trainee must complete required intake, risk, coverage, and underwriting sections before the system will rate and save results.</div>
      <div class="line-picker">
        <button class="card line-card" data-action="start-line" data-line="auto">
          <span class="badge blue">Personal Auto</span><h2>Auto New Business</h2><p>Practice prior insurance, vehicles, drivers, household disclosure, coverage limits, underwriting questions, and carrier comparison.</p>
          <ul class="feature-list"><li>Multiple vehicles and drivers</li><li>MVR-style risk flags</li><li>Referral / decline logic</li></ul>
        </button>
        <button class="card line-card" data-action="start-line" data-line="home">
          <span class="badge green">Property</span><h2>Homeowners New Business</h2><p>Practice occupancy, roof, construction, coverage, claim history, hazards, inspection, and documentation review.</p>
          <ul class="feature-list"><li>Roof and system updates</li><li>Loss and hazard review</li><li>Replacement cost checks</li></ul>
        </button>
      </div>
      <div class="section-title"><div><h2>Draft Quotes</h2><p>Continue saved draft applications.</p></div></div>
      ${renderQuoteTable(drafts, true)}
    `;
    return;
  }
  renderWizard();
}

function createDefaultForm(line){
  const schema = QB[line];
  const form = {};
  schema.steps.forEach(step => {
    if(step.fields){
      form[step.key] = {};
      step.fields.forEach(f => {
        const [name,,,,,def] = f;
        form[step.key][name] = def === 'today' ? todayISO() : (def ?? '');
      });
    }
  });
  if(line === 'auto'){
    form.vehicles = [clone(schema.defaultVehicle)];
    form.drivers = [clone(schema.defaultDriver)];
  }
  return form;
}

function startWizard(line, quote=null){
  state.wizard = quote ? {line:quote.line, step:0, form:clone(quote.form), quoteId:quote.id, results:quote.results || null} : {line, step:0, form:createDefaultForm(line), quoteId:null, results:null};
  setView('newQuote');
}

function renderWizard(){
  const w = state.wizard;
  const schema = QB[w.line];
  const step = schema.steps[w.step];
  const progress = Math.round(((w.step+1)/schema.steps.length)*100);
  const base = ENGINE.baseFlags(w.line, w.form);
  $('#newQuoteView').innerHTML = `
    <div class="section-title">
      <div><h2>${safe(schema.label)} Workflow</h2><p>${safe(step.hint)}</p></div>
      <div class="inline-actions"><button class="secondary-btn" data-action="cancel-wizard">Close Workflow</button><button class="warning-btn" data-action="save-draft">Save Draft</button></div>
    </div>
    <div class="wizard">
      <div class="stepper">
        ${schema.steps.map((s,i)=>`<button class="step-btn ${i===w.step?'active':''} ${i<w.step?'complete':''}" data-action="go-step" data-step="${i}"><span class="step-num">${i+1}</span><span class="step-label"><strong>${safe(s.title)}</strong><span>${i < w.step ? 'Completed' : i === w.step ? 'Current section' : 'Pending'}</span></span>${i<w.step?'✓':''}</button>`).join('')}
        <div class="card score-card">
          <span class="badge ${base.riskScore < 40 ? 'green' : base.riskScore < 70 ? 'orange' : 'red'}">Live Risk Score</span>
          <div class="score-number">${base.riskScore}</div>
          <div class="risk-meter"><div class="risk-fill" style="width:${base.riskScore}%"></div></div>
          <small>QA Score: <b>${base.qaScore}%</b> • Progress: <b>${progress}%</b></small>
        </div>
      </div>
      <div class="card wizard-card">
        <div class="form-header"><h2>${safe(step.title)}</h2><p>${safe(step.hint)}</p></div>
        ${step.review ? renderReviewStep(base) : step.repeat ? renderRepeatStep(step.repeat) : renderFields(step)}
        <div class="wizard-actions">
          <button class="secondary-btn" data-action="prev-step" ${w.step === 0 ? 'disabled' : ''}>Back</button>
          <div class="inline-actions">
            <button class="ghost-btn" data-action="save-draft">Save Draft</button>
            ${w.step < schema.steps.length-1 ? `<button class="primary-btn" data-action="next-step">Save & Continue</button>` : `<button class="primary-btn" data-action="rate-quote">Rate Quote</button>`}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFields(step){
  const group = state.wizard.form[step.key] || {};
  return `<div class="form-grid">${step.fields.map(field => renderField(field, step.key, group)).join('')}</div>`;
}
function renderField(field, groupKey, group){
  const [name,label,type,options,required,,help] = field;
  const value = group[name] ?? '';
  const req = required ? '<span class="req">*</span>' : '';
  const full = type === 'textarea' ? ' full' : '';
  const opts = resolveOptions(options);
  let control = '';
  if(type === 'select') control = `<select data-field="${groupKey}.${name}">${opts.map(o=>`<option ${String(value)===String(o)?'selected':''}>${safe(o)}</option>`).join('')}</select>`;
  else if(type === 'textarea') control = `<textarea data-field="${groupKey}.${name}" placeholder="Enter notes...">${safe(value)}</textarea>`;
  else control = `<input data-field="${groupKey}.${name}" type="${type}" value="${safe(value)}" ${type==='number'?'step="1"':''}/>`;
  return `<div class="field${full}" data-wrap="${groupKey}.${name}" data-required="${required ? 'true':'false'}"><label>${safe(label)} ${req}</label>${control}${help?`<small>${safe(help)}</small>`:''}<div class="error-text">This field is required.</div></div>`;
}
function resolveOptions(options){ return typeof options === 'string' ? DATA[options] || [] : options || []; }

function renderRepeatStep(type){
  const list = state.wizard.form[type] || [];
  const fieldDefs = type === 'vehicles' ? vehicleFields() : driverFields();
  const label = type === 'vehicles' ? 'Vehicle' : 'Driver';
  return `
    <div class="repeat-list">
      ${list.map((item,index)=>`<div class="repeat-card">
        <div class="repeat-head"><h3>${label} ${index+1}</h3>${list.length > 1 ? `<button class="danger-btn" data-action="remove-repeat" data-repeat="${type}" data-index="${index}">Remove</button>`:''}</div>
        <div class="form-grid">${fieldDefs.map(f=>renderRepeatField(f,type,index,item)).join('')}</div>
      </div>`).join('')}
    </div>
    <div class="inline-actions" style="margin-top:16px"><button class="secondary-btn" data-action="add-repeat" data-repeat="${type}">Add ${label}</button></div>
  `;
}
function renderRepeatField(field,type,index,item){
  const [name,label,inputType,options,required] = field;
  const value = item[name] ?? '';
  const opts = resolveOptions(options);
  const full = inputType === 'textarea' ? ' full' : '';
  let control = '';
  if(inputType === 'select') control = `<select data-repeat="${type}" data-index="${index}" data-name="${name}">${opts.map(o=>`<option ${String(value)===String(o)?'selected':''}>${safe(o)}</option>`).join('')}</select>`;
  else control = `<input data-repeat="${type}" data-index="${index}" data-name="${name}" type="${inputType}" value="${safe(value)}" />`;
  return `<div class="field${full}" data-required="${required?'true':'false'}"><label>${safe(label)} ${required?'<span class="req">*</span>':''}</label>${control}<div class="error-text">This field is required.</div></div>`;
}
function vehicleFields(){ return [
  ['year','Year','number',null,true],['make','Make','text',null,true],['model','Model','text',null,true],['vin','VIN','text',null,false],['bodyStyle','Body Style','select',['Sedan','SUV','Truck','Van','Coupe','Wagon','Crossover'],true],['ownership','Ownership','select',['Owned','Financed','Leased'],true],['vehicleUse','Vehicle Use','select',['Pleasure','Commute','Business Use','Farm Use'],true],['annualMileage','Annual Mileage','number',null,true],['commuteMiles','One-Way Commute Miles','number',null,false],['garagingSame','Garaging same as mailing','select','yesNo',true],['rideshare','Rideshare / delivery / livery','select','yesNo',true],['modified','Modified / salvaged / unrepaired damage','select','yesNo',true]
]; }
function driverFields(){ return [
  ['firstName','First Name','text',null,true],['lastName','Last Name','text',null,true],['dob','Date of Birth','date',null,true],['relationship','Relationship','select',['Named Insured','Spouse','Child','Parent','Other Household Member','Excluded'],true],['licenseState','License State','select','states',true],['licenseStatus','License Status','select',['Valid','Permit','Suspended','Expired','Foreign License'],true],['yearsLicensed','Years Licensed','number',null,true],['accidents','At-Fault Accidents 5 yrs','number',null,true],['violations','Moving Violations 5 yrs','number',null,true],['dui','DUI / major violation','select','yesNo',true],['excluded','Excluded Driver','select','yesNo',true]
]; }

function renderReviewStep(base){
  const w = state.wizard;
  const resultBlock = w.results ? renderResults(w.results) : '<div class="notice">No quote results yet. Click <b>Rate Quote</b> to run the simulated carrier rating engine.</div>';
  return `
    <div class="comparison-grid">
      <div class="card">
        <h3>Application Summary</h3>
        <div class="summary-box">
          <div class="summary-row"><span>Line</span><strong>${safe(lineLabel(w.line))}</strong></div>
          <div class="summary-row"><span>Applicant</span><strong>${safe(customerName(w.form))}</strong></div>
          <div class="summary-row"><span>State</span><strong>${safe(w.form.setup?.state || '')}</strong></div>
          <div class="summary-row"><span>Effective Date</span><strong>${safe(w.form.setup?.effectiveDate || '')}</strong></div>
          <div class="summary-row"><span>Risk Score</span><strong>${base.riskScore}</strong></div>
          <div class="summary-row"><span>QA Score</span><strong>${base.qaScore}%</strong></div>
        </div>
      </div>
      <div class="card">
        <h3>Training Flags</h3>
        ${base.flags.length ? `<ul class="flag-list">${base.flags.map(f=>`<li>${safe(f)}</li>`).join('')}</ul>` : `<div class="notice success">No major training flags detected.</div>`}
        ${base.qaDeductions.length ? `<h4>QA Deductions</h4><ul class="flag-list">${base.qaDeductions.map(f=>`<li>${safe(f)}</li>`).join('')}</ul>` : ''}
        ${base.requiredDocs.length ? `<h4>Suggested Documents</h4><ul class="flag-list">${base.requiredDocs.map(f=>`<li>${safe(f)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>
    <div class="section-title"><div><h2>Carrier Comparison</h2><p>Fictional results generated for training only.</p></div><div class="inline-actions"><button class="primary-btn" data-action="rate-quote">Rate Quote</button>${w.results ? '<button class="success-btn" data-action="submit-review">Submit for Trainer Review</button>' : ''}</div></div>
    ${resultBlock}
  `;
}

function renderResults(results){
  return `<div class="carrier-results">${results.carriers.map(r=>`
    <div class="card carrier-card">
      <div class="carrier-head"><div><div class="carrier-name">${safe(r.carrier)}</div><small>${safe(r.tier)}</small></div>${statusBadge(r.status)}</div>
      <div class="premium">${r.premium ? money(r.premium) : 'N/A'} <small>/ annual</small></div>
      <div class="summary-row"><span>Monthly est.</span><strong>${r.monthly ? money(r.monthly) : 'N/A'}</strong></div>
      <div class="summary-row"><span>Down payment</span><strong>${r.downPayment ? money(r.downPayment) : 'N/A'}</strong></div>
      <div class="summary-row"><span>Appetite</span><strong>${r.appetiteScore}%</strong></div>
      <ul class="flag-list">${r.notes.slice(0,4).map(n=>`<li>${safe(n)}</li>`).join('')}</ul>
    </div>`).join('')}</div>`;
}

function validateCurrentStep(){
  const w = state.wizard;
  const step = QB[w.line].steps[w.step];
  let valid = true;
  $$('.field').forEach(f => f.classList.remove('error'));
  if(step.fields){
    step.fields.forEach(field => {
      const [name,,type,,required] = field;
      const value = w.form[step.key]?.[name];
      const wrap = $(`[data-wrap="${step.key}.${name}"]`);
      if(required && String(value ?? '').trim() === ''){ valid = false; wrap?.classList.add('error'); }
      if(type === 'email' && value && !String(value).includes('@')){ valid = false; wrap?.classList.add('error'); }
    });
  }
  if(step.repeat){
    (w.form[step.repeat] || []).forEach((item,index)=>{
      const fields = step.repeat === 'vehicles' ? vehicleFields() : driverFields();
      fields.forEach(field=>{
        const [name,,,,required] = field;
        if(required && String(item[name] ?? '').trim() === '') valid = false;
      });
    });
  }
  if(!valid){
    toast('Please complete required fields before continuing.');
    logAction('validation-error', `Required field validation failed on ${step.title}.`, w.quoteId || 'Draft');
  }
  return valid;
}

function handleFieldInput(e){
  if(!state.wizard) return;
  const target = e.target;
  if(target.dataset.field){
    const [group,name] = target.dataset.field.split('.');
    state.wizard.form[group] ||= {};
    state.wizard.form[group][name] = target.value;
    state.wizard.results = null;
  }
  if(target.dataset.repeat){
    const type = target.dataset.repeat;
    const index = Number(target.dataset.index);
    const name = target.dataset.name;
    state.wizard.form[type][index][name] = target.value;
    state.wizard.results = null;
  }
}

function handleAction(e){
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  if(action === 'view') setView(btn.dataset.view);
  if(action === 'start-line') startWizard(btn.dataset.line);
  if(action === 'cancel-wizard'){ state.wizard = null; renderNewQuote(); }
  if(action === 'next-step'){ if(validateCurrentStep()){ state.wizard.step++; renderWizard(); } }
  if(action === 'prev-step'){ state.wizard.step = Math.max(0,state.wizard.step-1); renderWizard(); }
  if(action === 'go-step'){ const target = Number(btn.dataset.step); if(target <= state.wizard.step || validateCurrentStep()){ state.wizard.step = target; renderWizard(); } }
  if(action === 'add-repeat') addRepeat(btn.dataset.repeat);
  if(action === 'remove-repeat') removeRepeat(btn.dataset.repeat, Number(btn.dataset.index));
  if(action === 'save-draft') saveCurrentQuote('Draft');
  if(action === 'rate-quote') rateCurrentQuote();
  if(action === 'submit-review') submitForReview();
  if(action === 'queue-filter'){ state.queueFilter = btn.dataset.filter; renderQueue(); }
  if(action === 'queue-open') openQuote(btn.dataset.id);
  if(action === 'queue-view') showQuoteModal(btn.dataset.id);
  if(action === 'queue-delete') deleteQuote(btn.dataset.id);
  if(action === 'queue-duplicate') duplicateQuote(btn.dataset.id);
  if(action === 'trainer-review') showTrainerReview(btn.dataset.id);
  if(action === 'save-review') saveTrainerReview(btn.dataset.id);
  if(action === 'close-modal') closeModal();
  if(action === 'export-csv') exportCSV();
  if(action === 'export-json') exportJSON();
  if(action === 'import-json') importJSON();
  if(action === 'reset-data') resetAllData();
  if(action === 'seed-demo') seedDemoData();
  if(action === 'clear-drafts') clearDrafts();
}

function addRepeat(type){
  const line = state.wizard.line;
  const item = type === 'vehicles' ? QB[line].defaultVehicle : QB[line].defaultDriver;
  state.wizard.form[type].push(clone(item));
  state.wizard.results = null;
  renderWizard();
}
function removeRepeat(type,index){
  state.wizard.form[type].splice(index,1);
  state.wizard.results = null;
  renderWizard();
}

function currentQuotePayload(statusOverride=null){
  const w = state.wizard;
  const results = w.results || ENGINE.calculate(w.line, w.form, DATA);
  const carrierStatuses = results.carriers.map(r=>r.status);
  let status = statusOverride || 'Rated';
  if(!statusOverride){
    if(carrierStatuses.every(s=>s==='Declined')) status = 'Declined';
    else if(carrierStatuses.includes('Referral') || results.riskScore >= 70) status = 'Referral';
    else status = 'Rated';
  }
  const eligiblePremiums = results.carriers.filter(r=>r.premium).map(r=>r.premium);
  return {
    id: w.quoteId || uid('QUOTE'),
    line: w.line,
    customer: customerName(w.form),
    state: w.form.setup?.state || '',
    effectiveDate: w.form.setup?.effectiveDate || '',
    status,
    riskScore: results.riskScore,
    qaScore: results.qaScore,
    premiumLow: eligiblePremiums.length ? Math.min(...eligiblePremiums) : 0,
    premiumHigh: eligiblePremiums.length ? Math.max(...eligiblePremiums) : 0,
    owner: state.session.name,
    team: state.session.team,
    updatedAt: nowISO(),
    createdAt: w.quoteId ? (getQuotes().find(q=>q.id===w.quoteId)?.createdAt || nowISO()) : nowISO(),
    form: clone(w.form),
    results: clone(results),
    trainerReview: getQuotes().find(q=>q.id===w.quoteId)?.trainerReview || null
  };
}

function upsertQuote(quote){
  const quotes = getQuotes();
  const idx = quotes.findIndex(q=>q.id === quote.id);
  if(idx >= 0) quotes[idx] = quote; else quotes.unshift(quote);
  setQuotes(quotes);
  state.wizard.quoteId = quote.id;
  return quote;
}

function saveCurrentQuote(status='Draft'){
  if(!state.wizard) return;
  const quote = upsertQuote(currentQuotePayload(status));
  logAction(status === 'Draft' ? 'save-draft' : 'save-quote', `${quote.customer} ${status.toLowerCase()} saved.`, quote.id);
  toast(`${status} saved to work queue.`);
  render();
}
function rateCurrentQuote(){
  if(!validateCurrentStep()) return;
  const w = state.wizard;
  w.results = ENGINE.calculate(w.line, w.form, DATA);
  const quote = upsertQuote(currentQuotePayload());
  logAction('rate', `${quote.customer} was rated. Status: ${quote.status}.`, quote.id);
  toast('Carrier comparison generated.');
  renderWizard(); renderQueue(); renderDashboard();
}
function submitForReview(){
  if(!state.wizard?.results) rateCurrentQuote();
  const quote = upsertQuote(currentQuotePayload('Pending Review'));
  logAction('submit-review', `${quote.customer} submitted for trainer review.`, quote.id);
  toast('Submitted for Trainer/TL review.');
  render();
}

function renderQueue(){
  const filters = ['all','Draft','Rated','Referral','Pending Review','Declined','Reviewed'];
  let quotes = getQuotes();
  if(state.queueFilter !== 'all') quotes = quotes.filter(q => q.status === state.queueFilter);
  $('#queueView').innerHTML = `
    <div class="tabs">${filters.map(f=>`<button class="tab-btn ${state.queueFilter===f?'active':''}" data-action="queue-filter" data-filter="${f}">${safe(f)}</button>`).join('')}</div>
    <div class="section-title"><div><h2>Saved Quote Files</h2><p>Open, duplicate, review, or export local quote records.</p></div><div class="inline-actions"><button class="secondary-btn" data-action="export-csv">Export CSV</button><button class="secondary-btn" data-action="export-json">Export JSON</button></div></div>
    ${renderQuoteTable(quotes, false)}
  `;
}

function renderQuoteTable(quotes, compact=false){
  if(!quotes.length) return `<div class="empty card">No quote records found.</div>`;
  const rows = quotes.map(q=>`
    <tr>
      <td><b>${safe(q.customer)}</b><br><small>${safe(q.id)}</small></td>
      <td>${safe(lineLabel(q.line))}<br><small>${safe(q.state)} • Eff ${safe(q.effectiveDate)}</small></td>
      <td>${statusBadge(q.status)}</td>
      <td><b>${q.riskScore ?? '-'}</b><br><small>QA ${q.qaScore ?? '-'}%</small></td>
      <td>${q.premiumLow ? `${money(q.premiumLow)} - ${money(q.premiumHigh)}` : 'N/A'}</td>
      <td>${safe(q.owner || '')}<br><small>${fmtDate(q.updatedAt)}</small></td>
      <td><div class="inline-actions"><button class="secondary-btn" data-action="queue-open" data-id="${q.id}">Open</button><button class="ghost-btn" data-action="queue-view" data-id="${q.id}">View</button>${compact?'':`<button class="ghost-btn" data-action="queue-duplicate" data-id="${q.id}">Duplicate</button><button class="danger-btn" data-action="queue-delete" data-id="${q.id}">Delete</button>`}</div></td>
    </tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Line</th><th>Status</th><th>Risk / QA</th><th>Premium Range</th><th>Owner / Updated</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function openQuote(id){
  const quote = getQuotes().find(q => q.id === id);
  if(!quote){ toast('Quote not found.'); return; }
  startWizard(quote.line, quote);
  logAction('open-quote', `${quote.customer} quote opened.`, quote.id);
}
function deleteQuote(id){
  if(!confirm('Delete this local quote record?')) return;
  const quote = getQuotes().find(q=>q.id===id);
  setQuotes(getQuotes().filter(q=>q.id !== id));
  logAction('delete-quote', `${quote?.customer || 'Quote'} deleted.`, id);
  toast('Quote deleted.'); render();
}
function duplicateQuote(id){
  const quote = getQuotes().find(q=>q.id===id); if(!quote) return;
  const copy = clone(quote); copy.id = uid('QUOTE'); copy.status = 'Draft'; copy.customer = `${copy.customer} Copy`; copy.createdAt = nowISO(); copy.updatedAt = nowISO(); copy.owner = state.session.name;
  setQuotes([copy, ...getQuotes()]);
  logAction('duplicate-quote', `${quote.customer} duplicated.`, copy.id);
  toast('Quote duplicated as draft.'); render();
}

function renderMatrix(){
  $('#matrixView').innerHTML = `
    <div class="helper-banner"><b>Training note:</b> This matrix teaches appetite thinking. It is not an official carrier guideline and should never replace real underwriting manuals.</div>
    <div class="grid-3">
      ${DATA.carriers.map(c=>`<div class="card appetite-card">
        <span class="badge blue">${safe(c.code)} • ${safe(c.tier)}</span><h3>${safe(c.name)}</h3>
        <p>${safe(c.appetite.auto)}</p><p>${safe(c.appetite.home)}</p>
        <h4>Strengths</h4><ul class="flag-list">${c.strengths.map(s=>`<li>${safe(s)}</li>`).join('')}</ul>
        <h4>Cautions</h4><ul class="flag-list">${c.cautions.map(s=>`<li>${safe(s)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  `;
}

function renderTrainer(){
  const quotes = getQuotes();
  const pending = quotes.filter(q => q.status === 'Pending Review' || q.status === 'Referral');
  const logins = read(STORAGE.LOGINS, []);
  const logs = getLogs();
  if(roleLocked()){
    $('#trainerView').innerHTML = `<div class="card"><span class="badge orange">Trainer/TL Only</span><h2>Trainer dashboard is locked</h2><p class="muted">Logout and sign in as Trainer/TL using the training access code to review VA quote submissions.</p></div>`;
    return;
  }
  $('#trainerView').innerHTML = `
    <div class="grid-4">
      <div class="metric"><span>Pending Review</span><strong>${pending.length}</strong><small>Referral or submitted quote files.</small></div>
      <div class="metric"><span>Login Sessions</span><strong>${logins.length}</strong><small>Local training logins on this browser.</small></div>
      <div class="metric"><span>Audit Actions</span><strong>${logs.length}</strong><small>Saved local activity events.</small></div>
      <div class="metric"><span>Reviewed</span><strong>${quotes.filter(q=>q.status==='Reviewed').length}</strong><small>Coach-reviewed quote files.</small></div>
    </div>
    <div class="section-title"><div><h2>Review Queue</h2><p>Score trainee accuracy and add coaching comments.</p></div></div>
    ${renderTrainerTable(pending)}
    <div class="section-title"><div><h2>Login History</h2><p>Recent local sessions.</p></div></div>
    ${renderLoginTable(logins.slice(0,10))}
    <div class="section-title"><div><h2>Audit Log</h2><p>Latest trainee actions.</p></div></div>
    ${renderTimeline(logs.slice(0,10))}
  `;
}
function renderTrainerTable(quotes){
  if(!quotes.length) return `<div class="empty card">No quotes pending review.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Line</th><th>Status</th><th>Risk / QA</th><th>Owner</th><th>Review</th></tr></thead><tbody>${quotes.map(q=>`<tr><td><b>${safe(q.customer)}</b><br><small>${safe(q.id)}</small></td><td>${safe(lineLabel(q.line))}</td><td>${statusBadge(q.status)}</td><td>${q.riskScore} / ${q.qaScore}%</td><td>${safe(q.owner)}<br><small>${safe(q.team)}</small></td><td><button class="primary-btn" data-action="trainer-review" data-id="${q.id}">Review File</button></td></tr>`).join('')}</tbody></table></div>`;
}
function renderLoginTable(logins){
  if(!logins.length) return `<div class="empty card">No login records yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Team</th><th>Login Time</th></tr></thead><tbody>${logins.map(l=>`<tr><td>${safe(l.name)}</td><td>${safe(l.email || '-')}</td><td>${safe(l.role)}</td><td>${safe(l.team)}</td><td>${fmtDate(l.loginAt)}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderGuide(){
  const steps = [
    ['Start with account setup','Confirm transaction type, state, agency, producer code, effective date, and product line before entering risk details.'],
    ['Validate applicant information','Names, DOB, address, phone, and email must match the request source and any prior policy documents.'],
    ['Disclose all drivers and vehicles','For auto, never skip household residents, regular operators, excluded drivers, vehicle use, garaging, and prior insurance.'],
    ['Check property eligibility','For home, focus on occupancy, roof age/condition, updates, claims, hazards, and replacement cost.'],
    ['Answer underwriting questions carefully','Referral and decline outcomes are driven by underwriting answers. Do not guess. Add clear notes.'],
    ['Review before rating','Use the risk score, QA deductions, document list, and summary screen before submitting to trainer review.'],
    ['Save work queue records','Save drafts when incomplete and submit rated files for trainer/TL coaching review.'],
    ['Never use real private data','This is a training simulator only. Use sample or anonymized data.']
  ];
  $('#guideView').innerHTML = `
    <div class="guide-grid">${steps.map(s=>`<div class="card guide-step"><h3>${safe(s[0])}</h3><p class="muted">${safe(s[1])}</p></div>`).join('')}</div>
    <div class="section-title"><div><h2>Carrier Portal Best Practices</h2><p>Use these habits during quote practice.</p></div></div>
    <div class="grid-2"><div class="card"><h3>Do</h3><ul class="feature-list"><li>Verify before entering information</li><li>Use complete underwriting notes</li><li>Save drafts before leaving the page</li><li>Explain referral outcomes clearly</li></ul></div><div class="card"><h3>Do Not</h3><ul class="flag-list"><li>Do not enter real customer private data</li><li>Do not skip household drivers</li><li>Do not ignore roof or lapse concerns</li><li>Do not treat simulated premiums as real quotes</li></ul></div></div>
  `;
}

function renderAdmin(){
  const quotes = getQuotes();
  const logs = getLogs();
  $('#adminView').innerHTML = `
    <div class="grid-3">
      <div class="card"><h3>Export Records</h3><p class="muted">Download local quote data for coaching or backup.</p><div class="inline-actions"><button class="secondary-btn" data-action="export-csv">CSV</button><button class="secondary-btn" data-action="export-json">JSON</button></div></div>
      <div class="card"><h3>Seed Demo Data</h3><p class="muted">Add sample quotes to test dashboards and trainer review.</p><button class="primary-btn" data-action="seed-demo">Add Demo Quotes</button></div>
      <div class="card"><h3>Clear Local Data</h3><p class="muted">Remove drafts or reset all local simulator records on this browser.</p><div class="inline-actions"><button class="warning-btn" data-action="clear-drafts">Clear Drafts</button><button class="danger-btn" data-action="reset-data">Reset All</button></div></div>
    </div>
    <div class="section-title"><div><h2>Local Storage Summary</h2><p>Current browser data only. This static version has no database.</p></div></div>
    <div class="grid-3"><div class="metric"><span>Quotes</span><strong>${quotes.length}</strong></div><div class="metric"><span>Logs</span><strong>${logs.length}</strong></div><div class="metric"><span>Session Role</span><strong>${safe(state.session?.role || 'VA')}</strong></div></div>
    <div class="section-title"><div><h2>Import JSON Backup</h2><p>Paste a JSON export made from this portal.</p></div></div>
    <div class="card"><textarea id="importBox" placeholder='Paste JSON export here...'></textarea><br><br><button class="primary-btn" data-action="import-json">Import Backup</button></div>
  `;
}

function showQuoteModal(id){
  const q = getQuotes().find(x=>x.id===id); if(!q) return;
  const results = q.results ? renderResults(q.results) : '<div class="notice">No rating results saved.</div>';
  $('#modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>${safe(q.customer)}</h2><p class="muted">${safe(q.id)} • ${safe(lineLabel(q.line))}</p></div><button class="close-btn" data-action="close-modal">×</button></div><div class="status-strip">${statusBadge(q.status)}<span class="badge blue">Risk ${q.riskScore}</span><span class="badge green">QA ${q.qaScore}%</span></div>${results}${q.trainerReview ? `<div class="section-title"><div><h2>Trainer Review</h2></div></div><div class="notice success"><b>Score:</b> ${safe(q.trainerReview.score)}%<br><b>Comments:</b> ${safe(q.trainerReview.comments)}</div>`:''}</div></div>`;
}
function showTrainerReview(id){
  const q = getQuotes().find(x=>x.id===id); if(!q) return;
  $('#modalRoot').innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><h2>Trainer Review: ${safe(q.customer)}</h2><p class="muted">${safe(q.id)} • ${safe(lineLabel(q.line))}</p></div><button class="close-btn" data-action="close-modal">×</button></div>
    <div class="comparison-grid"><div class="card"><h3>File Snapshot</h3><div class="summary-box"><div class="summary-row"><span>Status</span><strong>${safe(q.status)}</strong></div><div class="summary-row"><span>Risk</span><strong>${q.riskScore}</strong></div><div class="summary-row"><span>QA</span><strong>${q.qaScore}%</strong></div><div class="summary-row"><span>Premium Range</span><strong>${q.premiumLow?`${money(q.premiumLow)} - ${money(q.premiumHigh)}`:'N/A'}</strong></div></div></div><div class="card"><h3>Checklist</h3><div class="checklist">${reviewChecklist(q.line).map((item,i)=>`<label class="check-item"><input type="checkbox" class="review-check" value="${i}" checked> <span>${safe(item)}</span></label>`).join('')}</div></div></div>
    <div class="section-title"><div><h2>Coaching Notes</h2><p>Add comments and save the review.</p></div></div><div class="card"><label>Trainer Comments</label><textarea id="reviewComments" placeholder="Example: Good carrier notes. Please verify prior limits before rating next time.">${safe(q.trainerReview?.comments || '')}</textarea><br><br><button class="primary-btn" data-action="save-review" data-id="${q.id}">Save Trainer Review</button></div>
  </div></div>`;
}
function reviewChecklist(line){
  return line === 'auto' ? ['Applicant information complete','Prior insurance and lapse reviewed','All vehicles added','All drivers and household residents reviewed','Coverage limits selected correctly','Underwriting notes are clear','Documents needed are listed'] : ['Applicant and property location complete','Roof and construction details verified','Coverage A and deductibles reviewed','Claim history reviewed','Hazards answered correctly','Underwriting notes are clear','Documents needed are listed'];
}
function saveTrainerReview(id){
  const checks = $$('.review-check');
  const checked = checks.filter(c=>c.checked).length;
  const score = Math.round((checked / checks.length) * 100);
  const comments = $('#reviewComments')?.value.trim() || 'Reviewed.';
  const quotes = getQuotes();
  const idx = quotes.findIndex(q=>q.id===id); if(idx < 0) return;
  quotes[idx].trainerReview = {score, comments, reviewedBy:state.session.name, reviewedAt:nowISO()};
  quotes[idx].status = 'Reviewed'; quotes[idx].updatedAt = nowISO();
  setQuotes(quotes);
  logAction('trainer-review', `${quotes[idx].customer} reviewed with score ${score}%.`, id);
  closeModal(); toast('Trainer review saved.'); render();
}
function closeModal(){ $('#modalRoot').innerHTML = ''; }

function exportCSV(){
  const quotes = getQuotes();
  const header = ['id','customer','line','state','effectiveDate','status','riskScore','qaScore','premiumLow','premiumHigh','owner','team','createdAt','updatedAt'];
  const rows = [header.join(',')].concat(quotes.map(q => header.map(h => `"${String(q[h] ?? '').replace(/"/g,'""')}"`).join(',')));
  downloadText(rows.join('\n'), 'lava-carrier-quotes.csv', 'text/csv');
  logAction('export-csv','Quote CSV exported.');
}
function exportJSON(){
  const payload = {exportedAt:nowISO(),quotes:getQuotes(),logs:getLogs(),logins:read(STORAGE.LOGINS,[])};
  downloadText(JSON.stringify(payload,null,2), 'lava-carrier-backup.json', 'application/json');
  logAction('export-json','JSON backup exported.');
}
function importJSON(){
  const raw = $('#importBox')?.value.trim(); if(!raw){ toast('Paste JSON backup first.'); return; }
  try{
    const data = JSON.parse(raw);
    if(Array.isArray(data.quotes)) setQuotes(data.quotes);
    if(Array.isArray(data.logs)) setLogs(data.logs);
    if(Array.isArray(data.logins)) write(STORAGE.LOGINS, data.logins);
    logAction('import-json','JSON backup imported.');
    toast('Backup imported.'); render();
  } catch { toast('Invalid JSON backup.'); }
}
function downloadText(content,filename,type){
  const blob = new Blob([content], {type});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}
function resetAllData(){
  if(!confirm('Reset all local quotes, logs, and login records?')) return;
  localStorage.removeItem(STORAGE.QUOTES); localStorage.removeItem(STORAGE.LOGS); localStorage.removeItem(STORAGE.LOGINS);
  state.wizard = null; toast('Local data reset.'); render();
}
function clearDrafts(){
  setQuotes(getQuotes().filter(q=>q.status !== 'Draft'));
  logAction('clear-drafts','Draft quotes cleared.'); toast('Drafts cleared.'); render();
}
function seedDemoData(){
  const autoForm = createDefaultForm('auto');
  autoForm.drivers[0].accidents = 1; autoForm.coverage.biLimit = '100/300';
  const homeForm = createDefaultForm('home');
  homeForm.property.roofYear = 2005; homeForm.risk.roofCondition = 'Average';
  const examples = [{line:'auto',form:autoForm},{line:'home',form:homeForm}].map(ex=>{
    const results = ENGINE.calculate(ex.line, ex.form, DATA);
    const eligible = results.carriers.filter(r=>r.premium).map(r=>r.premium);
    return {id:uid('QUOTE'),line:ex.line,customer:customerName(ex.form),state:ex.form.setup.state,effectiveDate:ex.form.setup.effectiveDate,status:results.riskScore>65?'Referral':'Rated',riskScore:results.riskScore,qaScore:results.qaScore,premiumLow:Math.min(...eligible),premiumHigh:Math.max(...eligible),owner:state.session.name,team:state.session.team,createdAt:nowISO(),updatedAt:nowISO(),form:ex.form,results};
  });
  setQuotes([...examples, ...getQuotes()]);
  logAction('seed-demo','Demo quote records added.'); toast('Demo records added.'); render();
}

init();
