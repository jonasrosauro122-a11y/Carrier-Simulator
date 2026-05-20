# LAVA CarrierOps Training Portal

Standalone Carrier Portal Simulator for GitHub + Netlify + Supabase.

## Deploy to Netlify

Build command: leave blank  
Publish directory: `.`

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

## Trainer Code

`LAVA2026`

## Important

Run `docs/supabase-setup.sql` in Supabase and update `js/config.js`.


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
