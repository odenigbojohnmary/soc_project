/**
 * server.js
 * ---------
 * Express application entry point.
 *
 * - Creates a MySQL connection pool and attaches it to every request (req.db)
 * - Registers all route modules
 * - Serves the frontend as static files
 * - Initialises the database schema on startup
 */

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { getPool, initDB } = require("./db");
const { DB_CONFIG }       = require("./config");

const app = express();

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------
app.use(cors());                        // Allow requests from the frontend
app.use(express.json());                // Parse JSON request bodies

// Attach the MySQL pool to every request so routes can use req.db
const pool = getPool(DB_CONFIG);
app.use((req, _res, next) => {
  req.db = pool;
  next();
});

// ------------------------------------------------------------------
// API Routes
// ------------------------------------------------------------------
app.use("/api/incidents/:id/notes", require("./routes/notes"));   // must come first
app.use("/api/incidents",           require("./routes/incidents"));
app.use("/api/staff",               require("./routes/staff"));
app.use("/api/assets",              require("./routes/assets"));
app.use("/api/uptime",              require("./routes/uptime"));
app.use("/api/cve",                 require("./routes/cve"));
app.use("/api/dashboard",           require("./routes/dashboard"));

// ------------------------------------------------------------------
// Serve frontend (HTML + JS)
// ------------------------------------------------------------------
const FRONTEND = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND));

// Catch-all: send index.html for any unmatched route
app.get("*", (_req, res) => res.sendFile(path.join(FRONTEND, "index.html")));

// ------------------------------------------------------------------
// Start server
// ------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

async function start() {
  await initDB(DB_CONFIG);             // Create DB and tables if needed
  app.listen(PORT, () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
  });
}

// Only start if run directly (not when required by tests)
if (require.main === module) {
  start().catch(console.error);
}

module.exports = { app, pool };        // exported for Supertest
