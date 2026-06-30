/**
 * routes/uptime.js
 * -----------------
 * Live uptime status from public status page APIs (no API key needed).
 *
 * GET /api/uptime/status   - fetch status from GitHub, Cloudflare, npm
 * GET /api/uptime/check    - ping a custom URL (?url=)
 */

const express = require("express");
const axios   = require("axios");
const router  = express.Router();

const STATUS_SOURCES = [
  {
    name:           "GitHub",
    url:            "https://www.githubstatus.com/api/v2/status.json",
    indicatorPath:  ["status", "indicator"],
    descPath:       ["status", "description"],
  },
  {
    name:           "Cloudflare",
    url:            "https://www.cloudflarestatus.com/api/v2/status.json",
    indicatorPath:  ["status", "indicator"],
    descPath:       ["status", "description"],
  },
  {
    name:           "npm Registry",
    url:            "https://status.npmjs.org/api/v2/status.json",
    indicatorPath:  ["status", "indicator"],
    descPath:       ["status", "description"],
  },
];

/** Walk a nested object by an array of keys */
function getNestedValue(obj, keys) {
  return keys.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : "unknown"), obj);
}

router.get("/status", async (req, res) => {
  const results = await Promise.all(
    STATUS_SOURCES.map(async (source) => {
      try {
        const { data } = await axios.get(source.url, { timeout: 5000 });
        const indicator = getNestedValue(data, source.indicatorPath);
        const status    = getNestedValue(data, source.descPath);
        return { name: source.name, status, indicator, ok: indicator === "none" };
      } catch (err) {
        return { name: source.name, status: "Unreachable", indicator: "unknown", ok: false };
      }
    })
  );
  res.json(results);
});

router.get("/check", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Provide a URL via ?url=" });

  try {
    const response = await axios.head(url, { timeout: 5000, maxRedirects: 5 });
    const ok = response.status < 400;
    res.json({ url, status_code: response.status, ok, message: ok ? "Online" : "Error status" });
  } catch (err) {
    const status_code = err.response?.status || null;
    res.json({ url, status_code, ok: false, message: "Unreachable", error: err.message });
  }
});

module.exports = router;
