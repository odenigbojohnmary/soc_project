/**
 * config.js
 * ---------
 * Loads MySQL connection settings from environment variables.
 * Defaults are suitable for local development.
 *
 * Set these in a .env file (see .env.example):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_TEST
 */

require("dotenv").config();

const DB_CONFIG = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "soc_db",
  multipleStatements: true,   // needed for init script
};

// Separate DB used by tests so real data is never touched
const TEST_DB_CONFIG = {
  ...DB_CONFIG,
  database: process.env.DB_TEST || "soc_test_db",
};

module.exports = { DB_CONFIG, TEST_DB_CONFIG };
