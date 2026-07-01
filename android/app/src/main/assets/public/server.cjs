var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_axios = __toESM(require("axios"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const getHIBAuth = (req) => {
    const headerUser = req.headers["x-hib-username"];
    const headerPass = req.headers["x-hib-password"];
    const username = headerUser && headerUser.trim() !== "" ? headerUser : process.env.HIB_USERNAME || "testuser";
    const password = headerPass && headerPass.trim() !== "" ? headerPass : process.env.HIB_PASSWORD || "f/\\N6k@67";
    return Buffer.from(`${username}:${password}`).toString("base64");
  };
  const getHIBHeaders = (req) => {
    const remoteUserHeader = req.headers["x-hib-remote-user"];
    const remoteUser = remoteUserHeader && remoteUserHeader.trim() !== "" && remoteUserHeader !== "undefined" ? remoteUserHeader : process.env.HIB_REMOTE_USER || "hib_testuser_testfhir";
    const headers = {
      "Authorization": `Basic ${getHIBAuth(req)}`,
      "remote-user": remoteUser,
      "Content-Type": "application/json"
    };
    const partnerId = req.headers["x-hib-partner-id"];
    const locationId = req.headers["x-hib-location-id"];
    if (partnerId && partnerId.trim() !== "" && partnerId !== "undefined") {
      headers["partner-id"] = partnerId;
    }
    if (locationId && locationId.trim() !== "" && locationId !== "undefined") {
      headers["location-id"] = locationId;
    }
    return headers;
  };
  app.get("/api/debug/ip", async (req, res) => {
    try {
      console.log("Checking outbound IP via ipify...");
      let ip = "";
      try {
        const response = await import_axios.default.get("https://api.ipify.org?format=json", { timeout: 5e3 });
        ip = response.data.ip;
      } catch (e) {
        console.warn("ipify failed, trying icanhazip...");
        const response = await import_axios.default.get("https://icanhazip.com", { timeout: 5e3 });
        ip = response.data.trim();
      }
      console.log("Outbound IP detected:", ip);
      res.json({ outboundIp: ip, note: "Provide this IP to HIB for whitelisting." });
    } catch (error) {
      console.error("IP check failed:", error.message);
      res.status(500).json({ error: "Failed to fetch outbound IP", details: error.message });
    }
  });
  app.get("/api/hib/patient/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = req.headers["x-hib-base-url"];
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const targetUrl = `${baseUrl}/api/api_fhir/Patient/?identifier=${id}`;
      console.log(`HIB Search URL: ${targetUrl}`);
      const response = await import_axios.default.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });
      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
        console.error("HIB Patient Search returned HTML for ID:", id);
        return res.status(response.status || 500).json({
          error: "HIB Server returned an error page instead of patient data.",
          status: response.status,
          url: targetUrl,
          message: "Authentication failed or IP not whitelisted."
        });
      }
      if (response.status === 404) {
        return res.status(404).json({
          error: "HIB Endpoint not found (404)",
          url: targetUrl,
          details: response.data
        });
      }
      res.status(response.status).json(response.data);
    } catch (error) {
      const errorData = error.response?.data;
      const status = error.response?.status || 500;
      console.error(`HIB Patient Search Error [${status}]:`, errorData || error.message);
      res.status(status).json({
        error: errorData?.message || errorData?.error || error.message || "Failed to search patient",
        details: errorData,
        status
      });
    }
  });
  app.get("/api/hib/coverage/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = req.headers["x-hib-base-url"];
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const targetUrl = `${baseUrl}/api/api_fhir/Coverage/?identifier=${id}`;
      const response = await import_axios.default.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
        // Handle all status codes
      });
      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
        console.error("HIB Coverage returned HTML instead of FHIR bundle for ID:", id);
        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ error: "HIB Authentication Failed. Please check your credentials." });
        }
        return res.json({ resourceType: "Bundle", entry: [] });
      }
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error("HIB Coverage Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search coverage" });
    }
  });
  app.post("/api/hib/eligibility", async (req, res) => {
    try {
      const baseUrl = req.headers["x-hib-base-url"] || process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      const response = await import_axios.default.post(`${baseUrl}api/api_fhir/EligibilityRequest/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error) {
      console.error("HIB Eligibility Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to check eligibility" });
    }
  });
  app.post("/api/hib/claim", async (req, res) => {
    try {
      const baseUrl = req.headers["x-hib-base-url"] || process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      const response = await import_axios.default.post(`${baseUrl}api/api_fhir/Claim/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error) {
      console.error("HIB Claim Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to submit claim" });
    }
  });
  app.get("/api/hib/claim/search", async (req, res) => {
    try {
      const { chfid, date_claimed } = req.query;
      if (!chfid || !date_claimed) {
        return res.status(400).json({ error: "chfid and date_claimed are required query parameters" });
      }
      let baseUrl = req.headers["x-hib-base-url"];
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }
      const targetUrl = `${baseUrl}/api/api_fhir/claim/code/search/?chfid=${chfid}&date_claimed=${date_claimed}`;
      console.log(`HIB Claim Search URL: ${targetUrl}`);
      const response = await import_axios.default.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });
      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
        console.error("HIB Claim Search returned HTML for chfid:", chfid);
        return res.status(response.status || 500).json({
          error: "HIB Server returned an error page instead of search data.",
          status: response.status,
          url: targetUrl
        });
      }
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error("HIB Claim Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search claim code" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
