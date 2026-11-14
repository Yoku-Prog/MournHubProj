require("dotenv").config({ quiet: true });
const dns = require("dns");

// Optional workaround for networks whose resolver can't look up mongodb+srv records
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()));
}

const isProduction = process.env.NODE_ENV === "production";

const requiredVars = ["MONGO_URI", "SESSION_SECRET"];
if (isProduction) {
  requiredVars.push(
    "BASE_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  );
}

const missing = requiredVars.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

const baseUrl = (process.env.BASE_URL || "").replace(/\/+$/, "");

// Number of reverse proxies in front of the app. Needed for HTTPS detection
// (secure cookies) and for rate limiting by the visitor's real IP.
let trustProxy = isProduction ? 1 : 0;
if (process.env.TRUST_PROXY !== undefined) {
  trustProxy = Number(process.env.TRUST_PROXY);
}

module.exports = {
  isProduction,
  baseUrl,
  trustProxy,
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  sessionSecret: process.env.SESSION_SECRET,
  contactEmail: process.env.CONTACT_EMAIL || null,

  // Printed QR codes depend on this, so it comes from BASE_URL whenever it's set
  publicBaseUrl(req) {
    return baseUrl || `${req.protocol}://${req.get("host")}`;
  },
};
