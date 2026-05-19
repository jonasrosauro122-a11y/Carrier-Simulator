# LAVA CarrierOps Enterprise Training Simulator

A standalone, Netlify-ready carrier portal simulator for VA insurance training.

## What is included

- VA login and Trainer/TL login
- Trainer code: `LAVA2026`
- Dashboard
- Policy search by policy number or named insured
- Blank carrier-style Auto and Home quoting workflows
- Auto insurance ID card generator
- Payment Center
- Endorsement processing workflow
- Policy cancellation workflow
- Quoting and remarketing workflow
- Work queue
- Trainer QA review center
- SOP/process guide
- CSV export
- JSON backup export/import
- Dark mode
- Local browser storage

## GitHub + Netlify setup

1. Upload the folder contents to a GitHub repository.
2. Your repository root must contain `index.html` directly.
3. In Netlify, connect the GitHub repository.
4. Build command: leave blank.
5. Publish directory: `.`
6. Deploy.

## Important notes

This is a static training simulator. It does not connect to a real carrier, real payment processor, or real policy system. All records are stored in the browser using localStorage unless exported as JSON.

To reset training data, clear browser site data/localStorage or use a fresh browser profile.
