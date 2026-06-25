(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const store = new CarrierStore();

  const state = {
    user: null,
    route: "dashboard",
    quoteSession: null,
    quoteDraft: null,
    quoteResult: null,
    selectedPolicy: null,
    selectedScenario: null,
    selectedScenarioOrder: 0
  };

  function fmtDate(iso){
    if(!iso) return "";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function fmtDuration(sec){
    sec = Number(sec || 0);
    if(sec < 60) return `${sec}s`;
    const m = Math.floor(sec/60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  function money(n){
    const num = Number(n || 0);
    return num.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0});
  }

  function toast(message, type=""){
    const el = $("#toast");
    el.textContent = message;
    el.className = "toast";
    if(type) el.classList.add(type);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=> el.classList.add("hidden"), 3800);
  }

  function setBusy(btn, busy, text){
    if(!btn) return;
    if(busy){
      btn.dataset.oldText = btn.textContent;
      btn.textContent = text || "Processing...";
      btn.disabled = true;
    }else{
      btn.textContent = btn.dataset.oldText || btn.textContent;
      btn.disabled = false;
    }
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getUser(){
    try{
      return JSON.parse(sessionStorage.getItem("lava_current_user") || localStorage.getItem("lava_current_user") || "null");
    }catch{return null;}
  }

  function setUser(user){
    state.user = user;
    sessionStorage.setItem("lava_current_user", JSON.stringify(user));
    localStorage.setItem("lava_current_user", JSON.stringify(user));
  }

  function clearUser(){
    sessionStorage.removeItem("lava_current_user");
    localStorage.removeItem("lava_current_user");
    state.user = null;
  }

  function updateChrome(){
    const user = state.user;
    $("#user-pill").textContent = user ? `${user.role}: ${user.name}` : "";
    $$(".trainer-only").forEach(el => el.classList.toggle("hidden", !(user && user.role === "Trainer")));
    $$(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.route === state.route));
    const pill = $("#connection-pill");
    if(store.connected){
      pill.textContent = "Supabase Connected";
      pill.className = "pill good";
    }else if(store.isConfigured()){
      pill.textContent = "Local Fallback";
      pill.className = "pill warn";
    }else{
      pill.textContent = "Local Mode";
      pill.className = "pill neutral";
    }
  }

  async function init(){
    initTheme();

    $("#login-role").addEventListener("change", () => {
      $("#trainer-code-wrap").classList.toggle("hidden", $("#login-role").value !== "Trainer");
    });

    $("#login-form").addEventListener("submit", handleLogin);
    $("#logout-btn").addEventListener("click", () => {
      clearUser();
      $("#app-shell").classList.add("hidden");
      $("#login-screen").classList.remove("hidden");
      location.hash = "";
    });

    $$(".nav-link").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.route)));

    const status = await store.testConnection();
    $("#login-status").textContent = status ? "Supabase is connected." : "Supabase is not connected yet. The portal will still work in local fallback mode.";

    const existing = getUser();
    if(existing){
      state.user = existing;
      enterShell("dashboard");
    }else{
      updateChrome();
    }
  }

  async function handleLogin(e){
    e.preventDefault();
    const name = $("#login-name").value.trim();
    const email = $("#login-email").value.trim();
    const role = $("#login-role").value;
    const code = $("#trainer-code").value.trim();

    if(!name || !email) return toast("Please enter VA full name and work email.", "bad");
    if(role === "Trainer"){
      const validCodes = [String(window.LAVA_TRAINER_CODE || "LAVA2026"), "LAVA2026", "TRAINER2026"]
        .map(c => c.trim().toUpperCase());
      if(!validCodes.includes(code.toUpperCase())){
        return toast("Invalid Trainer/TL code.", "bad");
      }
    }

    const user = {
      id: CarrierUtils.uuid(),
      name,
      email,
      role,
      login_at: CarrierUtils.nowIso()
    };

    setUser(user);
    enterShell("dashboard");

    // Save login in the background. Do not block dashboard routing.
    Promise.all([
      store.insert("carrier_login_logs", {
        va_name: user.name,
        va_email: user.email,
        role: user.role,
        login_at: user.login_at,
        session_id: user.id,
        details: { user_agent: navigator.userAgent, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
      }),
      store.logAudit(user, "LOGIN", `${user.name} entered the CarrierOps portal.`, { role: user.role })
    ]).catch(err => console.warn("Login documentation failed but portal continued.", err));
  }

  function enterShell(route){
    $("#login-screen").classList.add("hidden");
    $("#app-shell").classList.remove("hidden");
    navigate(route || "dashboard");
  }

  async function navigate(route){
    state.route = route || "dashboard";
    location.hash = "#" + state.route;
    updateChrome();

    const renderers = {
      dashboard: renderDashboard,
      search: renderSearch,
      quote: renderQuoteChooser,
      scenarios: renderScenarios,
      gradebook: renderGradebook,
      idcards: renderIdCards,
      payments: renderPayments,
      endorsements: renderEndorsements,
      cancellations: renderCancellations,
      remarketing: renderRemarketing,
      workqueue: renderWorkQueue,
      documents: renderDocuments,
      qa: renderQA,
      audit: renderAudit
    };
    const fn = renderers[state.route] || renderDashboard;
    await fn();
    updateChrome();
  }

  function pageHead(title, subtitle, actions=""){
    return `
      <div class="page-head">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="actions">${actions}</div>
      </div>
    `;
  }

  async function renderDashboard(){
    $("#view").innerHTML = pageHead(
      "Carrier Operations Dashboard",
      "Formal training overview for VA activity, quote timing, policy workflow, documentation, and trainer review.",
      `<button class="btn secondary" id="refresh-dashboard">Refresh Dashboard</button>
       <button class="btn" id="export-json">Export JSON Backup</button>`
    ) + `
      <section class="dashboard-hero card">
        <div class="dashboard-hero-copy">
          <p class="eyebrow">LAVA CarrierOps Command Center</p>
          <h2>Real-time VA Training Activity Monitor</h2>
          <p>This dashboard documents every login, quote start, quote rating duration, issued policy, workflow action, document upload, and trainer QA review.</p>
        </div>
        <div class="dashboard-hero-status">
          <span class="pill good">Dashboard Active</span>
          <span class="pill neutral">Training Mode</span>
          <span class="pill warn">Use Dummy Data Only</span>
        </div>
      </section>

      <div id="dashboard-body" class="dashboard-layout"></div>
    `;

    $("#refresh-dashboard").addEventListener("click", renderDashboard);
    $("#export-json").addEventListener("click", exportBackup);

    const [logins, sessions, quotes, policies, payments, endorsements, cancels, docs, audits, reviews] = await Promise.all([
      store.list("carrier_login_logs", {limit:1000}),
      store.list("carrier_quote_sessions", {limit:1000}),
      store.list("carrier_quotes", {limit:1000}),
      store.list("carrier_policies", {limit:1000}),
      store.list("carrier_payments", {limit:1000}),
      store.list("carrier_endorsements", {limit:1000}),
      store.list("carrier_cancellations", {limit:1000}),
      store.list("carrier_documents", {limit:1000}),
      store.list("carrier_audit_logs", {limit:1000}),
      store.list("carrier_trainer_reviews", {limit:1000})
    ]);

    const rated = sessions.filter(s => s.rated_at || s.duration_seconds);
    const avgDuration = rated.length ? Math.round(rated.reduce((a,s)=>a+Number(s.duration_seconds||0),0)/rated.length) : 0;
    const uniqueVAs = new Set(logins.map(l => (l.va_email || l.email || "").toLowerCase()).filter(Boolean)).size;
    const openEndorsements = endorsements.filter(e => !["Completed","Declined"].includes(e.status)).length;
    const openCancels = cancels.filter(c => !["Completed","Declined"].includes(c.status)).length;
    const openTasks = openEndorsements + openCancels;
    const referralQuotes = quotes.filter(q => /Referral/i.test(q.status || "")).length;
    const declinedQuotes = quotes.filter(q => /Declined/i.test(q.status || "")).length;

    const byEmail = {};
    logins.forEach(l => {
      const key = (l.va_email || "").toLowerCase() || l.va_name;
      byEmail[key] ||= { name:l.va_name, email:l.va_email, role:l.role, logins:0, lastLogin:null, quotesStarted:0, quotesRated:0, totalSeconds:0, policiesIssued:0, workflows:0, lastQuote:"" };
      byEmail[key].logins++;
      if(!byEmail[key].lastLogin || String(l.login_at || l.created_at) > String(byEmail[key].lastLogin)) byEmail[key].lastLogin = l.login_at || l.created_at;
    });

    sessions.forEach(s => {
      const key = (s.va_email || "").toLowerCase() || s.va_name;
      byEmail[key] ||= { name:s.va_name, email:s.va_email, role:s.role, logins:0, lastLogin:null, quotesStarted:0, quotesRated:0, totalSeconds:0, policiesIssued:0, workflows:0, lastQuote:"" };
      byEmail[key].quotesStarted++;
      if(s.duration_seconds){
        byEmail[key].quotesRated++;
        byEmail[key].totalSeconds += Number(s.duration_seconds || 0);
      }
      byEmail[key].lastQuote = `${s.quote_type || ""} ${s.status || ""} ${s.quote_number || ""}`.trim();
    });

    policies.forEach(p => {
      const key = (p.va_email || "").toLowerCase() || p.va_name;
      byEmail[key] ||= { name:p.va_name, email:p.va_email, role:"VA", logins:0, lastLogin:null, quotesStarted:0, quotesRated:0, totalSeconds:0, policiesIssued:0, workflows:0, lastQuote:"" };
      byEmail[key].policiesIssued++;
    });

    [...payments, ...endorsements, ...cancels, ...docs].forEach(x => {
      const key = (x.va_email || "").toLowerCase() || x.va_name;
      if(!key) return;
      byEmail[key] ||= { name:x.va_name, email:x.va_email, role:"VA", logins:0, lastLogin:null, quotesStarted:0, quotesRated:0, totalSeconds:0, policiesIssued:0, workflows:0, lastQuote:"" };
      byEmail[key].workflows++;
    });

    const monitorRows = Object.values(byEmail).sort((a,b)=>String(b.lastLogin||"").localeCompare(String(a.lastLogin||"")));

    $("#dashboard-body").innerHTML = `
      <section class="dashboard-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Executive Overview</p>
            <h2>Training Production Summary</h2>
          </div>
          <span class="pill neutral">Updated ${escapeHtml(new Date().toLocaleString())}</span>
        </div>
        <div class="grid four">
          ${metric("Unique VAs Logged In", uniqueVAs, "Saved in carrier_login_logs")}
          ${metric("Quotes Started", sessions.length, "Every Start Quote click is documented")}
          ${metric("Quotes Rated", rated.length, `Average quote time: ${fmtDuration(avgDuration)}`)}
          ${metric("Issued Policies", policies.length, "Policies created from Bind / Issue")}
        </div>
        <div class="grid four">
          ${metric("Payments Posted", payments.length, "Payment activity documented")}
          ${metric("Open Work Items", openTasks, `${openEndorsements} endorsements / ${openCancels} cancellations`)}
          ${metric("Documents Uploaded", docs.length, "Saved in carrier_documents")}
          ${metric("Trainer QA Reviews", reviews.length, "Trainer scoring and comments")}
        </div>
      </section>

      <section class="dashboard-section card pad">
        <div class="section-title">
          <div>
            <p class="eyebrow">VA Performance Monitor</p>
            <h2>Login, Quote Completion, and Timing</h2>
            <p>Use this table to verify who logged in, when they entered the portal, how many quotes they started, and how long they took to rate quotes.</p>
          </div>
        </div>
        ${table(["VA Name","Email","Role","Logins","Last Login","Quotes Started","Quotes Rated","Average Quote Time","Issued Policies","Documented Workflows","Last Quote"],
          monitorRows.map(r => [
            r.name || "-",
            r.email || "-",
            r.role || "-",
            r.logins,
            fmtDate(r.lastLogin),
            r.quotesStarted,
            r.quotesRated,
            r.quotesRated ? fmtDuration(Math.round(r.totalSeconds / r.quotesRated)) : "-",
            r.policiesIssued || 0,
            r.workflows || 0,
            r.lastQuote || "-"
          ])
        )}
      </section>

      <section class="dashboard-section">
        <div class="grid three">
          <div class="card pad dashboard-panel">
            <div class="section-title compact">
              <div>
                <p class="eyebrow">Quote Status</p>
                <h2>Carrier Appetite Results</h2>
              </div>
            </div>
            ${table(["Result","Count"],
              [
                ["Rated Quotes", rated.length],
                ["Referral Quotes", referralQuotes],
                ["Declined Quotes", declinedQuotes],
                ["Issued Policies", policies.length]
              ]
            )}
          </div>

          <div class="card pad dashboard-panel">
            <div class="section-title compact">
              <div>
                <p class="eyebrow">Workflow Center</p>
                <h2>Operational Activity</h2>
              </div>
            </div>
            ${table(["Workflow","Count"],
              [
                ["Payments", payments.length],
                ["Endorsements", endorsements.length],
                ["Cancellations", cancels.length],
                ["Remarketing", (await store.list("carrier_remarketing", {limit:1000})).length],
                ["Documents", docs.length]
              ]
            )}
          </div>

          <div class="card pad dashboard-panel">
            <div class="section-title compact">
              <div>
                <p class="eyebrow">Quick Actions</p>
                <h2>Carrier Tasks</h2>
              </div>
            </div>
            <div class="quick-actions">
              <button class="btn primary full" data-dashboard-route="quote">Start New Quote</button>
                <button class="btn secondary full" data-dashboard-route="scenarios">Scenario Library</button>
                <button class="btn full" data-dashboard-route="gradebook">Gradebook</button>
              <button class="btn secondary full" data-dashboard-route="search">Search Policy</button>
              <button class="btn secondary full" data-dashboard-route="endorsements">Process Endorsement</button>
              <button class="btn secondary full" data-dashboard-route="payments">Post Payment</button>
              <button class="btn secondary full" data-dashboard-route="audit">View Audit Logs</button>
            </div>
          </div>
        </div>
      </section>

      <section class="dashboard-section grid two">
        <div class="card pad">
          <div class="section-title compact">
            <div>
              <p class="eyebrow">Recent Quote Sessions</p>
              <h2>Quote Timing Documentation</h2>
            </div>
          </div>
          ${table(["VA","Type","Quote #","Started","Rated","Duration","Status"],
            sessions.slice(0,12).map(s => [
              s.va_name || "-",
              (s.quote_type || "").toUpperCase(),
              s.quote_number || "-",
              fmtDate(s.started_at || s.created_at),
              fmtDate(s.rated_at),
              s.duration_seconds ? fmtDuration(s.duration_seconds) : "In Progress",
              badge(s.status || "Started")
            ])
          )}
        </div>

        <div class="card pad">
          <div class="section-title compact">
            <div>
              <p class="eyebrow">Documentation Trail</p>
              <h2>Recent System Activity</h2>
            </div>
          </div>
          ${table(["Time","VA","Action","Message"],
            audits.slice(0,12).map(a => [
              fmtDate(a.created_at),
              a.va_name || "-",
              a.action || "-",
              a.message || "-"
            ])
          )}
        </div>
      </section>
    `;

    bindDashboardClicks();

    $$("[data-dashboard-route]").forEach(btn => {
      btn.addEventListener("click", () => navigate(btn.dataset.dashboardRoute));
    });
  }

  function metric(label, value, sub){
    return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><small>${escapeHtml(sub || "")}</small></div>`;
  }

  function badge(text){
    const t = String(text || "");
    const cls = /decline|cancel|fail/i.test(t) ? "bad" : /refer|pending|progress|start/i.test(t) ? "warn" : /issue|complete|rated|bound|preferred|saved/i.test(t) ? "good" : "neutral";
    return `<span class="pill ${cls}">${escapeHtml(t)}</span>`;
  }

  function table(headers, rows){
    if(!rows || !rows.length){
      return `<div class="notice">No records yet. Once a VA logs in, starts a quote, rates, uploads, or processes a workflow, it will show here.</div>`;
    }
    return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${String(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function bindDashboardClicks(){
    $$("#dashboard-body .metric").forEach((el, i) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const routes = ["audit","quote","quote","search","payments","endorsements","documents","workqueue"];
        navigate(routes[i] || "dashboard");
      });
    });
  }

  async function exportBackup(){
    const data = await store.exportAll();
    downloadText(`carrierops-backup-${Date.now()}.json`, JSON.stringify(data, null, 2), "application/json");
    toast("JSON backup downloaded.");
  }

  async function renderSearch(){
    $("#view").innerHTML = pageHead("Policy Search", "Pull up a customer/policy by policy number, named insured, email, phone, or quote number.") + `
      <div class="card pad">
        <div class="form-row">
          <label>Search Policy / Insured / Email / Phone
            <input id="policy-search-term" placeholder="Example: LVA-AUTO-1001 or Juan Dela Cruz" />
          </label>
          <label>Status Filter
            <select id="policy-search-status">
              <option value="">All Statuses</option>
              <option>Issued</option>
              <option>Pending</option>
              <option>Cancelled</option>
            </select>
          </label>
          <label>&nbsp;
            <button class="btn primary full" id="policy-search-btn">Search / Pull Up Customer</button>
          </label>
        </div>
        <div id="search-results" style="margin-top:18px"></div>
      </div>
    `;
    $("#policy-search-btn").addEventListener("click", doPolicySearch);
    $("#policy-search-term").addEventListener("keydown", e => { if(e.key === "Enter") doPolicySearch(); });
    await doPolicySearch();
  }

  async function doPolicySearch(){
    const term = $("#policy-search-term")?.value || "";
    const status = $("#policy-search-status")?.value || "";
    let rows = await store.searchPolicies(term);
    if(status) rows = rows.filter(r => r.status === status);
    $("#search-results").innerHTML = table(["Policy #","Insured","LOB","Email","Phone","Premium","Status","Actions"],
      rows.map(p => [
        p.policy_number || "-",
        p.insured_name || "-",
        p.line_of_business || "-",
        p.email || "-",
        p.phone || "-",
        money(p.premium),
        badge(p.status || "Issued"),
        `<button class="btn small secondary" data-pull-policy="${p.id}">Open</button>
         <button class="btn small" data-idcard-policy="${p.policy_number || ""}">ID Card</button>`
      ])
    );
    $$("[data-pull-policy]").forEach(btn => btn.addEventListener("click", async () => {
      state.selectedPolicy = rows.find(r => r.id === btn.dataset.pullPolicy);
      toast(`Pulled up ${state.selectedPolicy?.policy_number || "policy"}.`);
      renderPolicyDetail(state.selectedPolicy);
    }));
    $$("[data-idcard-policy]").forEach(btn => btn.addEventListener("click", () => {
      navigate("idcards").then(()=> { $("#id-policy-number").value = btn.dataset.idcardPolicy; });
    }));
  }

  function renderPolicyDetail(p){
    if(!p) return;
    $("#search-results").insertAdjacentHTML("afterbegin", `
      <div class="result-card" style="margin-bottom:16px">
        <h2>Customer Policy File</h2>
        <div class="grid four">
          ${metric("Policy Number", p.policy_number || "-", "Customer file")}
          ${metric("Named Insured", p.insured_name || "-", p.email || "")}
          ${metric("Line", p.line_of_business || "-", p.phone || "")}
          ${metric("Premium", money(p.premium), p.status || "")}
        </div>
        <div class="actions" style="margin-top:14px">
          <button class="btn secondary" onclick="window.CarrierApp.navigate('payments')">Process Payment</button>
          <button class="btn secondary" onclick="window.CarrierApp.navigate('endorsements')">Start Endorsement</button>
          <button class="btn secondary" onclick="window.CarrierApp.navigate('cancellations')">Start Cancellation</button>
          <button class="btn secondary" onclick="window.CarrierApp.navigate('idcards')">Generate Auto ID Card</button>
        </div>
      </div>
    `);
  }


  function getScenarios(){
    return (window.LAVA_ORDERED_SCENARIOS || []).slice().sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function getScenario(id){
    return getScenarios().find(s => s.id === id) || null;
  }

  function renderScenarioSequence(){
    return `<div class="scenario-sequence">
      ${getScenarios().map(s => `<div class="sequence-step">
        <span class="sequence-number">${Number(s.order || 0)}</span>
        <strong>${escapeHtml(s.id)}</strong>
        <small>${escapeHtml(s.line.toUpperCase())} - ${escapeHtml(s.title)}</small>
      </div>`).join("")}
    </div>`;
  }

  function renderScenarioCard(s){
    const zillow = s.propertyReferenceUrl ? `<a class="btn small" href="${escapeHtml(s.propertyReferenceUrl)}" target="_blank" rel="noopener">Open Zillow Reference</a>` : "";
    return `<div class="card pad scenario-card">
      <div class="scenario-meta">
        <span class="pill neutral">Order ${Number(s.order || 0)}</span>
        <span class="pill ${s.line === "home" ? "warn" : "good"}">${escapeHtml(s.line.toUpperCase())}</span>
        <span class="pill neutral">${escapeHtml(s.difficulty || "Training")}</span>
      </div>
      <h3>${escapeHtml(s.id)} - ${escapeHtml(s.title)}</h3>
      <p class="help-text"><strong>Dummy customer:</strong> ${escapeHtml(s.customer?.name || "Training Customer")}<br><strong>Goal:</strong> ${escapeHtml(s.trainingGoal || "Complete the quote accurately.")}</p>
      <ul class="scenario-list">${(s.summary || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      <div class="actions">
        <button class="btn primary" data-start-scenario="${escapeHtml(s.id)}">Start This Scenario</button>
        <a class="btn secondary" href="${escapeHtml(s.pdf)}" download>Download Scenario PDF</a>
        ${zillow}
        ${state.user?.role === "Trainer" ? `<button class="btn" data-answer-key="${escapeHtml(s.id)}">Answer Key</button>` : ""}
      </div>
    </div>`;
  }

  function renderScenarioBanner(s){
    return `<section class="scenario-banner notice">
      <strong>${escapeHtml(s.id)} - ${escapeHtml(s.title)}</strong><br>
      Fixed order ${Number(s.order || 0)} of ${getScenarios().length}. Dummy customer: ${escapeHtml(s.customer?.name || "Training Customer")}.
      ${s.propertyReferenceUrl ? `<br><a href="${escapeHtml(s.propertyReferenceUrl)}" target="_blank" rel="noopener">Open Zillow reference</a> and manually verify the property facts before submitting.` : ""}
      <div class="actions" style="margin-top:10px"><a class="btn small secondary" href="${escapeHtml(s.pdf)}" download>Download Scenario PDF</a></div>
    </section>`;
  }

  async function renderScenarios(){
    state.selectedScenario = null;
    $("#view").innerHTML = pageHead("Ordered Scenario Library", "Use these New Business scenarios in the exact same order for every VA attempt.", `
      <a class="btn secondary" href="public/scenarios/All_New_Business_Home_Auto_Scenarios.pdf" download>Download All Scenarios PDF</a>
      <button class="btn" id="go-gradebook">Open Gradebook</button>
    `) + `
      ${renderScenarioSequence()}
      <div class="grid two">${getScenarios().map(s => renderScenarioCard(s)).join("")}</div>
      <div id="answer-key-panel" style="margin-top:18px"></div>
    `;
    $("#go-gradebook").addEventListener("click", () => navigate("gradebook"));
    $$('[data-start-scenario]').forEach(btn => btn.addEventListener('click', () => {
      const scenario = getScenario(btn.dataset.startScenario);
      startQuote(scenario.line, scenario.id);
    }));
    $$('[data-answer-key]').forEach(btn => btn.addEventListener('click', () => showAnswerKey(btn.dataset.answerKey)));
  }

  function showAnswerKey(id){
    const s = getScenario(id);
    if(!s) return;
    const entries = Object.entries(s.answerKey || {});
    $("#answer-key-panel").innerHTML = `<div class="card pad">
      <div class="page-head" style="margin-bottom:14px">
        <div><h2 style="margin:0">Trainer Answer Key - ${escapeHtml(s.id)}</h2><p>${escapeHtml(s.title)}</p></div>
        <span class="pill bad">Trainer Only</span>
      </div>
      <div class="answer-key-grid">${entries.map(([k,v]) => `<div class="answer-key-item"><small>${escapeHtml(k)}</small>${escapeHtml(v)}</div>`).join("")}</div>
    </div>`;
  }

  function normalizeAnswer(v){
    return String(v ?? "").toLowerCase().trim().replace(/[$,]/g, "").replace(/\s+/g, " ").replace(/[.]/g, "");
  }

  function answerMatches(actual, expected){
    const a = normalizeAnswer(actual);
    const e = normalizeAnswer(expected);
    if(!e) return true;
    if(a === e) return true;
    const an = Number(a.replace(/[^0-9.-]/g, ""));
    const en = Number(e.replace(/[^0-9.-]/g, ""));
    if(Number.isFinite(an) && Number.isFinite(en)) return Math.abs(an - en) < 0.01;
    return a.includes(e) || e.includes(a);
  }

  function gradeAgainstScenario(type, data, scenario){
    if(!scenario) return null;
    const key = scenario.answerKey || {};
    const critical = new Set(scenario.criticalFields || []);
    const compared = Object.entries(key).map(([field, expected]) => {
      const actual = data[field] || "";
      const ok = answerMatches(actual, expected);
      return { field, expected, actual, ok, critical: critical.has(field) };
    });
    const total = compared.length || 1;
    const correct = compared.filter(x => x.ok).length;
    const criticalMisses = compared.filter(x => !x.ok && x.critical);
    const missed = compared.filter(x => !x.ok && !x.critical);
    const baseScore = Math.round((correct / total) * 100);
    const penalty = Math.min(25, criticalMisses.length * 3);
    const score = Math.max(0, baseScore - penalty);
    const gradeLabel = score >= 90 ? "Excellent / Ready" : score >= 80 ? "Passing / Minor Coaching" : score >= 70 ? "Needs Review" : "Failed Attempt";
    const buckets = {
      Applicant: ["insured_first","insured_last","email","phone","dob","marital_status","occupation","gender","residence_type"],
      Property: ["property_address","property_city","property_state","property_zip","year_built","square_feet","stories","construction","foundation","roof_year","roof_material"],
      Zillow: ["zillow_verified_address","zillow_year_built","zillow_square_feet","zillow_bedrooms","zillow_bathrooms","zillow_home_type","zillow_lot_size","zillow_roof_material","zillow_stories"],
      Auto: ["vehicle_year","vehicle_make","vehicle_model","vin","ownership","lienholder_name","garaging_zip","additional_vehicles","accidents_5yrs","violations_5yrs","liability_limits","um_uim"],
      Coverage: ["coverage_a","coverage_b","coverage_c","deductible","wind_hail","liability","medical","replacement_cost","water_backup","service_line","equipment_breakdown","comp_deductible","collision_deductible","rental","loan_lease_gap"],
      Underwriting: ["claims_5yrs","water_claims_5yrs","weather_claims_5yrs","pool","trampoline","dogs","business","short_term_rental","lapse_days","sr22","business_delivery","major_violations_5yrs"],
      MortgageBilling: ["mortgagee","mortgagee_address","loan_number","billing_method","payment_plan","escrowed","closing_request","paperless","auto_pay","paid_in_full"]
    };
    const sectionScores = Object.entries(buckets).map(([name, fields]) => {
      const items = compared.filter(x => fields.includes(x.field));
      if(!items.length) return null;
      return { name, score: Math.round((items.filter(x => x.ok).length / items.length) * 100), total: items.length };
    }).filter(Boolean);
    const coaching = [];
    if(criticalMisses.length) coaching.push("Review critical fields before submission: address, occupancy, claims, lender/lienholder, effective date, roof, or coverage limits.");
    if(missed.some(x => /^zillow_/.test(x.field))) coaching.push("Improve Zillow/property verification accuracy. Manually compare year built, square footage, beds, baths, home type, lot size, and roof facts.");
    if(missed.some(x => ["claims_5yrs","water_claims_5yrs","weather_claims_5yrs","accidents_5yrs","violations_5yrs","lapse_days"].includes(x.field))) coaching.push("Improve loss history and underwriting red flag capture.");
    if(missed.some(x => ["coverage_a","liability_limits","um_uim","deductible","wind_hail"].includes(x.field))) coaching.push("Review coverage selection and customer instructions.");
    if(!coaching.length) coaching.push("Strong accuracy. Continue using final review before rating.");
    return { score, gradeLabel, compared, correct, total, criticalMisses, missed, sectionScores, coaching };
  }

  async function renderGradebook(){
    const quotes = await store.list("carrier_quotes", {limit:1000});
    const graded = quotes.filter(q => q.rating_details?.scenario_grade || q.details?.scenario_id || q.scenario_id);
    $("#view").innerHTML = pageHead("Scenario Gradebook", "Review graded Home and Auto New Business scenario attempts while keeping the original CarrierOps style.", `
      <button class="btn secondary" id="export-gradebook">Export Gradebook CSV</button>
      <button class="btn" id="refresh-gradebook">Refresh</button>
    `) + `
      <div class="card pad">
        ${table(["Time","VA","Scenario","Type","Score","Critical Misses","Duration","Status"], graded.map(q => {
          const g = q.rating_details?.scenario_grade || {};
          return [fmtDate(q.created_at), q.va_name || "-", q.details?.scenario_id || q.scenario_id || "-", (q.quote_type || "").toUpperCase(), g.score != null ? g.score + "%" : "-", g.criticalMisses ? g.criticalMisses.length : 0, q.duration_seconds ? fmtDuration(q.duration_seconds) : "-", badge(g.gradeLabel || q.status || "-")];
        }))}
      </div>
    `;
    $("#refresh-gradebook").addEventListener("click", renderGradebook);
    $("#export-gradebook").addEventListener("click", () => exportGradebookCsv(graded));
  }

  function exportGradebookCsv(rows){
    const headers = ["created_at","va_name","va_email","scenario_id","quote_type","score","critical_misses","duration_seconds","status"];
    const csv = [headers.join(",")].concat(rows.map(q => {
      const g = q.rating_details?.scenario_grade || {};
      const vals = [q.created_at, q.va_name, q.va_email, q.details?.scenario_id || q.scenario_id || "", q.quote_type, g.score ?? "", g.criticalMisses ? g.criticalMisses.length : "", q.duration_seconds || "", g.gradeLabel || q.status || ""];
      return vals.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",");
    })).join("\n");
    downloadText("lava-scenario-gradebook.csv", csv, "text/csv");
  }

  async function renderQuoteChooser(){
    state.quoteSession = null;
    state.quoteDraft = null;
    state.quoteResult = null;
    state.selectedScenario = null;
    $("#view").innerHTML = pageHead("Start New Quote", "Choose an ordered New Business scenario or start a free-practice carrier quote. Scenario order is fixed for every VA.", `
      <a class="btn secondary" href="public/scenarios/All_New_Business_Home_Auto_Scenarios.pdf" download>Download All Scenarios PDF</a>
    `) + `
      ${renderScenarioSequence()}
      <div class="grid two">
        ${getScenarios().map(s => renderScenarioCard(s)).join("")}
      </div>
      <div class="notice" style="margin-top:18px"><strong>Training rule:</strong> All VAs should run the scenarios in this order: HOME-01, HOME-02, AUTO-01, AUTO-02. This keeps grading consistent across the team.</div>
      <div class="quote-chooser grid two" style="margin-top:18px">
        <button class="option" id="start-auto">
          <h3>Free Practice Auto Quote</h3>
          <p>Start the original carrier-style personal auto quote without scenario grading.</p>
          <span class="btn primary">Start Auto Quote</span>
        </button>
        <button class="option" id="start-home">
          <h3>Free Practice Home Quote</h3>
          <p>Start the original carrier-style homeowners quote without scenario grading.</p>
          <span class="btn primary">Start Home Quote</span>
        </button>
      </div>
    `;
    $("#start-auto").addEventListener("click", () => startQuote("auto"));
    $("#start-home").addEventListener("click", () => startQuote("home"));
    $$('[data-start-scenario]').forEach(btn => btn.addEventListener('click', () => {
      const scenario = getScenario(btn.dataset.startScenario);
      startQuote(scenario.line, scenario.id);
    }));
    $$('[data-answer-key]').forEach(btn => btn.addEventListener('click', () => {
      navigate("scenarios").then(() => showAnswerKey(btn.dataset.answerKey));
    }));
  }

  async function startQuote(type, scenarioId){
    const scenario = scenarioId ? getScenario(scenarioId) : null;
    state.selectedScenario = scenario;
    state.selectedScenarioOrder = scenario ? scenario.order : 0;
    const started = CarrierUtils.nowIso();
    const session = {
      id: CarrierUtils.uuid(),
      va_name: state.user.name,
      va_email: state.user.email,
      role: state.user.role,
      quote_type: type,
      scenario_id: scenario ? scenario.id : "",
      scenario_title: scenario ? scenario.title : "",
      scenario_order: scenario ? scenario.order : 0,
      started_at: started,
      status: "Started",
      details: { route: "quote", source: scenario ? "Ordered Scenario" : "Start Quote Button", scenario }
    };
    state.quoteSession = await store.insert("carrier_quote_sessions", session);
    store.logAudit(state.user, "QUOTE_STARTED", `${state.user.name} started a ${type.toUpperCase()} quote${scenario ? " for " + scenario.id : ""}.`, { quote_session_id: state.quoteSession.id, quote_type: type, scenario_id: scenario ? scenario.id : "" }).catch(console.warn);
    renderQuoteForm(type);
  }

  function renderQuoteForm(type){
    const schema = window.QUOTE_SCHEMAS[type];
    const scenario = state.selectedScenario;
    $("#view").innerHTML = pageHead(scenario ? `${scenario.id}: ${schema.title}` : schema.title, scenario ? `Ordered scenario ${scenario.order} of ${getScenarios().length}: ${scenario.title}` : "Complete the carrier-style questions. Required fields are validated before rating.", `
      <span class="pill warn" id="quote-timer">Timer: 0s</span>
      <button class="btn ghost" id="cancel-quote">Cancel Quote</button>
    `) + `
      <div class="card pad">
        ${scenario ? renderScenarioBanner(scenario) : ""}
        <div class="progress-bar"><span id="quote-progress"></span></div>
        <form id="quote-form" style="margin-top:18px">
          ${schema.sections.map(section => `
            <section class="form-section">
              <h3>${escapeHtml(section.title)}</h3>
              <div class="form-row ${section.fields.length % 4 === 0 ? "four" : ""}">
                ${section.fields.map(field => renderField(field)).join("")}
              </div>
            </section>
          `).join("")}
          <div class="actions">
            <button class="btn primary" type="button" id="review-submit-btn">Review &amp; Submit</button>
            <button class="btn" type="button" id="save-draft-btn">Save Draft</button>
            <button class="btn ghost" type="button" id="reset-form-btn">Clear Form</button>
          </div>
        </form>
        <div id="quote-review" style="margin-top:18px"></div>
        <div id="quote-result" style="margin-top:18px"></div>
      </div>
    `;

    $("#cancel-quote").addEventListener("click", () => navigate("quote"));
    $("#review-submit-btn").addEventListener("click", openFinalReview);
    $("#save-draft-btn").addEventListener("click", saveDraft);
    $("#reset-form-btn").addEventListener("click", () => $("#quote-form").reset());

    $("#quote-form").addEventListener("input", updateQuoteProgress);
    updateQuoteProgress();
    startTimer();
  }

  function renderField(field){
    const required = field.required ? "required" : "";
    if(field.type === "select"){
      return `<label>${escapeHtml(field.label)} ${field.required ? "<span style='color:#b42318'>*</span>" : ""}
        <select name="${escapeHtml(field.name)}" ${required}>
          <option value="">Select...</option>
          ${(field.options || []).map(o=>`<option>${escapeHtml(o)}</option>`).join("")}
        </select>
      </label>`;
    }
    if(field.type === "textarea"){
      return `<label>${escapeHtml(field.label)} ${field.required ? "<span style='color:#b42318'>*</span>" : ""}
        <textarea name="${escapeHtml(field.name)}" ${required} placeholder="${escapeHtml(field.placeholder || "")}"></textarea>
      </label>`;
    }
    return `<label>${escapeHtml(field.label)} ${field.required ? "<span style='color:#b42318'>*</span>" : ""}
      <input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || "text")}" ${required} placeholder="${escapeHtml(field.placeholder || "")}" />
    </label>`;
  }

  function startTimer(){
    clearInterval(window.__quoteTimer);
    window.__quoteTimer = setInterval(() => {
      if(!state.quoteSession || !$("#quote-timer")) return clearInterval(window.__quoteTimer);
      const secs = Math.max(0, Math.floor((Date.now() - new Date(state.quoteSession.started_at).getTime())/1000));
      $("#quote-timer").textContent = "Timer: " + fmtDuration(secs);
    }, 1000);
  }

  function formData(form){
    const fd = new FormData(form);
    const data = {};
    fd.forEach((v,k)=> data[k] = String(v).trim());
    return data;
  }

  function updateQuoteProgress(){
    const fields = $$("[required]", $("#quote-form"));
    const complete = fields.filter(f => String(f.value || "").trim()).length;
    const pct = fields.length ? Math.round((complete / fields.length) * 100) : 0;
    $("#quote-progress").style.width = pct + "%";
  }

  function validateRequired(form){
    $$(".required-missing", form).forEach(el => el.classList.remove("required-missing"));
    const missing = $$("[required]", form).filter(f => !String(f.value || "").trim());
    if(missing.length){
      missing[0].classList.add("required-missing");
      missing[0].scrollIntoView({behavior:"smooth", block:"center"});
      missing[0].focus();
      toast(`Please complete required field: ${missing[0].closest("label")?.innerText?.replace("*","").trim() || missing[0].name}`, "bad");
      return false;
    }
    return true;
  }

  async function saveDraft(){
    const data = formData($("#quote-form"));
    const quoteType = state.quoteSession?.quote_type || "unknown";
    await store.insert("carrier_quotes", {
      va_name: state.user.name,
      va_email: state.user.email,
      quote_session_id: state.quoteSession?.id,
      quote_type: quoteType,
      quote_number: "",
      insured_name: [data.insured_first, data.insured_last].filter(Boolean).join(" "),
      email: data.email || "",
      phone: data.phone || "",
      status: "Draft",
      premium: 0,
      duration_seconds: 0,
      details: data
    });
    await store.logAudit(state.user, "QUOTE_DRAFT_SAVED", `${state.user.name} saved a ${quoteType.toUpperCase()} quote draft.`, data);
    toast("Quote draft saved and documented.");
  }

  function calculateQuote(type, data){
    let base = type === "auto" ? 900 : 1250;
    const flags = [];
    let score = 92;

    if(type === "auto"){
      base += Number(data.annual_miles || 0) > 15000 ? 250 : 0;
      base += Number(data.annual_miles || 0) > 25000 ? 450 : 0;
      base += Number(data.accidents_5yrs || 0) * 350;
      base += Number(data.not_at_fault_5yrs || 0) * 75;
      base += Number(data.violations_5yrs || 0) * 175;
      base += Number(data.major_violations_5yrs || 0) * 650;
      base += Number(data.comp_claims_5yrs || 0) * 125;
      base += Number(data.lapse_days || 0) > 0 ? 220 : 0;
      base += Number(data.lapse_days || 0) > 30 ? 550 : 0;
      base += data.vehicle_use === "Business" ? 200 : 0;
      base += data.vehicle_use === "Artisan Use" ? 350 : 0;
      base += data.multi_policy === "Yes" ? -120 : 0;
      base += data.multi_car === "Yes" ? -85 : 0;
      base += data.telematics === "Yes - Enroll" ? -95 : 0;
      base += data.paid_in_full === "Yes" ? -70 : 0;

      if(data.vehicle_use === "Rideshare/Delivery" || data.business_delivery === "Yes"){ flags.push("Rideshare/delivery/livery exposure requires referral."); score -= 18; }
      if(data.sr22 === "Yes"){ flags.push("SR-22/FR-44 filing requires underwriting review."); score -= 15; }
      if(data.salvage === "Yes"){ flags.push("Salvage, rebuilt, gray market, or custom vehicle is outside normal appetite."); score -= 20; }
      if(data.license_status !== "Valid"){ flags.push("Driver license is not valid."); score -= 30; }
      if(Number(data.accidents_5yrs || 0) >= 2){ flags.push("Multiple at-fault accidents."); score -= 16; }
      if(Number(data.major_violations_5yrs || 0) >= 1){ flags.push("Major violation present: DUI, reckless, racing, or similar."); score -= 25; }
      if(data.unacceptable_driver === "Yes"){ flags.push("Unacceptable driver present."); score -= 30; }
      if(data.fraud_or_misrep === "Yes"){ flags.push("Prior fraud, material misrepresentation, or policy rescission."); score -= 35; }
      if(data.any_modified_vehicle === "Yes"){ flags.push("Modified/classic/exotic/high-performance vehicle requires review."); score -= 12; }
      if(data.documents_ready === "No"){ flags.push("Required documents are not ready."); score -= 8; }
      if(data.unlisted_household === "Yes"){ flags.push("Unlisted household members age 14+ must be reviewed."); score -= 10; }
    }else{
      base += Number(data.coverage_a || 0) * 0.0022;
      base += Number(data.replacement_cost_estimate || 0) * 0.0014;
      base += Math.max(0, (new Date().getFullYear() - Number(data.roof_year || new Date().getFullYear())) * 18);
      base += Number(data.claims_5yrs || 0) * 275;
      base += Number(data.water_claims_5yrs || 0) * 325;
      base += Number(data.liability_claims_5yrs || 0) * 400;
      base += Number(data.weather_claims_5yrs || 0) * 175;
      base += data.burglar_alarm === "Central Station" ? -65 : 0;
      base += data.fire_alarm === "Central Station" ? -75 : 0;
      base += data.sprinkler === "Full" ? -110 : 0;
      base += data.water_backup && data.water_backup !== "No" ? 55 : 0;
      base += data.service_line === "Yes" ? 45 : 0;
      base += data.equipment_breakdown === "Yes" ? 35 : 0;

      if(data.occupancy === "Vacant"){ flags.push("Vacant home requires referral/possible decline."); score -= 30; }
      if(data.occupancy === "Builder's Risk / Renovation" || data.renovation_over_30 === "Yes"){ flags.push("Renovation or builder risk exposure requires special underwriting."); score -= 18; }
      if(data.short_term_rental === "Yes"){ flags.push("Short-term rental exposure requires special program."); score -= 18; }
      if(data.dogs === "Yes - bite history" || data.dogs === "Restricted breed / unknown"){ flags.push("Animal bite or restricted breed exposure requires underwriting review."); score -= 18; }
      if(data.pool === "Yes - unfenced" || data.pool === "Yes - diving board/slide"){ flags.push("Pool hazard outside standard appetite."); score -= 22; }
      if(data.brushfire === "Yes"){ flags.push("Brushfire/wildfire exposure requires review."); score -= 15; }
      if(Number(data.claims_5yrs || 0) >= 3){ flags.push("High property claim frequency."); score -= 20; }
      if(Number(data.water_claims_5yrs || 0) >= 2){ flags.push("Multiple water losses require review."); score -= 18; }
      if(data.electrical_type === "Knob and Tube" || data.electrical_type === "Fuses" || data.electrical_type === "Aluminum Wiring"){ flags.push("Electrical system may be outside carrier appetite."); score -= 20; }
      if(data.plumbing_type === "Polybutylene"){ flags.push("Polybutylene plumbing requires underwriting review."); score -= 18; }
      if(data.solid_fuel === "Yes"){ flags.push("Wood stove / solid fuel heat requires photos or inspection."); score -= 12; }
      if(data.flood_zone === "A" || data.flood_zone === "AE" || data.flood_zone === "V" || data.flood_zone === "VE"){ flags.push("High-risk flood zone; confirm flood coverage."); score -= 12; }
      if(data.unrepaired_damage === "Yes" || data.open_foundation_hazards === "Yes"){ flags.push("Existing damage or liability hazard present."); score -= 28; }
      if(data.prior_fraud === "Yes"){ flags.push("Prior fraud/misrepresentation/rescission issue."); score -= 35; }
      if(data.inspection_consent === "No"){ flags.push("Customer does not agree to inspection."); score -= 18; }
    }

    let status = "Preferred";
    if(score < 78) status = "Referral";
    if(score < 58) status = "Declined";
    if(flags.length === 0 && score < 88) status = "Standard";
    const premium = Math.max(300, Math.round(base));
    const down = Math.round(premium * 0.18);
    const monthly = Math.round((premium - down) / 10);

    return { premium, down, monthly, flags, score: Math.max(0, score), status };
  }

  function getQuoteFieldDefs(type){
    const schema = window.QUOTE_SCHEMAS[type];
    const defs = {};
    (schema?.sections || []).forEach(sec => (sec.fields || []).forEach(f => { defs[f.name] = { label: f.label, section: sec.title, required: !!f.required }; }));
    return defs;
  }

  // Requirement #9 - obvious inconsistency detection for the review page.
  function findInconsistencies(type, data){
    const issues = [];
    const num = v => Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    const isYes = v => /^yes/i.test(String(v || "").trim());

    if(data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) issues.push("Email address does not look valid.");
    if(data.effective_date && data.expiration_date && data.effective_date > data.expiration_date) issues.push("Effective date is after the expiration date.");

    if(type === "home"){
      const yb = num(data.year_built);
      if(yb && (yb < 1850 || yb > new Date().getFullYear())) issues.push("Year built is outside a realistic range.");
      const ry = num(data.roof_year);
      if(ry && yb && ry < yb) issues.push("Roof year is older than the year the home was built.");
      if(data.zillow_year_built && data.year_built && num(data.zillow_year_built) !== yb) issues.push("Entered year built does not match the Zillow-verified year built.");
      if(data.zillow_square_feet && data.square_feet && num(data.zillow_square_feet) !== num(data.square_feet)) issues.push("Entered square footage does not match the Zillow-verified square footage.");
      if(isYes(data.prior_claims) && !String(data.claims_5yrs || "").trim()) issues.push("Prior claims marked Yes but claim count / details are blank.");
      if(data.mortgagee && !data.loan_number) issues.push("Mortgagee entered but loan number is blank.");
    }else{
      if(data.garaging_same === "No" && !String(data.garaging_address || "").trim()) issues.push("Garaging is marked different from mailing, but no garaging address was entered.");
      const li = num(data.prior_limits);
      if(data.currently_insured === "No" && data.prior_carrier) issues.push("Not currently insured but a prior carrier is listed - confirm prior coverage.");
      if(isYes(data.prior_claims) && !num(data.accidents_5yrs) && !num(data.comp_claims_5yrs)) issues.push("Prior claims marked Yes but no accidents/claims counts were entered.");
      if(data.ownership && data.ownership !== "Owned" && !String(data.lienholder_name || data.lienholder || "").trim()) issues.push("Vehicle is financed/leased but no lienholder/loss payee was entered.");
    }
    return issues;
  }

  // Requirement #9 - Final Review Before Submit.
  function openFinalReview(){
    const form = $("#quote-form");
    if(!form) return;
    const type = state.quoteSession.quote_type;
    const defs = getQuoteFieldDefs(type);
    const data = formData(form);

    const missingRequired = $$("[required]", form)
      .filter(f => !String(f.value || "").trim())
      .map(f => defs[f.name]?.label || f.name);

    const inconsistencies = findInconsistencies(type, data);

    // Group entered answers by section for the review page.
    const sections = (window.QUOTE_SCHEMAS[type].sections || []).map(sec => {
      const rows = (sec.fields || []).map(f => {
        const val = data[f.name];
        const blank = !String(val || "").trim();
        const flagMissing = f.required && blank;
        return `<tr class="${flagMissing ? "review-missing" : ""}">
          <td>${escapeHtml(f.label)}${f.required ? " <span style='color:#b42318'>*</span>" : ""}</td>
          <td>${blank ? `<em class="${flagMissing ? "review-missing-text" : "help-text"}">${flagMissing ? "MISSING" : "blank"}</em>` : escapeHtml(val)}</td>
        </tr>`;
      }).join("");
      return `<details class="review-section" ${ (sec.fields||[]).some(f => f.required && !String(data[f.name]||"").trim()) ? "open" : "" }>
        <summary><strong>${escapeHtml(sec.title)}</strong></summary>
        <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th style="width:42%">Field</th><th>Entered Answer</th></tr></thead><tbody>${rows}</tbody></table></div>
      </details>`;
    }).join("");

    $("#quote-review").innerHTML = `
      <div class="card pad" id="review-card">
        <div class="page-head" style="margin-bottom:12px">
          <div><h2 style="margin:0">Final Review Before Submit</h2><p>Confirm every answer below. You can go back to edit before the attempt is graded and saved.</p></div>
          <span class="pill ${missingRequired.length ? "bad" : "good"}">${missingRequired.length ? missingRequired.length + " required field(s) missing" : "All required fields complete"}</span>
        </div>

        ${missingRequired.length ? `<div class="notice bad"><strong>Missing required fields:</strong><br>${missingRequired.map(escapeHtml).join("<br>")}</div>` : ``}
        ${inconsistencies.length ? `<div class="notice warn" style="margin-top:12px"><strong>Possible inconsistencies to double-check:</strong><br>${inconsistencies.map(escapeHtml).join("<br>")}</div>` : `<div class="notice good" style="margin-top:12px">No obvious inconsistencies detected.</div>`}

        <div style="margin-top:14px">${sections}</div>

        <label class="review-confirm" style="display:flex;align-items:center;gap:10px;margin-top:16px">
          <input type="checkbox" id="review-confirm-box" style="width:auto" />
          <span>I confirm these answers are complete and accurate for this training attempt.</span>
        </label>

        <div class="actions" style="margin-top:14px">
          <button class="btn primary" type="button" id="confirm-submit-btn" ${missingRequired.length ? "disabled" : ""}>Confirm &amp; Submit Final Attempt</button>
          <button class="btn ghost" type="button" id="back-edit-btn">Go Back &amp; Edit</button>
        </div>
        ${missingRequired.length ? `<p class="help-text" style="margin-top:8px">Complete the missing required fields above, then reopen Review &amp; Submit.</p>` : ``}
      </div>
    `;

    const reviewCardEl = $("#review-card");
    if(reviewCardEl && reviewCardEl.scrollIntoView) reviewCardEl.scrollIntoView({ behavior:"smooth", block:"start" });
    $("#back-edit-btn").addEventListener("click", () => {
      $("#quote-review").innerHTML = "";
      const f = $("#quote-form");
      if(f && f.scrollIntoView) f.scrollIntoView({ behavior:"smooth", block:"start" });
    });

    const confirmBtn = $("#confirm-submit-btn");
    const box = $("#review-confirm-box");
    if(box && confirmBtn && !missingRequired.length){
      confirmBtn.disabled = !box.checked;
      box.addEventListener("change", () => { confirmBtn.disabled = !box.checked; });
      confirmBtn.addEventListener("click", () => {
        if(!box.checked) return toast("Please confirm the attempt before submitting.", "bad");
        $("#quote-review").innerHTML = "";
        rateQuote();
      });
    }
  }

  async function rateQuote(){
    const btn = $("#confirm-submit-btn") || $("#review-submit-btn");
    const form = $("#quote-form");
    if(!validateRequired(form)) return;

    setBusy(btn, true, "Rating...");
    try{
      const data = formData(form);
      const type = state.quoteSession.quote_type;
      const result = calculateQuote(type, data);
      const scenario = state.selectedScenario || (state.quoteSession?.scenario_id ? getScenario(state.quoteSession.scenario_id) : null);
      const scenarioGrade = gradeAgainstScenario(type, data, scenario);
      if(scenarioGrade){
        result.score = scenarioGrade.score;
        result.status = scenarioGrade.criticalMisses.length ? "Graded - Critical Review" : (scenarioGrade.score >= 80 ? "Graded - Passing" : "Graded - Coaching Needed");
        result.flags = (result.flags || []).concat(scenarioGrade.criticalMisses.map(x => `Critical miss: ${x.field} expected ${x.expected || "-"}, entered ${x.actual || "blank"}`));
        result.scenario_grade = scenarioGrade;
      }
      const ratedAt = CarrierUtils.nowIso();
      const durationSeconds = Math.max(1, Math.floor((new Date(ratedAt).getTime() - new Date(state.quoteSession.started_at).getTime()) / 1000));
      const quoteNumber = `LVA-${type.toUpperCase()}-Q-${Date.now().toString().slice(-7)}`;

      state.quoteResult = { ...result, quoteNumber, durationSeconds, ratedAt, data };

      await store.update("carrier_quote_sessions", state.quoteSession.id, {
        status: "Rated",
        quote_number: quoteNumber,
        rated_at: ratedAt,
        duration_seconds: durationSeconds,
        premium: result.premium,
        details: { ...state.quoteSession.details, result, insured: [data.insured_first, data.insured_last].filter(Boolean).join(" ") }
      });

      const quoteRow = await store.insert("carrier_quotes", {
        va_name: state.user.name,
        va_email: state.user.email,
        quote_session_id: state.quoteSession.id,
        quote_type: type,
        scenario_id: scenario ? scenario.id : "",
        scenario_title: scenario ? scenario.title : "",
        scenario_order: scenario ? scenario.order : 0,
        quote_number: quoteNumber,
        insured_name: [data.insured_first, data.insured_last].filter(Boolean).join(" "),
        email: data.email || "",
        phone: data.phone || "",
        status: result.status,
        premium: result.premium,
        duration_seconds: durationSeconds,
        details: Object.assign({}, data, { scenario_id: scenario ? scenario.id : "", scenario_title: scenario ? scenario.title : "", scenario_order: scenario ? scenario.order : 0 }),
        rating_details: result
      });

      await store.logAudit(state.user, "QUOTE_RATED", `${state.user.name} rated ${quoteNumber} in ${fmtDuration(durationSeconds)}.`, {
        quote_number: quoteNumber, quote_type: type, duration_seconds: durationSeconds, status: result.status, premium: result.premium
      });

      renderQuoteResult(quoteRow, state.quoteResult);
      toast(`Attempt submitted in ${fmtDuration(durationSeconds)}, graded, and saved to the Gradebook.`, "good");
    }catch(err){
      console.error(err);
      toast("Unable to rate quote. Please check required fields and Supabase setup.", "bad");
    }finally{
      setBusy(btn, false);
    }
  }

  function renderQuoteResult(quoteRow, result){
    $("#quote-result").innerHTML = `
      <div class="result-card">
        <div class="grid three">
          ${metric("Quote Number", result.quoteNumber, "Saved in quote activity")}
          ${metric("Annual Premium", money(result.premium), `Down ${money(result.down)} | Monthly ${money(result.monthly)}`)}
          ${metric("Quote Duration", fmtDuration(result.durationSeconds), `VA: ${state.user.name}`)}
        </div>
        <div class="notice ${result.status === "Declined" ? "bad" : result.status === "Referral" ? "warn" : "good"}" style="margin-top:14px">
          Carrier Result: <strong>${escapeHtml(result.status)}</strong>. QA Score: <strong>${result.score}%</strong>
        </div>
        ${result.flags.length ? `<div class="notice warn" style="margin-top:14px"><strong>Underwriting / Grading Flags:</strong><br>${result.flags.map(escapeHtml).join("<br>")}</div>` : `<div class="notice good" style="margin-top:14px">No major underwriting flags found.</div>`}
        ${result.scenario_grade ? renderScenarioGradeReport(result.scenario_grade) : ""}
        <div class="actions" style="margin-top:16px">
          <button class="btn success" id="bind-policy-btn">Bind / Issue Policy</button>
          <button class="btn secondary" id="download-result-pdf-btn">Download Result PDF</button>
          <button class="btn" id="retry-scenario-btn">Retry Scenario</button>
          <button class="btn ghost" id="print-quote-btn">Print Quote</button>
          <button class="btn ghost" id="go-dashboard-btn">View Dashboard Tracking</button>
        </div>
      </div>
    `;
    $("#bind-policy-btn").addEventListener("click", () => bindPolicy(quoteRow, result));
    $("#print-quote-btn").addEventListener("click", () => window.print());
    $("#go-dashboard-btn").addEventListener("click", () => navigate("dashboard"));
    $("#download-result-pdf-btn").addEventListener("click", () => downloadResultPdf(quoteRow, result));
    const retryBtn = $("#retry-scenario-btn");
    if(retryBtn){
      const sc = state.selectedScenario || (quoteRow.scenario_id ? getScenario(quoteRow.scenario_id) : null);
      if(sc){
        retryBtn.addEventListener("click", () => { toast("Restarting scenario for another attempt."); startQuote(sc.line, sc.id); });
      }else{
        retryBtn.addEventListener("click", () => startQuote(quoteRow.quote_type));
      }
    }
  }

  // Requirement #10 - downloadable graded result PDF (client-side, no server needed).
  function downloadResultPdf(quoteRow, result){
    const g = result.scenario_grade;
    const lines = [];
    lines.push("LAVA CarrierOps - Graded Scenario Result");
    lines.push("Training simulator - dummy data only");
    lines.push("");
    lines.push(`Quote Number: ${result.quoteNumber || "-"}`);
    lines.push(`VA: ${state.user?.name || "-"}  (${state.user?.email || "-"})`);
    lines.push(`Line of Business: ${(quoteRow.quote_type || "").toUpperCase()}`);
    lines.push(`Scenario: ${quoteRow.scenario_id || "Free practice"}${quoteRow.scenario_title ? " - " + quoteRow.scenario_title : ""}`);
    lines.push(`Submitted: ${fmtDate(result.ratedAt)}`);
    lines.push(`Duration: ${fmtDuration(result.durationSeconds)}`);
    lines.push(`Annual Premium: ${money(result.premium)}  (Down ${money(result.down)} / Monthly ${money(result.monthly)})`);
    lines.push(`Carrier Result: ${result.status}`);
    lines.push("");
    if(g){
      lines.push(`SCORE: ${g.score}%  -  ${g.gradeLabel}`);
      const passStatus = g.score >= 90 ? "Excellent / Ready" : g.score >= 80 ? "Passing / Minor coaching" : g.score >= 70 ? "Needs review" : "Failed attempt";
      lines.push(`Pass/Fail Status: ${passStatus}`);
      lines.push(`Correct fields: ${g.correct} of ${g.total}`);
      lines.push(`Critical misses: ${g.criticalMisses.length}`);
      lines.push("");
      lines.push("Section Scores:");
      g.sectionScores.forEach(s => lines.push(`  - ${s.name}: ${s.score}% (${s.total} fields)`));
      lines.push("");
      if(g.criticalMisses.length){
        lines.push("Critical Misses:");
        g.criticalMisses.forEach(x => lines.push(`  - ${x.field}: expected "${x.expected}", entered "${x.actual || "blank"}"`));
        lines.push("");
      }
      if(g.missed.length){
        lines.push("Other Missed Items:");
        g.missed.forEach(x => lines.push(`  - ${x.field}: expected "${x.expected}", entered "${x.actual || "blank"}"`));
        lines.push("");
      }
      lines.push("Coaching Notes:");
      g.coaching.forEach(c => lines.push(`  - ${c}`));
    }else{
      lines.push("This was a free-practice quote (not scenario-graded).");
      if(result.flags?.length){
        lines.push("");
        lines.push("Underwriting Flags:");
        result.flags.forEach(f => lines.push(`  - ${f}`));
      }
    }

    const filenameBase = `lava-result-${(quoteRow.scenario_id || quoteRow.quote_type || "quote")}-${(result.quoteNumber || Date.now())}`;

    // Prefer a real PDF via jsPDF if available; gracefully fall back to a text file.
    const jspdfNS = window.jspdf || window.jsPDF;
    const JsPdf = jspdfNS && (jspdfNS.jsPDF || jspdfNS);
    if(JsPdf){
      try{
        const doc = new JsPdf({ unit: "pt", format: "letter" });
        const margin = 48;
        let y = margin;
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFont("helvetica","bold"); doc.setFontSize(15);
        doc.text("LAVA CarrierOps", margin, y); y += 18;
        doc.setFont("helvetica","normal"); doc.setFontSize(10);
        lines.slice(1).forEach(line => {
          const isHeader = /:$/.test(line) && !line.startsWith("  ");
          const big = /^SCORE:/.test(line);
          doc.setFont("helvetica", (isHeader || big) ? "bold" : "normal");
          doc.setFontSize(big ? 13 : 10);
          const wrapped = doc.splitTextToSize(line || " ", 515);
          wrapped.forEach(w => {
            if(y > pageH - margin){ doc.addPage(); y = margin; }
            doc.text(w, margin, y); y += big ? 18 : 14;
          });
        });
        doc.save(filenameBase + ".pdf");
        toast("Result PDF downloaded.", "good");
        return;
      }catch(err){
        console.warn("jsPDF failed, falling back to text export.", err);
      }
    }
    downloadText(filenameBase + ".txt", lines.join("\n"), "text/plain");
    toast("Result downloaded (text). PDF library was unavailable.", "warn");
  }


  function renderScenarioGradeReport(g){
    const scoreClass = g.score >= 90 ? "good" : g.score >= 80 ? "warn" : "bad";
    return `<div class="card pad" style="margin-top:16px">
      <div class="grid two">
        <div>
          <p class="eyebrow">Graded Scenario Result</p>
          <h2 style="margin:0 0 10px">${escapeHtml(g.gradeLabel)}</h2>
          <p class="help-text">Correct fields: ${g.correct} of ${g.total}. Critical misses: ${g.criticalMisses.length}.</p>
          <div class="grade-breakdown">${g.sectionScores.map(s => `<div class="grade-chip"><small>${escapeHtml(s.name)}</small><strong>${s.score}%</strong></div>`).join("")}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center"><div class="score-ring ${scoreClass}">${g.score}%</div></div>
      </div>
      ${g.criticalMisses.length ? `<div class="notice bad" style="margin-top:14px"><strong>Critical Misses</strong><br>${g.criticalMisses.map(x => `${escapeHtml(x.field)}: expected <strong>${escapeHtml(x.expected)}</strong>, entered <strong>${escapeHtml(x.actual || "blank")}</strong>`).join("<br>")}</div>` : `<div class="notice good" style="margin-top:14px">No critical misses found.</div>`}
      ${g.coaching.length ? `<div class="notice warn" style="margin-top:14px"><strong>Coaching Notes</strong><br>${g.coaching.map(escapeHtml).join("<br>")}</div>` : ""}
      <details style="margin-top:14px"><summary><strong>Show field-by-field comparison</strong></summary>
        <div class="table-wrap compare-table" style="margin-top:10px"><table><thead><tr><th>Field</th><th>Expected</th><th>Entered</th><th>Status</th></tr></thead><tbody>${g.compared.map(x => `<tr><td>${escapeHtml(x.field)}${x.critical ? " *" : ""}</td><td>${escapeHtml(x.expected)}</td><td>${escapeHtml(x.actual || "blank")}</td><td>${x.ok ? "Correct" : "Missed"}</td></tr>`).join("")}</tbody></table></div>
      </details>
    </div>`;
  }

  async function bindPolicy(quoteRow, result){
    if(result.status === "Declined") return toast("Declined quotes cannot be issued. Send to remarketing or trainer review.", "bad");
    const type = state.quoteSession.quote_type;
    const policyNumber = `LVA-${type.toUpperCase()}-${Date.now().toString().slice(-7)}`;
    const d = result.data;
    const policy = await store.insert("carrier_policies", {
      va_name: state.user.name,
      va_email: state.user.email,
      policy_number: policyNumber,
      quote_number: result.quoteNumber,
      line_of_business: type === "auto" ? "Personal Auto" : (d.line_of_business || "Homeowners"),
      insured_name: [d.insured_first, d.insured_last].filter(Boolean).join(" "),
      email: d.email || "",
      phone: d.phone || "",
      effective_date: d.effective_date || "",
      status: "Issued",
      premium: result.premium,
      details: d
    });
    await store.logAudit(state.user, "POLICY_ISSUED", `${state.user.name} issued policy ${policyNumber} from quote ${result.quoteNumber}.`, policy);
    toast(`Policy issued: ${policyNumber}`, "good");
    navigate("search");
  }

  async function renderIdCards(){
    $("#view").innerHTML = pageHead("Auto Insurance ID Cards", "Generate a printable Auto ID card from an issued auto policy or manual training entry.") + `
      <div class="grid two">
        <div class="card pad">
          <div class="form-row two">
            <label>Policy Number
              <input id="id-policy-number" placeholder="Search issued auto policy number" />
            </label>
            <label>&nbsp;
              <button class="btn primary full" id="load-id-policy">Load Policy</button>
            </label>
          </div>
          <div class="form-section">
            <h3>ID Card Details</h3>
            <div class="form-row two">
              <label>Insured Name<input id="id-insured" /></label>
              <label>Policy Number<input id="id-policy" /></label>
              <label>Effective Date<input id="id-eff" type="date" /></label>
              <label>Expiration Date<input id="id-exp" type="date" /></label>
              <label>Vehicle Year/Make/Model<input id="id-vehicle" /></label>
              <label>VIN<input id="id-vin" /></label>
            </div>
          </div>
          <div class="actions">
            <button class="btn primary" id="generate-id-card">Generate ID Card</button>
            <button class="btn secondary" id="print-id-card">Print / Save PDF</button>
          </div>
        </div>
        <div class="card pad" id="id-card-preview">
          <div class="notice">Load an auto policy or enter details, then click Generate ID Card.</div>
        </div>
      </div>
    `;
    $("#load-id-policy").addEventListener("click", loadPolicyForId);
    $("#generate-id-card").addEventListener("click", generateIdCard);
    $("#print-id-card").addEventListener("click", () => window.print());
  }

  async function loadPolicyForId(){
    const policyNumber = $("#id-policy-number").value.trim();
    const rows = await store.searchPolicies(policyNumber);
    const p = rows.find(r => String(r.policy_number).toLowerCase() === policyNumber.toLowerCase()) || rows[0];
    if(!p) return toast("No policy found. You can still type details manually.", "warn");
    const d = p.details || {};
    $("#id-insured").value = p.insured_name || "";
    $("#id-policy").value = p.policy_number || "";
    $("#id-eff").value = p.effective_date || "";
    $("#id-exp").value = d.expiration_date || "";
    $("#id-vehicle").value = [d.vehicle_year, d.vehicle_make, d.vehicle_model].filter(Boolean).join(" ");
    $("#id-vin").value = d.vin || "";
    toast("Policy loaded for ID card.", "good");
  }

  function generateIdCard(){
    const data = {
      insured: $("#id-insured").value,
      policy: $("#id-policy").value,
      eff: $("#id-eff").value,
      exp: $("#id-exp").value,
      vehicle: $("#id-vehicle").value,
      vin: $("#id-vin").value
    };
    $("#id-card-preview").innerHTML = `
      <div class="id-card">
        <h2>Insurance Identification Card</h2>
        <div class="id-grid">
          <div class="id-cell"><small>Company</small>LAVA CarrierOps Training Insurance</div>
          <div class="id-cell"><small>Policy Number</small>${escapeHtml(data.policy || "-")}</div>
          <div class="id-cell"><small>Named Insured</small>${escapeHtml(data.insured || "-")}</div>
          <div class="id-cell"><small>Effective / Expiration</small>${escapeHtml(data.eff || "-")} to ${escapeHtml(data.exp || "-")}</div>
          <div class="id-cell"><small>Vehicle</small>${escapeHtml(data.vehicle || "-")}</div>
          <div class="id-cell"><small>VIN</small>${escapeHtml(data.vin || "-")}</div>
        </div>
        <p class="footer-note">Training simulator document only. Not valid proof of insurance.</p>
      </div>
    `;
    store.logAudit(state.user, "AUTO_ID_CARD_GENERATED", `${state.user.name} generated an Auto ID card for ${data.policy || "manual entry"}.`, data).catch(console.warn);
  }

  async function renderPayments(){
    $("#view").innerHTML = pageHead("Payment Center", "Process training payments, generate receipt, and document the transaction on the dashboard.") + `
      <div class="card pad">
        <div class="form-row three">
          <label>Policy Number<input id="pay-policy" required placeholder="Policy number" /></label>
          <label>Payment Amount<input id="pay-amount" required type="number" placeholder="0.00" /></label>
          <label>Payment Method
            <select id="pay-method"><option>Card</option><option>ACH</option><option>Check</option><option>Cash</option></select>
          </label>
          <label>Paid By<input id="pay-by" placeholder="Customer name" /></label>
          <label>Payment Date<input id="pay-date" type="date" /></label>
          <label>Notes<input id="pay-notes" placeholder="Confirmation notes" /></label>
        </div>
        <div class="actions">
          <button class="btn primary" id="process-payment">Process Payment</button>
          <button class="btn secondary" id="download-receipt">Download Last Receipt</button>
        </div>
        <div id="payment-result" style="margin-top:18px"></div>
      </div>
    `;
    $("#pay-date").valueAsDate = new Date();
    $("#process-payment").addEventListener("click", processPayment);
    $("#download-receipt").addEventListener("click", () => {
      const html = $("#payment-result").innerText || "No receipt generated.";
      downloadText(`payment-receipt-${Date.now()}.txt`, html, "text/plain");
    });
  }

  async function processPayment(){
    const rec = {
      va_name: state.user.name,
      va_email: state.user.email,
      policy_number: $("#pay-policy").value.trim(),
      amount: Number($("#pay-amount").value || 0),
      payment_method: $("#pay-method").value,
      paid_by: $("#pay-by").value.trim(),
      payment_date: $("#pay-date").value,
      notes: $("#pay-notes").value.trim(),
      status: "Posted",
      confirmation_number: "PAY-" + Date.now().toString().slice(-8)
    };
    if(!rec.policy_number || !rec.amount) return toast("Policy number and amount are required.", "bad");
    await store.insert("carrier_payments", rec);
    await store.logAudit(state.user, "PAYMENT_POSTED", `${state.user.name} posted payment ${rec.confirmation_number} for ${rec.policy_number}.`, rec);
    $("#payment-result").innerHTML = `<div class="notice good"><strong>Payment Posted:</strong> ${rec.confirmation_number}<br>Policy: ${escapeHtml(rec.policy_number)}<br>Amount: ${money(rec.amount)}</div>`;
    toast("Payment processed and documented.", "good");
  }

  async function renderEndorsements(){
    $("#view").innerHTML = pageHead("Endorsement Processing", "Process policy changes, upload supporting documents, and track open endorsement work.") + `
      <div class="card pad">
        <div class="form-row three">
          <label>Policy Number<input id="end-policy" required /></label>
          <label>Endorsement Type
            <select id="end-type">${window.CARRIER_REFERENCE.endorsementTypes.map(x=>`<option>${escapeHtml(x)}</option>`).join("")}</select>
          </label>
          <label>Effective Date<input id="end-eff" type="date" /></label>
        </div>
        <label>Change Description / Processing Notes
          <textarea id="end-notes" placeholder="Example: Add driver John Smith effective 06/01. Verified license and household status."></textarea>
        </label>
        <label>Upload Supporting Document
          <input id="end-file" type="file" />
        </label>
        <div class="actions">
          <button class="btn primary" id="submit-endorsement">Submit Endorsement</button>
          <button class="btn secondary" id="view-endorsement-guide">How to Process Endorsement</button>
        </div>
        <div id="endorsement-result" style="margin-top:18px"></div>
      </div>
    `;
    $("#end-eff").valueAsDate = new Date();
    $("#submit-endorsement").addEventListener("click", submitEndorsement);
    $("#view-endorsement-guide").addEventListener("click", () => {
      $("#endorsement-result").innerHTML = `<div class="notice"><strong>Endorsement SOP:</strong><br>1. Pull up the policy.<br>2. Verify effective date and requested change.<br>3. Collect required documents.<br>4. Submit endorsement transaction.<br>5. Review premium impact.<br>6. Document notes and follow-up.</div>`;
    });
  }

  async function submitEndorsement(){
    const policy = $("#end-policy").value.trim();
    if(!policy) return toast("Policy number is required.", "bad");
    const rec = await store.insert("carrier_endorsements", {
      va_name: state.user.name,
      va_email: state.user.email,
      policy_number: policy,
      endorsement_type: $("#end-type").value,
      effective_date: $("#end-eff").value,
      notes: $("#end-notes").value.trim(),
      status: "Pending Review"
    });
    const file = $("#end-file").files[0];
    if(file){
      await store.uploadDocument(file, "endorsements", state.user, { policy_number: policy, document_type: "Endorsement Support", endorsement_id: rec.id });
    }
    await store.logAudit(state.user, "ENDORSEMENT_SUBMITTED", `${state.user.name} submitted endorsement ${rec.endorsement_type} for ${policy}.`, rec);
    $("#endorsement-result").innerHTML = `<div class="notice good">Endorsement submitted and documented. Status: Pending Review.</div>`;
    toast("Endorsement submitted and shown in dashboard/work queue.", "good");
  }

  async function renderCancellations(){
    $("#view").innerHTML = pageHead("Policy Cancellation", "Document cancellation requests with reason, effective date, and notes.") + `
      <div class="card pad">
        <div class="form-row three">
          <label>Policy Number<input id="can-policy" required /></label>
          <label>Cancellation Reason
            <select id="can-reason">${window.CARRIER_REFERENCE.cancellationReasons.map(x=>`<option>${escapeHtml(x)}</option>`).join("")}</select>
          </label>
          <label>Cancellation Effective Date<input id="can-eff" type="date" /></label>
        </div>
        <label>Cancellation Notes<textarea id="can-notes" placeholder="Document who requested cancellation, proof received, and refund instructions."></textarea></label>
        <div class="actions">
          <button class="btn danger" id="submit-cancel">Submit Cancellation</button>
          <button class="btn secondary" id="cancel-guide">How to Cancel Policy</button>
        </div>
        <div id="cancel-result" style="margin-top:18px"></div>
      </div>
    `;
    $("#can-eff").valueAsDate = new Date();
    $("#submit-cancel").addEventListener("click", submitCancel);
    $("#cancel-guide").addEventListener("click", () => {
      $("#cancel-result").innerHTML = `<div class="notice warn"><strong>Cancellation SOP:</strong><br>1. Confirm policy number and named insured.<br>2. Verify request authority.<br>3. Confirm cancellation effective date.<br>4. Confirm replacement coverage if applicable.<br>5. Submit cancellation transaction.<br>6. Document notes and notify client/agency.</div>`;
    });
  }

  async function submitCancel(){
    const policy = $("#can-policy").value.trim();
    if(!policy) return toast("Policy number is required.", "bad");
    const rec = await store.insert("carrier_cancellations", {
      va_name: state.user.name,
      va_email: state.user.email,
      policy_number: policy,
      reason: $("#can-reason").value,
      effective_date: $("#can-eff").value,
      notes: $("#can-notes").value.trim(),
      status: "Pending Review"
    });
    await store.logAudit(state.user, "CANCELLATION_SUBMITTED", `${state.user.name} submitted cancellation for ${policy}.`, rec);
    $("#cancel-result").innerHTML = `<div class="notice good">Cancellation request documented and routed to Work Queue.</div>`;
    toast("Cancellation documented.", "good");
  }

  async function renderRemarketing(){
    $("#view").innerHTML = pageHead("Quoting & Remarketing", "Document renewal remarketing, carrier comparison, and rewrite opportunities.") + `
      <div class="card pad">
        <div class="form-row three">
          <label>Policy Number / Account<input id="rm-policy" /></label>
          <label>Named Insured<input id="rm-insured" /></label>
          <label>Target Date<input id="rm-date" type="date" /></label>
        </div>
        <label>Reason for Remarketing
          <select id="rm-reason">
            <option>Renewal increase</option>
            <option>Coverage improvement</option>
            <option>Carrier non-renewal</option>
            <option>Client requested shopping</option>
            <option>Claims/underwriting concern</option>
          </select>
        </label>
        <label>Markets / Notes<textarea id="rm-notes" placeholder="List markets quoted, appetite concerns, and follow-up action."></textarea></label>
        <button class="btn primary" id="submit-rm">Save Remarketing Activity</button>
        <div id="rm-result" style="margin-top:18px"></div>
      </div>
    `;
    $("#rm-date").valueAsDate = new Date();
    $("#submit-rm").addEventListener("click", submitRemarketing);
  }

  async function submitRemarketing(){
    const rec = await store.insert("carrier_remarketing", {
      va_name: state.user.name,
      va_email: state.user.email,
      policy_number: $("#rm-policy").value.trim(),
      insured_name: $("#rm-insured").value.trim(),
      target_date: $("#rm-date").value,
      reason: $("#rm-reason").value,
      notes: $("#rm-notes").value.trim(),
      status: "Open"
    });
    await store.logAudit(state.user, "REMARKETING_SAVED", `${state.user.name} saved remarketing activity.`, rec);
    $("#rm-result").innerHTML = `<div class="notice good">Remarketing activity saved and shown in the Dashboard.</div>`;
    toast("Remarketing activity documented.", "good");
  }

  async function renderWorkQueue(){
    const [endorsements, cancels, remarketing, sessions] = await Promise.all([
      store.list("carrier_endorsements", {limit:500}),
      store.list("carrier_cancellations", {limit:500}),
      store.list("carrier_remarketing", {limit:500}),
      store.list("carrier_quote_sessions", {limit:500})
    ]);
    const items = [
      ...endorsements.map(x => ({ type:"Endorsement", policy:x.policy_number, status:x.status, va:x.va_name, created:x.created_at, notes:x.endorsement_type })),
      ...cancels.map(x => ({ type:"Cancellation", policy:x.policy_number, status:x.status, va:x.va_name, created:x.created_at, notes:x.reason })),
      ...remarketing.map(x => ({ type:"Remarketing", policy:x.policy_number, status:x.status, va:x.va_name, created:x.created_at, notes:x.reason })),
      ...sessions.filter(s => s.status === "Started").map(x => ({ type:"Quote In Progress", policy:x.quote_number || "-", status:x.status, va:x.va_name, created:x.started_at, notes:x.quote_type }))
    ].sort((a,b)=>String(b.created).localeCompare(String(a.created)));

    $("#view").innerHTML = pageHead("Work Queue", "Open quote, endorsement, cancellation, and remarketing work items.") + `
      <div class="card pad">
        ${table(["Type","Policy/Quote","Status","VA","Created","Notes"],
          items.map(i => [i.type, i.policy || "-", badge(i.status || "Open"), i.va || "-", fmtDate(i.created), i.notes || "-"])
        )}
      </div>
    `;
  }

  async function renderDocuments(){
    const docs = await store.list("carrier_documents", {limit:500});
    $("#view").innerHTML = pageHead("Documents", "Uploaded supporting documents for endorsements, cancellations, quotes, and training workflows.") + `
      <div class="card pad">
        ${table(["Uploaded","VA","Policy","Type","File","Status","Download"],
          docs.map(d => [
            fmtDate(d.created_at),
            d.va_name || "-",
            d.policy_number || "-",
            d.document_type || "-",
            d.file_name || "-",
            badge(d.upload_status || "Saved"),
            d.file_url ? `<a class="btn small secondary" href="${escapeHtml(d.file_url)}" target="_blank">Open</a>` : `<span class="pill neutral">Metadata Only</span>`
          ])
        )}
      </div>
    `;
  }

  async function renderQA(){
    const [quotes, sessions] = await Promise.all([
      store.list("carrier_quotes", {limit:500}),
      store.list("carrier_quote_sessions", {limit:500})
    ]);
    $("#view").innerHTML = pageHead("Trainer QA Review", "Review VA quote accuracy, speed, documentation, and underwriting flag handling.", `<button class="btn secondary" id="qa-scenarios">Open Scenario Library</button>`) + `
      <div class="grid two">
        <div class="card pad">
          ${table(["Quote #","VA","Type","Status","Premium","Duration","Action"],
            quotes.map(q => [
              q.quote_number || "-",
              q.va_name || "-",
              (q.quote_type || "").toUpperCase(),
              badge(q.status || "-"),
              money(q.premium),
              q.duration_seconds ? fmtDuration(q.duration_seconds) : "-",
              `<button class="btn small secondary" data-review-quote="${q.id}">Review</button>`
            ])
          )}
        </div>
        <div class="card pad" id="qa-panel">
          <div class="notice">Select a quote to review.</div>
        </div>
      </div>
    `;
    const qaScenarioBtn = $("#qa-scenarios");
    if(qaScenarioBtn) qaScenarioBtn.addEventListener("click", () => navigate("scenarios"));
    $$("[data-review-quote]").forEach(btn => btn.addEventListener("click", () => {
      const q = quotes.find(x => x.id === btn.dataset.reviewQuote);
      renderReviewPanel(q);
    }));
  }

  function renderReviewPanel(q){
    $("#qa-panel").innerHTML = `
      <h2>Review ${escapeHtml(q.quote_number || "Quote")}</h2>
      <p><strong>VA:</strong> ${escapeHtml(q.va_name || "-")}<br><strong>Duration:</strong> ${q.duration_seconds ? fmtDuration(q.duration_seconds) : "-"}</p>
      <label>QA Score
        <input id="qa-score" type="number" min="0" max="100" placeholder="0-100" />
      </label>
      <label>Trainer Comments
        <textarea id="qa-comments" placeholder="Example: Good data entry. Needs to verify prior limits and document underwriting flag."></textarea>
      </label>
      <button class="btn primary" id="save-qa">Save QA Review</button>
    `;
    $("#save-qa").addEventListener("click", async () => {
      const rec = await store.insert("carrier_trainer_reviews", {
        va_name: q.va_name,
        va_email: q.va_email,
        trainer_name: state.user.name,
        trainer_email: state.user.email,
        quote_number: q.quote_number,
        quote_session_id: q.quote_session_id,
        score: Number($("#qa-score").value || 0),
        comments: $("#qa-comments").value.trim(),
        status: "Reviewed"
      });
      await store.logAudit(state.user, "TRAINER_QA_REVIEW", `${state.user.name} reviewed quote ${q.quote_number}.`, rec);
      toast("QA review saved and documented.", "good");
    });
  }

  async function renderAudit(){
    const logs = await store.list("carrier_audit_logs", {limit:1000});
    $("#view").innerHTML = pageHead("Audit Logs", "Every login, quote, payment, endorsement, cancellation, document, and QA action is documented here.", `
      <button class="btn secondary" id="refresh-audit">Refresh</button>
    `) + `
      <div class="card pad">
        ${table(["Time","VA","Role","Action","Message"],
          logs.map(l => [fmtDate(l.created_at), l.va_name || "-", l.role || "-", l.action || "-", l.message || "-"])
        )}
      </div>
    `;
    $("#refresh-audit").addEventListener("click", renderAudit);
  }

  function downloadText(filename, text, type){
    const blob = new Blob([text], {type: type || "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }


  function applyTheme(theme){
    const mode = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    document.body.dataset.theme = mode;
    document.body.style.colorScheme = mode;
    document.body.classList.toggle("theme-dark", mode === "dark");
    document.body.classList.toggle("theme-light", mode === "light");
    localStorage.setItem("lava_theme_mode", mode);
    const btn = $("#theme-toggle");
    if(btn){
      const icon = $(".theme-icon", btn);
      const text = $(".theme-text", btn);
      if(icon) icon.textContent = mode === "dark" ? "🌙" : "☀️";
      if(text) text.textContent = mode === "dark" ? "Dark Mode" : "Light Mode";
      btn.classList.toggle("active", mode === "dark");
      btn.setAttribute("aria-pressed", String(mode === "dark"));
    }
  }

  function initTheme(){
    const saved = localStorage.getItem("lava_theme_mode") || "light";
    applyTheme(saved);
    const btn = $("#theme-toggle");
    if(btn){
      btn.addEventListener("click", () => {
        const next = document.body.classList.contains("theme-dark") ? "light" : "dark";
        applyTheme(next);
        toast(`${next === "dark" ? "Dark" : "Light"} mode activated.`);
      });
    }
  }

  window.CarrierApp = { navigate, store, state, applyTheme };

  document.addEventListener("DOMContentLoaded", init);
})();
