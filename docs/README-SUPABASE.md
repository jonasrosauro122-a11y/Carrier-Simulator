# Supabase Setup

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Copy all content from `docs/supabase-setup.sql`.
4. Click **Run**.
5. Go to **Project Settings → API Keys**.
6. Copy your **Project URL** and **publishable key** or legacy **anon public key**.
7. Paste them into `js/config.js`.

Example:

```js
window.LAVA_SUPABASE = {
  url: "https://your-project-id.supabase.co",
  anonKey: "sb_publishable_your_key_here",
  bucket: "carrier-documents"
};
```

Do not use `service_role`, `sb_secret`, or secret keys inside this static website.

## What the Dashboard Tracks

- VA logins
- Login time
- Quote start time
- Quote rated time
- Quote duration
- Quote number
- Quote result
- Policy issuance
- Payments
- Endorsements
- Cancellations
- Remarketing
- Document uploads
- Trainer QA reviews
- Audit logs

This project is for training/demo use only. Use dummy data.
