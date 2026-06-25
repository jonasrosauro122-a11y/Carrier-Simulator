/*
  LAVA CarrierOps - static build for Vercel (and any static host).
  ----------------------------------------------------------------
  This project is a dependency-free static site (no React/Vite bundler).
  This script simply copies the static assets into ./dist and, when the
  hosting platform provides Supabase environment variables, regenerates
  dist/js/config.js so the deployed app talks to Supabase.

  Recognised environment variables (anon/publishable key ONLY):
    VITE_SUPABASE_URL        (preferred, matches the project spec)
    VITE_SUPABASE_ANON_KEY   (preferred, matches the project spec)
    SUPABASE_URL             (accepted alias)
    SUPABASE_ANON_KEY        (accepted alias)
    SUPABASE_BUCKET          (optional, defaults to carrier-documents)
    LAVA_TRAINER_CODE        (optional, defaults to LAVA2026)

  NEVER set a service_role / secret key here. Only the public anon key
  belongs on the frontend; Row Level Security protects the data.

  If no Supabase env vars are present, the committed js/config.js is used
  as-is and the app keeps working in localStorage demo/fallback mode.
*/
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");

// Files / folders that make up the deployable static site.
const ASSETS = ["index.html", "css", "js", "data", "images", "public", "_redirects", "netlify.toml"];

function rimraf(target){
  if(fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyRecursive(src, dest){
  const stat = fs.statSync(src);
  if(stat.isDirectory()){
    fs.mkdirSync(dest, { recursive: true });
    for(const entry of fs.readdirSync(src)){
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  }else{
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function buildConfig(){
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const anon = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  const bucket = (process.env.SUPABASE_BUCKET || "carrier-documents").trim();
  const trainer = (process.env.LAVA_TRAINER_CODE || "LAVA2026").trim();

  if(!url || !anon){
    console.log("[build] No Supabase env vars detected. Using committed js/config.js (localStorage fallback stays available).");
    return; // leave the copied config.js untouched
  }

  // Safety: refuse to embed an obvious service-role/secret key on the frontend.
  if(/service_role/i.test(anon) || /^sb_secret/i.test(anon)){
    console.error("[build] Refusing to build: a service_role/secret key was supplied. Use the anon/publishable key only.");
    process.exit(1);
  }

  const cfg = `/* Auto-generated at build time from Vercel environment variables. Do not edit by hand. */
window.LAVA_SUPABASE = {
  url: ${JSON.stringify(url)},
  anonKey: ${JSON.stringify(anon)},
  bucket: ${JSON.stringify(bucket)}
};
window.LAVA_TRAINER_CODE = ${JSON.stringify(trainer)};
`;
  fs.mkdirSync(path.join(OUT, "js"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "js", "config.js"), cfg, "utf8");
  console.log("[build] Injected Supabase config from environment variables (anon key only).");
}

function main(){
  console.log("[build] Building static site into ./dist ...");
  rimraf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  for(const asset of ASSETS){
    const src = path.join(ROOT, asset);
    if(fs.existsSync(src)){
      copyRecursive(src, path.join(OUT, asset));
    }else{
      console.log(`[build] Skipping missing asset: ${asset}`);
    }
  }

  buildConfig();
  console.log("[build] Done. Output directory: dist");
}

main();
