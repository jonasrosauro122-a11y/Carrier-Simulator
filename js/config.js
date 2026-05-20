/*
  LAVA CarrierOps Portal - Supabase Configuration

  STEP 1: Run docs/supabase-setup.sql in Supabase SQL Editor.
  STEP 2: Create/confirm Storage bucket: carrier-documents.
  STEP 3: Paste your Supabase Project URL and publishable/anon public key below.

  IMPORTANT:
  - Use only the Supabase publishable key or legacy anon public key.
  - NEVER put a service_role key or sb_secret key in this file.
*/
window.LAVA_SUPABASE = {
  url: "",       // Example: "https://your-project-id.supabase.co"
  anonKey: "",   // Example: "sb_publishable_..." or legacy anon public key
  bucket: "carrier-documents"
};

// Training access code for Trainer/TL view.
window.LAVA_TRAINER_CODE = "LAVA2026";
