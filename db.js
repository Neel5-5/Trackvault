const initSqlJs = require("sql.js");
const path = require("path");
const fs   = require("fs");

const DB_PATH  = process.env.DB_PATH || path.join(__dirname, "data/events.db");
const DATA_DIR = path.dirname(DB_PATH);

let db;

async function init() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const fileExists = fs.existsSync(DB_PATH);
  db = fileExists
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      path      TEXT    NOT NULL,
      referrer  TEXT,
      ua        TEXT,
      w         INTEGER,
      h         INTEGER,
      sid       TEXT    NOT NULL,
      ts        INTEGER NOT NULL,
      ip        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ts  ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_sid ON events(sid);
  `);
  save();
}

function save() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

setInterval(save, 5000);
process.on("exit", save);
process.on("SIGINT", () => { save(); process.exit(); });

function addEvent(evt) {
  db.run(
    `INSERT INTO events (path, referrer, ua, w, h, sid, ts, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [evt.path, evt.referrer, evt.ua, evt.w, evt.h, evt.sid, evt.ts, evt.ip]
  );
}

function getStats(since) {
  const sinceMs = since || 0;
  const q = (sql) => db.exec(sql, [sinceMs]);
  const toRows = (res, keys) =>
    res.length ? res[0].values.map(r => Object.fromEntries(keys.map((k, i) => [k, r[i]]))) : [];

  const pageviews = q("SELECT COUNT(*) as n FROM events WHERE ts >= ?")[0].values[0][0];
  const uniques   = q("SELECT COUNT(DISTINCT sid) as n FROM events WHERE ts >= ?")[0].values[0][0];
  const topPages  = toRows(q(`SELECT path, COUNT(*) as views FROM events WHERE ts >= ? GROUP BY path ORDER BY views DESC LIMIT 10`), ["path","views"]);
  const referrers = toRows(q(`SELECT referrer, COUNT(*) as views FROM events WHERE ts >= ? AND referrer != '' GROUP BY referrer ORDER BY views DESC LIMIT 10`), ["referrer","views"]);
  const daily     = toRows(q(`SELECT date(ts/1000, 'unixepoch') as day, COUNT(*) as views, COUNT(DISTINCT sid) as visitors FROM events WHERE ts >= ? GROUP BY day ORDER BY day ASC`), ["day","views","visitors"]);

  return { pageviews, uniques, topPages, referrers, daily };
}

module.exports = { init, addEvent, getStats };
