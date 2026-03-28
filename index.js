const express = require("express");
const path    = require("path");
const { init, addEvent, getStats } = require("./db");

const app   = express();
const PORT  = process.env.PORT || 3000;
const TOKEN = process.env.DASHBOARD_TOKEN || "";

app.use(express.json());
app.use(express.static(__dirname));

app.use("/event", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("/event", (_, res) => res.sendStatus(204));

app.post("/event", (req, res) => {
  const { path: p, referrer, ua, w, h, sid, ts } = req.body || {};
  if (!sid || !p) return res.sendStatus(400);
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
  addEvent({ path: p, referrer: referrer || "", ua: ua || "", w: w || 0, h: h || 0, sid, ts: ts || Date.now(), ip });
  res.sendStatus(204);
});

function auth(req, res, next) {
  if (!TOKEN) return next();
  const t = req.query.token || req.headers["x-token"];
  if (t !== TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/api/stats", auth, (req, res) => {
  const range = parseInt(req.query.range) || 7;
  const sinceMs = Date.now() - range * 24 * 60 * 60 * 1000;
  res.json(getStats(sinceMs));
});

init().then(() => {
  app.listen(PORT, () => console.log(`Trackvault → http://localhost:${PORT}/dashboard.html`));
}).catch(err => {
  console.error("DB init failed:", err);
  process.exit(1);
});
