/**
 * db.js
 * -----
 * MySQL connection pool and schema initialisation.
 *
 * Uses mysql2/promise for async/await support.
 * A connection pool is used so multiple requests can be handled concurrently.
 *
 * Key differences from the Python version:
 *   - Placeholders are ?  (mysql2 syntax)
 *   - Rows are returned as plain JS objects (no row_factory needed)
 *   - pool.execute() is used for queries (auto-prepares statements)
 */

const mysql  = require("mysql2/promise");
const { DB_CONFIG } = require("./config");

let pool = null;

/**
 * Returns the shared connection pool, creating it on first call.
 * Pass a custom config object to override defaults (used in tests).
 */
function getPool(config = null) {
  if (!pool || config) {
    return mysql.createPool(config || DB_CONFIG);
  }
  return pool;
}

/**
 * Initialise the database:
 *   1. Create the database if it does not exist
 *   2. Create all tables
 * Safe to call on every startup (uses IF NOT EXISTS).
 */
async function initDB(config = null) {
  const cfg    = config || DB_CONFIG;
  const dbName = cfg.database;

  // Step 1 — connect without specifying the database to CREATE it
  const rootPool = mysql.createPool({ ...cfg, database: undefined });
  await rootPool.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootPool.end();
  console.log(`[DB] Database '${dbName}' ready.`);

  // Step 2 — connect to the database and create tables
  const dbPool = mysql.createPool(cfg);

  // ------------------------------------------------------------------
  // STAFF table
  // ------------------------------------------------------------------
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id         INT          NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120) NOT NULL,
      role       ENUM('analyst','manager') NOT NULL DEFAULT 'analyst',
      email      VARCHAR(180) NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_staff_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ------------------------------------------------------------------
  // ASSETS table
  // ------------------------------------------------------------------
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS assets (
      id         INT          NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120) NOT NULL,
      url        VARCHAR(500),
      type       ENUM('web','server','network','application') NOT NULL DEFAULT 'web',
      owner      VARCHAR(120),
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ------------------------------------------------------------------
  // INCIDENTS table
  // ------------------------------------------------------------------
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS incidents (
      id          INT          NOT NULL AUTO_INCREMENT,
      title       VARCHAR(255) NOT NULL,
      type        ENUM('breach','alert','outage','vulnerability') NOT NULL,
      severity    ENUM('critical','high','medium','low')          NOT NULL,
      status      ENUM('open','investigating','resolved')         NOT NULL DEFAULT 'open',
      description TEXT,
      cve_id      VARCHAR(30),
      cvss_score  DECIMAL(4,1),
      asset_id    INT,
      assigned_to INT,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      PRIMARY KEY (id),
      CONSTRAINT fk_incident_asset FOREIGN KEY (asset_id)    REFERENCES assets(id) ON DELETE SET NULL,
      CONSTRAINT fk_incident_staff FOREIGN KEY (assigned_to) REFERENCES staff(id)  ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ------------------------------------------------------------------
  // INCIDENT_NOTES table
  // Audit trail of analyst investigation notes per incident.
  // ------------------------------------------------------------------
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS incident_notes (
      id          INT  NOT NULL AUTO_INCREMENT,
      incident_id INT  NOT NULL,
      author_id   INT,
      note        TEXT NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_note_incident FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      CONSTRAINT fk_note_author   FOREIGN KEY (author_id)   REFERENCES staff(id)     ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await dbPool.end();
  console.log("[DB] Tables created / verified.");
}

// Run directly: node backend/db.js
if (require.main === module) {
  initDB().catch(console.error);
}

module.exports = { getPool, initDB };
