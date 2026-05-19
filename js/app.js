(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const storeKey = 'lavaCarrierOpsTrainingV1';
  const trainerCode = 'LAVA2026';

  const emptyState = () => ({
    session: null,
    policies: [],
    quotes: [],
    payments: [],
    endorsements: [],
    cancellations: [],
    remarkets: [],
    tasks: [],
    qa: [],
    activity: [],
    idCards: [],
    selectedPolicyId: null
  });

  let state = loadState();
  let quoteStepIndex = 0;
  let lastQuoteResult = null;

  function loadState() {
    try {
      const saved = localStorage.getItem(storeKey);
      if (!saved) return emptyState();
      return { ...emptyState(), ...JSON.parse(saved) };
    } catch (error) {
      console.error(error);
      return emptyState();
    }
  }

  function saveState() {
    localStorage.setItem(storeKey, JSON.stringify(state));
    renderAll();
  }

  function nowStamp() {
    return new Date().toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function uid(prefix = 'REF') {
    const year = String(new Date().getFullYear()).slice(-2);
    return `${prefix}-${year}${Math.floor(100000 + Math.random() * 900000)}`;
  }

  function money(value) {
    const n = Number(value || 0);
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function toast(message) {
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2600);
  }

  function logActivity(type, message, reference = '') {
    state.activity.unshift({ id: uid('ACT'), time: nowStamp(), type, message, reference, user: state.session?.name || 'System' });
    state.activity = state.activity.slice(0, 150);
  }

  function addTask(type, title, policyNumber = '', priority = 'Normal', notes = '') {
    state.tasks.unshift({ id: uid('TASK'), type, title, policyNumber, priority, notes, status: 'Open', created: nowStamp(), owner: state.session?.name || 'Unassigned' });
  }

  function init() {
    bindEvents();
    if (state.session) showApp();
    else showLogin();
    renderAll();
    syncProductFields();
    showQuoteStep(0);
  }

  function bindEvents() {
    $('#loginRole')?.addEventListener('change', e => {
      $('#trainerCodeWrap').classList.toggle('hidden', e.target.value !== 'trainer');
    });

    $('#loginForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#loginName').value.trim();
      const email = $('#loginEmail').value.trim();
      const role = $('#loginRole').value;
      const code = $('#trainerCode').value.trim();
      if (role === 'trainer' && code !== trainerCode) {
        toast('Invalid trainer access code.');
        return;
      }
      state.session = { name, email, role, loginTime: nowStamp() };
      logActivity('Login', `${name} entered the portal as ${role === 'trainer' ? 'Trainer/TL' : 'VA Trainee'}.`);
      saveState();
      showApp();
    });

    $('#logoutBtn')?.addEventListener('click', () => {
      logActivity('Logout', `${state.session?.name || 'User'} logged out.`);
      state.session = null;
      saveState();
      showLogin();
    });

    $('#themeToggle')?.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('lavaTheme', next);
    });
    const savedTheme = localStorage.getItem('lavaTheme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

    $$('.nav-item').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
    $$('[data-jump]').forEach(button => button.addEventListener('click', () => showView(button.dataset.jump)));

    $('#backupBtn')?.addEventListener('click', exportBackup);
    $('#importBackupInput')?.addEventListener('change', importBackup);
    $('#clearActivityBtn')?.addEventListener('click', () => {
      state.activity = [];
      saveState();
      toast('Activity cleared.');
    });

    $('#manualPolicyForm')?.addEventListener('submit', saveManualPolicy);
    $('#policySearchBtn')?.addEventListener('click', searchPolicies);
    $('#resetSearchBtn')?.addEventListener('click', () => {
      $('#policySearchValue').value = '';
      $('#policyResults').className = 'result-list empty-state';
      $('#policyResults').textContent = 'No policy selected.';
      state.selectedPolicyId = null;
      saveState();
    });

    $('#quoteProduct')?.addEventListener('change', syncProductFields);
    $$('.step-dot').forEach((button, index) => button.addEventListener('click', () => showQuoteStep(index)));
    $('#prevQuoteStep')?.addEventListener('click', () => showQuoteStep(Math.max(0, quoteStepIndex - 1)));
    $('#nextQuoteStep')?.addEventListener('click', () => showQuoteStep(Math.min(4, quoteStepIndex + 1)));
    $('#saveQuoteDraftBtn')?.addEventListener('click', saveQuoteDraft);
    $('#quoteForm')?.addEventListener('submit', generateQuote);
    $('#quoteForm')?.addEventListener('reset', () => {
      setTimeout(() => {
        lastQuoteResult = null;
        $('#quoteResults').className = 'result-list empty-state';
        $('#quoteResults').textContent = 'Complete the blank quote form and generate results.';
        $('#quoteValidation').textContent = 'No validation run yet.';
        syncProductFields();
        showQuoteStep(0);
      }, 0);
    });

    $('#idCardForm')?.addEventListener('submit', generateIdCard);
    $('#printIdCardBtn')?.addEventListener('click', () => window.print());

    $('#paymentForm')?.addEventListener('submit', postPayment);
    $('#exportPaymentsBtn')?.addEventListener('click', () => exportCsv('payments.csv', state.payments));

    $('#endorsementType')?.addEventListener('change', renderEndorsementChecklist);
    $('#endorsementForm')?.addEventListener('submit', submitEndorsement);
    $('#exportEndorsementsBtn')?.addEventListener('click', () => exportCsv('endorsements.csv', state.endorsements));

    $('#cancellationForm')?.addEventListener('submit', submitCancellation);
    $('#exportCancellationsBtn')?.addEventListener('click', () => exportCsv('cancellations.csv', state.cancellations));

    $('#remarketForm')?.addEventListener('submit', generateRemarketing);
    $('#exportRemarketsBtn')?.addEventListener('click', () => exportCsv('remarketing.csv', state.remarkets));

    $('#addManualTaskBtn')?.addEventListener('click', () => {
      const title = prompt('Task title');
      if (!title) return;
      addTask('Manual', title, '', 'Normal', 'Manual training task');
      logActivity('Task', `Manual task added: ${title}`);
      saveState();
    });
    $('#clearCompletedTasksBtn')?.addEventListener('click', () => {
      state.tasks = state.tasks.filter(t => t.status !== 'Completed');
      saveState();
      toast('Completed tasks cleared.');
    });

    $('#qaForm')?.addEventListener('submit', saveQaReview);
    $('#exportQaBtn')?.addEventListener('click', () => exportCsv('qa-reviews.csv', state.qa));
    $('#exportActivityBtn')?.addEventListener('click', () => exportCsv('system-activity.csv', state.activity));

    document.addEventListener('click', handleDynamicClicks);
  }

  function showLogin() {
    $('#loginScreen')?.classList.remove('hidden');
    $('#appShell')?.classList.add('hidden');
  }

  function showApp() {
    $('#loginScreen')?.classList.add('hidden');
    $('#appShell')?.classList.remove('hidden');
    showView('dashboard');
  }

  function showView(viewId) {
    $$('.view').forEach(v => v.classList.remove('active-view'));
    $(`#${viewId}`)?.classList.add('active-view');
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
    const label = $(`.nav-item[data-view="${viewId}"]`)?.textContent || 'Dashboard';
    $('#viewTitle').textContent = label;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    renderSession();
    renderDashboard();
    renderSelectedPolicy();
    renderPaymentHistory();
    renderEndorsementLog();
    renderCancellationLog();
    renderRemarketingResults();
    renderQueue();
    renderQaLog();
    renderActivityTable();
  }

  function renderSession() {
    const badge = $('#sessionBadge');
    if (!badge) return;
    if (!state.session) badge.textContent = 'Not logged in';
    else badge.textContent = `${state.session.name} • ${state.session.role === 'trainer' ? 'Trainer/TL' : 'VA Trainee'}`;
  }

  function renderDashboard() {
    setText('#statPolicies', state.policies.length);
    setText('#statQueue', state.tasks.filter(t => t.status !== 'Completed').length);
    setText('#statQuotes', state.quotes.length);
    setText('#statPayments', state.payments.length);

    const node = $('#recentActivity');
    if (!node) return;
    if (!state.activity.length) {
      node.className = 'activity-list empty-state';
      node.textContent = 'No activity yet.';
      return;
    }
    node.className = 'activity-list';
    node.innerHTML = state.activity.slice(0, 8).map(item => `
      <div class="activity-item">
        <b>${esc(item.type)} — ${esc(item.message)}</b>
        <span class="meta">${esc(item.time)} • User: ${esc(item.user)} ${item.reference ? '• Ref: ' + esc(item.reference) : ''}</span>
      </div>
    `).join('');
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function saveManualPolicy(e) {
    e.preventDefault();
    const data = formData(e.target);
    const lobCode = data.lob === 'Auto' ? 'AUTO' : 'HOME';
    const policy = {
      id: uid('POL'),
      policyNumber: data.policyNumber.trim() || uid(`LVA-${lobCode}`),
      lob: data.lob,
      insuredName: data.insuredName.trim(),
      effectiveDate: data.effectiveDate,
      expirationDate: data.expirationDate,
      premium: Number(data.premium || 0),
      status: data.status,
      riskAddress: data.riskAddress,
      notes: data.notes,
      created: nowStamp(),
      source: 'Manual Policy Admin',
      details: {}
    };
    state.policies.unshift(policy);
    state.selectedPolicyId = policy.id;
    logActivity('Policy', `Training policy saved for ${policy.insuredName}.`, policy.policyNumber);
    addTask('Policy Service', `Verify policy file for ${policy.insuredName}`, policy.policyNumber, 'Normal', 'Manual policy created. Confirm required fields and documents.');
    e.target.reset();
    saveState();
    searchPolicies(policy.policyNumber);
    toast('Training policy saved.');
  }

  function searchPolicies(forcedValue) {
    const type = $('#policySearchType')?.value || 'policyNumber';
    const value = String(forcedValue || $('#policySearchValue')?.value || '').trim().toLowerCase();
    const node = $('#policyResults');
    if (!node) return;
    if (!value) {
      node.className = 'result-list empty-state';
      node.textContent = 'Enter a policy number or named insured to search.';
      return;
    }
    const results = state.policies.filter(policy => {
      const target = type === 'insuredName' ? policy.insuredName : policy.policyNumber;
      return String(target || '').toLowerCase().includes(value);
    });
    if (!results.length) {
      node.className = 'result-list empty-state';
      node.innerHTML = `No records found for <b>${esc(value)}</b>. Create or bind a training policy first.`;
      return;
    }
    node.className = 'result-list';
    node.innerHTML = results.map(policyCard).join('');
  }

  function policyCard(policy) {
    return `
      <div class="result-card">
        <b>${esc(policy.policyNumber)} — ${esc(policy.insuredName)}</b>
        <span class="meta">${esc(policy.lob)} • ${esc(policy.status)} • Effective ${esc(policy.effectiveDate || 'N/A')} to ${esc(policy.expirationDate || 'N/A')} • Premium ${money(policy.premium)}</span>
        <div class="badge-row"><span class="pill">${esc(policy.source || 'Policy')}</span><span class="pill ${policy.status?.includes('Cancel') ? 'danger' : 'success'}">${esc(policy.status)}</span></div>
        <div class="card-actions">
          <button class="btn tiny primary" data-select-policy="${esc(policy.id)}">Open Policy File</button>
          <button class="btn tiny secondary" data-policy-to-id="${esc(policy.id)}">Use for Auto ID</button>
          <button class="btn tiny secondary" data-policy-action="payment" data-policy-id="${esc(policy.id)}">Payment</button>
          <button class="btn tiny secondary" data-policy-action="endorsement" data-policy-id="${esc(policy.id)}">Endorsement</button>
          <button class="btn tiny danger-ghost" data-policy-action="cancel" data-policy-id="${esc(policy.id)}">Cancel</button>
        </div>
      </div>
    `;
  }

  function renderSelectedPolicy() {
    const panel = $('#selectedPolicyPanel');
    const badge = $('#selectedPolicyBadge');
    if (!panel) return;
    const policy = state.policies.find(p => p.id === state.selectedPolicyId);
    if (!policy) {
      panel.className = 'empty-state';
      panel.textContent = 'Search or create a policy to view policy file actions.';
      if (badge) badge.textContent = 'None';
      return;
    }
    if (badge) badge.textContent = policy.policyNumber;
    panel.className = '';
    panel.innerHTML = `
      <div class="result-card">
        <h4>${esc(policy.insuredName)}</h4>
        <div class="id-grid">
          <div><b>Policy Number</b><br>${esc(policy.policyNumber)}</div>
          <div><b>LOB / Status</b><br>${esc(policy.lob)} • ${esc(policy.status)}</div>
          <div><b>Effective</b><br>${esc(policy.effectiveDate)} to ${esc(policy.expirationDate)}</div>
          <div><b>Premium</b><br>${money(policy.premium)}</div>
          <div class="full-span"><b>Risk Address</b><br>${esc(policy.riskAddress || 'Not entered')}</div>
          <div class="full-span"><b>Notes</b><br>${esc(policy.notes || 'No notes')}</div>
        </div>
        <div class="card-actions">
          <button class="btn tiny secondary" data-policy-action="payment" data-policy-id="${esc(policy.id)}">Process Payment</button>
          <button class="btn tiny secondary" data-policy-action="endorsement" data-policy-id="${esc(policy.id)}">Start Endorsement</button>
          <button class="btn tiny secondary" data-policy-to-id="${esc(policy.id)}">Generate Auto ID</button>
          <button class="btn tiny danger-ghost" data-policy-action="cancel" data-policy-id="${esc(policy.id)}">Cancel Policy</button>
          <button class="btn tiny danger-ghost" data-delete-policy="${esc(policy.id)}">Delete Training Record</button>
        </div>
      </div>
    `;
  }

  function syncProductFields() {
    const product = $('#quoteProduct')?.value || '';
    $$('.auto-fields').forEach(node => node.classList.toggle('hidden', product !== 'Auto'));
    $$('.home-fields').forEach(node => node.classList.toggle('hidden', product !== 'Home'));
  }

  function showQuoteStep(index) {
    quoteStepIndex = index;
    $$('.quote-tab').forEach((tab, i) => tab.classList.toggle('active', i === index));
    $$('.step-dot').forEach((button, i) => button.classList.toggle('active', i === index));
  }

  function validateQuote(data) {
    const product = data.product;
    const required = [...CARRIER_RULES.requiredQuoteFields.shared, ...(CARRIER_RULES.requiredQuoteFields[product] || [])];
    const missing = required.filter(field => !String(data[field] || '').trim());
    const warnings = [];
    if (Number(data.lapseDays || 0) > 30) warnings.push('Prior insurance lapse is over 30 days. Carrier referral likely.');
    if (data.priorCancel === 'Yes') warnings.push('Prior cancellation/non-renewal requires underwriting review.');
    if (data.openClaims === 'Yes') warnings.push('Open claim or pending litigation requires referral.');
    if (data.documentsReceived !== 'Yes') warnings.push('Documents are incomplete. Do not bind without review.');
    if (product === 'Auto') {
      if (data.vehicleUse === 'Delivery / Rideshare') warnings.push('Delivery/rideshare use may be ineligible or require special endorsement.');
      if (Number(data.violations || 0) >= 3) warnings.push('Three or more incidents may be declined by preferred markets.');
      if (data.sr22 === 'Yes') warnings.push('SR-22/FR-44 required. Nonstandard market or referral likely.');
    }
    if (product === 'Home') {
      const currentYear = new Date().getFullYear();
      if (data.roofYear && currentYear - Number(data.roofYear) > 20) warnings.push('Roof age is over 20 years. Inspection or roof exclusion may apply.');
      if (data.occupancy === 'Vacant') warnings.push('Vacant property is outside standard homeowners appetite.');
      if (Number(data.homeClaims || 0) >= 2) warnings.push('Two or more home claims may trigger referral or decline.');
      if (data.homeHazards === 'Yes') warnings.push('Pool/trampoline/dog/wood stove requires additional underwriting questions.');
    }
    return { missing, warnings };
  }

  function calculateRisk(data) {
    let score = 20;
    const factors = [];
    const add = (points, text) => { score += points; factors.push(text); };
    if (data.continuousInsurance === 'No') add(12, 'No continuous prior insurance');
    if (Number(data.lapseDays || 0) > 0) add(Math.min(25, Number(data.lapseDays) / 2), 'Prior insurance lapse');
    if (data.priorCancel === 'Yes') add(22, 'Prior cancellation/non-renewal');
    if (data.openClaims === 'Yes') add(18, 'Open claim or litigation');
    if (data.misrepresentation === 'Yes') add(45, 'Material misrepresentation');
    if (data.documentsReceived !== 'Yes') add(10, 'Documents incomplete');
    if (data.paymentReady === 'No') add(8, 'Payment not ready');

    if (data.product === 'Auto') {
      if (data.vehicleUse === 'Business') add(10, 'Business vehicle use');
      if (data.vehicleUse === 'Delivery / Rideshare') add(25, 'Delivery/rideshare exposure');
      if (Number(data.annualMileage || 0) > 18000) add(8, 'High annual mileage');
      if (Number(data.yearsLicensed || 0) < 3) add(12, 'Driver licensed less than 3 years');
      if (Number(data.violations || 0) > 0) add(Number(data.violations) * 12, 'Accidents/violations');
      if (data.sr22 === 'Yes') add(30, 'SR-22/FR-44 filing');
      if (data.excludedDrivers === 'Yes') add(8, 'Excluded driver required');
    }

    if (data.product === 'Home') {
      const currentYear = new Date().getFullYear();
      if (data.yearBuilt && currentYear - Number(data.yearBuilt) > 60) add(10, 'Older home');
      if (data.roofYear && currentYear - Number(data.roofYear) > 20) add(22, 'Older roof');
      if (data.construction === 'Manufactured Home') add(18, 'Manufactured home exposure');
      if (data.roofType === 'Wood Shake' || data.roofType === 'Flat Roof') add(15, 'Roof type concern');
      if (data.protectionClass === '9-10') add(15, 'High protection class');
      if (data.occupancy === 'Vacant') add(35, 'Vacant occupancy');
      if (Number(data.homeClaims || 0) > 0) add(Number(data.homeClaims) * 15, 'Prior home claims');
      if (data.homeHazards === 'Yes') add(12, 'Pool/trampoline/dog/wood stove exposure');
    }

    score = Math.round(Math.min(100, score));
    let status = 'Preferred';
    if (score >= 80 || data.misrepresentation === 'Yes') status = 'Declined';
    else if (score >= 58) status = 'Referral';
    else if (score >= 38) status = 'Standard';
    return { score, status, factors };
  }

  function generateQuote(e) {
    e.preventDefault();
    const form = e.target;
    const data = formData(form);
    const validation = validateQuote(data);
    renderQuoteValidation(validation);
    if (!data.product) {
      toast('Please select a line of business.');
      return;
    }
    const risk = calculateRisk(data);
    const carriers = CARRIER_RULES.carriers.map((carrier, index) => {
      const base = data.product === 'Auto' ? carrier.baseAuto : carrier.baseHome;
      const premium = Math.round((base + risk.score * 18 + index * 42) * (index === 4 && risk.status !== 'Preferred' ? 1.08 : 1));
      let status = risk.status;
      if (status === 'Preferred' && index > 2) status = 'Standard';
      if (status === 'Declined' && index === 4 && data.misrepresentation !== 'Yes') status = 'Referral';
      const downPayment = Math.round(premium * 0.18);
      return { carrier: carrier.name, appetite: carrier.appetite, status, annualPremium: premium, monthly: Math.round((premium - downPayment) / 10), downPayment };
    });
    const quote = {
      id: uid('QT'),
      quoteNumber: uid(data.product === 'Auto' ? 'QAUTO' : 'QHOME'),
      created: nowStamp(),
      status: 'Generated',
      data,
      risk,
      carriers,
      trainee: state.session?.name || 'Unknown'
    };
    lastQuoteResult = quote;
    state.quotes.unshift(quote);
    logActivity('Quote', `Carrier result generated for ${data.insuredName || 'blank account'}.`, quote.quoteNumber);
    addTask('Quote Review', `Review quote result for ${data.insuredName || 'Unnamed insured'}`, quote.quoteNumber, risk.status === 'Referral' || risk.status === 'Declined' ? 'High' : 'Normal', risk.factors.join('; '));
    saveState();
    renderQuoteResults(quote);
    toast('Carrier result generated.');
  }

  function renderQuoteValidation(validation) {
    const node = $('#quoteValidation');
    if (!node) return;
    const missingHtml = validation.missing.length ? `<b>Missing Required Fields:</b><ul>${validation.missing.map(m => `<li>${esc(labelize(m))}</li>`).join('')}</ul>` : '<b class="status-preferred">All core required fields have entries.</b>';
    const warnHtml = validation.warnings.length ? `<b>Underwriting Warnings:</b><ul>${validation.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p>No underwriting warnings found from current answers.</p>';
    node.innerHTML = `${missingHtml}<hr>${warnHtml}`;
  }

  function labelize(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  function renderQuoteResults(quote) {
    const node = $('#quoteResults');
    if (!node) return;
    node.className = 'result-list';
    const data = quote.data;
    node.innerHTML = `
      <div class="result-card">
        <b>${esc(quote.quoteNumber)} — ${esc(data.product)} Quote for ${esc(data.insuredName || 'Unnamed Insured')}</b>
        <span class="meta">Risk Score: ${quote.risk.score}/100 • Overall Status: <span class="${statusClass(quote.risk.status)}">${esc(quote.risk.status)}</span> • Created ${esc(quote.created)}</span>
        <div class="badge-row">${quote.risk.factors.slice(0, 8).map(f => `<span class="pill warning">${esc(f)}</span>`).join('') || '<span class="pill success">No major risk factors</span>'}</div>
      </div>
      ${quote.carriers.map((result, index) => `
        <div class="result-card">
          <b>${esc(result.carrier)}</b>
          <span class="meta">${esc(result.appetite)}</span>
          <div class="id-grid">
            <div><b>Status</b><br><span class="${statusClass(result.status)}">${esc(result.status)}</span></div>
            <div><b>Annual Premium</b><br>${money(result.annualPremium)}</div>
            <div><b>Monthly Estimate</b><br>${money(result.monthly)}</div>
            <div><b>Down Payment</b><br>${money(result.downPayment)}</div>
          </div>
          <div class="card-actions">
            <button class="btn tiny primary" data-bind-quote="${esc(quote.id)}" data-carrier-index="${index}">Bind Training Policy</button>
            <button class="btn tiny secondary" data-task-from-quote="${esc(quote.id)}" data-carrier-index="${index}">Create Follow-Up Task</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  function statusClass(status) {
    if (status === 'Preferred') return 'status-preferred';
    if (status === 'Referral' || status === 'Standard') return 'status-referral';
    if (status === 'Declined') return 'status-declined';
    return '';
  }

  function saveQuoteDraft() {
    const form = $('#quoteForm');
    if (!form) return;
    const data = formData(form);
    const quote = { id: uid('DRFT'), quoteNumber: uid('DRAFT'), created: nowStamp(), status: 'Draft', data, trainee: state.session?.name || 'Unknown', risk: { score: 0, status: 'Draft', factors: [] }, carriers: [] };
    state.quotes.unshift(quote);
    logActivity('Quote Draft', `Quote draft saved for ${data.insuredName || 'blank account'}.`, quote.quoteNumber);
    addTask('Draft', `Complete quote draft ${quote.quoteNumber}`, quote.quoteNumber, 'Normal', 'Draft saved from quote center.');
    saveState();
    toast('Quote draft saved.');
  }

  function bindQuote(quoteId, carrierIndex) {
    const quote = state.quotes.find(q => q.id === quoteId);
    if (!quote || !quote.carriers?.[carrierIndex]) return;
    const carrier = quote.carriers[carrierIndex];
    if (carrier.status === 'Declined') {
      toast('Declined indication cannot be bound. Create referral task instead.');
      return;
    }
    const data = quote.data;
    const effective = data.effectiveDate || new Date().toISOString().slice(0,10);
    const expiration = addYear(effective);
    const policy = {
      id: uid('POL'),
      policyNumber: uid(data.product === 'Auto' ? 'LVA-AUTO' : 'LVA-HOME'),
      lob: data.product,
      insuredName: data.insuredName || 'Unnamed Insured',
      effectiveDate: effective,
      expirationDate: expiration,
      premium: carrier.annualPremium,
      status: carrier.status === 'Referral' ? 'Pending Underwriting' : 'Active',
      riskAddress: data.product === 'Auto' ? data.autoGaragingAddress : data.propertyAddress,
      notes: `Bound from ${quote.quoteNumber} with ${carrier.carrier}. Status: ${carrier.status}.`,
      created: nowStamp(),
      source: 'Quote Bind',
      carrier: carrier.carrier,
      quoteNumber: quote.quoteNumber,
      details: data
    };
    state.policies.unshift(policy);
    state.selectedPolicyId = policy.id;
    logActivity('Bind', `Training policy bound for ${policy.insuredName}.`, policy.policyNumber);
    addTask('Post Bind', `Complete post-bind checklist for ${policy.insuredName}`, policy.policyNumber, policy.status === 'Pending Underwriting' ? 'High' : 'Normal', 'Confirm payment, forms, documents, and policy delivery.');
    saveState();
    showView('policySearch');
    searchPolicies(policy.policyNumber);
    toast('Training policy bound and saved.');
  }

  function addYear(dateStr) {
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0,10);
  }

  function generateIdCard(e) {
    e.preventDefault();
    const data = formData(e.target);
    const card = { id: uid('ID'), created: nowStamp(), ...data };
    state.idCards.unshift(card);
    logActivity('ID Card', `Auto ID card generated for ${data.insuredName}.`, data.policyNumber || card.id);
    saveState();
    renderIdCard(card);
    toast('Auto ID card generated.');
  }

  function renderIdCard(card) {
    const node = $('#idCardPreview');
    if (!node) return;
    node.className = 'id-card';
    node.innerHTML = `
      <h3>AUTO INSURANCE IDENTIFICATION CARD</h3>
      <div class="id-grid">
        <div><b>Policy Number</b><br>${esc(card.policyNumber || 'N/A')}</div>
        <div><b>Carrier</b><br>${esc(card.carrier || 'Training Carrier')}</div>
        <div><b>Named Insured</b><br>${esc(card.insuredName)}</div>
        <div><b>Agency</b><br>${esc(card.agency || 'Training Agency')}</div>
        <div><b>Effective Date</b><br>${esc(card.effectiveDate)}</div>
        <div><b>Expiration Date</b><br>${esc(card.expirationDate)}</div>
        <div><b>VIN</b><br>${esc(card.vin)}</div>
        <div><b>Vehicle</b><br>${esc(card.vehicleYear)} ${esc(card.vehicleMake)} ${esc(card.vehicleModel)}</div>
      </div>
      <small>Training copy only. Not valid as proof of insurance.</small>
    `;
  }

  function postPayment(e) {
    e.preventDefault();
    const data = formData(e.target);
    const payment = { id: data.reference?.trim() || uid('PAY'), created: nowStamp(), trainee: state.session?.name || '', ...data, amount: Number(data.amount || 0) };
    state.payments.unshift(payment);
    const policy = state.policies.find(p => p.policyNumber.toLowerCase() === data.policyNumber.toLowerCase());
    if (policy && data.status === 'Posted') policy.status = 'Active';
    logActivity('Payment', `${money(payment.amount)} payment ${payment.status.toLowerCase()} for ${data.insuredName}.`, payment.id);
    addTask('Payment', `Verify payment receipt for ${data.insuredName}`, data.policyNumber, data.status === 'Failed / Returned' ? 'High' : 'Normal', `Payment type: ${data.paymentType}.`);
    e.target.reset();
    saveState();
    toast('Payment recorded.');
  }

  function renderPaymentHistory() {
    renderTable('#paymentHistory', state.payments, ['created','id','policyNumber','insuredName','paymentType','amount','method','status'], { amount: money });
  }

  function renderEndorsementChecklist() {
    const type = $('#endorsementType')?.value;
    const node = $('#endorsementChecklist');
    if (!node) return;
    if (!type) {
      node.textContent = 'Select an endorsement type to view required questions.';
      return;
    }
    const reqs = CARRIER_RULES.endorsementRequirements[type] || [];
    node.innerHTML = `<b>${esc(type)} Required Information</b><ul>${reqs.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
  }

  function submitEndorsement(e) {
    e.preventDefault();
    const data = formData(e.target);
    const reqs = CARRIER_RULES.endorsementRequirements[data.type] || [];
    const record = { id: uid('ENDT'), created: nowStamp(), trainee: state.session?.name || '', requiredItems: reqs.join('; '), status: data.uwApproval === 'Yes' || data.uwApproval === 'Unsure / Refer to Carrier' ? 'Pending UW Review' : 'Submitted', ...data };
    state.endorsements.unshift(record);
    logActivity('Endorsement', `${data.type} endorsement submitted for ${data.insuredName}.`, record.id);
    addTask('Endorsement', `Follow up ${data.type} endorsement`, data.policyNumber, record.status.includes('UW') ? 'High' : 'Normal', data.details);
    e.target.reset();
    renderEndorsementChecklist();
    saveState();
    toast('Endorsement workflow submitted.');
  }

  function renderEndorsementLog() {
    renderTable('#endorsementLog', state.endorsements, ['created','id','policyNumber','insuredName','type','effectiveDate','premiumImpact','status']);
  }

  function submitCancellation(e) {
    e.preventDefault();
    const data = formData(e.target);
    let status = 'Cancellation Request Created';
    if (data.signedRequest === 'No') status = 'Pending Signed Request';
    if (data.reason === 'Non-Payment') status = 'Pending Carrier Non-Pay Timeline';
    const record = { id: uid('CXL'), created: nowStamp(), trainee: state.session?.name || '', status, ...data };
    state.cancellations.unshift(record);
    const policy = state.policies.find(p => p.policyNumber.toLowerCase() === data.policyNumber.toLowerCase());
    if (policy) policy.status = 'Pending Cancellation';
    logActivity('Cancellation', `Cancellation workflow created for ${data.insuredName}.`, record.id);
    addTask('Cancellation', `Confirm cancellation with carrier for ${data.insuredName}`, data.policyNumber, 'High', data.notes || data.reason);
    e.target.reset();
    saveState();
    toast('Cancellation workflow created.');
  }

  function renderCancellationLog() {
    renderTable('#cancellationLog', state.cancellations, ['created','id','policyNumber','insuredName','lob','reason','cancelDate','signedRequest','status']);
  }

  function generateRemarketing(e) {
    e.preventDefault();
    const data = formData(e.target);
    const current = Number(data.currentPremium || 0);
    const renewal = Number(data.renewalPremium || 0);
    const increase = current ? Math.round(((renewal - current) / current) * 100) : 0;
    const count = Number(data.carrierCount || 3);
    const markets = CARRIER_RULES.carriers.slice(0, count).map((carrier, index) => {
      const adjustment = (index - 1) * 70 + (increase > 20 ? -120 : 60);
      const estimate = Math.max(300, Math.round(renewal + adjustment - (index * 35)));
      return { carrier: carrier.name, estimate, action: index === 0 ? 'Prioritize' : index === count - 1 ? 'Backup market' : 'Quote if appetite fits' };
    });
    const record = { id: uid('RMKT'), created: nowStamp(), trainee: state.session?.name || '', increasePercent: increase, markets, ...data };
    state.remarkets.unshift(record);
    logActivity('Remarketing', `Remarketing worksheet generated for ${data.insuredName}.`, record.id);
    addTask('Remarketing', `Complete market comparison for ${data.insuredName}`, data.policyNumber, increase > 20 ? 'High' : 'Normal', `Renewal increase: ${increase}%.`);
    e.target.reset();
    saveState();
    renderRemarketingResults(record);
    toast('Remarketing worksheet generated.');
  }

  function renderRemarketingResults(record = null) {
    const node = $('#remarketResults');
    if (!node) return;
    const item = record || state.remarkets[0];
    if (!item) {
      node.className = 'result-list empty-state';
      node.textContent = 'No remarketing worksheet generated yet.';
      return;
    }
    node.className = 'result-list';
    node.innerHTML = `
      <div class="result-card">
        <b>${esc(item.id)} — ${esc(item.insuredName)}</b>
        <span class="meta">LOB: ${esc(item.lob)} • Current ${money(item.currentPremium)} • Renewal ${money(item.renewalPremium)} • Increase ${esc(item.increasePercent)}%</span>
      </div>
      ${item.markets.map(m => `
        <div class="result-card">
          <b>${esc(m.carrier)}</b>
          <div class="id-grid"><div><b>Estimated Premium</b><br>${money(m.estimate)}</div><div><b>Action</b><br>${esc(m.action)}</div></div>
        </div>
      `).join('')}
    `;
  }

  function renderQueue() {
    const node = $('#queueList');
    if (!node) return;
    if (!state.tasks.length) {
      node.className = 'queue-list empty-state';
      node.textContent = 'No open tasks yet.';
      return;
    }
    node.className = 'queue-list';
    node.innerHTML = state.tasks.map(task => `
      <div class="queue-item">
        <b>${esc(task.title)}</b>
        <span class="meta">${esc(task.type)} • ${esc(task.policyNumber || 'No policy')} • ${esc(task.priority)} priority • ${esc(task.status)} • ${esc(task.created)}</span>
        ${task.notes ? `<p>${esc(task.notes)}</p>` : ''}
        <div class="card-actions">
          <button class="btn tiny secondary" data-task-status="${esc(task.id)}" data-status="Open">Open</button>
          <button class="btn tiny secondary" data-task-status="${esc(task.id)}" data-status="In Progress">In Progress</button>
          <button class="btn tiny primary" data-task-status="${esc(task.id)}" data-status="Completed">Completed</button>
          <button class="btn tiny danger-ghost" data-delete-task="${esc(task.id)}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function saveQaReview(e) {
    e.preventDefault();
    const data = formData(e.target);
    const avg = Math.round((Number(data.accuracy) + Number(data.process) + Number(data.documentation)) / 3);
    const record = { id: uid('QA'), created: nowStamp(), trainer: state.session?.name || '', averageScore: avg, ...data };
    state.qa.unshift(record);
    logActivity('QA Review', `Trainer review saved for ${data.trainee}. Average score ${avg}%.`, record.id);
    e.target.reset();
    saveState();
    toast('QA review saved.');
  }

  function renderQaLog() {
    renderTable('#qaLog', state.qa, ['created','id','trainee','reference','accuracy','process','documentation','averageScore','outcome']);
  }

  function renderActivityTable() {
    renderTable('#systemActivity', state.activity, ['time','type','message','reference','user']);
  }

  function renderTable(selector, rows, columns, formatters = {}) {
    const node = $(selector);
    if (!node) return;
    if (!rows.length) {
      node.className = 'table-wrap empty-state';
      node.textContent = node.id === 'systemActivity' ? 'No system activity yet.' : 'No records yet.';
      return;
    }
    node.className = 'table-wrap';
    node.innerHTML = `
      <table class="data-table">
        <thead><tr>${columns.map(c => `<th>${esc(labelize(c))}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${esc(formatters[c] ? formatters[c](row[c]) : row[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    `;
  }

  function handleDynamicClicks(e) {
    const target = e.target.closest('button');
    if (!target) return;

    if (target.dataset.selectPolicy) {
      state.selectedPolicyId = target.dataset.selectPolicy;
      saveState();
      toast('Policy file opened.');
    }

    if (target.dataset.policyToId) {
      const policy = state.policies.find(p => p.id === target.dataset.policyToId);
      if (policy) fillIdCardFromPolicy(policy);
    }

    if (target.dataset.policyAction) {
      const policy = state.policies.find(p => p.id === target.dataset.policyId);
      if (policy) prefillServiceForm(policy, target.dataset.policyAction);
    }

    if (target.dataset.deletePolicy) {
      if (confirm('Delete this training policy record?')) {
        const id = target.dataset.deletePolicy;
        state.policies = state.policies.filter(p => p.id !== id);
        if (state.selectedPolicyId === id) state.selectedPolicyId = null;
        logActivity('Policy', 'Training policy deleted.');
        saveState();
      }
    }

    if (target.dataset.bindQuote) {
      bindQuote(target.dataset.bindQuote, Number(target.dataset.carrierIndex));
    }

    if (target.dataset.taskFromQuote) {
      const quote = state.quotes.find(q => q.id === target.dataset.taskFromQuote);
      const result = quote?.carriers?.[Number(target.dataset.carrierIndex)];
      if (quote && result) {
        addTask('Quote Follow-Up', `Follow up ${result.carrier} quote for ${quote.data.insuredName || 'Unnamed insured'}`, quote.quoteNumber, result.status === 'Referral' ? 'High' : 'Normal', `Status: ${result.status}. Premium: ${money(result.annualPremium)}.`);
        logActivity('Task', 'Quote follow-up task created.', quote.quoteNumber);
        saveState();
        toast('Follow-up task created.');
      }
    }

    if (target.dataset.taskStatus) {
      const task = state.tasks.find(t => t.id === target.dataset.taskStatus);
      if (task) {
        task.status = target.dataset.status;
        logActivity('Task', `Task marked ${task.status}.`, task.id);
        saveState();
      }
    }

    if (target.dataset.deleteTask) {
      state.tasks = state.tasks.filter(t => t.id !== target.dataset.deleteTask);
      saveState();
    }
  }

  function fillIdCardFromPolicy(policy) {
    showView('idCards');
    const form = $('#idCardForm');
    if (!form) return;
    form.policyNumber.value = policy.policyNumber || '';
    form.insuredName.value = policy.insuredName || '';
    form.effectiveDate.value = policy.effectiveDate || '';
    form.expirationDate.value = policy.expirationDate || '';
    form.carrier.value = policy.carrier || 'Training Carrier';
    form.agency.value = policy.details?.producer || '';
    form.vin.value = policy.details?.vin || '';
    form.vehicleYear.value = policy.details?.vehicleYear || '';
    form.vehicleMake.value = policy.details?.vehicleMake || '';
    form.vehicleModel.value = policy.details?.vehicleModel || '';
    toast('Policy details loaded into Auto ID form.');
  }

  function prefillServiceForm(policy, action) {
    const viewMap = { payment: 'payments', endorsement: 'endorsements', cancel: 'cancellations' };
    showView(viewMap[action]);
    const formId = action === 'payment' ? '#paymentForm' : action === 'endorsement' ? '#endorsementForm' : '#cancellationForm';
    const form = $(formId);
    if (!form) return;
    if (form.policyNumber) form.policyNumber.value = policy.policyNumber || '';
    if (form.insuredName) form.insuredName.value = policy.insuredName || '';
    if (form.lob) form.lob.value = policy.lob === 'Home' ? 'Home' : 'Auto';
    toast('Policy details loaded into service form.');
  }

  function exportBackup() {
    downloadFile('lava-carrierops-backup.json', JSON.stringify(state, null, 2), 'application/json');
    toast('Backup exported.');
  }

  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        state = { ...emptyState(), ...imported };
        saveState();
        toast('Backup imported.');
      } catch (error) {
        toast('Import failed. Please use a valid backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function exportCsv(filename, rows) {
    if (!rows?.length) {
      toast('No records to export.');
      return;
    }
    const flatRows = rows.map(row => flatten(row));
    const headers = Array.from(new Set(flatRows.flatMap(row => Object.keys(row))));
    const csv = [headers.join(','), ...flatRows.map(row => headers.map(h => csvCell(row[h])).join(','))].join('\n');
    downloadFile(filename, csv, 'text/csv');
    toast('CSV exported.');
  }

  function flatten(obj, prefix = '', output = {}) {
    Object.entries(obj || {}).forEach(([key, value]) => {
      const name = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) output[name] = value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(' | ');
      else if (value && typeof value === 'object') flatten(value, name, output);
      else output[name] = value;
    });
    return output;
  }

  function csvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
