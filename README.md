# LAVA Carrier Portal Training Simulator

Standalone static insurance carrier portal simulator for VA training. No npm, no Vite, no Next.js, and no build command required.

## Folder Structure

```text
lava-carrier-training-portal/
├── index.html
├── css/
│   └── portal.css
├── js/
│   └── app.js
├── data/
│   └── carriers.js
├── images/
│   ├── logo.svg
│   └── favicon.svg
├── docs/
├── netlify.toml
├── _redirects
└── README.md
```

## Netlify Deployment

1. Upload the contents of this folder to your GitHub repository root.
2. In Netlify, connect the GitHub repository.
3. Set **Build command** to blank / empty.
4. Set **Publish directory** to `.`
5. Deploy.

## Login

- VA trainees can log in using their name, email, and batch.
- Trainer/TL access code: `LAVA2026`
- This is for training only. The login is local browser storage, not a real secure authentication system.

## Features

- Standalone `index.html` app
- VA training login and login logs
- Trainer/TL dashboard
- Auto and Home new business quote workflow
- Realistic carrier portal-style questions
- No Easy / Normal / Hard scenario buttons
- Carrier appetite guide
- Quote work queue
- Quote results with Bindable / Referral / Declined status
- CSV export
- Print / Save as PDF
- Dark mode
- Local browser storage

## Important Training Disclaimer

This simulator does not create real insurance quotes, policies, bind requests, or customer transactions. It is only a training environment for VA workflow practice.
