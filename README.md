# LAVA CarrierOps Training Portal

A standalone carrier-style insurance operations simulator for VA training. This version is static and runs directly on GitHub Pages, Netlify, or any basic web server.

## Features

- VA trainee login
- Trainer / Team Lead login with code `LAVA2026`
- Dashboard section
- Policy search by policy number or named insured
- Blank policy creation for practice
- New business Auto and Home quote workflow
- Carrier-style underwriting questions
- Carrier result generation with preferred, standard, referral, and declined outcomes
- Bind training policy from quote results
- Auto Insurance ID card generator
- Payment processing simulator
- Endorsement workflow and endorsement checklist
- Cancellation workflow and cancellation checklist
- Quoting and remarketing worksheet
- Work queue
- Trainer QA review
- Activity logs
- CSV exports
- JSON backup export/import
- Dark/light mode

## GitHub + Netlify Setup

1. Upload the contents of this folder to your GitHub repository.
2. Make sure `index.html` is in the root of the repository.
3. In Netlify, connect the GitHub repository.
4. Set the build command to blank.
5. Set the publish directory to `.`
6. Deploy.

## Important Training Notes

This simulator does not connect to real carriers, real payments, or real policy systems. All data is stored in the browser using localStorage unless exported/imported with the backup feature. Do not enter real customer sensitive information.
