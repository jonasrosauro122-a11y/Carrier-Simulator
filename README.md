# LAVA CarrierOps Portal Simulator

Standalone carrier-style insurance portal simulator for VA training.

## Works directly in GitHub + Netlify

No `npm install`.
No build command.
No framework build.
Just upload the folder contents to GitHub and deploy with Netlify.

## Folder Structure

```text
index.html
css/
  styles.css
js/
  config.js
  supabase-store.js
  app.js
data/
  reference.js
docs/
  supabase-setup.sql
  README-SUPABASE.md
images/
exports/
netlify.toml
_redirects
README.md
```

## Netlify Settings

```text
Build command: leave blank
Publish directory: .
```

## Supabase Setup

1. Open Supabase.
2. Create a project.
3. Go to SQL Editor.
4. Open `docs/supabase-setup.sql` from this project.
5. Copy everything and click Run in Supabase.
6. Go to Project Settings > API.
7. Copy your Project URL and publishable/anon public key.
8. Open `js/config.js`.
9. Paste your values:

```js
window.LAVA_SUPABASE = {
  url: "https://your-project-id.supabase.co",
  anonKey: "sb_publishable_xxxxxxxxxxxxxxxxx",
  bucket: "carrier-documents"
};
```

Do not use a service role or secret key in this static website.

## Main Features

- VA login
- Trainer/TL login
- Dashboard
- Policy Search
- Auto Quote
- Home Quote
- Rate Quote
- Bind / Issue Policy
- Auto ID Card Generator
- Payment Center
- Endorsement Processing
- Document Uploads
- Cancellation Workflow
- Remarketing Workflow
- Work Queue
- Trainer QA Review
- Audit Logs
- Supabase database + storage integration
- Local fallback when Supabase is not configured

## Trainer Code

```text
LAVA2026
```

## Important

This is a training simulator only. Do not enter real insured/customer information.
