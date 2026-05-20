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
