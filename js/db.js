/* CarrierOps storage layer.
   Works with Supabase when configured. Falls back to localStorage when not configured.
*/
(function () {
  const TABLES = {
    policies: "carrier_policies",
    quotes: "carrier_quotes",
    endorsements: "carrier_endorsements",
    payments: "carrier_payments",
    cancellations: "carrier_cancellations",
    documents: "carrier_documents",
    remarketing: "carrier_remarketing",
    audit: "carrier_audit_logs",
    logins: "carrier_login_logs"
  };

  const LOCAL_KEYS = Object.fromEntries(Object.keys(TABLES).map((key) => [key, `lava_carrierops_${key}`]));

  function safeJsonParse(value, fallback) {
    try { return JSON.parse(value); } catch (err) { return fallback; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  class CarrierStore {
    constructor() {
      this.config = window.LAVA_SUPABASE || {};
      this.online = Boolean(this.config.url && this.config.anonKey && window.supabase);
      this.supabase = null;
      if (this.online) {
        try {
          this.supabase = window.supabase.createClient(this.config.url, this.config.anonKey);
        } catch (err) {
          console.warn("Supabase could not initialize. Using local mode.", err);
          this.online = false;
        }
      }
    }

    isOnline() { return this.online; }

    now() { return new Date().toISOString(); }

    localRead(collection) {
      return safeJsonParse(localStorage.getItem(LOCAL_KEYS[collection]), []);
    }

    localWrite(collection, rows) {
      localStorage.setItem(LOCAL_KEYS[collection], JSON.stringify(rows));
      return rows;
    }

    normalize(row) {
      return {
        id: row.id || uuid(),
        created_at: row.created_at || this.now(),
        updated_at: this.now(),
        ...row
      };
    }

    async list(collection, options = {}) {
      if (this.online) {
        try {
          let query = this.supabase.from(TABLES[collection]).select("*");
          if (options.eq) Object.entries(options.eq).forEach(([key, value]) => { query = query.eq(key, value); });
          if (options.orderBy) query = query.order(options.orderBy, { ascending: options.ascending ?? false });
          const { data, error } = await query;
          if (error) throw error;
          return data || [];
        } catch (err) {
          console.warn(`Supabase list failed for ${collection}. Falling back to local mode.`, err);
          this.online = false;
        }
      }
      let rows = this.localRead(collection);
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          rows = rows.filter((row) => String(row[key] || "").toLowerCase() === String(value || "").toLowerCase());
        });
      }
      if (options.orderBy) {
        rows.sort((a, b) => String(b[options.orderBy] || "").localeCompare(String(a[options.orderBy] || "")));
      }
      return rows;
    }

    async save(collection, row) {
      const normalized = this.normalize(row);
      if (this.online) {
        try {
          const { data, error } = await this.supabase.from(TABLES[collection]).upsert(normalized).select().single();
          if (error) throw error;
          return data;
        } catch (err) {
          console.warn(`Supabase save failed for ${collection}. Falling back to local mode.`, err);
          this.online = false;
        }
      }
      const rows = this.localRead(collection);
      const idx = rows.findIndex((item) => item.id === normalized.id);
      if (idx >= 0) rows[idx] = { ...rows[idx], ...normalized };
      else rows.unshift(normalized);
      this.localWrite(collection, rows);
      return normalized;
    }

    async insert(collection, row) {
      return this.save(collection, { ...row, id: row.id || uuid() });
    }

    async findPolicy(term) {
      const rows = await this.list("policies", { orderBy: "updated_at" });
      const q = String(term || "").trim().toLowerCase();
      if (!q) return [];
      return rows.filter((p) => {
        return String(p.policy_number || "").toLowerCase().includes(q) ||
          String(p.named_insured || "").toLowerCase().includes(q) ||
          String(p.email || "").toLowerCase().includes(q) ||
          String(p.phone || "").toLowerCase().includes(q);
      });
    }

    async getPolicy(policyNumber) {
      const rows = await this.list("policies");
      return rows.find((p) => String(p.policy_number || "").toLowerCase() === String(policyNumber || "").toLowerCase()) || null;
    }

    async uploadDocument(file, meta = {}) {
      const id = uuid();
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `${meta.policy_number || "unassigned"}/${Date.now()}-${safeName}`;
      let storagePath = "";
      let dataUrl = "";
      if (this.online) {
        try {
          const bucket = this.config.bucket || "carrier-documents";
          const { error } = await this.supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });
          if (error) throw error;
          storagePath = path;
        } catch (err) {
          console.warn("Supabase document upload failed. Saving document in local browser storage instead.", err);
          this.online = false;
        }
      }
      if (!this.online) {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      return this.insert("documents", {
        id,
        policy_number: meta.policy_number || "",
        document_type: meta.document_type || "Supporting Document",
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_path: storagePath,
        data_url: dataUrl,
        uploaded_by: meta.uploaded_by || "",
        related_record_id: meta.related_record_id || "",
        created_at: this.now()
      });
    }

    async getDocumentDownloadUrl(doc) {
      if (this.online && doc.storage_path) {
        try {
          const bucket = this.config.bucket || "carrier-documents";
          const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(doc.storage_path, 60 * 15);
          if (error) throw error;
          return data.signedUrl;
        } catch (err) {
          console.warn("Supabase signed URL failed. Checking local document copy.", err);
          this.online = false;
        }
      }
      if (doc.data_url) return doc.data_url;
      return "";
    }

    async audit(action, details = {}, user = {}) {
      return this.insert("audit", {
        action,
        policy_number: details.policy_number || "",
        details,
        performed_by: user.name || "",
        user_email: user.email || "",
        created_at: this.now()
      });
    }

    async logLogin(user) {
      return this.insert("logins", {
        user_name: user.name,
        user_email: user.email,
        role: user.role,
        created_at: this.now()
      });
    }

    exportLocalBackup() {
      const payload = {};
      Object.keys(LOCAL_KEYS).forEach((key) => payload[key] = this.localRead(key));
      return payload;
    }

    importLocalBackup(payload) {
      Object.keys(LOCAL_KEYS).forEach((key) => {
        if (Array.isArray(payload[key])) this.localWrite(key, payload[key]);
      });
    }

    clearLocal() {
      Object.values(LOCAL_KEYS).forEach((key) => localStorage.removeItem(key));
    }
  }

  window.CarrierStore = CarrierStore;
})();
