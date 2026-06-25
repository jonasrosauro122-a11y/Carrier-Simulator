# Supabase + Vercel Setup for LAVA CarrierOps

This app is a static training simulator. It uses the Supabase REST API from the browser and falls back to `localStorage` if Supabase is not configured or the tables are missing.

## 1. Create / open your Supabase project

Open Supabase, create a project, then go to **SQL Editor**.

## 2. Run the SQL

Copy everything from:

```text
docs/RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql
```

Paste it into Supabase **SQL Editor**, then click **Run**.

This creates:

- `carrier_login_logs`
- `carrier_quote_sessions`
- `carrier_quotes`
- `carrier_policies`
- `carrier_payments`
- `carrier_endorsements`
- `carrier_cancellations`
- `carrier_remarketing`
- `carrier_documents`
- `carrier_audit_logs`
- `carrier_trainer_reviews`
- `profiles`
- `scenarios`
- `scenario_files`
- `quote_attempts`
- `quote_answers`
- `gradebook`
- `trainer_reviews`
- `carrier-documents` storage bucket

It also adds the scenario tracking columns required by the ordered Home/Auto simulator:

- `scenario_id`
- `scenario_title`
- `scenario_order`

## 3. Get the correct Supabase key

Use **Project URL** plus a **publishable key** or legacy **anon public key**.

Do **not** use `service_role`, `sb_secret`, or any secret key in this frontend project.

## 4. Connect locally

For local/static testing, edit:

```text
js/config.js
```

Example:

```js
window.LAVA_SUPABASE = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "sb_publishable_your_public_key_here",
  bucket: "carrier-documents"
};
window.LAVA_TRAINER_CODE = "TRAINER2026";
```

Then run:

```bash
npm install
npm run dev
```

Open the local URL shown by the script.

## 5. Connect on Vercel

In Vercel, open your project, then go to **Settings → Environment Variables**.

Add:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_public_key_here
SUPABASE_BUCKET=carrier-documents
LAVA_TRAINER_CODE=TRAINER2026
```

Then redeploy.

The included `build.js` will generate `dist/js/config.js` from the Vercel environment variables during `npm run build`.

## 6. Vercel build settings

Use these settings:

```text
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## 7. How to confirm Supabase is working

After deployment:

1. Open the site.
2. Log in with a dummy VA name and email.
3. Check the top-right connection pill.
4. If it says **Supabase Connected**, test one scenario and submit a quote.
5. Go to Supabase **Table Editor → carrier_quotes**.
6. Confirm a new row was created with `scenario_id`, `scenario_title`, and `rating_details`.

If the pill says local/offline mode, check:

- Did you run `docs/RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql`?
- Did you add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel?
- Did you redeploy after adding environment variables?
- Did you accidentally use a secret/service-role key instead of publishable/anon public?

## Training Safety

This version uses permissive training RLS policies so the static simulator can save data using the public key. Use dummy training data only. For production with real client data, add Supabase Auth and stricter user-based RLS before storing any real personal information.
