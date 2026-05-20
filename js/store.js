/* LAVA CarrierOps Data Store
   Works with Supabase REST API when js/config.js has URL/key.
   Falls back to localStorage so the portal stays clickable even while Supabase is being configured.
*/
(function(){
  const DB_KEY = "lava_carrierops_training_db_v3";

  const TABLES = [
    "carrier_login_logs",
    "carrier_quote_sessions",
    "carrier_quotes",
    "carrier_policies",
    "carrier_payments",
    "carrier_endorsements",
    "carrier_cancellations",
    "carrier_remarketing",
    "carrier_documents",
    "carrier_audit_logs",
    "carrier_trainer_reviews"
  ];

  function uuid(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function nowIso(){ return new Date().toISOString(); }

  function readLocal(){
    try{
      const raw = localStorage.getItem(DB_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      TABLES.forEach(t => parsed[t] ||= []);
      return parsed;
    }catch(err){
      const empty = {};
      TABLES.forEach(t => empty[t] = []);
      return empty;
    }
  }

  function writeLocal(db){
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function cleanUrl(url){
    return String(url || "").trim().replace(/\/+$/,"");
  }

  class CarrierStore {
    constructor(){
      const cfg = window.LAVA_SUPABASE || {};
      this.url = cleanUrl(cfg.url);
      this.key = String(cfg.anonKey || "").trim();
      this.bucket = cfg.bucket || "carrier-documents";
      this.lastError = "";
      this.connected = false;
    }

    isConfigured(){
      return Boolean(this.url && this.key && this.url.includes(".supabase.co"));
    }

    headers(extra={}){
      return Object.assign({
        "apikey": this.key,
        "Authorization": "Bearer " + this.key,
        "Content-Type": "application/json"
      }, extra);
    }

    async testConnection(){
      if(!this.isConfigured()){
        this.connected = false;
        this.lastError = "Supabase URL/key missing.";
        return false;
      }
      try{
        const res = await fetch(`${this.url}/rest/v1/carrier_login_logs?select=id&limit=1`, {
          headers: this.headers()
        });
        if(!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
        this.connected = true;
        this.lastError = "";
        return true;
      }catch(err){
        console.warn("Supabase connection failed; using local mode.", err);
        this.connected = false;
        this.lastError = err.message || String(err);
        return false;
      }
    }

    async list(table, opts={}){
      if(!TABLES.includes(table)) throw new Error("Unknown table: " + table);
      const order = opts.order || "created_at.desc";
      const limit = opts.limit ? `&limit=${Number(opts.limit)}` : "";
      const select = opts.select || "*";
      const filter = opts.filter || "";
      const url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}&order=${order}${limit}`;

      if(this.connected && this.isConfigured()){
        try{
          const res = await fetch(url, { headers: this.headers() });
          if(!res.ok) throw new Error(await res.text());
          return await res.json();
        }catch(err){
          console.warn("List failed, falling back local:", table, err);
          this.lastError = err.message || String(err);
        }
      }

      const db = readLocal();
      let rows = [...(db[table] || [])];
      rows.sort((a,b)=> String(b.created_at||"").localeCompare(String(a.created_at||"")));
      if(opts.limit) rows = rows.slice(0, Number(opts.limit));
      return rows;
    }

    async searchPolicies(term){
      const q = String(term || "").trim().toLowerCase();
      const rows = await this.list("carrier_policies", { limit: 500 });
      if(!q) return rows;
      return rows.filter(p => [
        p.policy_number, p.insured_name, p.email, p.phone, p.quote_number, p.line_of_business
      ].some(v => String(v || "").toLowerCase().includes(q)));
    }

    async insert(table, row){
      if(!TABLES.includes(table)) throw new Error("Unknown table: " + table);
      const payload = Object.assign({ id: uuid(), created_at: nowIso() }, row || {});

      const db = readLocal();
      db[table] ||= [];
      db[table].unshift(payload);
      writeLocal(db);

      if(this.connected && this.isConfigured()){
        try{
          const res = await fetch(`${this.url}/rest/v1/${table}`, {
            method: "POST",
            headers: this.headers({ "Prefer": "return=representation" }),
            body: JSON.stringify(payload)
          });
          if(!res.ok) throw new Error(await res.text());
          const data = await res.json();
          return data?.[0] || payload;
        }catch(err){
          console.warn("Insert failed but local record saved:", table, err);
          this.lastError = err.message || String(err);
        }
      }
      return payload;
    }

    async update(table, id, changes){
      if(!TABLES.includes(table)) throw new Error("Unknown table: " + table);

      const db = readLocal();
      db[table] ||= [];
      const idx = db[table].findIndex(r => String(r.id) === String(id));
      if(idx >= 0){
        db[table][idx] = Object.assign({}, db[table][idx], changes, { updated_at: nowIso() });
        writeLocal(db);
      }

      if(this.connected && this.isConfigured()){
        try{
          const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: this.headers({ "Prefer": "return=representation" }),
            body: JSON.stringify(Object.assign({}, changes, { updated_at: nowIso() }))
          });
          if(!res.ok) throw new Error(await res.text());
          const data = await res.json();
          return data?.[0] || (idx >= 0 ? db[table][idx] : changes);
        }catch(err){
          console.warn("Update failed but local record updated:", table, err);
          this.lastError = err.message || String(err);
        }
      }
      return idx >= 0 ? db[table][idx] : changes;
    }

    async uploadDocument(file, folder, user, related){
      if(!file) return null;
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${folder || "uploads"}/${Date.now()}-${uuid()}.${ext}`;

      let storagePath = path;
      let publicUrl = "";
      let uploadStatus = "Local Reference";

      if(this.connected && this.isConfigured()){
        try{
          const res = await fetch(`${this.url}/storage/v1/object/${this.bucket}/${path}`, {
            method: "POST",
            headers: {
              "apikey": this.key,
              "Authorization": "Bearer " + this.key,
              "Content-Type": file.type || "application/octet-stream",
              "x-upsert": "true"
            },
            body: file
          });
          if(!res.ok) throw new Error(await res.text());
          uploadStatus = "Uploaded";
          publicUrl = `${this.url}/storage/v1/object/public/${this.bucket}/${path}`;
        }catch(err){
          console.warn("File upload failed; document metadata will still be saved locally.", err);
          this.lastError = err.message || String(err);
          storagePath = "";
        }
      }

      const doc = await this.insert("carrier_documents", {
        va_name: user?.name || "",
        va_email: user?.email || "",
        policy_number: related?.policy_number || "",
        quote_number: related?.quote_number || "",
        document_type: related?.document_type || "Training Document",
        file_name: safeName,
        file_path: storagePath,
        file_url: publicUrl,
        upload_status: uploadStatus,
        details: { size: file.size, type: file.type, related }
      });

      return doc;
    }

    async logAudit(user, action, message, details={}){
      return this.insert("carrier_audit_logs", {
        va_name: user?.name || "",
        va_email: user?.email || "",
        role: user?.role || "",
        action,
        message,
        details
      });
    }

    async exportAll(){
      const out = {};
      for(const t of TABLES) out[t] = await this.list(t, {limit: 5000});
      return out;
    }

    async importLocal(json){
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      const db = readLocal();
      TABLES.forEach(t => {
        if(Array.isArray(parsed[t])) db[t] = parsed[t];
      });
      writeLocal(db);
      return true;
    }
  }

  window.CarrierStore = CarrierStore;
  window.CarrierUtils = { uuid, nowIso, readLocal, writeLocal, TABLES };
})();
