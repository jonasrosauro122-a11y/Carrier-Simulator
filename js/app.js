(function () {
  "use strict";

  const store = new window.CarrierStore();
  const state = {
    user: null,
    route: "dashboard",
    activePolicy: null,
    searchResults: [],
    quoteResult: null,
    lastReceipt: null,
    lastEndorsement: null,
    lastCancellation: null,
    lastRemarketing: null
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const formatMoney = (value) => Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US") : "—";
  const today = () => new Date().toISOString().slice(0, 10);
  const addYears = (dateString, years) => {
    const d = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().slice(0, 10);
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const initials = (name) => String(name || "VA").split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  function makeId(prefix) {
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`;
  }

  function getUser() {
    return JSON.parse(localStorage.getItem("lava_carrierops_session") || "null");
  }

  function setUser(user) {
    localStorage.setItem("lava_carrierops_session", JSON.stringify(user));
    state.user = user;
  }

  function toast(message, type = "info") {
    const stack = $("#toast-stack");
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = esc(message);
    stack.appendChild(node);
    setTimeout(() => node.remove(), 4500);
  }

  function downloadText(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadHtml(filename, title, bodyHtml) {
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font-family:Arial,sans-serif;margin:28px;color:#111827} h1,h2,h3{margin-bottom:6px}
      .box{border:1px solid #d0d5dd;border-radius:12px;padding:16px;margin:12px 0}
      table{width:100%;border-collapse:collapse} td,th{border:1px solid #d0d5dd;padding:8px;text-align:left}
      small{color:#667085}.brand{background:#0f4c81;color:#fff;padding:14px;border-radius:12px}
      @media print{button{display:none}}
    </style></head><body><button onclick="window.print()">Print / Save as PDF</button>${bodyHtml}</body></html>`;
    downloadText(filename, doc, "text/html");
  }

  function formData(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    $$("input[type=checkbox]", form).forEach((box) => {
      if (!data[box.name]) data[box.name] = box.checked ? "Yes" : "No";
    });
    return data;
  }

  function csv(rows) {
    if (!rows.length) return "";
    const cols = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    const q = (v) => `"${String(typeof v === "object" && v !== null ? JSON.stringify(v) : v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(","), ...rows.map((row) => cols.map((c) => q(row[c])).join(","))].join("\n");
  }

  function updateChrome() {
    $("#connection-badge").textContent = store.isOnline() ? "Supabase Connected" : "Local Mode";
    $("#connection-badge").classList.toggle("online", store.isOnline());
    if (!state.user) return;
    $("#user-name").textContent = state.user.name;
    $("#user-role").textContent = state.user.role;
    $("#user-initials").textContent = initials(state.user.name);
    $$(".trainer-only").forEach((el) => el.classList.toggle("hidden", state.user.role !== "Trainer"));
    $$(".nav-link").forEach((btn) => btn.classList.toggle("active", btn.dataset.route === state.route));
  }

  async function navigate(route) {
    state.route = route || "dashboard";
    history.replaceState(null, "", `#${state.route}`);
    updateChrome();
    await render();
  }

  async function render() {
    const view = $("#view");
    view.innerHTML = `<div class="card"><p class="muted">Loading ${esc(state.route)}...</p></div>`;
    try {
      if (state.route === "dashboard") return renderDashboard();
      if (state.route === "search") return renderSearch();
      if (state.route === "quote") return renderQuote();
      if (state.route === "idcards") return renderIdCards();
      if (state.route === "payments") return renderPayments();
      if (state.route === "endorsements") return renderEndorsements();
      if (state.route === "cancellations") return renderCancellations();
      if (state.route === "remarketing") return renderRemarketing();
      if (state.route === "workqueue") return renderWorkQueue();
      if (state.route === "trainer") return renderTrainer();
      return renderDashboard();
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="warning-box"><strong>Portal error:</strong> ${esc(err.message || err)}</div>`;
    }
  }

  function viewHead(title, subtitle, actions = "") {
    return `<div class="view-head"><div><p class="eyebrow">Carrier Operations</p><h1>${esc(title)}</h1><p class="muted">${esc(subtitle || "")}</p></div><div class="view-actions">${actions}</div></div>`;
  }

  async function renderDashboard() {
    const [policies, payments, endorsements, cancellations, audit] = await Promise.all([
      store.list("policies", { orderBy: "updated_at" }),
      store.list("payments", { orderBy: "created_at" }),
      store.list("endorsements", { orderBy: "created_at" }),
      store.list("cancellations", { orderBy: "created_at" }),
      store.list("audit", { orderBy: "created_at" })
    ]);

    const activePolicies = policies.filter((p) => String(p.status || "").toLowerCase() === "active").length;
    const openItems = endorsements.filter((e) => e.status !== "Completed").length + cancellations.filter((c) => c.status !== "Completed").length;
    const totalPremium = policies.reduce((sum, p) => sum + Number(p.premium || 0), 0);

    $("#view").innerHTML = `
      ${viewHead("Dashboard", "Top carrier-style command center for policy servicing and VA training.", `
        <button class="btn primary" data-route="quote">Start New Quote</button>
        <button class="btn subtle" data-route="search">Find Policy</button>
      `)}
      <div class="grid four">
        <div class="metric"><div class="value">${policies.length}</div><div class="label">Policies in Training System</div></div>
        <div class="metric"><div class="value">${activePolicies}</div><div class="label">Active Policies</div></div>
        <div class="metric"><div class="value">${openItems}</div><div class="label">Open Service Items</div></div>
        <div class="metric"><div class="value">${formatMoney(totalPremium)}</div><div class="label">Written Premium</div></div>
      </div>

      <div class="grid two" style="margin-top:1rem">
        <section class="card">
          <h2>Quick Policy Search</h2>
          <p class="muted">Search a policy number or named insured. Try demo policy <span class="kbd">LVA-AUTO-1001</span> after loading demo policies.</p>
          ${searchStrip("dashboard-search", "Policy number or named insured")}
          <div id="dashboard-search-results" class="results-list"></div>
        </section>
        <section class="card">
          <h2>Carrier Task Launcher</h2>
          <div class="grid two">
            ${launcher("Policy Search", "Find a customer record.", "search")}
            ${launcher("Quote", "Create auto or home quote.", "quote")}
            ${launcher("ID Cards", "Generate auto ID cards.", "idcards")}
            ${launcher("Endorsements", "Process policy changes.", "endorsements")}
            ${launcher("Payments", "Post payment and receipt.", "payments")}
            ${launcher("Cancellations", "Process cancellation request.", "cancellations")}
          </div>
        </section>
      </div>

      <div class="grid two" style="margin-top:1rem">
        <section class="card">
          <h2>Recent Activity</h2>
          ${activityList(audit.slice(0, 7))}
        </section>
        <section class="card">
          <h2>System Setup</h2>
          <div class="${store.isOnline() ? "success-box" : "info-box"}">
            <strong>${store.isOnline() ? "Supabase is connected." : "Local training mode is active."}</strong><br>
            ${store.isOnline() ? "Records and uploaded documents are saved to your Supabase project." : "Records are saved in this browser only. Add Supabase URL/key in js/config.js and run docs/supabase-setup.sql to make it shared."}
          </div>
          <button class="btn subtle" data-action="download-readme">Download Setup Notes</button>
        </section>
      </div>
    `;
  }

  function launcher(title, text, route) {
    return `<button class="card soft" data-route="${route}" style="text-align:left"><strong>${esc(title)}</strong><p class="muted">${esc(text)}</p></button>`;
  }

  function searchStrip(id, placeholder) {
    return `<div class="search-strip">
      <label>Search
        <input id="${id}" placeholder="${esc(placeholder)}" />
      </label>
      <label>Search Type
        <select id="${id}-type">
          <option>Policy Number</option>
          <option>Named Insured</option>
          <option>Email / Phone</option>
        </select>
      </label>
      <button class="btn primary" data-action="policy-search" data-input="${id}" data-results="${id}-results">Search</button>
    </div>`;
  }

  function activityList(items) {
    if (!items.length) return `<div class="empty-state">No activity yet.</div>`;
    return `<div class="results-list">${items.map((a) => `<div class="activity-item">
      <div><strong>${esc(a.action)}</strong><p>${esc(a.policy_number || "No policy")} • ${esc(a.performed_by || "System")} • ${formatDate(a.created_at)}</p></div>
      <span class="status-pill open">Audit</span>
    </div>`).join("")}</div>`;
  }

  async function renderSearch() {
    $("#view").innerHTML = `
      ${viewHead("Policy Search", "Pull up customer policies by policy number or named insured.", `
        <button class="btn subtle" data-action="load-demo">Load Demo Policies</button>
        <button class="btn primary" data-route="quote">Create New Policy</button>
      `)}
      <section class="card">
        ${searchStrip("policy-search-main", "Example: LVA-AUTO-1001 or Jamie Rivera")}
        <div id="policy-search-main-results" class="results-list"></div>
      </section>
      <section id="active-policy-panel" style="margin-top:1rem">${state.activePolicy ? policyServicePanel(state.activePolicy) : ""}</section>
    `;
  }

  function policyResultList(policies) {
    if (!policies.length) {
      return `<div class="empty-state">
        <strong>No policy found.</strong>
        <p>Ask trainee to verify the policy number, spelling of named insured, or create a new quote.</p>
        <button class="btn primary" data-route="quote">Start New Quote</button>
      </div>`;
    }
    return policies.map((p) => `<article class="result-card">
      <div>
        <p class="eyebrow">${esc(p.policy_type || "Policy")}</p>
        <h3>${esc(p.policy_number)}</h3>
        <p><strong>${esc(p.named_insured)}</strong> • ${esc(p.address || "No address on file")}</p>
        <p>${esc(p.carrier || "CarrierOps Mutual")} • Effective ${formatDate(p.effective_date)} to ${formatDate(p.expiration_date)} • Premium ${formatMoney(p.premium)}</p>
      </div>
      <div class="view-actions">
        <span class="status-pill ${String(p.status || "").toLowerCase().replace(/\s+/g, "-")}">${esc(p.status || "Active")}</span>
        <button class="btn primary" data-action="open-policy" data-policy="${esc(p.policy_number)}">Open</button>
      </div>
    </article>`).join("");
  }

  function policyServicePanel(p) {
    const vehicle = p.data?.vehicles?.[0] || {};
    return `<section class="card">
      <div class="view-head">
        <div>
          <p class="eyebrow">${esc(p.policy_type || "Policy")} Policy File</p>
          <h1>${esc(p.policy_number)}</h1>
          <p class="muted">${esc(p.named_insured)} • ${esc(p.email || "No email")} • ${esc(p.phone || "No phone")}</p>
        </div>
        <span class="status-pill ${String(p.status || "").toLowerCase().replace(/\s+/g, "-")}">${esc(p.status || "Active")}</span>
      </div>
      <div class="grid four">
        <div class="metric"><div class="label">Carrier</div><div class="value" style="font-size:1.1rem">${esc(p.carrier || "CarrierOps Mutual")}</div></div>
        <div class="metric"><div class="label">Term</div><div class="value" style="font-size:1.1rem">${formatDate(p.effective_date)} - ${formatDate(p.expiration_date)}</div></div>
        <div class="metric"><div class="label">Premium</div><div class="value" style="font-size:1.3rem">${formatMoney(p.premium)}</div></div>
        <div class="metric"><div class="label">Balance</div><div class="value" style="font-size:1.3rem">${formatMoney(p.balance)}</div></div>
      </div>
      <div class="grid two" style="margin-top:1rem">
        <div class="card soft">
          <h3>Risk Snapshot</h3>
          <p><strong>Address:</strong> ${esc(p.address || "Not entered")}</p>
          <p><strong>Primary vehicle/property:</strong> ${esc(vehicle.year ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : p.data?.property?.year_built ? `${p.data.property.year_built} home • ${p.data.property.construction || ""}` : "Not entered")}</p>
          <p><strong>Risk Score:</strong> ${esc(p.risk_score || "Not scored")}</p>
        </div>
        <div class="card soft">
          <h3>Process Action</h3>
          <div class="view-actions">
            ${p.policy_type === "Auto" ? `<button class="btn primary" data-route="idcards">Generate ID Card</button>` : ""}
            <button class="btn primary" data-route="payments">Post Payment</button>
            <button class="btn primary" data-route="endorsements">Process Endorsement</button>
            <button class="btn warning" data-route="remarketing">Remarket</button>
            <button class="btn danger" data-route="cancellations">Cancel Policy</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  async function renderQuote() {
    $("#view").innerHTML = `
      ${viewHead("New Quote", "Blank carrier-style intake. No customer information is pre-filled.", `
        <button class="btn subtle" data-action="reset-quote">Clear Quote</button>
      `)}
      <form id="quote-form" class="card">
        <div class="stepper">
          <span class="step-pill active">Account</span>
          <span class="step-pill">Risk</span>
          <span class="step-pill">Coverage</span>
          <span class="step-pill">Underwriting</span>
          <span class="step-pill">Rate / Bind</span>
        </div>

        <div class="form-section">
          <h3>1. Account Setup</h3>
          <div class="form-grid">
            <label class="span-4">Line of Business
              <select name="policy_type" id="quote-type" required>
                <option value="Auto">Personal Auto</option>
                <option value="Home">Homeowners</option>
              </select>
            </label>
            <label class="span-4">Requested Effective Date
              <input name="effective_date" type="date" required />
            </label>
            <label class="span-4">Producer / Agency
              <input name="agency" placeholder="Agency name" required />
            </label>
            <label class="span-4">Named Insured
              <input name="named_insured" placeholder="First Last or business/trust name" required />
            </label>
            <label class="span-4">Email
              <input name="email" type="email" placeholder="insured@email.com" />
            </label>
            <label class="span-4">Phone
              <input name="phone" placeholder="(555) 555-5555" />
            </label>
            <label class="span-8">Mailing Address
              <input name="mailing_address" placeholder="Street, City, State ZIP" required />
            </label>
            <label class="span-4">Prior Carrier
              <input name="prior_carrier" placeholder="Current/prior insurance carrier" />
            </label>
            <label class="span-4">Prior Expiration
              <input name="prior_expiration" type="date" />
            </label>
            <label class="span-4">Years Continuously Insured
              <select name="continuous_insurance">
                <option value="0">No prior / lapse</option>
                <option value="1">Less than 1 year</option>
                <option value="3">1-3 years</option>
                <option value="5">3+ years</option>
              </select>
            </label>
            <label class="span-4">Quote Source
              <select name="source">
                <option>Agency Request</option>
                <option>Phone Inquiry</option>
                <option>Email Request</option>
                <option>Renewal Remarketing</option>
              </select>
            </label>
          </div>
        </div>

        <div id="auto-risk" class="form-section">
          <h3>2A. Auto Risk Details</h3>
          <div class="form-grid">
            <label class="span-4">Garaging Address
              <input name="garaging_address" placeholder="Street, City, State ZIP" />
            </label>
            <label class="span-2">Vehicle Year
              <input name="vehicle_year" type="number" min="1980" max="2035" />
            </label>
            <label class="span-3">Vehicle Make
              <input name="vehicle_make" placeholder="Toyota" />
            </label>
            <label class="span-3">Vehicle Model
              <input name="vehicle_model" placeholder="Camry" />
            </label>
            <label class="span-4">VIN
              <input name="vin" maxlength="17" placeholder="17-character VIN" />
            </label>
            <label class="span-4">Vehicle Use
              <select name="vehicle_use">
                <option>Commute</option>
                <option>Pleasure</option>
                <option>Business</option>
                <option>Rideshare / Delivery</option>
              </select>
            </label>
            <label class="span-4">Annual Mileage
              <input name="annual_mileage" type="number" min="0" placeholder="12000" />
            </label>
            <label class="span-4">Driver Name
              <input name="driver_name" placeholder="Primary driver" />
            </label>
            <label class="span-2">DOB
              <input name="driver_dob" type="date" />
            </label>
            <label class="span-2">License State
              <input name="license_state" maxlength="2" placeholder="CA" />
            </label>
            <label class="span-2">Years Licensed
              <input name="years_licensed" type="number" min="0" />
            </label>
            <label class="span-2">Violations
              <input name="violations" type="number" min="0" value="0" />
            </label>
            <label class="span-2">At-Fault Claims
              <input name="auto_claims" type="number" min="0" value="0" />
            </label>
          </div>
        </div>

        <div id="home-risk" class="form-section hidden">
          <h3>2B. Home Risk Details</h3>
          <div class="form-grid">
            <label class="span-8">Property Location
              <input name="property_address" placeholder="Street, City, State ZIP" />
            </label>
            <label class="span-4">Occupancy
              <select name="occupancy">
                <option>Primary</option>
                <option>Secondary</option>
                <option>Tenant Occupied</option>
                <option>Vacant</option>
              </select>
            </label>
            <label class="span-3">Year Built
              <input name="year_built" type="number" min="1800" max="2035" />
            </label>
            <label class="span-3">Roof Year
              <input name="roof_year" type="number" min="1800" max="2035" />
            </label>
            <label class="span-3">Construction
              <select name="construction">
                <option>Frame</option>
                <option>Masonry</option>
                <option>Brick Veneer</option>
                <option>Manufactured</option>
              </select>
            </label>
            <label class="span-3">Protection Class
              <select name="protection_class">
                <option>1-3</option>
                <option>4-6</option>
                <option>7-8</option>
                <option>9-10</option>
              </select>
            </label>
            <label class="span-4">Dwelling Coverage A
              <input name="coverage_a" type="number" min="0" placeholder="450000" />
            </label>
            <label class="span-4">Home Claims Last 5 Years
              <input name="home_claims" type="number" min="0" value="0" />
            </label>
            <label class="span-4">Distance to Coast / Brush
              <select name="cat_exposure">
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </label>
          </div>
        </div>

        <div class="form-section">
          <h3>3. Coverage Selection</h3>
          <div class="form-grid">
            <label class="span-3 auto-only">BI Limit
              <select name="bi_limit"><option>State Minimum</option><option>50/100</option><option>100/300</option><option>250/500</option></select>
            </label>
            <label class="span-3 auto-only">PD Limit
              <select name="pd_limit"><option>25,000</option><option>50,000</option><option>100,000</option></select>
            </label>
            <label class="span-3 auto-only">Comprehensive Deductible
              <select name="comp_ded"><option>None</option><option>250</option><option>500</option><option>1000</option></select>
            </label>
            <label class="span-3 auto-only">Collision Deductible
              <select name="coll_ded"><option>None</option><option>250</option><option>500</option><option>1000</option></select>
            </label>
            <label class="span-3 home-only hidden">HO Form
              <select name="home_form"><option>HO3</option><option>HO5</option><option>HO6</option><option>DP3</option></select>
            </label>
            <label class="span-3 home-only hidden">Deductible
              <select name="home_ded"><option>1000</option><option>2500</option><option>5000</option></select>
            </label>
            <label class="span-3 home-only hidden">Water Backup
              <select name="water_backup"><option>No</option><option>5,000</option><option>10,000</option><option>25,000</option></select>
            </label>
            <label class="span-3 home-only hidden">Personal Property
              <select name="contents"><option>50%</option><option>70%</option><option>Replacement Cost</option></select>
            </label>
            <label class="span-4">Paperless Discount
              <select name="paperless"><option>Yes</option><option>No</option></select>
            </label>
            <label class="span-4">Autopay Discount
              <select name="autopay"><option>Yes</option><option>No</option></select>
            </label>
            <label class="span-4">Bundle Opportunity
              <select name="bundle"><option>No</option><option>Auto + Home</option><option>Umbrella</option></select>
            </label>
          </div>
        </div>

        <div class="form-section">
          <h3>4. Underwriting Questions</h3>
          <div class="form-grid">
            <label class="span-4">Any lapse in coverage?
              <select name="lapse"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4">Any prior carrier cancellation/non-renewal?
              <select name="prior_cancel"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4">Any open claims?
              <select name="open_claims"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4 auto-only">Any excluded drivers needed?
              <select name="excluded_driver"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4 auto-only">Rideshare, delivery, or commercial use?
              <select name="commercial_use"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4 home-only hidden">Any trampoline, pool, or animal exposure?
              <select name="liability_hazard"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-4 home-only hidden">Any unrepaired damage or vacancy?
              <select name="property_condition"><option>No</option><option>Yes</option></select>
            </label>
            <label class="span-12">Underwriter Notes / Remark
              <textarea name="uw_notes" placeholder="Document assumptions, missing items, coverage discussion, and reason for referral if applicable."></textarea>
            </label>
          </div>
        </div>

        <div class="view-actions">
          <button class="btn primary" type="submit">Rate Quote</button>
          <button class="btn success hidden" type="button" id="bind-quote-btn" data-action="bind-quote">Bind / Create Policy</button>
        </div>
      </form>
      <section id="quote-output" style="margin-top:1rem"></section>
    `;

    $("#quote-type").addEventListener("change", syncQuoteType);
    syncQuoteType();
  }

  function syncQuoteType() {
    const type = $("#quote-type")?.value || "Auto";
    $("#auto-risk")?.classList.toggle("hidden", type !== "Auto");
    $("#home-risk")?.classList.toggle("hidden", type !== "Home");
    $$(".auto-only").forEach((el) => el.classList.toggle("hidden", type !== "Auto"));
    $$(".home-only").forEach((el) => el.classList.toggle("hidden", type !== "Home"));
  }

  function rateQuote(data) {
    const type = data.policy_type;
    let premium = type === "Auto" ? 1180 : 980;
    let risk = 25;
    const flags = [];

    if (data.continuous_insurance === "0" || data.lapse === "Yes") { premium += 275; risk += 18; flags.push("Coverage lapse requires underwriting review."); }
    if (data.prior_cancel === "Yes") { premium += 350; risk += 22; flags.push("Prior cancellation/non-renewal disclosed."); }
    if (data.open_claims === "Yes") { premium += 450; risk += 25; flags.push("Open claims require referral."); }

    if (type === "Auto") {
      const vehicleAge = Number(new Date().getFullYear()) - Number(data.vehicle_year || new Date().getFullYear());
      const mileage = Number(data.annual_mileage || 0);
      const violations = Number(data.violations || 0);
      const claims = Number(data.auto_claims || 0);
      if (vehicleAge <= 3) premium += 250;
      if (mileage > 15000) { premium += 160; risk += 7; flags.push("High annual mileage."); }
      if (data.vehicle_use === "Business") { premium += 300; risk += 12; flags.push("Business use disclosed."); }
      if (data.vehicle_use === "Rideshare / Delivery" || data.commercial_use === "Yes") { premium += 600; risk += 40; flags.push("Rideshare/delivery use may be ineligible."); }
      if (data.bi_limit === "100/300") premium += 115;
      if (data.bi_limit === "250/500") premium += 220;
      if (data.comp_ded !== "None") premium += 145;
      if (data.coll_ded !== "None") premium += 265;
      premium += violations * 240 + claims * 350;
      risk += violations * 12 + claims * 16;
      if (data.excluded_driver === "Yes") { risk += 14; flags.push("Driver exclusion form required."); }
    } else {
      const coverageA = Number(data.coverage_a || 300000);
      const roofAge = Number(new Date().getFullYear()) - Number(data.roof_year || new Date().getFullYear());
      const homeClaims = Number(data.home_claims || 0);
      premium += Math.max(0, coverageA - 250000) * 0.0024;
      if (roofAge > 15) { premium += 420; risk += 18; flags.push("Roof age over 15 years requires photos or inspection."); }
      if (data.occupancy === "Tenant Occupied" || data.occupancy === "Vacant") { premium += 500; risk += 30; flags.push("Non-primary/vacant occupancy may require referral."); }
      if (data.cat_exposure === "High") { premium += 550; risk += 28; flags.push("High catastrophe exposure."); }
      if (data.protection_class === "9-10") { premium += 320; risk += 17; flags.push("Protection class 9-10."); }
      if (data.liability_hazard === "Yes") { premium += 180; risk += 14; flags.push("Liability hazard disclosed."); }
      if (data.property_condition === "Yes") { premium += 450; risk += 35; flags.push("Condition/vacancy issue requires referral."); }
      premium += homeClaims * 420;
      risk += homeClaims * 20;
    }

    if (data.paperless === "Yes") premium -= 35;
    if (data.autopay === "Yes") premium -= 45;
    if (data.bundle !== "No") premium -= 85;

    premium = Math.max(350, Math.round(premium));
    let status = "Preferred";
    if (risk >= 45) status = "Standard";
    if (risk >= 65) status = "Referral";
    if (risk >= 90) status = "Declined";

    return {
      quote_number: makeId("QTE"),
      policy_type: type,
      premium,
      monthly: Math.round((premium / 12) * 100) / 100,
      down_payment: Math.round(premium * 0.18),
      risk_score: Math.min(100, risk),
      status,
      flags,
      data
    };
  }

  async function renderIdCards() {
    $("#view").innerHTML = `
      ${viewHead("Auto Insurance ID Cards", "Pull up an active auto policy and generate a printable ID card.", "")}
      <section class="card">
        ${searchStrip("idcard-search", "Auto policy number or named insured")}
        <div id="idcard-search-results" class="results-list"></div>
      </section>
      <section id="idcard-panel" style="margin-top:1rem">${state.activePolicy ? idCardPanel(state.activePolicy) : ""}</section>
    `;
  }

  function idCardPanel(p) {
    if (!p || p.policy_type !== "Auto") {
      return `<div class="warning-box"><strong>Auto policy required.</strong> Search and open an active Auto policy to generate an ID card.</div>`;
    }
    const v = p.data?.vehicles?.[0] || {};
    const d = p.data?.drivers?.[0] || {};
    return `<section class="card">
      <h2>Insurance Identification Card Preview</h2>
      <div class="id-card-preview" id="id-card-print">
        <div class="id-card-head">
          <div><strong>CarrierOps Mutual Insurance</strong><br><small>TRAINING AUTO INSURANCE ID CARD</small></div>
          <div><strong>NAIC 19999</strong></div>
        </div>
        <div class="id-card-body">
          ${idField("Policy Number", p.policy_number)}
          ${idField("Named Insured", p.named_insured)}
          ${idField("Effective Date", formatDate(p.effective_date))}
          ${idField("Expiration Date", formatDate(p.expiration_date))}
          ${idField("Vehicle", `${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "Not entered")}
          ${idField("VIN", v.vin || "Not entered")}
          ${idField("Primary Driver", d.name || p.named_insured)}
          ${idField("Agency", p.agency || "Training Agency")}
        </div>
      </div>
      <div class="view-actions" style="margin-top:1rem">
        <button class="btn primary" data-action="download-id-card">Download ID Card HTML</button>
        <button class="btn subtle" onclick="window.print()">Print / Save as PDF</button>
      </div>
    </section>`;
  }

  function idField(label, value) {
    return `<div class="id-field"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
  }

  async function renderPayments() {
    $("#view").innerHTML = `
      ${viewHead("Payment Center", "Pull up a policy, post payment, and generate a receipt.", "")}
      <section class="card">
        ${searchStrip("payment-search", "Policy number or named insured")}
        <div id="payment-search-results" class="results-list"></div>
      </section>
      <section id="payment-panel" style="margin-top:1rem">${state.activePolicy ? paymentPanel(state.activePolicy) : ""}</section>
    `;
  }

  function paymentPanel(p) {
    return `<section class="card">
      <h2>Payment Processing — ${esc(p.policy_number)}</h2>
      <div class="grid four">
        <div class="metric"><div class="label">Named Insured</div><div class="value" style="font-size:1.1rem">${esc(p.named_insured)}</div></div>
        <div class="metric"><div class="label">Status</div><div class="value" style="font-size:1.1rem">${esc(p.status)}</div></div>
        <div class="metric"><div class="label">Premium</div><div class="value" style="font-size:1.3rem">${formatMoney(p.premium)}</div></div>
        <div class="metric"><div class="label">Current Balance</div><div class="value" style="font-size:1.3rem">${formatMoney(p.balance)}</div></div>
      </div>
      <form id="payment-form" class="form-section" style="margin-top:1rem">
        <h3>Post Payment</h3>
        <div class="form-grid">
          <label class="span-3">Payment Amount
            <input name="amount" type="number" min="1" step="0.01" required placeholder="0.00" />
          </label>
          <label class="span-3">Payment Method
            <select name="payment_method"><option>ACH</option><option>Credit Card</option><option>Debit Card</option><option>Agency Sweep</option><option>Check</option></select>
          </label>
          <label class="span-3">Payment Date
            <input name="payment_date" type="date" value="${today()}" required />
          </label>
          <label class="span-3">Payer Name
            <input name="payer_name" placeholder="Name on payment" required />
          </label>
          <label class="span-12">Payment Notes / Authorization Remark
            <textarea name="notes" placeholder="Document authorization, card/check details not stored, and confirmation provided."></textarea>
          </label>
        </div>
        <button class="btn primary" type="submit">Submit Payment</button>
      </form>
      <div id="payment-output">${state.lastReceipt ? receiptHtml(state.lastReceipt) : ""}</div>
    </section>`;
  }

  function receiptHtml(r) {
    return `<div class="success-box"><strong>Payment posted.</strong> Confirmation ${esc(r.confirmation_number)} for ${formatMoney(r.amount)}.</div>
      <button class="btn subtle" data-action="download-receipt">Download Receipt</button>`;
  }

  async function renderEndorsements() {
    $("#view").innerHTML = `
      ${viewHead("Endorsement Processing", "Pull up a policy, process changes, upload supporting documents, and generate endorsement packet.", "")}
      <section class="card">
        ${searchStrip("endorsement-search", "Policy number or named insured")}
        <div id="endorsement-search-results" class="results-list"></div>
      </section>
      <section id="endorsement-panel" style="margin-top:1rem">${state.activePolicy ? endorsementPanel(state.activePolicy) : ""}</section>
    `;
    await renderDocumentList();
  }

  function endorsementPanel(p) {
    return `<section class="card">
      <h2>Endorsement Workbench — ${esc(p.policy_number)}</h2>
      <div class="info-box"><strong>Carrier process:</strong> Verify insured, confirm effective date, capture exact change, upload required document if applicable, review premium impact, add remark, submit for processing.</div>
      <form id="endorsement-form" class="form-section">
        <h3>Endorsement Request</h3>
        <div class="form-grid">
          <label class="span-4">Endorsement Type
            <select name="endorsement_type" required>
              <option>Add Vehicle</option>
              <option>Remove Vehicle</option>
              <option>Add Driver</option>
              <option>Remove Driver</option>
              <option>Address Change</option>
              <option>Coverage Change</option>
              <option>Lienholder / Mortgagee Change</option>
              <option>Named Insured Correction</option>
              <option>Document Update Only</option>
            </select>
          </label>
          <label class="span-4">Requested Effective Date
            <input name="effective_date" type="date" value="${today()}" required />
          </label>
          <label class="span-4">Requested By
            <select name="requested_by"><option>Named Insured</option><option>Agent</option><option>Lienholder/Mortgagee</option><option>Carrier Underwriter</option></select>
          </label>
          <label class="span-6">Current Information
            <textarea name="current_info" placeholder="What is currently on the policy?"></textarea>
          </label>
          <label class="span-6">New Information / Change Requested
            <textarea name="new_info" placeholder="Enter exact endorsement change. Example: Add 2021 Toyota Camry VIN..."></textarea>
          </label>
          <label class="span-4">Estimated Premium Impact
            <select name="premium_impact"><option>No Change</option><option>Increase</option><option>Decrease</option><option>Referral Required</option></select>
          </label>
          <label class="span-4">Estimated Premium Delta
            <input name="premium_delta" type="number" step="0.01" placeholder="0.00" />
          </label>
          <label class="span-4">Processing Status
            <select name="status"><option>Pending Review</option><option>Submitted to Carrier</option><option>Completed</option><option>Referral Required</option></select>
          </label>
          <label class="span-12">Processor Remark
            <textarea name="remark" required placeholder="Document verification, requested change, documents uploaded, and next steps."></textarea>
          </label>
        </div>
        <div class="doc-drop">
          <strong>Upload endorsement documents</strong>
          <p>Examples: signed request, VIN proof, driver license, mortgagee clause, updated declarations.</p>
          <input name="documents" type="file" multiple />
        </div>
        <div class="view-actions" style="margin-top:1rem">
          <button class="btn primary" type="submit">Submit Endorsement</button>
          <button class="btn subtle" type="button" data-action="download-endorsement-guide">How to Process Endorsement</button>
        </div>
      </form>
      <div id="endorsement-output">${state.lastEndorsement ? endorsementHtml(state.lastEndorsement) : ""}</div>
      <div id="document-list"></div>
    </section>`;
  }

  function endorsementHtml(e) {
    return `<div class="success-box"><strong>Endorsement saved.</strong> ${esc(e.endorsement_type)} is ${esc(e.status)}.</div>
      <button class="btn subtle" data-action="download-endorsement-packet">Download Endorsement Packet</button>`;
  }

  async function renderCancellations() {
    $("#view").innerHTML = `
      ${viewHead("Policy Cancellation", "Pull up a policy, document cancellation reason, and generate cancellation workflow packet.", "")}
      <section class="card">
        ${searchStrip("cancel-search", "Policy number or named insured")}
        <div id="cancel-search-results" class="results-list"></div>
      </section>
      <section id="cancel-panel" style="margin-top:1rem">${state.activePolicy ? cancellationPanel(state.activePolicy) : ""}</section>
    `;
  }

  function cancellationPanel(p) {
    return `<section class="card">
      <h2>Cancellation Workbench — ${esc(p.policy_number)}</h2>
      <div class="warning-box"><strong>Training reminder:</strong> Always verify state rules, required notice period, mortgagee/lienholder notice, refund method, and whether cancellation can be backdated.</div>
      <form id="cancellation-form" class="form-section">
        <h3>Cancellation Request</h3>
        <div class="form-grid">
          <label class="span-4">Cancellation Type
            <select name="cancellation_type"><option>Insured Request</option><option>Non-Payment</option><option>Duplicate Coverage</option><option>Sold Vehicle / Property</option><option>Underwriting Reason</option><option>Flat Cancel</option></select>
          </label>
          <label class="span-4">Requested Effective Date
            <input name="effective_date" type="date" required />
          </label>
          <label class="span-4">Requested By
            <select name="requested_by"><option>Named Insured</option><option>Agent</option><option>Carrier</option><option>Mortgagee/Lienholder</option></select>
          </label>
          <label class="span-4">Proof Received?
            <select name="proof_received"><option>No</option><option>Yes</option><option>Not Required</option></select>
          </label>
          <label class="span-4">Refund Method
            <select name="refund_method"><option>Carrier Calculates</option><option>Return to Insured</option><option>Return Premium to Agency</option><option>No Refund</option></select>
          </label>
          <label class="span-4">Status
            <select name="status"><option>Pending Review</option><option>Submitted to Carrier</option><option>Completed</option></select>
          </label>
          <label class="span-12">Cancellation Reason / Remark
            <textarea name="reason" required placeholder="Document cancellation reason, verified party, effective date requested, proof received, and next steps."></textarea>
          </label>
        </div>
        <div class="view-actions">
          <button class="btn danger" type="submit">Submit Cancellation Request</button>
          <button class="btn subtle" type="button" data-action="download-cancel-guide">How to Cancel Policy</button>
        </div>
      </form>
      <div id="cancel-output">${state.lastCancellation ? cancellationHtml(state.lastCancellation) : ""}</div>
    </section>`;
  }

  function cancellationHtml(c) {
    return `<div class="success-box"><strong>Cancellation request saved.</strong> Status: ${esc(c.status)}.</div>
      <button class="btn subtle" data-action="download-cancel-packet">Download Cancellation Packet</button>`;
  }

  async function renderRemarketing() {
    $("#view").innerHTML = `
      ${viewHead("Quoting & Remarketing", "Pull up an expiring or high-premium account, review risk, and generate carrier comparison.", "")}
      <section class="card">
        ${searchStrip("remarket-search", "Policy number or named insured")}
        <div id="remarket-search-results" class="results-list"></div>
      </section>
      <section id="remarket-panel" style="margin-top:1rem">${state.activePolicy ? remarketingPanel(state.activePolicy) : ""}</section>
    `;
  }

  function remarketingPanel(p) {
    return `<section class="card">
      <h2>Remarketing Submission — ${esc(p.policy_number)}</h2>
      <form id="remarketing-form" class="form-section">
        <div class="form-grid">
          <label class="span-4">Reason for Remarketing
            <select name="reason"><option>Renewal Premium Increase</option><option>Client Requested Lower Premium</option><option>Carrier Non-Renewal</option><option>Coverage Improvement</option><option>New Market Appetite</option></select>
          </label>
          <label class="span-4">Renewal / Target Effective Date
            <input name="target_effective" type="date" value="${p.expiration_date || today()}" />
          </label>
          <label class="span-4">Target Premium
            <input name="target_premium" type="number" placeholder="${Math.round(Number(p.premium || 0) * 0.92)}" />
          </label>
          <label class="span-12">Marketing Notes
            <textarea name="notes" placeholder="Summarize risk, current carrier issues, missing information, and desired coverage."></textarea>
          </label>
        </div>
        <button class="btn primary" type="submit">Generate Remarketing Comparison</button>
      </form>
      <div id="remarket-output">${state.lastRemarketing ? remarketingHtml(state.lastRemarketing) : ""}</div>
    </section>`;
  }

  function remarketingHtml(r) {
    return `<div class="card soft">
      <h3>Carrier Comparison</h3>
      <div class="table-wrap"><table><thead><tr><th>Market</th><th>Indication</th><th>Status</th><th>Notes</th></tr></thead><tbody>
      ${r.markets.map((m) => `<tr><td>${esc(m.market)}</td><td>${formatMoney(m.indication)}</td><td><span class="status-pill ${m.status.toLowerCase()}">${esc(m.status)}</span></td><td>${esc(m.notes)}</td></tr>`).join("")}
      </tbody></table></div>
      <button class="btn subtle" data-action="download-remarket-summary" style="margin-top:1rem">Download Remarketing Summary</button>
    </div>`;
  }

  async function renderWorkQueue() {
    const [endorsements, cancellations, quotes, payments] = await Promise.all([
      store.list("endorsements", { orderBy: "created_at" }),
      store.list("cancellations", { orderBy: "created_at" }),
      store.list("quotes", { orderBy: "created_at" }),
      store.list("payments", { orderBy: "created_at" })
    ]);
    const queue = [
      ...endorsements.map((x) => ({ type: "Endorsement", title: x.endorsement_type, policy: x.policy_number, status: x.status, created_at: x.created_at })),
      ...cancellations.map((x) => ({ type: "Cancellation", title: x.cancellation_type, policy: x.policy_number, status: x.status, created_at: x.created_at })),
      ...quotes.filter((q) => q.status === "Referral").map((x) => ({ type: "Quote Referral", title: x.quote_number, policy: "", status: x.status, created_at: x.created_at })),
      ...payments.slice(0, 8).map((x) => ({ type: "Payment", title: x.confirmation_number, policy: x.policy_number, status: "Completed", created_at: x.created_at }))
    ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    $("#view").innerHTML = `
      ${viewHead("Work Queue", "Open service requests and trainee activities across the carrier portal.", `
        <button class="btn subtle" data-action="export-workqueue">Export Queue CSV</button>
      `)}
      <section class="card">
        ${queue.length ? queue.map((item) => `<div class="queue-item">
          <div><p class="eyebrow">${esc(item.type)}</p><h3>${esc(item.title || "Service Item")}</h3><p>${esc(item.policy || "No policy")} • ${formatDate(item.created_at)}</p></div>
          <span class="status-pill ${String(item.status || "open").toLowerCase().replace(/\s+/g, "-")}">${esc(item.status || "Open")}</span>
        </div>`).join("") : `<div class="empty-state">No work queue items yet.</div>`}
      </section>
    `;
  }

  async function renderTrainer() {
    if (state.user?.role !== "Trainer") {
      $("#view").innerHTML = `${viewHead("Trainer QA", "Trainer/TL access required.", "")}<div class="warning-box">Please log in as Trainer / Team Lead to access this section.</div>`;
      return;
    }
    const [logins, audit, policies, endorsements] = await Promise.all([
      store.list("logins", { orderBy: "created_at" }),
      store.list("audit", { orderBy: "created_at" }),
      store.list("policies", { orderBy: "created_at" }),
      store.list("endorsements", { orderBy: "created_at" })
    ]);
    $("#view").innerHTML = `
      ${viewHead("Trainer QA Dashboard", "Review VA activity, policy work, logs, and export training records.", `
        <button class="btn subtle" data-action="export-all-csv">Export Audit CSV</button>
        <button class="btn subtle" data-action="backup-json">Backup JSON</button>
        <label class="btn subtle">Import JSON <input id="backup-import" type="file" accept="application/json" class="hidden"></label>
      `)}
      <div class="grid four">
        <div class="metric"><div class="value">${logins.length}</div><div class="label">VA Logins</div></div>
        <div class="metric"><div class="value">${audit.length}</div><div class="label">Audit Events</div></div>
        <div class="metric"><div class="value">${policies.length}</div><div class="label">Policies Created</div></div>
        <div class="metric"><div class="value">${endorsements.length}</div><div class="label">Endorsements</div></div>
      </div>
      <div class="grid two" style="margin-top:1rem">
        <section class="card">
          <h2>Login History</h2>
          <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Date</th></tr></thead><tbody>
            ${logins.slice(0, 30).map((l) => `<tr><td>${esc(l.user_name)}</td><td>${esc(l.user_email)}</td><td>${esc(l.role)}</td><td>${formatDate(l.created_at)}</td></tr>`).join("") || `<tr><td colspan="4">No login records.</td></tr>`}
          </tbody></table></div>
        </section>
        <section class="card">
          <h2>Audit Trail</h2>
          ${activityList(audit.slice(0, 30))}
        </section>
      </div>
    `;
  }

  function demoPolicies() {
    return [
      {
        policy_number: "LVA-AUTO-1001",
        policy_type: "Auto",
        named_insured: "Jamie Rivera",
        email: "jamie.rivera@example.com",
        phone: "(555) 013-1001",
        address: "123 Training Ave, Columbus, OH 43004",
        status: "Active",
        carrier: "CarrierOps Mutual",
        agency: "LAVA Training Agency",
        effective_date: "2026-01-01",
        expiration_date: "2027-01-01",
        premium: 1487,
        balance: 742,
        risk_score: 39,
        data: {
          vehicles: [{ year: "2022", make: "Honda", model: "Civic EX", vin: "1HGBH41JXMN109186", use: "Commute" }],
          drivers: [{ name: "Jamie Rivera", dob: "1991-04-08", license_state: "OH" }],
          coverages: { bi: "100/300", pd: "100,000", comp: "500", collision: "500" }
        }
      },
      {
        policy_number: "LVA-HOME-2001",
        policy_type: "Home",
        named_insured: "Morgan Santos",
        email: "morgan.santos@example.com",
        phone: "(555) 013-2001",
        address: "742 Sample Ridge Dr, Tampa, FL 33602",
        status: "Active",
        carrier: "CarrierOps Mutual",
        agency: "LAVA Training Agency",
        effective_date: "2026-03-15",
        expiration_date: "2027-03-15",
        premium: 2215,
        balance: 1108,
        risk_score: 47,
        data: {
          property: { year_built: "2008", roof_year: "2019", construction: "Masonry", coverage_a: "465000", occupancy: "Primary" },
          coverages: { form: "HO3", deductible: "2500", water_backup: "10,000" }
        }
      }
    ];
  }

  async function loadDemoPolicies() {
    for (const policy of demoPolicies()) {
      const existing = await store.getPolicy(policy.policy_number);
      if (!existing) await store.save("policies", policy);
    }
    await store.audit("Demo policies loaded", { policy_number: "LVA-AUTO-1001 / LVA-HOME-2001" }, state.user || {});
    toast("Demo policies loaded. Try LVA-AUTO-1001 or Jamie Rivera.", "success");
    await render();
  }

  function buildPolicyFromQuote(q) {
    const d = q.data;
    const policyNumber = makeId(d.policy_type === "Auto" ? "AUTO" : "HOME");
    const p = {
      policy_number: policyNumber,
      policy_type: d.policy_type,
      named_insured: d.named_insured,
      email: d.email,
      phone: d.phone,
      address: d.policy_type === "Auto" ? (d.garaging_address || d.mailing_address) : (d.property_address || d.mailing_address),
      status: "Active",
      carrier: "CarrierOps Mutual",
      agency: d.agency,
      effective_date: d.effective_date,
      expiration_date: addYears(d.effective_date, 1),
      premium: q.premium,
      balance: q.premium,
      risk_score: q.risk_score,
      data: d.policy_type === "Auto" ? {
        vehicles: [{ year: d.vehicle_year, make: d.vehicle_make, model: d.vehicle_model, vin: d.vin, use: d.vehicle_use }],
        drivers: [{ name: d.driver_name || d.named_insured, dob: d.driver_dob, license_state: d.license_state }],
        coverages: { bi: d.bi_limit, pd: d.pd_limit, comp: d.comp_ded, collision: d.coll_ded },
        quote: d
      } : {
        property: { year_built: d.year_built, roof_year: d.roof_year, construction: d.construction, coverage_a: d.coverage_a, occupancy: d.occupancy },
        coverages: { form: d.home_form, deductible: d.home_ded, water_backup: d.water_backup, contents: d.contents },
        quote: d
      }
    };
    return p;
  }

  async function handlePolicySearch(inputId, resultsId) {
    const term = $(`#${inputId}`)?.value || "";
    const results = await store.findPolicy(term);
    const target = $(`#${resultsId}`);
    if (target) target.innerHTML = policyResultList(results);
    if (!results.length) toast("No policy found. You can create a new quote or load demo policies.", "info");
  }

  async function openPolicy(policyNumber) {
    const policy = await store.getPolicy(policyNumber);
    if (!policy) return toast("Policy was not found.", "error");
    state.activePolicy = policy;
    await store.audit("Policy opened", { policy_number: policy.policy_number }, state.user || {});
    if (state.route === "dashboard") {
      state.route = "search";
      history.replaceState(null, "", "#search");
      updateChrome();
    }
    await render();
  }

  async function handleQuoteSubmit(form) {
    const data = formData(form);
    const quote = rateQuote(data);
    state.quoteResult = quote;
    await store.save("quotes", {
      quote_number: quote.quote_number,
      quote_type: quote.policy_type,
      named_insured: data.named_insured,
      status: quote.status,
      premium: quote.premium,
      data: quote,
      created_by: state.user?.name || "",
      created_at: new Date().toISOString()
    });
    await store.audit("Quote rated", { quote_number: quote.quote_number, policy_type: quote.policy_type, status: quote.status, premium: quote.premium }, state.user || {});
    $("#quote-output").innerHTML = `
      <section class="card">
        <div class="view-head">
          <div><p class="eyebrow">Quote Result</p><h1>${esc(quote.quote_number)}</h1><p class="muted">${esc(quote.policy_type)} quote for ${esc(data.named_insured)}</p></div>
          <span class="status-pill ${quote.status.toLowerCase()}">${esc(quote.status)}</span>
        </div>
        <div class="grid four">
          <div class="metric"><div class="label">Annual Premium</div><div class="value">${formatMoney(quote.premium)}</div></div>
          <div class="metric"><div class="label">Monthly Estimate</div><div class="value">${formatMoney(quote.monthly)}</div></div>
          <div class="metric"><div class="label">Down Payment</div><div class="value">${formatMoney(quote.down_payment)}</div></div>
          <div class="metric"><div class="label">Risk Score</div><div class="value">${quote.risk_score}/100</div></div>
        </div>
        ${quote.flags.length ? `<div class="warning-box"><strong>Underwriting flags:</strong><ul>${quote.flags.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : `<div class="success-box">No major underwriting flags based on training rules.</div>`}
      </section>`;
    $("#bind-quote-btn").classList.toggle("hidden", quote.status === "Declined");
    toast("Quote rated successfully.", "success");
  }

  async function bindQuote() {
    if (!state.quoteResult) return toast("Rate a quote first.", "error");
    const policy = buildPolicyFromQuote(state.quoteResult);
    await store.save("policies", policy);
    await store.audit("Policy bound from quote", { policy_number: policy.policy_number, quote_number: state.quoteResult.quote_number }, state.user || {});
    state.activePolicy = policy;
    toast(`Policy created: ${policy.policy_number}`, "success");
    await navigate("search");
  }

  async function handlePaymentSubmit(form) {
    if (!state.activePolicy) return toast("Open a policy first.", "error");
    const data = formData(form);
    const amount = Number(data.amount || 0);
    const receipt = {
      policy_number: state.activePolicy.policy_number,
      amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      payer_name: data.payer_name,
      notes: data.notes,
      confirmation_number: makeId("PMT"),
      created_by: state.user?.name || "",
      created_at: new Date().toISOString()
    };
    state.lastReceipt = await store.save("payments", receipt);
    const updated = { ...state.activePolicy, balance: Math.max(0, Number(state.activePolicy.balance || 0) - amount), updated_at: new Date().toISOString() };
    await store.save("policies", updated);
    state.activePolicy = updated;
    await store.audit("Payment posted", { policy_number: updated.policy_number, amount, confirmation_number: receipt.confirmation_number }, state.user || {});
    toast("Payment posted and receipt generated.", "success");
    await renderPayments();
  }

  async function handleEndorsementSubmit(form) {
    if (!state.activePolicy) return toast("Open a policy first.", "error");
    const data = formData(form);
    const endorsement = await store.save("endorsements", {
      policy_number: state.activePolicy.policy_number,
      endorsement_type: data.endorsement_type,
      effective_date: data.effective_date,
      requested_by: data.requested_by,
      current_info: data.current_info,
      new_info: data.new_info,
      premium_impact: data.premium_impact,
      premium_delta: Number(data.premium_delta || 0),
      status: data.status,
      remark: data.remark,
      created_by: state.user?.name || "",
      created_at: new Date().toISOString()
    });
    const fileInput = form.querySelector("input[type=file]");
    if (fileInput?.files?.length) {
      for (const file of fileInput.files) {
        await store.uploadDocument(file, {
          policy_number: state.activePolicy.policy_number,
          document_type: data.endorsement_type,
          uploaded_by: state.user?.name || "",
          related_record_id: endorsement.id
        });
      }
    }
    state.lastEndorsement = endorsement;
    await store.audit("Endorsement submitted", { policy_number: state.activePolicy.policy_number, endorsement_type: data.endorsement_type, status: data.status }, state.user || {});
    toast("Endorsement saved. Documents uploaded if selected.", "success");
    await renderEndorsements();
    await renderDocumentList();
  }

  async function renderDocumentList() {
    const panel = $("#document-list");
    if (!panel || !state.activePolicy) return;
    const docs = await store.list("documents", { eq: { policy_number: state.activePolicy.policy_number }, orderBy: "created_at" });
    panel.innerHTML = `<h3>Uploaded Documents</h3>${docs.length ? `<div class="table-wrap"><table><thead><tr><th>Document</th><th>Type</th><th>Uploaded By</th><th>Action</th></tr></thead><tbody>
      ${docs.map((d) => `<tr><td>${esc(d.file_name)}</td><td>${esc(d.document_type)}</td><td>${esc(d.uploaded_by)}</td><td><button class="btn subtle" data-action="download-document" data-doc="${esc(d.id)}">Download</button></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty-state">No documents uploaded yet.</div>`}`;
  }

  async function handleCancellationSubmit(form) {
    if (!state.activePolicy) return toast("Open a policy first.", "error");
    const data = formData(form);
    const cancellation = await store.save("cancellations", {
      policy_number: state.activePolicy.policy_number,
      cancellation_type: data.cancellation_type,
      effective_date: data.effective_date,
      requested_by: data.requested_by,
      proof_received: data.proof_received,
      refund_method: data.refund_method,
      status: data.status,
      reason: data.reason,
      created_by: state.user?.name || "",
      created_at: new Date().toISOString()
    });
    state.lastCancellation = cancellation;
    const updated = { ...state.activePolicy, status: data.status === "Completed" ? "Cancelled" : "Pending Cancellation", updated_at: new Date().toISOString() };
    await store.save("policies", updated);
    state.activePolicy = updated;
    await store.audit("Cancellation submitted", { policy_number: updated.policy_number, cancellation_type: data.cancellation_type, status: data.status }, state.user || {});
    toast("Cancellation request saved.", "success");
    await renderCancellations();
  }

  async function handleRemarketingSubmit(form) {
    if (!state.activePolicy) return toast("Open a policy first.", "error");
    const data = formData(form);
    const base = Number(state.activePolicy.premium || 1000);
    const risk = Number(state.activePolicy.risk_score || 50);
    const markets = [
      { market: "CarrierOps Preferred", indication: Math.round(base * (risk > 60 ? 1.08 : 0.93)), status: risk > 70 ? "Referral" : "Approved", notes: risk > 70 ? "Needs underwriter review." : "Strong fit based on training appetite." },
      { market: "Summit Standard", indication: Math.round(base * 0.98), status: "Approved", notes: "Competitive standard market." },
      { market: "Harbor Select", indication: Math.round(base * (risk > 55 ? 1.12 : 0.9)), status: risk > 80 ? "Declined" : "Approved", notes: risk > 80 ? "Outside appetite." : "Potential savings opportunity." }
    ];
    const remarketing = await store.save("remarketing", {
      policy_number: state.activePolicy.policy_number,
      reason: data.reason,
      target_effective: data.target_effective,
      target_premium: Number(data.target_premium || 0),
      notes: data.notes,
      markets,
      created_by: state.user?.name || "",
      created_at: new Date().toISOString()
    });
    state.lastRemarketing = remarketing;
    await store.audit("Remarketing comparison generated", { policy_number: state.activePolicy.policy_number, reason: data.reason }, state.user || {});
    toast("Remarketing comparison generated.", "success");
    await renderRemarketing();
  }

  async function downloadCurrentDocument(docId) {
    const docs = await store.list("documents");
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return toast("Document not found.", "error");
    const url = await store.getDocumentDownloadUrl(doc);
    if (!url) return toast("No download URL available.", "error");
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name || "document";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadIdCard() {
    if (!state.activePolicy) return;
    const p = state.activePolicy;
    const v = p.data?.vehicles?.[0] || {};
    downloadHtml(`${p.policy_number}-auto-id-card.html`, "Auto ID Card", `
      <div class="brand"><h1>CarrierOps Mutual Insurance</h1><p>Training Auto Insurance ID Card • NAIC 19999</p></div>
      <div class="box"><h2>${esc(p.policy_number)}</h2><p><strong>Named Insured:</strong> ${esc(p.named_insured)}</p><p><strong>Effective:</strong> ${formatDate(p.effective_date)} to ${formatDate(p.expiration_date)}</p></div>
      <table><tr><th>Vehicle</th><td>${esc(`${v.year || ""} ${v.make || ""} ${v.model || ""}`)}</td></tr><tr><th>VIN</th><td>${esc(v.vin || "Not entered")}</td></tr><tr><th>Agency</th><td>${esc(p.agency || "Training Agency")}</td></tr></table>
      <small>This is a simulator document for training only.</small>
    `);
  }

  function downloadReceipt() {
    const r = state.lastReceipt;
    if (!r) return;
    downloadHtml(`${r.confirmation_number}-payment-receipt.html`, "Payment Receipt", `
      <div class="brand"><h1>Payment Receipt</h1><p>CarrierOps Training Portal</p></div>
      <div class="box"><h2>${esc(r.confirmation_number)}</h2><p><strong>Policy:</strong> ${esc(r.policy_number)}</p><p><strong>Amount:</strong> ${formatMoney(r.amount)}</p><p><strong>Method:</strong> ${esc(r.payment_method)}</p><p><strong>Date:</strong> ${formatDate(r.payment_date)}</p><p><strong>Payer:</strong> ${esc(r.payer_name)}</p></div>
      <p>${esc(r.notes || "")}</p>
    `);
  }

  function downloadEndorsementPacket() {
    const e = state.lastEndorsement;
    if (!e) return;
    downloadHtml(`${e.policy_number}-endorsement-packet.html`, "Endorsement Packet", `
      <div class="brand"><h1>Endorsement Processing Packet</h1><p>Training document</p></div>
      <div class="box"><h2>${esc(e.endorsement_type)}</h2><p><strong>Policy:</strong> ${esc(e.policy_number)}</p><p><strong>Effective:</strong> ${formatDate(e.effective_date)}</p><p><strong>Status:</strong> ${esc(e.status)}</p><p><strong>Premium Delta:</strong> ${formatMoney(e.premium_delta)}</p></div>
      <h3>Current Information</h3><p>${esc(e.current_info)}</p>
      <h3>New Information</h3><p>${esc(e.new_info)}</p>
      <h3>Processor Remark</h3><p>${esc(e.remark)}</p>
    `);
  }

  function downloadCancellationPacket() {
    const c = state.lastCancellation;
    if (!c) return;
    downloadHtml(`${c.policy_number}-cancellation-packet.html`, "Cancellation Packet", `
      <div class="brand"><h1>Cancellation Request Packet</h1><p>Training document</p></div>
      <div class="box"><h2>${esc(c.cancellation_type)}</h2><p><strong>Policy:</strong> ${esc(c.policy_number)}</p><p><strong>Effective:</strong> ${formatDate(c.effective_date)}</p><p><strong>Status:</strong> ${esc(c.status)}</p><p><strong>Requested By:</strong> ${esc(c.requested_by)}</p></div>
      <h3>Reason / Remark</h3><p>${esc(c.reason)}</p>
    `);
  }

  function downloadRemarketingSummary() {
    const r = state.lastRemarketing;
    if (!r) return;
    downloadHtml(`${r.policy_number}-remarketing-summary.html`, "Remarketing Summary", `
      <div class="brand"><h1>Remarketing Summary</h1><p>Training document</p></div>
      <div class="box"><p><strong>Policy:</strong> ${esc(r.policy_number)}</p><p><strong>Reason:</strong> ${esc(r.reason)}</p><p><strong>Target Effective:</strong> ${formatDate(r.target_effective)}</p></div>
      <table><thead><tr><th>Market</th><th>Indication</th><th>Status</th><th>Notes</th></tr></thead><tbody>${r.markets.map((m) => `<tr><td>${esc(m.market)}</td><td>${formatMoney(m.indication)}</td><td>${esc(m.status)}</td><td>${esc(m.notes)}</td></tr>`).join("")}</tbody></table>
    `);
  }

  function downloadGuide(type) {
    const isCancel = type === "cancel";
    const title = isCancel ? "How to Cancel a Policy" : "How to Process an Endorsement";
    const steps = isCancel ? [
      "Pull up the correct policy by policy number or named insured.",
      "Verify requester authority and confirm the effective cancellation date.",
      "Review state rules, lienholder/mortgagee notice requirements, and refund handling.",
      "Collect proof if required, such as replacement coverage or sold vehicle/property documentation.",
      "Enter the cancellation request, document detailed remarks, and generate the packet.",
      "Submit to carrier and monitor status until completed."
    ] : [
      "Pull up the correct policy and verify the named insured.",
      "Identify the endorsement type and required effective date.",
      "Capture current information and exact new information.",
      "Upload required supporting documents such as signed forms, VIN proof, license, mortgagee clause, or declarations.",
      "Estimate premium impact and document underwriting flags.",
      "Submit the endorsement and download the processing packet for training review."
    ];
    downloadHtml(`${title.toLowerCase().replace(/\s+/g, "-")}.html`, title, `<div class="brand"><h1>${esc(title)}</h1></div><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`);
  }

  async function exportWorkQueue() {
    const endorsements = await store.list("endorsements");
    const cancellations = await store.list("cancellations");
    const rows = [...endorsements.map((e) => ({ type: "Endorsement", ...e })), ...cancellations.map((c) => ({ type: "Cancellation", ...c }))];
    downloadText("carrierops-workqueue.csv", csv(rows), "text/csv");
  }

  async function exportAudit() {
    const audit = await store.list("audit");
    downloadText("carrierops-audit.csv", csv(audit), "text/csv");
  }

  async function backupJson() {
    if (store.isOnline()) {
      const collections = ["policies", "quotes", "endorsements", "payments", "cancellations", "documents", "remarketing", "audit", "logins"];
      const payload = {};
      for (const c of collections) payload[c] = await store.list(c);
      downloadText("carrierops-supabase-backup.json", JSON.stringify(payload, null, 2), "application/json");
    } else {
      downloadText("carrierops-local-backup.json", JSON.stringify(store.exportLocalBackup(), null, 2), "application/json");
    }
  }

  function setupEvents() {
    $("#login-role").addEventListener("change", () => {
      $("#trainer-code-wrap").classList.toggle("hidden", $("#login-role").value !== "Trainer");
    });

    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const role = $("#login-role").value;
      if (role === "Trainer" && $("#trainer-code").value !== (window.LAVA_TRAINER_CODE || "LAVA2026")) {
        toast("Invalid trainer code.", "error");
        return;
      }
      const user = {
        name: $("#login-name").value.trim(),
        email: $("#login-email").value.trim(),
        role,
        login_at: new Date().toISOString()
      };
      setUser(user);
      await store.logLogin(user);
      $("#login-screen").classList.add("hidden");
      $("#app-shell").classList.remove("hidden");
      updateChrome();
      await navigate(location.hash.replace("#", "") || "dashboard");
    });

    document.body.addEventListener("click", async (e) => {
      const routeBtn = e.target.closest("[data-route]");
      if (routeBtn) {
        await navigate(routeBtn.dataset.route);
        return;
      }
      const actionBtn = e.target.closest("[data-action]");
      if (!actionBtn) return;
      const action = actionBtn.dataset.action;
      if (action === "policy-search") return handlePolicySearch(actionBtn.dataset.input, actionBtn.dataset.results);
      if (action === "open-policy") return openPolicy(actionBtn.dataset.policy);
      if (action === "load-demo") return loadDemoPolicies();
      if (action === "bind-quote") return bindQuote();
      if (action === "reset-quote") { state.quoteResult = null; await renderQuote(); return; }
      if (action === "download-id-card") return downloadIdCard();
      if (action === "download-receipt") return downloadReceipt();
      if (action === "download-endorsement-packet") return downloadEndorsementPacket();
      if (action === "download-cancel-packet") return downloadCancellationPacket();
      if (action === "download-remarket-summary") return downloadRemarketingSummary();
      if (action === "download-endorsement-guide") return downloadGuide("endorsement");
      if (action === "download-cancel-guide") return downloadGuide("cancel");
      if (action === "download-document") return downloadCurrentDocument(actionBtn.dataset.doc);
      if (action === "export-workqueue") return exportWorkQueue();
      if (action === "export-all-csv") return exportAudit();
      if (action === "backup-json") return backupJson();
      if (action === "download-readme") return downloadText("carrierops-setup-notes.txt", "Run docs/supabase-setup.sql in Supabase, create storage bucket carrier-documents, and paste URL/anon key in js/config.js. For Netlify: build command blank, publish directory dot.");
    });

    document.body.addEventListener("submit", async (e) => {
      if (e.target.id === "quote-form") { e.preventDefault(); await handleQuoteSubmit(e.target); }
      if (e.target.id === "payment-form") { e.preventDefault(); await handlePaymentSubmit(e.target); }
      if (e.target.id === "endorsement-form") { e.preventDefault(); await handleEndorsementSubmit(e.target); }
      if (e.target.id === "cancellation-form") { e.preventDefault(); await handleCancellationSubmit(e.target); }
      if (e.target.id === "remarketing-form") { e.preventDefault(); await handleRemarketingSubmit(e.target); }
    });

    $("#quick-demo-btn").addEventListener("click", loadDemoPolicies);
    $("#logout-btn").addEventListener("click", () => {
      localStorage.removeItem("lava_carrierops_session");
      state.user = null;
      state.activePolicy = null;
      $("#app-shell").classList.add("hidden");
      $("#login-screen").classList.remove("hidden");
    });
    $("#theme-toggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("lava_theme", next);
    });

    document.body.addEventListener("change", async (e) => {
      if (e.target.id === "backup-import") {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        store.importLocalBackup(JSON.parse(text));
        toast("Backup imported into local mode.", "success");
        await render();
      }
    });
  }

  async function init() {
    document.documentElement.dataset.theme = localStorage.getItem("lava_theme") || "";
    setupEvents();
    state.user = getUser();
    if (state.user) {
      $("#login-screen").classList.add("hidden");
      $("#app-shell").classList.remove("hidden");
      updateChrome();
      await navigate(location.hash.replace("#", "") || "dashboard");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
