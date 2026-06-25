/*
  Minimal zero-dependency static file server for local development.
  Usage: npm start  (or: node serve.js)  -> http://localhost:5173
  This is for LOCAL preview only. Production is served by Vercel from ./dist.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  try{
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if(urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
    if(!filePath.startsWith(ROOT)){ res.writeHead(403); return res.end("Forbidden"); }
    if(!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()){
      // Hash routing means everything else falls back to index.html
      const fallback = fs.readFileSync(path.join(ROOT, "index.html"));
      res.writeHead(200, { "Content-Type": TYPES[".html"] });
      return res.end(fallback);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  }catch(err){
    res.writeHead(500); res.end("Server error: " + err.message);
  }
}).listen(PORT, () => {
  console.log(`LAVA CarrierOps dev server running at http://localhost:${PORT}`);
});
