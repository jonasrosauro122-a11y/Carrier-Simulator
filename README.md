# LAVA CarrierOps Training Portal

A standalone, Netlify-ready carrier operations simulator for VA training.

## What this version includes

- Top navigation carrier-style UI
- VA login and Trainer/TL login
- Trainer code: `LAVA2026`
- Dashboard
- Policy Search by policy number or named insured
- New Quote start screen with Auto or Home selection
- Separate realistic carrier-style Auto quote questions
- Separate realistic carrier-style Home quote questions
- Auto Insurance ID Card Generator
- Payment Center with receipt download
- Endorsement Processing with document upload/download
- How to Process Endorsements guide
- Policy Cancellation workflow with packet download
- How to Cancel Policy guide
- Quoting & Remarketing with carrier comparison
- Work Queue
- Trainer QA / audit logs
- CSV and JSON exports
- Supabase-ready storage and database setup
- Local browser fallback when Supabase is not configured

## GitHub + Netlify deployment

Upload the folder contents to your GitHub repository. The root of your repository should show:

```text
index.html
css/
js/
data/
images/
docs/
exports/
netlify.toml
_redirects
README.md
```

In Netlify:

```text
Build command: leave blank
Publish directory: .
```

No `npm install` and no build command are required.

## Supabase setup

1. Create a Supabase project.
2. Go to Supabase SQL Editor.
3. Open `docs/supabase-setup.sql`.
4. Copy everything and run it.
5. Go to Supabase Project Settings > API.
6. Copy:
   - Project URL
   - anon public key
7. Open `js/config.js`.
8. Paste the values:

```js
window.LAVA_SUPABASE = {
  url: "https://YOURPROJECT.supabase.co",
  anonKey: "YOUR_ANON_PUBLIC_KEY",
  bucket: "carrier-documents"
};
```

9. Commit and push the update to GitHub.
10. Redeploy Netlify.

## Training demo policies

The portal starts empty until you create a quote/policy or click **Load Demo Policies**. When you click **Start New Quote**, select **Auto Quote** or **Home Quote** first. Each line opens a separate carrier-style intake with blank fields and realistic underwriting questions.

Demo search examples:

```text
LVA-AUTO-1001
Jamie Rivera
LVA-HOME-2001
Morgan Santos
```

## Important security note

The included Supabase SQL allows anonymous read/write because this is a static training simulator. Do not use real customer data. For production, use Supabase Auth, server-side validation, and stricter RLS policies.
