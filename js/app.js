(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const store = window.CarrierStore;
  const REF = window.LAVA_REFERENCE || {};
  const TRAINER_CODE = window.LAVA_TRAINER_CODE || "LAVA2026";

  const state = {
    user: null,
    route: "dashboard",
    quote: null,
    quoteStep: 0,
    activePolicy: null,
    currentResult: null
  };

  const routes = {
    dashboard: "Dashboard",
    search: "Policy Search",
    quote: "Start Quote",
    idcard: "Auto ID Card",
    payments: "Payments",
    endorsements: "Endorsements",
    cancellations: "Cancellations",
    remarketing: "Remarketing",
    documents: "Documents",
    queue: "Work Queue",
    trainer: "Trainer QA"
  };

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function money(n){
    const num = Number(n || 0);
    return num.toLocaleString("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 });
  }

  function dateOnly(iso){
    if(!iso) return "";
    return String(iso).slice(0,10);
  }

  function today(){
    return new Date().toISOString().slice(0,10);
  }

  function addDays(date, days){
    const d = date ? new Date(date) : new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  }

  function genNumber(prefix){
    const y = new Date().getFullYear();
    const r = Math.floor(100000 + Math.random()*899999);
    return `${prefix}-${y}-${r}`;
  }

  function toast(message, type="info"){
    const wrap = $("#toast-wrap");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<strong>${type === "error" ? "Action needed" : type === "success" ? "Success" : "Notice"}</strong><br>${escapeHtml(message)}`;
    wrap.appendChild(el);
    setTimeout(()=> el.remove(), 5200);
  }

  function userFromStorage(){
    try{ return JSON.parse(localStorage.getItem("lava_carrierops_session") || "null"); }
    catch{ return null; }
  }

  function saveUser(user){
    state.user = user;
    localStorage.setItem("lava_carrierops_session", JSON.stringify(user));
    $("#user-pill").textContent = `${user.role}: ${user.name}`;
  }

  function clearUser(){
    localStorage.removeItem("lava_carrierops_session");
    state.user = null;
  }

  function showApp(){
    $("#login-screen").classList.add("hidden");
    $("#app-shell").classList.remove("hidden");
  }

  function showLogin(){
    $("#login-screen").classList.remove("hidden");
    $("#app-shell").classList.add("hidden");
  }

  function updateConnectionPill(detail){
    const st = detail || store.status();
    const pill = $("#connection-status");
    if(!pill) return;
    if(st.healthy){
      pill.innerHTML = `<span class="dot good"></span><span>Supabase Connected</span>`;
    }else if(st.configured){
      pill.innerHTML = `<span class="dot bad"></span><span>Supabase Issue • Local Fallback</span>`;
      pill.title = st.error || "Check Supabase URL, key, SQL setup, or RLS policies.";
    }else{
      pill.innerHTML = `<span class="dot"></span><span>Local Mode • Add Supabase config</span>`;
      pill.title = st.error || "Open js/config.js and paste your Supabase URL/key.";
    }
  }

  function setActiveNav(){
    $$(".nav-link").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.route === state.route);
    });
  }

  function pageHead(title, subtitle, actions=""){
    return `
      <div class="page-head">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="action-bar">${actions}</div>
      </div>
    `;
  }

  function renderView(html){
    $("#view").innerHTML = html;
    setActiveNav();
  }

  function routeTo(route, push=true){
    if(!routes[route]) route = "dashboard";
    state.route = route;
    if(push) history.replaceState(null, "", `#${route}`);
    renderRoute(route);
  }

  function requireLogin(){
    if(!state.user){
      const saved = userFromStorage();
      if(saved){
        saveUser(saved);
        showApp();
        return true;
      }
      showLogin();
      return false;
    }
    return true;
  }

  function table(headers, rows, empty="No records found."){
    if(!rows || !rows.length) return `<div class="empty-state">${escapeHtml(empty)}</div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    `;
  }

  async function renderRoute(route){
    if(!requireLogin()) return;
    state.route = route;
    setActiveNav();

    if(route === "dashboard") return renderDashboard();
    if(route === "search") return renderSearch();
    if(route === "quote") return renderQuoteChoice();
    if(route === "idcard") return renderIdCard();
    if(route === "payments") return renderPayments();
    if(route === "endorsements") return renderEndorsements();
    if(route === "cancellations") return renderCancellations();
    if(route === "remarketing") return renderRemarketing();
    if(route === "documents") return renderDocuments();
    if(route === "queue") return renderQueue();
    if(route === "trainer") return renderTrainer();
    renderDashboard();
  }

  function quickCard(route, icon, title, body){
    return `<div class="card quick-card" data-route="${route}">
      <div>
        <div class="icon-badge">${icon}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>
      <span class="small">Open module →</span>
    </div>`;
  }

  async function renderDashboard(){
    renderView(pageHead("Dashboard", "Central command center for carrier-style VA training workflows.", `
      <button class="btn primary" data-route="quote">Start New Quote</button>
      <button class="btn" data-route="search">Search Policy</button>
    `) + `
      <div id="dash-metrics" class="grid cols-4">
        ${["Policies","Quotes","Endorsements","Open Work"].map(x=>`<div class="card metric"><div><span>${x}</span><strong>—</strong></div><div class="icon-badge">⌁</div></div>`).join("")}
      </div>
      <div class="divider"></div>
      <div class="grid cols-3">
        ${quickCard("search","🔎","Policy Search","Pull up a customer using policy number, name, or email.")}
        ${quickCard("quote","🧾","Quote Auto or Home","Begin a realistic new business quote intake.")}
        ${quickCard("idcard","🚗","Auto ID Card","Generate and print an insurance ID card for bound auto policies.")}
        ${quickCard("endorsements","✍️","Endorsements","Process policy changes and attach supporting documents.")}
        ${quickCard("payments","💳","Payments","Post payment transactions and download receipts.")}
        ${quickCard("cancellations","🛑","Cancellation","Submit cancellation requests with reason and documents.")}
      </div>
      <div class="divider"></div>
      <div class="grid cols-2">
        <div class="card">
          <div class="section-title"><h3>Recent Work Queue</h3><button class="btn" data-route="queue">View all</button></div>
          <div id="recent-work"><div class="empty-state">Loading queue...</div></div>
        </div>
        <div class="card">
          <div class="section-title"><h3>Portal Health</h3></div>
          <div id="portal-health"></div>
        </div>
      </div>
    `);

    const [policies, quotes, endts, cancels] = await Promise.all([
      store.list("carrier_policies", {limit:200}),
      store.list("carrier_quotes", {limit:200}),
      store.list("carrier_endorsements", {limit:200}),
      store.list("carrier_cancellations", {limit:200})
    ]);

    const openWork = quotes.filter(q=>["Quoted","Referral Required"].includes(q.status)).length + endts.filter(e=>e.status !== "Completed").length + cancels.filter(c=>c.status !== "Completed").length;
    $("#dash-metrics").innerHTML = `
      <div class="card metric"><div><span>Policies</span><strong>${policies.length}</strong></div><div class="icon-badge">📄</div></div>
      <div class="card metric"><div><span>Quotes</span><strong>${quotes.length}</strong></div><div class="icon-badge">🧾</div></div>
      <div class="card metric"><div><span>Endorsements</span><strong>${endts.length}</strong></div><div class="icon-badge">✍️</div></div>
      <div class="card metric"><div><span>Open Work</span><strong>${openWork}</strong></div><div class="icon-badge">📌</div></div>
    `;
    const rows = [
      ...quotes.slice(0,4).map(q=>`<tr><td>Quote</td><td>${escapeHtml(q.quote_number)}</td><td>${escapeHtml(q.named_insured)}</td><td>${escapeHtml(q.status)}</td></tr>`),
      ...endts.slice(0,4).map(e=>`<tr><td>Endorsement</td><td>${escapeHtml(e.policy_number)}</td><td>${escapeHtml(e.endorsement_type)}</td><td>${escapeHtml(e.status)}</td></tr>`)
    ].slice(0,6);
    $("#recent-work").innerHTML = table(["Type","Reference","Customer/Action","Status"], rows, "No work yet. Start a quote or process an endorsement.");
    const st = store.status();
    $("#portal-health").innerHTML = `
      <div class="kv"><b>Database</b><span>${st.healthy ? "Supabase connected" : st.configured ? "Supabase configured but fallback active" : "Local mode until config is added"}</span></div>
      <div class="kv"><b>Signed in as</b><span>${escapeHtml(state.user.name)} (${escapeHtml(state.user.role)})</span></div>
      <div class="kv"><b>Storage bucket</b><span>${escapeHtml((window.LAVA_SUPABASE||{}).bucket || "carrier-documents")}</span></div>
      <div class="kv"><b>Reminder</b><span>Use dummy customer data only. This is not a live carrier system.</span></div>
    `;
  }

  function searchBox(moduleTitle="Search Policy"){
    return `
      <form class="card" id="policy-search-form">
        <div class="form-grid">
          <label class="span-2">Policy Number, Named Insured, or Email
            <input id="policy-search-term" required placeholder="Example: LVA-AUTO-2026-123456 or Juan Dela Cruz" />
          </label>
          <label>Search Type
            <select id="policy-search-type">
              <option>Policy Number / Name</option>
              <option>Named Insured</option>
              <option>Policy Number</option>
            </select>
          </label>
        </div>
        <div class="action-bar" style="margin-top:14px">
          <button class="btn primary" type="submit">${escapeHtml(moduleTitle)}</button>
          <button class="btn" type="button" id="clear-active-policy">Clear Selected Policy</button>
        </div>
      </form>
      <div id="policy-search-results" style="margin-top:16px"></div>
    `;
  }

  async function renderSearch(){
    renderView(pageHead("Policy Search", "Pull up policy records by policy number, named insured, or customer email.", `
      <button class="btn primary" data-route="quote">Start Quote</button>
    `) + searchBox("Search"));
    bindPolicySearch();
  }

  function bindPolicySearch(onSelect){
    const form = $("#policy-search-form");
    if(!form) return;
    $("#clear-active-policy")?.addEventListener("click", ()=>{
      state.activePolicy = null;
      toast("Selected policy cleared.", "success");
      const r = $("#policy-search-results");
      if(r) r.innerHTML = "";
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const term = $("#policy-search-term").value.trim();
      const box = $("#policy-search-results");
      box.innerHTML = `<div class="empty-state">Searching policy records...</div>`;
      const policies = await store.findPolicy(term);
      box.innerHTML = renderPolicyResults(policies, onSelect);
      $$(".select-policy").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const policy = policies.find(p => p.id === id);
        if(policy){
          state.activePolicy = policy;
          toast(`Policy ${policy.policy_number} selected.`, "success");
          if(onSelect) onSelect(policy);
          else renderPolicyDetail(policy, box);
        }
      }));
    });
  }

  function renderPolicyResults(policies, onSelect){
    const rows = policies.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.policy_number)}</strong><br><span class="small">${escapeHtml(p.line_of_business)}</span></td>
        <td>${escapeHtml(p.named_insured)}<br><span class="small">${escapeHtml(p.email || "")}</span></td>
        <td>${escapeHtml(p.policy_status || "Active")}</td>
        <td>${dateOnly(p.effective_date)} - ${dateOnly(p.expiration_date)}</td>
        <td>${money(p.premium)}</td>
        <td><button class="btn primary select-policy" data-id="${escapeHtml(p.id)}" type="button">${onSelect ? "Select" : "Open"}</button></td>
      </tr>
    `);
    return table(["Policy","Named Insured","Status","Term","Premium","Action"], rows, "No matching policies found. Create/bind a quote first to create a policy.");
  }

  function renderPolicyDetail(policy, container){
    const data = policy.policy_data || {};
    container.innerHTML += `
      <div class="card" style="margin-top:18px">
        <div class="policy-header">
          <div>
            <h2>${escapeHtml(policy.policy_number)}</h2>
            <p>${escapeHtml(policy.named_insured)} • ${escapeHtml(policy.line_of_business)}</p>
            <p>${dateOnly(policy.effective_date)} to ${dateOnly(policy.expiration_date)} • ${escapeHtml(policy.policy_status)}</p>
          </div>
          <div class="badge good">${money(policy.premium)}</div>
        </div>
        <div class="grid cols-3" style="margin-top:18px">
          <div class="card soft"><b>Contact</b><p class="small">${escapeHtml(policy.email || "No email")}<br>${escapeHtml(policy.phone || "No phone")}</p></div>
          <div class="card soft"><b>Mailing Address</b><p class="small">${escapeHtml(policy.mailing_address || data.mailing_address || "Not provided")}</p></div>
          <div class="card soft"><b>Risk Address</b><p class="small">${escapeHtml(policy.risk_address || policy.garaging_address || data.risk_address || data.garaging_address || "Not provided")}</p></div>
        </div>
        <div class="action-bar" style="margin-top:18px">
          <button class="btn" data-route="idcard">Generate Auto ID Card</button>
          <button class="btn" data-route="payments">Post Payment</button>
          <button class="btn" data-route="endorsements">Process Endorsement</button>
          <button class="btn" data-route="cancellations">Cancel Policy</button>
        </div>
      </div>
    `;
  }

  function renderQuoteChoice(){
    state.quote = null;
    state.currentResult = null;
    renderView(pageHead("Start Quote", "Choose a line of business. Every field starts blank so the VA must enter the information.", "") + `
      <div class="quote-choice">
        <div class="choice-card" id="start-auto">
          <div class="big-icon">🚗</div>
          <h2>Auto Insurance Quote</h2>
          <p>Applicant, prior insurance, vehicle/VIN, drivers, coverage, discounts, and underwriting questions.</p>
          <button class="btn primary" type="button">Start Auto Quote</button>
        </div>
        <div class="choice-card" id="start-home">
          <div class="big-icon">🏠</div>
          <h2>Home Insurance Quote</h2>
          <p>Applicant, property details, construction, roof, claims, coverages, mortgagee, hazards, and underwriting questions.</p>
          <button class="btn primary" type="button">Start Home Quote</button>
        </div>
      </div>
    `);
    $("#start-auto").addEventListener("click", ()=> startQuote("Auto"));
    $("#start-home").addEventListener("click", ()=> startQuote("Home"));
  }

  function startQuote(lob){
    state.quote = { lob, data:{}, created_at: store.now(), created_by_email: state.user.email };
    state.quoteStep = 0;
    renderQuoteWizard();
  }

  function optionHtml(options, selected=""){
    return (options || []).map(o=>`<option value="${escapeHtml(o)}" ${selected===o?"selected":""}>${escapeHtml(o)}</option>`).join("");
  }
  function stateOptions(){ return `<option value="">Select state</option>${optionHtml(REF.states || [])}`; }
  function yesNo(){ return `<option value="">Select</option><option>No</option><option>Yes</option>`; }

  const autoSteps = [
    { title:"Account Setup", render: () => `
      <div class="form-grid">
        <label>Named Insured Full Name <input name="named_insured" required placeholder="Full legal name" /></label>
        <label>Email <input name="email" required type="email" placeholder="customer@email.com" /></label>
        <label>Phone <input name="phone" required placeholder="(555) 555-5555" /></label>
        <label>Effective Date <input name="effective_date" required type="date" /></label>
        <label>Producer/Agency Code <input name="agency_code" placeholder="Training agency code" /></label>
        <label>Quote Source <select name="quote_source"><option>New Business</option><option>Rewrite</option><option>Remarket</option><option>Cross-sell</option></select></label>
        <label class="span-3">Mailing Address <input name="mailing_address" required placeholder="Street, City, State ZIP" /></label>
      </div>` },
    { title:"Prior Insurance", render: () => `
      <div class="form-grid">
        <label>Prior Carrier <input name="prior_carrier" required placeholder="Carrier name" /></label>
        <label>Prior BI Limits <select name="prior_limits" required><option value="">Select</option>${optionHtml(REF.autoCoverages.bodilyInjury)}</select></label>
        <label>Current Policy Expiration <input name="prior_expiration" type="date" /></label>
        <label>Any lapse in last 12 months? <select name="lapse_12" required>${yesNo()}</select></label>
        <label>If lapse, number of days <input name="lapse_days" type="number" min="0" placeholder="0" /></label>
        <label>Prior cancellation/non-renewal? <select name="prior_cancel" required>${yesNo()}</select></label>
        <label class="span-3">Explain prior insurance issues, if any <textarea name="prior_notes" placeholder="Leave blank if none"></textarea></label>
      </div>` },
    { title:"Vehicle / Garaging", render: () => `
      <div class="form-grid">
        <label>VIN <input name="vin" required maxlength="17" placeholder="17-character VIN" /></label>
        <label>Year <input name="vehicle_year" required type="number" min="1980" max="2035" /></label>
        <label>Make <input name="vehicle_make" required placeholder="Toyota" /></label>
        <label>Model <input name="vehicle_model" required placeholder="Camry" /></label>
        <label>Body Type <select name="body_type" required><option value="">Select</option><option>Sedan</option><option>SUV</option><option>Pickup</option><option>Van</option><option>Coupe</option><option>Other</option></select></label>
        <label>Ownership <select name="ownership" required><option value="">Select</option><option>Owned</option><option>Financed</option><option>Leased</option></select></label>
        <label>Primary Use <select name="vehicle_use" required><option value="">Select</option><option>Pleasure</option><option>Commute</option><option>Business</option><option>Farm</option><option>Delivery/Rideshare</option></select></label>
        <label>Annual Mileage <input name="annual_miles" required type="number" min="0" placeholder="12000" /></label>
        <label>Anti-Theft Device <select name="anti_theft"><option>None</option><option>Factory Alarm</option><option>Tracking Device</option><option>Passive Immobilizer</option></select></label>
        <label class="span-3">Garaging Address <input name="garaging_address" required placeholder="Street, City, State ZIP" /></label>
      </div>` },
    { title:"Drivers / Household", render: () => `
      <div class="form-grid">
        <label>Primary Driver Name <input name="driver_name" required placeholder="Full name" /></label>
        <label>Date of Birth <input name="driver_dob" required type="date" /></label>
        <label>License State <select name="license_state" required>${stateOptions()}</select></label>
        <label>License Status <select name="license_status" required><option value="">Select</option><option>Valid</option><option>Permit</option><option>Suspended</option><option>International</option></select></label>
        <label>Years Licensed <input name="years_licensed" required type="number" min="0" placeholder="5" /></label>
        <label>Marital Status <select name="marital_status"><option>Single</option><option>Married</option><option>Domestic Partner</option><option>Divorced</option><option>Widowed</option></select></label>
        <label>Any accidents in 5 years? <select name="accidents_5" required>${yesNo()}</select></label>
        <label>Any violations in 5 years? <select name="violations_5" required>${yesNo()}</select></label>
        <label>Any excluded or unlisted household drivers? <select name="household_drivers" required>${yesNo()}</select></label>
        <label class="span-3">Driver Notes <textarea name="driver_notes" placeholder="List additional drivers, exclusions, SR-22 notes, etc."></textarea></label>
      </div>` },
    { title:"Coverages", render: () => `
      <div class="form-grid">
        <label>Bodily Injury <select name="bi_limit" required><option value="">Select</option>${optionHtml(REF.autoCoverages.bodilyInjury)}</select></label>
        <label>Property Damage <select name="pd_limit" required><option value="">Select</option>${optionHtml(REF.autoCoverages.propertyDamage)}</select></label>
        <label>UM/UIM <select name="um_limit" required><option value="">Select</option>${optionHtml(REF.autoCoverages.bodilyInjury)}</select></label>
        <label>Medical Payments / PIP <select name="medpay" required><option value="">Select</option>${optionHtml(REF.autoCoverages.medPay)}</select></label>
        <label>Comprehensive Deductible <select name="comp_ded" required><option value="">Select</option>${optionHtml(REF.autoCoverages.deductibles)}</select></label>
        <label>Collision Deductible <select name="coll_ded" required><option value="">Select</option>${optionHtml(REF.autoCoverages.deductibles)}</select></label>
        <label>Rental Reimbursement <select name="rental" required><option value="">Select</option>${optionHtml(REF.autoCoverages.rental)}</select></label>
        <label>Roadside Assistance <select name="roadside" required>${yesNo()}</select></label>
        <label>Loan/Lease Gap <select name="gap" required>${yesNo()}</select></label>
      </div>` },
    { title:"Underwriting", render: () => `
      <div class="form-grid">
        <label>Vehicle used for rideshare/delivery? <select name="rideshare" required>${yesNo()}</select></label>
        <label>Vehicle modified/performance enhanced? <select name="modified" required>${yesNo()}</select></label>
        <label>Salvage/rebuilt title? <select name="salvage" required>${yesNo()}</select></label>
        <label>Any driver requires SR-22/FR-44? <select name="sr22" required>${yesNo()}</select></label>
        <label>Any driver with DUI/reckless driving? <select name="major_violation" required>${yesNo()}</select></label>
        <label>Any business/commercial exposure? <select name="business_use" required>${yesNo()}</select></label>
        <label class="span-3">Underwriting remarks <textarea name="uw_remarks" placeholder="Explain any Yes answers."></textarea></label>
      </div>` }
  ];

  const homeSteps = [
    { title:"Account Setup", render: () => `
      <div class="form-grid">
        <label>Named Insured Full Name <input name="named_insured" required placeholder="Full legal name" /></label>
        <label>Email <input name="email" required type="email" placeholder="customer@email.com" /></label>
        <label>Phone <input name="phone" required placeholder="(555) 555-5555" /></label>
        <label>Effective Date <input name="effective_date" required type="date" /></label>
        <label>Quote Type <select name="quote_type"><option>New Purchase</option><option>Existing Home</option><option>Rewrite</option><option>Remarket</option></select></label>
        <label>Occupancy <select name="occupancy" required><option value="">Select</option><option>Primary</option><option>Secondary</option><option>Seasonal</option><option>Rental</option><option>Vacant</option></select></label>
        <label class="span-3">Mailing Address <input name="mailing_address" required placeholder="Street, City, State ZIP" /></label>
        <label class="span-3">Property Address <input name="risk_address" required placeholder="Street, City, State ZIP" /></label>
      </div>` },
    { title:"Property Details", render: () => `
      <div class="form-grid">
        <label>Year Built <input name="year_built" required type="number" min="1800" max="2035" /></label>
        <label>Square Footage <input name="square_feet" required type="number" min="100" /></label>
        <label>Number of Stories <select name="stories" required><option value="">Select</option><option>1</option><option>1.5</option><option>2</option><option>3+</option></select></label>
        <label>Construction Type <select name="construction" required><option value="">Select</option><option>Frame</option><option>Masonry</option><option>Brick Veneer</option><option>Concrete</option><option>Manufactured</option></select></label>
        <label>Foundation <select name="foundation" required><option value="">Select</option><option>Slab</option><option>Crawlspace</option><option>Basement</option><option>Pier/Post</option></select></label>
        <label>Protection Class <input name="protection_class" placeholder="1-10 if known" /></label>
        <label>Distance to Fire Hydrant <input name="hydrant_distance" placeholder="Example: within 1000 ft" /></label>
        <label>Distance to Fire Station <input name="station_distance" placeholder="Example: 3 miles" /></label>
        <label>Alarm System <select name="alarm"><option>None</option><option>Local Burglar</option><option>Central Burglar</option><option>Central Fire</option><option>Central Fire/Burglar</option></select></label>
      </div>` },
    { title:"Roof / Systems", render: () => `
      <div class="form-grid">
        <label>Roof Type <select name="roof_type" required><option value="">Select</option><option>Composition Shingle</option><option>Tile</option><option>Metal</option><option>Wood Shake</option><option>Flat</option><option>Other</option></select></label>
        <label>Roof Year <input name="roof_year" required type="number" min="1900" max="2035" /></label>
        <label>Roof Condition <select name="roof_condition" required><option value="">Select</option><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option></select></label>
        <label>Electrical Updated Year <input name="electrical_year" type="number" min="1900" max="2035" /></label>
        <label>Plumbing Updated Year <input name="plumbing_year" type="number" min="1900" max="2035" /></label>
        <label>HVAC Updated Year <input name="hvac_year" type="number" min="1900" max="2035" /></label>
        <label>Water Heater Year <input name="water_heater_year" type="number" min="1900" max="2035" /></label>
        <label>Water Shutoff Device <select name="water_shutoff" required>${yesNo()}</select></label>
        <label>Any knob/tube, aluminum wiring, polybutylene? <select name="old_systems" required>${yesNo()}</select></label>
      </div>` },
    { title:"Coverage", render: () => `
      <div class="form-grid">
        <label>Dwelling Coverage A <input name="dwelling" required type="number" min="25000" placeholder="450000" /></label>
        <label>Other Structures B <input name="other_structures" type="number" placeholder="Auto or amount" /></label>
        <label>Personal Property C <input name="personal_property" type="number" placeholder="Auto or amount" /></label>
        <label>Loss of Use D <select name="loss_of_use" required><option value="">Select</option>${optionHtml(REF.homeCoverages.lossOfUse)}</select></label>
        <label>Personal Liability <select name="liability" required><option value="">Select</option>${optionHtml(REF.homeCoverages.liability)}</select></label>
        <label>Medical Payments <select name="medical"><option>1,000</option><option>5,000</option><option>10,000</option></select></label>
        <label>All Peril Deductible <select name="deductible" required><option value="">Select</option>${optionHtml(REF.homeCoverages.deductibles)}</select></label>
        <label>Wind/Hail Deductible <select name="wind_ded" required><option value="">Select</option>${optionHtml(REF.homeCoverages.deductibles)}</select></label>
        <label>Water Backup <select name="water_backup"><option>No Coverage</option><option>5,000</option><option>10,000</option><option>25,000</option></select></label>
        <label class="span-3">Mortgagee / Loan Number <input name="mortgagee" placeholder="Mortgagee name, address, loan #" /></label>
      </div>` },
    { title:"Claims / Prior Insurance", render: () => `
      <div class="form-grid">
        <label>Prior Carrier <input name="prior_carrier" required placeholder="Carrier name" /></label>
        <label>Prior Policy Expiration <input name="prior_expiration" type="date" /></label>
        <label>Any lapse in coverage? <select name="lapse_12" required>${yesNo()}</select></label>
        <label>Any property claims in 5 years? <select name="claims_5" required>${yesNo()}</select></label>
        <label>Number of claims <input name="claim_count" type="number" min="0" placeholder="0" /></label>
        <label>Any prior cancellation/non-renewal? <select name="prior_cancel" required>${yesNo()}</select></label>
        <label class="span-3">Claim details / prior carrier notes <textarea name="claim_notes" placeholder="Date, cause of loss, amount paid, repairs completed."></textarea></label>
      </div>` },
    { title:"Hazards / Underwriting", render: () => `
      <div class="form-grid">
        <label>Swimming pool? <select name="pool" required>${yesNo()}</select></label>
        <label>Pool fenced/gated? <select name="pool_fenced">${yesNo()}</select></label>
        <label>Trampoline? <select name="trampoline" required>${yesNo()}</select></label>
        <label>Animals/dogs on premises? <select name="dogs" required>${yesNo()}</select></label>
        <label>Wood stove/fireplace insert? <select name="wood_stove" required>${yesNo()}</select></label>
        <label>Business on premises? <select name="business_premises" required>${yesNo()}</select></label>
        <label>Short-term rental / Airbnb? <select name="short_term" required>${yesNo()}</select></label>
        <label>Vacant or under renovation? <select name="vacant_reno" required>${yesNo()}</select></label>
        <label>Brush/wildfire exposure? <select name="brush" required>${yesNo()}</select></label>
        <label class="span-3">Underwriting remarks <textarea name="uw_remarks" placeholder="Explain any Yes answers."></textarea></label>
      </div>` }
  ];

  function renderQuoteWizard(){
    const steps = state.quote.lob === "Auto" ? autoSteps : homeSteps;
    const step = steps[state.quoteStep];
    const stepsHtml = steps.map((s,i)=>`<div class="step-pill ${i===state.quoteStep?'active':''} ${i<state.quoteStep?'done':''}" data-step="${i}">
      <span class="step-number">${i+1}</span><span>${escapeHtml(s.title)}</span>
    </div>`).join("");

    renderView(pageHead(`${state.quote.lob} Quote`, "Complete all required carrier questions before rating.", `
      <button class="btn" type="button" id="back-to-choice">Change Line</button>
    `) + `
      <div class="wizard">
        <aside class="steps">${stepsHtml}</aside>
        <section class="card">
          <div class="section-title">
            <h2>${escapeHtml(step.title)}</h2>
            <span class="badge">${state.quoteStep+1} of ${steps.length}</span>
          </div>
          <form id="quote-step-form">
            ${step.render()}
            <div class="form-error hidden" id="quote-error"></div>
            <div class="divider"></div>
            <div class="action-bar">
              <button class="btn" type="button" id="quote-prev" ${state.quoteStep===0?'disabled':''}>Previous</button>
              ${state.quoteStep < steps.length-1
                ? `<button class="btn primary" type="submit">Save & Continue</button>`
                : `<button class="btn primary" type="submit">Rate Quote</button>`}
              <button class="btn" type="button" id="save-draft">Save Draft</button>
            </div>
          </form>
          <div id="quote-result" style="margin-top:18px"></div>
        </section>
      </div>
    `);

    hydrateQuoteFields();
    $$(".step-pill").forEach(btn => btn.addEventListener("click", () => {
      saveCurrentStep(false);
      state.quoteStep = Number(btn.dataset.step);
      renderQuoteWizard();
    }));
    $("#back-to-choice").addEventListener("click", renderQuoteChoice);
    $("#quote-prev").addEventListener("click", () => {
      saveCurrentStep(false);
      state.quoteStep = Math.max(0, state.quoteStep - 1);
      renderQuoteWizard();
    });
    $("#save-draft").addEventListener("click", saveDraftQuote);
    $("#quote-step-form").addEventListener("submit", async e => {
      e.preventDefault();
      if(!saveCurrentStep(true)) return;
      if(state.quoteStep < steps.length - 1){
        state.quoteStep++;
        renderQuoteWizard();
      }else{
        rateQuote();
      }
    });
  }

  function hydrateQuoteFields(){
    const data = state.quote?.data || {};
    $$("#quote-step-form [name]").forEach(el => {
      if(data[el.name] != null) el.value = data[el.name];
    });
  }

  function saveCurrentStep(validate=true){
    const form = $("#quote-step-form");
    if(!form) return true;
    const error = $("#quote-error");
    error.classList.add("hidden");
    $$("#quote-step-form input, #quote-step-form select, #quote-step-form textarea").forEach(el => el.classList.remove("invalid"));
    const required = $$("#quote-step-form [required]");
    if(validate){
      for(const el of required){
        if(!String(el.value || "").trim()){
          el.classList.add("invalid");
          error.textContent = `Please complete: ${el.closest("label")?.childNodes[0]?.textContent?.trim() || el.name}`;
          error.classList.remove("hidden");
          el.scrollIntoView({ behavior:"smooth", block:"center" });
          el.focus();
          return false;
        }
      }
    }
    const fd = new FormData(form);
    for(const [k,v] of fd.entries()) state.quote.data[k] = String(v).trim();
    return true;
  }

  function calculatePremium(lob, data){
    let score = 20;
    let flags = [];
    let premium = lob === "Auto" ? 850 : 950;

    if(lob === "Auto"){
      const year = Number(data.vehicle_year || new Date().getFullYear());
      const age = new Date().getFullYear() - year;
      premium += Math.max(0, 12-age) * 45;
      premium += Number(data.annual_miles || 0) > 15000 ? 180 : 0;
      if(data.bi_limit === "250/500" || data.bi_limit === "500/500") premium += 170;
      if(data.comp_ded === "100" || data.coll_ded === "100") premium += 220;
      if(data.accidents_5 === "Yes"){ score += 22; premium += 420; flags.push("Accident history requires underwriting review."); }
      if(data.violations_5 === "Yes"){ score += 18; premium += 280; flags.push("Violation history present."); }
      if(data.lapse_12 === "Yes"){ score += 20; premium += 260; flags.push("Coverage lapse disclosed."); }
      if(data.rideshare === "Yes" || data.business_use === "Yes"){ score += 35; premium += 500; flags.push("Business/rideshare exposure may be ineligible."); }
      if(data.salvage === "Yes"){ score += 35; flags.push("Salvage/rebuilt title is a carrier referral."); }
      if(data.sr22 === "Yes" || data.major_violation === "Yes"){ score += 40; premium += 550; flags.push("SR-22/major violation referral."); }
    }else{
      const dwelling = Number(data.dwelling || 0);
      premium += dwelling * 0.0045;
      const roofAge = new Date().getFullYear() - Number(data.roof_year || new Date().getFullYear());
      if(roofAge > 15){ score += 20; premium += 350; flags.push("Roof age over 15 years."); }
      if(data.roof_condition === "Poor"){ score += 40; flags.push("Poor roof condition is referral/decline concern."); }
      if(data.old_systems === "Yes"){ score += 25; premium += 300; flags.push("Older electrical/plumbing system disclosed."); }
      if(data.claims_5 === "Yes"){ score += 22; premium += 420; flags.push("Property claims in prior 5 years."); }
      if(Number(data.claim_count || 0) >= 2){ score += 25; flags.push("Multiple prior claims."); }
      ["trampoline","dogs","wood_stove","business_premises","short_term","vacant_reno","brush"].forEach(k => {
        if(data[k] === "Yes"){ score += 12; premium += 120; flags.push(`${k.replaceAll("_"," ")} exposure disclosed.`); }
      });
      if(data.occupancy === "Vacant"){ score += 35; flags.push("Vacant occupancy may be ineligible."); }
      if(data.construction === "Manufactured"){ score += 18; premium += 220; flags.push("Manufactured home referral likely."); }
    }
    let status = "Quoted";
    if(score >= 85) status = "Declined";
    else if(score >= 55 || flags.length) status = "Referral Required";
    const qaScore = Math.max(50, 100 - Math.floor(score * .45));
    premium = Math.round(premium / 10) * 10;
    return { status, premium, monthly: Math.round(premium/12), downPayment: Math.round(premium*.18), riskScore: score, qaScore, flags };
  }

  function rateQuote(){
    const data = state.quote.data;
    const result = calculatePremium(state.quote.lob, data);
    state.currentResult = result;
    const resultEl = $("#quote-result");
    resultEl.innerHTML = `
      <div class="result-box">
        <div class="section-title">
          <h2>Rate Result</h2>
          <span class="badge ${result.status === "Quoted" ? "good" : result.status === "Referral Required" ? "warn" : "bad"}">${escapeHtml(result.status)}</span>
        </div>
        <div class="grid cols-4">
          <div class="card soft"><span class="small">Annual Premium</span><h2>${money(result.premium)}</h2></div>
          <div class="card soft"><span class="small">Monthly Estimate</span><h2>${money(result.monthly)}</h2></div>
          <div class="card soft"><span class="small">Down Payment</span><h2>${money(result.downPayment)}</h2></div>
          <div class="card soft"><span class="small">Risk Score</span><h2>${result.riskScore}</h2></div>
        </div>
        ${result.flags.length ? `<div class="card soft" style="margin-top:14px"><b>Underwriting Flags</b><ul>${result.flags.map(f=>`<li>${escapeHtml(f)}</li>`).join("")}</ul></div>` : `<p class="badge good" style="margin-top:14px">No referral flags detected.</p>`}
        <div class="action-bar" style="margin-top:16px">
          <button class="btn primary" id="save-rated-quote" type="button">Save Quote</button>
          <button class="btn success" id="bind-policy" type="button" ${result.status === "Declined" ? "disabled" : ""}>Bind / Issue Policy</button>
          <button class="btn" id="print-quote" type="button">Print Quote</button>
        </div>
      </div>
    `;
    $("#save-rated-quote").addEventListener("click", saveRatedQuote);
    $("#bind-policy").addEventListener("click", bindPolicy);
    $("#print-quote").addEventListener("click", ()=> window.print());
    toast("Quote rated successfully.", "success");
  }

  async function saveDraftQuote(){
    saveCurrentStep(false);
    const quoteNumber = state.quote.quote_number || genNumber("DRAFT");
    state.quote.quote_number = quoteNumber;
    const row = await store.upsert("carrier_quotes", {
      quote_number: quoteNumber,
      line_of_business: state.quote.lob,
      named_insured: state.quote.data.named_insured || "(Draft - no name)",
      email: state.quote.data.email || "",
      phone: state.quote.data.phone || "",
      status: "Draft",
      premium: 0,
      monthly: 0,
      risk_score: 0,
      qa_score: 0,
      quote_data: state.quote.data,
      created_by_email: state.user.email,
      created_by_name: state.user.name
    }, "quote_number");
    await store.logAudit("SAVE_DRAFT", "carrier_quotes", { quote_number: row.quote_number }, state.user);
    toast(`Draft saved: ${row.quote_number}`, "success");
  }

  async function saveRatedQuote(){
    if(!state.currentResult){ toast("Please rate the quote first.", "error"); return null; }
    const qn = state.quote.quote_number || genNumber(state.quote.lob === "Auto" ? "AQ" : "HQ");
    state.quote.quote_number = qn;
    const result = state.currentResult;
    const data = state.quote.data;
    const row = await store.upsert("carrier_quotes", {
      quote_number: qn,
      line_of_business: state.quote.lob,
      named_insured: data.named_insured,
      email: data.email,
      phone: data.phone,
      status: result.status,
      premium: result.premium,
      monthly: result.monthly,
      risk_score: result.riskScore,
      qa_score: result.qaScore,
      quote_data: data,
      created_by_email: state.user.email,
      created_by_name: state.user.name
    }, "quote_number");
    await store.logAudit("SAVE_QUOTE", "carrier_quotes", { quote_number: row.quote_number, status: row.status }, state.user);
    toast(`Quote saved: ${row.quote_number}`, "success");
    return row;
  }

  async function bindPolicy(){
    if(!state.currentResult){ toast("Please rate the quote first.", "error"); return; }
    if(!state.quote.quote_number) await saveRatedQuote();
    const data = state.quote.data;
    const prefix = state.quote.lob === "Auto" ? "LVA-AUTO" : "LVA-HOME";
    const policyNumber = genNumber(prefix);
    const eff = data.effective_date || today();
    const row = await store.insert("carrier_policies", {
      policy_number: policyNumber,
      named_insured: data.named_insured,
      email: data.email,
      phone: data.phone,
      line_of_business: state.quote.lob,
      policy_status: "Active",
      effective_date: eff,
      expiration_date: addDays(eff, 365),
      mailing_address: data.mailing_address || "",
      risk_address: data.risk_address || data.garaging_address || "",
      garaging_address: data.garaging_address || "",
      premium: state.currentResult.premium,
      quote_number: state.quote.quote_number,
      policy_data: data,
      created_by_email: state.user.email,
      created_by_name: state.user.name
    });
    await store.logAudit("BIND_POLICY", "carrier_policies", { policy_number: row.policy_number, quote_number: state.quote.quote_number }, state.user);
    state.activePolicy = row;
    toast(`Policy issued: ${row.policy_number}`, "success");
    routeTo("search");
    setTimeout(() => {
      const box = $("#policy-search-results");
      if(box) renderPolicyDetail(row, box);
    }, 50);
  }

  async function renderIdCard(){
    renderView(pageHead("Auto Insurance ID Card", "Pull up an active Auto policy and generate a printable insurance ID card.", "") + `
      ${searchBox("Find Auto Policy")}
      <div id="id-card-area" style="margin-top:18px"></div>
    `);
    bindPolicySearch((policy)=> generateIdCard(policy));
    if(state.activePolicy) generateIdCard(state.activePolicy);
  }

  function generateIdCard(policy){
    const area = $("#id-card-area");
    if(!area) return;
    if(policy.line_of_business !== "Auto"){
      area.innerHTML = `<div class="empty-state">Selected policy is not an Auto policy. Please select an Auto policy.</div>`;
      return;
    }
    const d = policy.policy_data || {};
    area.innerHTML = `
      <div class="card">
        <div class="section-title">
          <h2>Insurance Identification Card</h2>
          <div class="action-bar">
            <button class="btn primary" id="download-id-card" type="button">Download HTML</button>
            <button class="btn" onclick="window.print()" type="button">Print / Save PDF</button>
          </div>
        </div>
        <div class="id-card" id="auto-id-card">
          <div class="id-top">
            <div>
              <h2>LAVA Training Insurance</h2>
              <p>Auto Insurance Identification Card</p>
            </div>
            <div><b>NAIC:</b> 00000<br><b>Training Only</b></div>
          </div>
          <div class="grid cols-2">
            <div>
              <h3>Insured</h3>
              <p>${escapeHtml(policy.named_insured)}<br>${escapeHtml(policy.mailing_address || "")}</p>
              <p><b>Policy:</b> ${escapeHtml(policy.policy_number)}<br>
              <b>Effective:</b> ${dateOnly(policy.effective_date)}<br>
              <b>Expires:</b> ${dateOnly(policy.expiration_date)}</p>
            </div>
            <div>
              <h3>Vehicle</h3>
              <p>${escapeHtml(d.vehicle_year || "")} ${escapeHtml(d.vehicle_make || "")} ${escapeHtml(d.vehicle_model || "")}<br>
              <b>VIN:</b> ${escapeHtml(d.vin || "")}<br>
              <b>Garaging:</b> ${escapeHtml(d.garaging_address || policy.garaging_address || "")}</p>
            </div>
          </div>
          <p class="small">This card is generated for training simulation only and is not proof of real insurance.</p>
        </div>
      </div>
    `;
    $("#download-id-card").addEventListener("click", () => downloadText(`auto-id-card-${policy.policy_number}.html`, $("#auto-id-card").outerHTML, "text/html"));
  }

  function modulePolicyHeader(title, subtitle){
    return pageHead(title, subtitle, state.activePolicy ? `<span class="badge good">Selected: ${escapeHtml(state.activePolicy.policy_number)}</span>` : "");
  }

  async function renderPayments(){
    renderView(modulePolicyHeader("Payment Center", "Search a policy, post a payment, and download a receipt.") + `
      ${searchBox("Find Policy")}
      <div id="payment-panel" style="margin-top:18px"></div>
    `);
    bindPolicySearch(renderPaymentPanel);
    if(state.activePolicy) renderPaymentPanel(state.activePolicy);
  }

  function renderPaymentPanel(policy){
    $("#payment-panel").innerHTML = `
      <div class="card">
        <div class="section-title"><h2>Post Payment for ${escapeHtml(policy.policy_number)}</h2><span class="badge">${escapeHtml(policy.named_insured)}</span></div>
        <form id="payment-form">
          <div class="form-grid">
            <label>Payment Amount <input name="amount" required type="number" min="1" step="0.01" placeholder="250.00" /></label>
            <label>Payment Method <select name="method" required><option value="">Select</option>${optionHtml(REF.paymentMethods)}</select></label>
            <label>Payment Date <input name="payment_date" required type="date" value="${today()}" /></label>
            <label>Reference Number <input name="reference_number" placeholder="Confirmation/check number" /></label>
            <label>Received From <input name="received_from" required placeholder="Customer / Agency" /></label>
            <label>Apply To <select name="apply_to"><option>Current Term Premium</option><option>Renewal Down Payment</option><option>Endorsement Premium</option><option>Past Due Balance</option></select></label>
            <label class="span-3">Payment Notes <textarea name="notes" placeholder="Receipt or billing notes."></textarea></label>
          </div>
          <div class="action-bar" style="margin-top:14px">
            <button class="btn primary" type="submit">Post Payment</button>
          </div>
        </form>
        <div id="payment-receipt"></div>
      </div>
    `;
    $("#payment-form").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const row = await store.insert("carrier_payments", {
        policy_number: policy.policy_number,
        named_insured: policy.named_insured,
        amount: Number(data.amount),
        method: data.method,
        payment_date: data.payment_date,
        reference_number: data.reference_number,
        received_from: data.received_from,
        apply_to: data.apply_to,
        notes: data.notes,
        status: "Posted",
        created_by_email: state.user.email
      });
      await store.logAudit("POST_PAYMENT", "carrier_payments", { policy_number: policy.policy_number, amount: data.amount }, state.user);
      const receipt = `
        <div class="result-box" style="margin-top:18px">
          <h2>Payment Receipt</h2>
          <p><b>Receipt ID:</b> ${escapeHtml(row.id)}<br>
          <b>Policy:</b> ${escapeHtml(policy.policy_number)}<br>
          <b>Named Insured:</b> ${escapeHtml(policy.named_insured)}<br>
          <b>Amount:</b> ${money(row.amount)}<br>
          <b>Method:</b> ${escapeHtml(row.method)}<br>
          <b>Date:</b> ${escapeHtml(row.payment_date)}</p>
          <button class="btn primary" id="download-receipt" type="button">Download Receipt</button>
        </div>`;
      $("#payment-receipt").innerHTML = receipt;
      $("#download-receipt").addEventListener("click", ()=> downloadText(`receipt-${policy.policy_number}.html`, receipt, "text/html"));
      toast("Payment posted.", "success");
    });
  }

  async function renderEndorsements(){
    renderView(modulePolicyHeader("Endorsement Processing", "Process policy changes and upload/download supporting documents.") + `
      ${searchBox("Find Policy")}
      <div id="endorsement-panel" style="margin-top:18px"></div>
    `);
    bindPolicySearch(renderEndorsementPanel);
    if(state.activePolicy) renderEndorsementPanel(state.activePolicy);
  }

  function renderEndorsementPanel(policy){
    $("#endorsement-panel").innerHTML = `
      <div class="card">
        <div class="section-title">
          <h2>Endorse Policy ${escapeHtml(policy.policy_number)}</h2>
          <button class="btn" type="button" id="show-endorsement-guide">How to Process Endorsement</button>
        </div>
        <div id="endorsement-guide" class="card soft hidden">
          <ol>
            <li>Pull up the correct policy by policy number or named insured.</li>
            <li>Confirm effective date and the exact requested change.</li>
            <li>Choose endorsement type and enter clear remarks.</li>
            <li>Upload supporting documents, if provided.</li>
            <li>Submit to create the endorsement work item and audit log.</li>
          </ol>
        </div>
        <form id="endorsement-form">
          <div class="form-grid">
            <label>Endorsement Type <select name="endorsement_type" required><option value="">Select</option>${optionHtml(REF.endorsementTypes)}</select></label>
            <label>Effective Date <input name="effective_date" required type="date" value="${today()}" /></label>
            <label>Premium Impact <select name="premium_impact"><option>Unknown / Pending Rating</option><option>No Change</option><option>Additional Premium</option><option>Return Premium</option></select></label>
            <label class="span-3">Change Description <textarea name="description" required placeholder="Example: Add driver, include full name, DOB, license state, effective date, and underwriting notes."></textarea></label>
            <label class="span-3">Upload Supporting Documents
              <input name="documents" id="endorsement-docs" type="file" multiple />
            </label>
          </div>
          <div class="action-bar" style="margin-top:14px">
            <button class="btn primary" type="submit">Submit Endorsement</button>
          </div>
        </form>
        <div id="endorsement-result"></div>
      </div>
    `;
    $("#show-endorsement-guide").addEventListener("click", ()=> $("#endorsement-guide").classList.toggle("hidden"));
    $("#endorsement-form").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const row = await store.insert("carrier_endorsements", {
        policy_number: policy.policy_number,
        named_insured: policy.named_insured,
        endorsement_type: data.endorsement_type,
        effective_date: data.effective_date,
        premium_impact: data.premium_impact,
        description: data.description,
        status: "Submitted",
        created_by_email: state.user.email
      });
      const files = $("#endorsement-docs").files;
      const docs = await store.uploadFiles(files, { module:"endorsements", policy_number:policy.policy_number, uploaded_by_email:state.user.email });
      await store.logAudit("SUBMIT_ENDORSEMENT", "carrier_endorsements", { policy_number: policy.policy_number, type: data.endorsement_type, docs: docs.length }, state.user);
      $("#endorsement-result").innerHTML = `<div class="result-box" style="margin-top:18px">
        <h2>Endorsement Submitted</h2>
        <p><b>Work Item:</b> ${escapeHtml(row.id)}<br><b>Status:</b> ${escapeHtml(row.status)}<br><b>Documents:</b> ${docs.length}</p>
      </div>`;
      toast("Endorsement submitted.", "success");
    });
  }

  async function renderCancellations(){
    renderView(modulePolicyHeader("Policy Cancellation", "Submit cancellation requests with reason, date, and supporting remarks.") + `
      ${searchBox("Find Policy")}
      <div id="cancel-panel" style="margin-top:18px"></div>
    `);
    bindPolicySearch(renderCancelPanel);
    if(state.activePolicy) renderCancelPanel(state.activePolicy);
  }

  function renderCancelPanel(policy){
    $("#cancel-panel").innerHTML = `
      <div class="card">
        <div class="section-title">
          <h2>Cancel Policy ${escapeHtml(policy.policy_number)}</h2>
          <button class="btn" type="button" id="show-cancel-guide">How to Cancel Policy</button>
        </div>
        <div id="cancel-guide" class="card soft hidden">
          <ol>
            <li>Verify policy number, named insured, and requester authority.</li>
            <li>Confirm the requested cancellation effective date.</li>
            <li>Select the reason and collect signed request if required.</li>
            <li>Submit cancellation request and update status to Pending Cancellation.</li>
          </ol>
        </div>
        <form id="cancel-form">
          <div class="form-grid">
            <label>Cancellation Reason <select name="reason" required><option value="">Select</option>${optionHtml(REF.cancelReasons)}</select></label>
            <label>Cancellation Effective Date <input name="effective_date" required type="date" value="${today()}" /></label>
            <label>Requested By <input name="requested_by" required placeholder="Named insured / agent / carrier" /></label>
            <label>Signed Request Received? <select name="signed_request" required>${yesNo()}</select></label>
            <label>Replacement Policy Known? <select name="replacement_known" required>${yesNo()}</select></label>
            <label>Refund Method <select name="refund_method"><option>Unknown</option><option>Mail Check</option><option>Return to Card/ACH</option><option>Agency Account</option></select></label>
            <label class="span-3">Cancellation Notes <textarea name="notes" required placeholder="Document customer request, reason, and any missing requirements."></textarea></label>
          </div>
          <div class="action-bar" style="margin-top:14px">
            <button class="btn danger" type="submit">Submit Cancellation</button>
          </div>
        </form>
        <div id="cancel-result"></div>
      </div>
    `;
    $("#show-cancel-guide").addEventListener("click", ()=> $("#cancel-guide").classList.toggle("hidden"));
    $("#cancel-form").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const row = await store.insert("carrier_cancellations", {
        policy_number: policy.policy_number,
        named_insured: policy.named_insured,
        reason: data.reason,
        effective_date: data.effective_date,
        requested_by: data.requested_by,
        signed_request: data.signed_request,
        replacement_known: data.replacement_known,
        refund_method: data.refund_method,
        notes: data.notes,
        status: "Pending Cancellation",
        created_by_email: state.user.email
      });
      await store.update("carrier_policies", { policy_status:"Pending Cancellation" }, { policy_number: policy.policy_number });
      await store.logAudit("SUBMIT_CANCELLATION", "carrier_cancellations", { policy_number: policy.policy_number, reason: data.reason }, state.user);
      $("#cancel-result").innerHTML = `<div class="result-box" style="margin-top:18px"><h2>Cancellation Request Submitted</h2><p>Work Item: ${escapeHtml(row.id)} • Status: Pending Cancellation</p></div>`;
      toast("Cancellation request submitted.", "success");
    });
  }

  async function renderRemarketing(){
    renderView(modulePolicyHeader("Quoting & Remarketing", "Review existing policy information and create a remarketing task.") + `
      ${searchBox("Find Policy")}
      <div id="remarketing-panel" style="margin-top:18px"></div>
    `);
    bindPolicySearch(renderRemarketingPanel);
    if(state.activePolicy) renderRemarketingPanel(state.activePolicy);
  }

  function renderRemarketingPanel(policy){
    $("#remarketing-panel").innerHTML = `
      <div class="card">
        <div class="section-title"><h2>Remarket ${escapeHtml(policy.policy_number)}</h2><span class="badge">${escapeHtml(policy.line_of_business)}</span></div>
        <form id="remarketing-form">
          <div class="form-grid">
            <label>Renewal / Target Effective Date <input name="target_date" required type="date" value="${policy.expiration_date || today()}" /></label>
            <label>Reason for Remarketing <select name="reason" required><option value="">Select</option><option>Premium Increase</option><option>Carrier Appetite</option><option>Coverage Concern</option><option>Client Request</option><option>Claims/Underwriting Concern</option></select></label>
            <label>Current Premium <input name="current_premium" type="number" value="${Number(policy.premium || 0)}" /></label>
            <label class="span-3">Markets to Check <input name="markets" required placeholder="Example: Travelers, Safeco, Progressive, National General, Mercury" /></label>
            <label class="span-3">Remarketing Notes <textarea name="notes" required placeholder="Summarize reason, target coverage, and carrier appetite notes."></textarea></label>
          </div>
          <div class="action-bar" style="margin-top:14px">
            <button class="btn primary" type="submit">Create Remarketing Task</button>
          </div>
        </form>
        <div id="remarketing-result"></div>
      </div>
    `;
    $("#remarketing-form").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const row = await store.insert("carrier_remarketing", {
        policy_number: policy.policy_number,
        named_insured: policy.named_insured,
        line_of_business: policy.line_of_business,
        target_date: data.target_date,
        reason: data.reason,
        current_premium: Number(data.current_premium || 0),
        markets: data.markets,
        notes: data.notes,
        status: "Open",
        created_by_email: state.user.email
      });
      await store.logAudit("CREATE_REMARKETING", "carrier_remarketing", { policy_number: policy.policy_number, reason: data.reason }, state.user);
      $("#remarketing-result").innerHTML = `<div class="result-box" style="margin-top:18px"><h2>Remarketing Task Created</h2><p>Task ID: ${escapeHtml(row.id)} • Status: Open</p></div>`;
      toast("Remarketing task created.", "success");
    });
  }

  async function renderDocuments(){
    renderView(pageHead("Documents", "View uploaded endorsement and workflow documents. Supabase storage is used when configured.", `
      <button class="btn" data-route="endorsements">Upload via Endorsement</button>
    `) + `<div id="docs-list" class="card"><div class="empty-state">Loading documents...</div></div>`);
    const docs = await store.list("carrier_documents", {limit:200});
    const rows = docs.map(d => `
      <tr>
        <td><strong>${escapeHtml(d.file_name)}</strong><br><span class="small">${escapeHtml(d.file_type)} • ${Math.round((d.file_size||0)/1024)} KB</span></td>
        <td>${escapeHtml(d.policy_number)}</td>
        <td>${escapeHtml(d.module)}</td>
        <td>${escapeHtml(d.uploaded_by_email || "")}</td>
        <td>${dateOnly(d.created_at)}</td>
        <td><button class="btn doc-download" data-path="${escapeHtml(d.file_path)}" data-name="${escapeHtml(d.file_name)}" type="button">Download</button></td>
      </tr>
    `);
    $("#docs-list").innerHTML = table(["File","Policy","Module","Uploaded By","Date","Action"], rows, "No documents uploaded yet.");
    $$(".doc-download").forEach(btn => btn.addEventListener("click", async () => {
      const url = await store.getSignedUrl(btn.dataset.path);
      if(url) window.open(url, "_blank");
      else toast("No signed URL available. Check Supabase storage bucket and policies.", "error");
    }));
  }

  async function renderQueue(){
    renderView(pageHead("Work Queue", "Review open quotes, endorsements, payments, cancellations, and remarketing items.", `
      <button class="btn" id="export-queue">Export Queue CSV</button>
    `) + `<div id="queue-list" class="card"><div class="empty-state">Loading work queue...</div></div>`);
    const [quotes, endts, pays, cancels, rem] = await Promise.all([
      store.list("carrier_quotes", {limit:100}),
      store.list("carrier_endorsements", {limit:100}),
      store.list("carrier_payments", {limit:100}),
      store.list("carrier_cancellations", {limit:100}),
      store.list("carrier_remarketing", {limit:100})
    ]);
    const items = [
      ...quotes.map(q=>({type:"Quote", ref:q.quote_number, insured:q.named_insured, status:q.status, date:q.created_at})),
      ...endts.map(e=>({type:"Endorsement", ref:e.policy_number, insured:e.endorsement_type, status:e.status, date:e.created_at})),
      ...pays.map(p=>({type:"Payment", ref:p.policy_number, insured:money(p.amount), status:p.status, date:p.created_at})),
      ...cancels.map(c=>({type:"Cancellation", ref:c.policy_number, insured:c.reason, status:c.status, date:c.created_at})),
      ...rem.map(r=>({type:"Remarketing", ref:r.policy_number, insured:r.reason, status:r.status, date:r.created_at}))
    ].sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
    const rows = items.map(i=>`<tr><td>${escapeHtml(i.type)}</td><td>${escapeHtml(i.ref)}</td><td>${escapeHtml(i.insured)}</td><td>${escapeHtml(i.status)}</td><td>${dateOnly(i.date)}</td></tr>`);
    $("#queue-list").innerHTML = table(["Type","Reference","Customer/Action","Status","Date"], rows, "No work items yet.");
    $("#export-queue").addEventListener("click", ()=> downloadCsv("carrierops-work-queue.csv", items));
  }

  async function renderTrainer(){
    if(state.user.role !== "Trainer"){
      renderView(pageHead("Trainer QA", "Trainer / Team Lead access is required.", "") + `<div class="empty-state">Please log in as Trainer / Team Lead to access QA tools.</div>`);
      return;
    }
    renderView(pageHead("Trainer QA Dashboard", "Review VA activity, login records, quote quality, and audit logs.", `
      <button class="btn" id="export-backup">Export JSON Backup</button>
      <label class="btn" style="cursor:pointer">Import JSON <input id="import-backup" type="file" accept=".json" class="hidden"></label>
    `) + `
      <div class="grid cols-2">
        <div class="card"><div class="section-title"><h3>Login History</h3></div><div id="login-history"></div></div>
        <div class="card"><div class="section-title"><h3>Audit Logs</h3></div><div id="audit-history"></div></div>
      </div>
      <div class="card" style="margin-top:18px">
        <div class="section-title"><h3>QA Review</h3></div>
        <form id="qa-form">
          <div class="form-grid">
            <label>Reference Number <input name="reference_number" required placeholder="Quote or Policy Number" /></label>
            <label>VA Name <input name="va_name" required placeholder="VA being reviewed" /></label>
            <label>QA Score <input name="qa_score" required type="number" min="0" max="100" placeholder="95" /></label>
            <label class="span-3">Trainer Comments <textarea name="comments" required placeholder="Accuracy feedback, missing fields, coaching notes."></textarea></label>
          </div>
          <div class="action-bar" style="margin-top:14px">
            <button class="btn primary" type="submit">Save QA Review</button>
          </div>
        </form>
      </div>
    `);
    const [logins, audits] = await Promise.all([
      store.list("carrier_login_logs", {limit:50}),
      store.list("carrier_audit_logs", {limit:50})
    ]);
    $("#login-history").innerHTML = table(["Name","Email","Role","Time"], logins.map(l=>`<tr><td>${escapeHtml(l.name || l.full_name)}</td><td>${escapeHtml(l.email)}</td><td>${escapeHtml(l.role)}</td><td>${dateOnly(l.created_at)} ${String(l.created_at||"").slice(11,16)}</td></tr>`), "No login logs yet.");
    $("#audit-history").innerHTML = table(["Action","Entity","User","Time"], audits.map(a=>`<tr><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.entity)}</td><td>${escapeHtml(a.user_email)}</td><td>${dateOnly(a.created_at)} ${String(a.created_at||"").slice(11,16)}</td></tr>`), "No audit logs yet.");
    $("#qa-form").addEventListener("submit", async e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      await store.insert("carrier_qa_reviews", {
        reference_number: data.reference_number,
        va_name: data.va_name,
        qa_score: Number(data.qa_score),
        comments: data.comments,
        trainer_name: state.user.name,
        trainer_email: state.user.email
      });
      await store.logAudit("SAVE_QA_REVIEW", "carrier_qa_reviews", data, state.user);
      toast("QA review saved.", "success");
      e.target.reset();
    });
    $("#export-backup").addEventListener("click", () => downloadText("carrierops-local-backup.json", JSON.stringify(store.exportJson(), null, 2), "application/json"));
    $("#import-backup").addEventListener("change", e => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          store.importJson(JSON.parse(reader.result));
          toast("Local backup imported.", "success");
        }catch{ toast("Invalid JSON backup file.", "error"); }
      };
      reader.readAsText(file);
    });
  }

  function downloadText(filename, text, type="text/plain"){
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCsv(filename, rows){
    const keys = Object.keys(rows[0] || { empty:"" });
    const csv = [keys.join(","), ...rows.map(r=>keys.map(k=>`"${String(r[k]??"").replaceAll('"','""')}"`).join(","))].join("\n");
    downloadText(filename, csv, "text/csv");
  }

  function initEvents(){
    $("#login-role").addEventListener("change", e => {
      $("#trainer-code-wrap").classList.toggle("hidden", e.target.value !== "Trainer");
      $("#trainer-code").required = e.target.value === "Trainer";
    });

    $("#login-form").addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#login-name").value.trim();
      const email = $("#login-email").value.trim();
      const role = $("#login-role").value;
      const code = $("#trainer-code").value.trim();
      const err = $("#login-error");
      err.classList.add("hidden");

      if(role === "Trainer" && code !== TRAINER_CODE){
        err.textContent = "Invalid trainer code.";
        err.classList.remove("hidden");
        return;
      }

      const user = { name, email, role, signed_in_at: store.now() };
      saveUser(user);
      showApp();
      routeTo("dashboard", true);

      // Background logging only. Never block portal navigation.
      store.upsert("carrier_va_users", { full_name:name, email, role, last_login_at:store.now() }, "email").catch(console.warn);
      store.insert("carrier_login_logs", { name, email, role, created_at:store.now() }).catch(console.warn);
      store.logAudit("LOGIN", "carrier_login_logs", { email, role }, user).catch(console.warn);
    });

    $("#logout-btn").addEventListener("click", () => {
      clearUser();
      showLogin();
      history.replaceState(null, "", location.pathname);
    });

    $("#theme-toggle").addEventListener("click", () => {
      document.body.classList.toggle("dark");
      localStorage.setItem("lava_carrierops_theme", document.body.classList.contains("dark") ? "dark" : "light");
    });

    document.body.addEventListener("click", e => {
      const routeBtn = e.target.closest("[data-route]");
      if(routeBtn && routes[routeBtn.dataset.route]){
        e.preventDefault();
        routeTo(routeBtn.dataset.route);
      }
    });

    window.addEventListener("hashchange", () => {
      const route = location.hash.replace("#","") || "dashboard";
      if(routes[route]) routeTo(route, false);
    });

    window.addEventListener("carrierops:connection", e => updateConnectionPill(e.detail));
  }

  async function init(){
    if(localStorage.getItem("lava_carrierops_theme") === "dark") document.body.classList.add("dark");
    initEvents();
    updateConnectionPill();
    store.checkConnection().then(updateConnectionPill);

    const saved = userFromStorage();
    if(saved){
      saveUser(saved);
      showApp();
      routeTo("dashboard", true);
    }else{
      showLogin();
    }
  }

  init();
})();
