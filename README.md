# LAVA CarrierOps Home & Auto New Business Quoting Simulator

Graded, scenario-based VA insurance training portal. Dependency-free static site (vanilla HTML/CSS/JS — no React/Vite bundler) with a Supabase backend and a localStorage demo fallback. Deployable to Vercel or Netlify.

> Training simulator. Use dummy data only. No real insured information. LAVA branding only — no real carrier branding.

## Run locally

```bash
npm start        # serves at http://localhost:5173 (zero-dependency dev server)
# or just open index.html directly in a browser
```

## Deploy to Vercel (recommended)

1. Push this folder to a Git repo and import it into Vercel.
2. Vercel reads `vercel.json` automatically:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. In Vercel → Project → Settings → Environment Variables, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon / publishable key (NEVER the service_role key)
   - *(optional)* `SUPABASE_BUCKET` (defaults to `carrier-documents`)
   - *(optional)* `LAVA_TRAINER_CODE` (defaults to `LAVA2026`)
4. Deploy. `build.js` copies the static site into `dist/` and regenerates `dist/js/config.js` from those env vars. If no env vars are set, the app still runs in localStorage demo mode.

The build refuses to run if a `service_role`/secret key is supplied, so only the public anon key can reach the frontend (Row Level Security protects the data).

## Deploy to Netlify (also supported)

Build command: `npm run build` · Publish directory: `dist` (or leave build blank and publish `.`). `netlify.toml` and `_redirects` are included.

## Folder Structure

```text
index.html
css/styles.css
js/config.js
js/store.js
js/app.js
data/carrier-questions.js
docs/supabase-setup.sql
docs/README-SUPABASE.md
images/
exports/
netlify.toml
_redirects
README.md
```

## Trainer / Admin Code

`LAVA2026` or `TRAINER2026` (either works). Trainer mode reveals answer keys, Trainer QA, and Audit Logs.

## Supabase setup

Run BOTH SQL files in the Supabase SQL Editor:

1. `docs/supabase-setup.sql` — the `carrier_*` tables the live app reads/writes today (login logs, quote sessions, quotes, policies, gradebook source, trainer reviews, audit, documents) + RLS + storage bucket.
2. `docs/supabase-newbusiness-schema.sql` — the documented New Business schema (`profiles`, `scenarios`, `scenario_files`, `quote_attempts`, `quote_answers`, `gradebook`, `trainer_reviews`) + RLS + the 4 seeded scenarios with answer keys. Provisioned and seeded for a future migration to Supabase Auth.

Then set the env vars (above) in Vercel, or for pure local testing paste your URL + anon key into `js/config.js`.


## Theme / Background Update

This version includes:

- Uploaded LAVA red-gradient background image
- Highlighted Dark Mode / Light Mode toggle
- Saved theme preference in browser localStorage
- Carrier portal UI remains fully clickable
- Supabase-ready activity dashboard remains included


## Expanded Realistic Carrier Questions

This version expands the Auto and Home quote workflows to better simulate a carrier portal.

### Auto Quote now includes:
- Transaction and agency setup
- Named insured/contact
- Mailing and garaging
- Prior insurance and current coverage
- Vehicle identification and use
- Additional vehicles
- Driver license and experience
- Household drivers/exclusions
- Incidents, violations, and losses
- Coverage selection
- Discounts, billing, and documents
- Carrier underwriting knockout questions

### Home Quote now includes:
- Transaction and agency setup
- Named insured/contact
- Property location and occupancy
- Property valuation and construction
- Roof, utilities, and home systems
- Protection, fire, and safety
- Prior insurance and loss history
- Coverage selection
- Optional endorsements
- Mortgagee, additional interests, and billing
- Risk hazards and liability exposure
- Carrier underwriting knockout questions


## Formal Organized Dashboard

This version includes:
- Formal Carrier Operations Dashboard header
- Executive Overview section
- VA Performance Monitor with login/quote timing
- Workflow Center
- Quote status summary
- Quick action buttons
- Recent Quote Sessions
- Recent Documentation Trail
- `images/red-gradient-bg.jpg` applied as the website background


## Home/Auto Ordered Scenario Upgrade - Original Style Preserved

This upgraded ZIP keeps the original CarrierOps simulator UI, CSS, dashboard, carrier workflow, policy tools, quote timer, localStorage fallback, and Trainer QA routes. The upgrade only adds the requested New Business scenario training layer.

### Added

- Ordered scenario sequence for every VA attempt:
  1. HOME-01 - Dallas Primary Home - New Purchase
  2. HOME-02 - Charlotte Existing Home - Reshop / New Business
  3. AUTO-01 - Two-Vehicle Family Auto - Bundle Opportunity
  4. AUTO-02 - Single Driver Auto - Coverage Upgrade
- Scenario Library route using the original card/button/table styling.
- Downloadable PDF for each scenario.
- Downloadable combined PDF packet: `public/scenarios/All_New_Business_Home_Auto_Scenarios.pdf`.
- Zillow/manual property verification fields added to the Home quote workflow.
- Automatic scenario grading against answer keys.
- Critical miss detection.
- Scenario Gradebook with CSV export.
- Trainer answer key access through Scenario Library / Trainer QA.

### Trainer Code

`LAVA2026`

### Run

Open `index.html`, or deploy the folder to Netlify with publish directory `.`.


## This Upgrade (Original Style Preserved)

The original CarrierOps UI, CSS, dashboard, navigation, carrier workflow tabs, quote timer, theme toggle, localStorage fallback, and Trainer QA were all kept. The upgrade only added the items below.

### Added in this version
- **Final Review Before Submit**: a review page that groups every entered answer by section, highlights missing required fields, flags obvious inconsistencies (e.g. Zillow year/sqft mismatch, financed vehicle with no lienholder, claims marked Yes but counts blank, effective vs expiration date), lets the trainee go back to edit, and requires a confirmation checkbox before the attempt is graded and saved.
- **Results enhancements**: "Download Result PDF" (client-side via jsPDF, with an automatic text fallback) and "Retry Scenario" buttons, plus explicit "saved to Gradebook" confirmation.
- **Both trainer codes**: `LAVA2026` and `TRAINER2026` accepted.
- **Vercel deployment**: `package.json`, `build.js` (static copy into `dist/` + env-var injection), `serve.js` (local dev server), `vercel.json`.
- **New Business Supabase schema + seed**: `docs/supabase-newbusiness-schema.sql`.

### Files added
- `build.js`, `serve.js`, `package.json`, `vercel.json`
- `docs/supabase-newbusiness-schema.sql`

### Files modified
- `js/app.js` — review gate, result PDF/retry, dual trainer code, defensive scroll
- `index.html` — jsPDF CDN, dual trainer-code help text, review/result containers
- `css/styles.css` — review-page styles (uses existing design tokens)
- `README.md` — this documentation

## Known limitations
- The live app persists graded attempts to the `carrier_*` tables (read by the Gradebook). The 7-table New Business schema is created and seeded but not yet the primary write path — it is provisioned for a future Supabase Auth migration.
- Result PDF generation uses the jsPDF CDN; if the CDN is blocked it falls back to a downloadable `.txt` result (no error).
- Demo RLS policies are permissive for `anon` so the simulator works without full auth. Tighten these (gate `answer_key` and trainer tables behind `profiles.role = 'Trainer'`) before any non-training use.
- Zillow is referenced by public link only — the app never scrapes or bypasses Zillow; trainees verify manually.
- The deployed anon Supabase key is public by design; it is safe only because RLS protects the data. Never put a service_role key on the frontend.
