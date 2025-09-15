const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Detect production mode
const isProd = process.env.NODE_ENV === "production";

// In production, use userData folder (writable path outside app.asar)
const userDataPath = require("electron").app
  ? require("electron").app.getPath("userData")
  : path.resolve(__dirname); // fallback for dev

// Decide DB path
const dbPath = isProd
  ? path.join(userDataPath, "app.db") // ✅ safe writable path
  : path.join(__dirname, "app.db");

console.log("📂 Using database at:", dbPath);

// Copy app.db if not already there (first launch)
if (isProd && fs.existsSync(path.join(__dirname, "app.db")) && !fs.existsSync(dbPath)) {
  fs.copyFileSync(path.join(__dirname, "app.db"), dbPath);
  console.log("✅ Copied bundled database to userData folder");
}

// Open DB
const db = new Database(dbPath, {
  verbose: console.log,
  timeout: 5000,
});

// Enable PRAGMAs
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// Load schema if available
const schemaPath = path.join(__dirname, "schema.sql");
if (fs.existsSync(schemaPath)) {
  try {
    db.exec(fs.readFileSync(schemaPath, "utf8"));
    console.log("✅ Database schema verified");
  } catch (err) {
    console.error("❌ Error initializing DB schema:", err.message);
  }
}

module.exports = db;
