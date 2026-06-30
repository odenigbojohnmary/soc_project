# Attributions

This file documents all external resources, libraries, APIs, and assistance
used in the JavaScript version of the SOC Incident Log project, as required
by the Dublin Business School assignment brief and Academic Integrity Policy.

---

## npm Libraries & Frameworks

| Package         | Version  | Purpose                                        | Licence    | URL                                          |
|-----------------|----------|------------------------------------------------|------------|----------------------------------------------|
| express         | ^4.19.2  | Web framework — REST API routing and middleware | MIT        | https://expressjs.com                        |
| mysql2          | ^3.10.0  | MySQL driver with Promise/async-await support  | MIT        | https://github.com/sidorares/node-mysql2     |
| axios           | ^1.7.2   | HTTP client for NVD API and uptime checks      | MIT        | https://axios-http.com                       |
| cors            | ^2.8.5   | Cross-Origin Resource Sharing middleware       | MIT        | https://github.com/expressjs/cors            |
| dotenv          | ^16.4.5  | Loads environment variables from .env file     | BSD-2      | https://github.com/motdotla/dotenv           |
| jest            | ^29.7.0  | JavaScript testing framework                   | MIT        | https://jestjs.io                            |
| supertest       | ^7.0.0   | HTTP assertions for testing Express routes     | MIT        | https://github.com/ladjs/supertest           |

Node.js built-in modules used (no external install required):
- `path` — file path resolution for serving static frontend files
- `fs` / `stream` — used internally by Express for static file serving

---

## External APIs

| API                          | Usage                                                | Terms of Use                                              |
|------------------------------|------------------------------------------------------|-----------------------------------------------------------|
| NIST NVD REST API v2         | CVE lookup — returns description, CVSS score, severity | Public domain — https://nvd.nist.gov/developers/vulnerabilities |
| GitHub Status API            | Live uptime status check for dashboard               | Public — https://www.githubstatus.com                     |
| Cloudflare Status API        | Live uptime status check for dashboard               | Public — https://www.cloudflarestatus.com                 |
| npm Registry Status API      | Live uptime status check for dashboard               | Public — https://status.npmjs.org                        |

All APIs are used in read-only mode, within their fair use guidelines, and require no API key for the usage patterns implemented in this project.

---

## Learning Resources & Documentation Referenced

| Resource                                  | URL                                                                 | Used For                              |
|-------------------------------------------|---------------------------------------------------------------------|---------------------------------------|
| Express.js Official Documentation         | https://expressjs.com/en/4x/api.html                               | Routing, middleware, static files     |
| mysql2 README                             | https://github.com/sidorares/node-mysql2#readme                    | Connection pool, prepared statements  |
| MDN Web Docs — Fetch API                  | https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API         | Frontend API calls                    |
| MDN Web Docs — async/await                | https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises | Async patterns           |
| Jest Documentation                        | https://jestjs.io/docs/getting-started                             | Test structure, mocking               |
| Supertest GitHub README                   | https://github.com/ladjs/supertest#readme                          | HTTP integration testing              |
| NIST NVD API Documentation                | https://nvd.nist.gov/developers/vulnerabilities                    | CVE lookup endpoint and response shape|
| Axios Documentation                       | https://axios-http.com/docs/intro                                  | Making HTTP requests from Node.js     |
| Node.js dotenv Documentation              | https://github.com/motdotla/dotenv#readme                          | Loading .env credentials              |
| MySQL 8 Reference Manual                  | https://dev.mysql.com/doc/refman/8.0/en/                           | SQL syntax, ENUM types, FK constraints|

---

## Generative AI Assistance

Portions of this project were developed with assistance from **Claude** (Anthropic).

Specifically, Claude assisted with:
- Initial system architecture design and selection of the Node.js/Express/MySQL stack
- Scaffolding of route file structure and boilerplate Express patterns
- Writing Jest + Supertest test structure and mock patterns for the NVD API
- Drafting the README.md and ATTRIBUTIONS.md documentation

**All AI-assisted code was:**
- Reviewed and understood by the student before inclusion
- Modified and adapted to fit the specific project requirements
- Committed incrementally alongside original student-written code

In accordance with the **DBS Generative AI Guidelines**, this assistance is fully disclosed here and acknowledged in the repository commit history. The submitted work demonstrates the student's own understanding and has been adapted beyond the AI-generated scaffolding.

---

## Code Patterns & Conventions Referenced

| Pattern                              | Source / Inspiration                                                  |
|--------------------------------------|-----------------------------------------------------------------------|
| Express route modularisation         | Express.js official routing guide — https://expressjs.com/en/guide/routing.html |
| mysql2 connection pool pattern       | mysql2 official examples — https://github.com/sidorares/node-mysql2/tree/master/examples |
| Jest mock for axios                  | Jest mock documentation — https://jestjs.io/docs/mock-functions       |
| Supertest test client pattern        | Supertest README examples                                             |
| Pagination with LIMIT/OFFSET         | MySQL pagination best practices — https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html |
| CSV generation without a library     | MDN Streams API + Node.js string handling                             |

---

## Summary

All third-party code, libraries, APIs, and AI assistance used in this project
are attributed above. No code has been plagiarised or submitted without
acknowledgement. All licences (MIT, BSD) permit use in student projects
without restriction, provided attribution is given — which this file provides.

**Student:** Johnmary Odenigbo  
**Module:** Information Systems Development  
**Institution:** Dublin Business School  
**Submission:** Week 12
