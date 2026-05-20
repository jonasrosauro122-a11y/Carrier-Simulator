(function(){
  const cfg = window.LAVA_SUPABASE || {};
  const bucket = cfg.bucket || "carrier-documents";
  let client = null;
  let supabaseHealthy = false;
  let lastError = "";

  const TABLES = [
    "carrier_va_users","carrier_login_logs","carrier_policies","carrier_quotes",
    "carrier_payments","carrier_endorsements","carrier_cancellations",
    "carrier_documents","carrier_remarketing","carrier_audit_logs","carrier_qa_reviews"
  ];

  function uid(prefix="ID"){
    const t = Date.now().toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2,7).toUpperCase();
    return `${prefix}-${t}-${r}`;
  }

  function now(){ return new Date().toISOString(); }

  function withTimeout(promise, ms=6500){
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Supabase request timed out")), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function isConfigured(){
    return !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);
  }

  function getClient(){
    if(!isConfigured()) return null;
    if(!client){
      client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }
    return client;
  }

  function setHealth(ok, err=""){
    supabaseHealthy = !!ok;
    lastError = err || "";
    window.dispatchEvent(new CustomEvent("carrierops:connection", { detail:{ ok:supabaseHealthy, error:lastError }}));
  }

  async function checkConnection(){
    if(!isConfigured()){
      setHealth(false, "Supabase is not configured. Fill js/config.js.");
      return false;
    }
    try{
      const sb = getClient();
      const { error } = await withTimeout(sb.from("carrier_policies").select("id").limit(1), 6000);
      if(error) throw error;
      setHealth(true);
      return true;
    }catch(err){
      setHealth(false, err.message || String(err));
      return false;
    }
  }

  function localKey(table){ return `lava_carrierops_${table}`; }

  function localList(table){
    try{ return JSON.parse(localStorage.getItem(localKey(table)) || "[]"); }
    catch{ return []; }
  }

  function localSet(table, rows){
    localStorage.setItem(localKey(table), JSON.stringify(rows || []));
  }

  function normalizeRow(row){
    return {
      id: row.id || crypto.randomUUID?.() || uid("ROW"),
      created_at: row.created_at || now(),
      updated_at: now(),
      ...row
    };
  }

  async function insert(table, row){
    const payload = normalizeRow(row);
    const sb = getClient();
    if(sb){
      try{
        const { data, error } = await withTimeout(sb.from(table).insert(payload).select().single());
        if(error) throw error;
        setHealth(true);
        return data;
      }catch(err){
        console.warn(`Supabase insert failed on ${table}. Falling back locally.`, err);
        setHealth(false, err.message || String(err));
      }
    }
    const rows = localList(table);
    rows.unshift(payload);
    localSet(table, rows);
    return payload;
  }

  async function upsert(table, row, onConflict){
    const payload = normalizeRow(row);
    const sb = getClient();
    if(sb){
      try{
        let q = sb.from(table).upsert(payload);
        if(onConflict) q = sb.from(table).upsert(payload, { onConflict });
        const { data, error } = await withTimeout(q.select().single());
        if(error) throw error;
        setHealth(true);
        return data;
      }catch(err){
        console.warn(`Supabase upsert failed on ${table}. Falling back locally.`, err);
        setHealth(false, err.message || String(err));
      }
    }
    const rows = localList(table);
    const idx = rows.findIndex(r => (payload.id && r.id === payload.id) || (onConflict && r[onConflict] === payload[onConflict]));
    if(idx >= 0) rows[idx] = { ...rows[idx], ...payload, updated_at: now() };
    else rows.unshift(payload);
    localSet(table, rows);
    return idx >= 0 ? rows[idx] : payload;
  }

  async function list(table, options={}){
    const limit = options.limit || 100;
    const order = options.order || "created_at";
    const ascending = !!options.ascending;
    const sb = getClient();
    if(sb){
      try{
        let q = sb.from(table).select("*").limit(limit);
        if(order) q = q.order(order, { ascending });
        const { data, error } = await withTimeout(q, 6500);
        if(error) throw error;
        setHealth(true);
        return data || [];
      }catch(err){
        console.warn(`Supabase list failed on ${table}. Falling back locally.`, err);
        setHealth(false, err.message || String(err));
      }
    }
    const rows = localList(table);
    return rows.sort((a,b)=>{
      const av = a[order] || ""; const bv = b[order] || "";
      return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    }).slice(0, limit);
  }

  async function findPolicy(term){
    term = String(term || "").trim();
    if(!term) return [];
    const sb = getClient();
    if(sb){
      try{
        const like = `%${term}%`;
        const { data, error } = await withTimeout(
          sb.from("carrier_policies")
            .select("*")
            .or(`policy_number.ilike.${like},named_insured.ilike.${like},email.ilike.${like}`)
            .order("created_at", { ascending:false })
            .limit(25),
          6500
        );
        if(error) throw error;
        setHealth(true);
        return data || [];
      }catch(err){
        console.warn("Supabase policy search failed. Falling back locally.", err);
        setHealth(false, err.message || String(err));
      }
    }
    const s = term.toLowerCase();
    return localList("carrier_policies").filter(p =>
      String(p.policy_number||"").toLowerCase().includes(s) ||
      String(p.named_insured||"").toLowerCase().includes(s) ||
      String(p.email||"").toLowerCase().includes(s)
    ).slice(0, 25);
  }

  async function update(table, values, match){
    const payload = { ...values, updated_at: now() };
    const sb = getClient();
    if(sb){
      try{
        let q = sb.from(table).update(payload);
        Object.entries(match || {}).forEach(([k,v]) => q = q.eq(k,v));
        const { data, error } = await withTimeout(q.select(), 6500);
        if(error) throw error;
        setHealth(true);
        return data || [];
      }catch(err){
        console.warn(`Supabase update failed on ${table}. Falling back locally.`, err);
        setHealth(false, err.message || String(err));
      }
    }
    const rows = localList(table);
    const changed = [];
    const next = rows.map(row => {
      const ok = Object.entries(match || {}).every(([k,v]) => row[k] === v);
      if(ok){
        const merged = { ...row, ...payload };
        changed.push(merged);
        return merged;
      }
      return row;
    });
    localSet(table, next);
    return changed;
  }

  async function uploadFiles(fileList, meta={}){
    const files = Array.from(fileList || []);
    if(!files.length) return [];
    const sb = getClient();
    const uploaded = [];
    for(const file of files){
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `${meta.module || "general"}/${meta.policy_number || "no-policy"}/${Date.now()}-${safeName}`;
      let record = {
        id: crypto.randomUUID?.() || uid("DOC"),
        policy_number: meta.policy_number || "",
        module: meta.module || "general",
        file_name: file.name,
        file_path: path,
        file_type: file.type || "application/octet-stream",
        file_size: file.size || 0,
        uploaded_by_email: meta.uploaded_by_email || "",
        created_at: now()
      };
      if(sb){
        try{
          const { error } = await withTimeout(
            sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || undefined }),
            9000
          );
          if(error) throw error;
          const { data: urlData } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60);
          record.download_url = urlData?.signedUrl || "";
          setHealth(true);
        }catch(err){
          console.warn("Supabase file upload failed. Keeping local metadata only.", err);
          setHealth(false, err.message || String(err));
          record.local_note = "Upload failed or Supabase not configured.";
        }
      }else{
        record.local_note = "Local mode: file metadata saved only.";
      }
      const saved = await insert("carrier_documents", record);
      uploaded.push(saved);
    }
    return uploaded;
  }

  async function getSignedUrl(path){
    const sb = getClient();
    if(!sb || !path) return "";
    try{
      const { data, error } = await withTimeout(sb.storage.from(bucket).createSignedUrl(path, 60*60), 6000);
      if(error) throw error;
      return data?.signedUrl || "";
    }catch(err){
      console.warn("Signed URL failed", err);
      return "";
    }
  }

  async function logAudit(action, entity, details, user){
    return insert("carrier_audit_logs", {
      action, entity,
      details: details || {},
      user_name: user?.name || "",
      user_email: user?.email || "",
      user_role: user?.role || "",
      created_at: now()
    });
  }

  function exportJson(){
    const out = {};
    TABLES.forEach(t => out[t] = localList(t));
    return out;
  }

  function importJson(obj){
    Object.entries(obj || {}).forEach(([table, rows]) => {
      if(TABLES.includes(table) && Array.isArray(rows)) localSet(table, rows);
    });
  }

  window.CarrierStore = {
    uid, now, isConfigured, getClient, checkConnection, insert, upsert, list, update,
    findPolicy, uploadFiles, getSignedUrl, logAudit, exportJson, importJson,
    status(){ return { configured:isConfigured(), healthy:supabaseHealthy, error:lastError }; }
  };
})();
