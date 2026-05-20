# Supabase Setup Guide

Run `supabase-setup.sql` first. The portal expects these tables:

- carrier_va_users
- carrier_login_logs
- carrier_policies
- carrier_quotes
- carrier_payments
- carrier_endorsements
- carrier_cancellations
- carrier_documents
- carrier_remarketing
- carrier_audit_logs
- carrier_qa_reviews

It also expects this Storage bucket:

```text
carrier-documents
```

## Where to put your keys

Open:

```text
js/config.js
```

Example:

```js
window.LAVA_SUPABASE = {
  url: "https://your-project-id.supabase.co",
  anonKey: "sb_publishable_xxxxxxxxxxxxxxxxx",
  bucket: "carrier-documents"
};
```

Use a publishable key or legacy anon public key only.

## Test Checklist

1. Log in as VA.
2. Confirm dashboard opens immediately.
3. Start Quote > Auto or Home.
4. Fill required fields and click Rate Quote.
5. Click Save Quote.
6. Click Bind / Issue Policy.
7. Go to Supabase Table Editor > carrier_policies.
8. Confirm the policy record appears.
9. Go to Endorsements and upload a document.
10. Confirm the document appears in Storage > carrier-documents.

## Troubleshooting

If portal says Local Mode:
- `js/config.js` has empty URL/key, or
- Netlify is still showing an older deploy, or
- Supabase setup SQL was not run.

If upload fails:
- Confirm bucket is exactly `carrier-documents`.
- Confirm storage policies were created by the SQL script.

If save fails:
- Re-run `docs/supabase-setup.sql`.
- Confirm the tables exist.
- Hard refresh the site with Ctrl + Shift + R.
