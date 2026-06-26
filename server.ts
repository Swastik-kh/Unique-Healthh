import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // HIB Helper to get auth header
  const getHIBAuth = (req: express.Request) => {
    const headerUser = req.headers['x-hib-username'] as string;
    const headerPass = req.headers['x-hib-password'] as string;
    const username = (headerUser && headerUser.trim() !== '') ? headerUser : (process.env.HIB_USERNAME || 'testuser');
    const password = (headerPass && headerPass.trim() !== '') ? headerPass : (process.env.HIB_PASSWORD || 'f/\\N6k@67');
    return Buffer.from(`${username}:${password}`).toString('base64');
  };

  const getHIBHeaders = (req: express.Request) => {
    const remoteUserHeader = req.headers['x-hib-remote-user'] as string;
    const remoteUser = (remoteUserHeader && remoteUserHeader.trim() !== '' && remoteUserHeader !== 'undefined') ? remoteUserHeader : (process.env.HIB_REMOTE_USER || 'hib_testuser_testfhir');
    
    const headers: any = {
      'Authorization': `Basic ${getHIBAuth(req)}`,
      'remote-user': remoteUser,
      'Content-Type': 'application/json'
    };

    const partnerId = req.headers['x-hib-partner-id'] as string;
    const locationId = req.headers['x-hib-location-id'] as string;

    if (partnerId && partnerId.trim() !== '' && partnerId !== 'undefined') {
      headers['partner-id'] = partnerId;
    }
    if (locationId && locationId.trim() !== '' && locationId !== 'undefined') {
      headers['location-id'] = locationId;
    }

    return headers;
  };

  // HIB API Routes
  app.get("/api/hib/patient/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = (req.headers['x-hib-base-url'] as string);
      if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
        baseUrl = process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      }
      
      // Sanitize baseUrl: remove trailing slash if present
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // Ensure protocol
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }
      
      const targetUrl = `${baseUrl}/api/api_fhir/Patient?identifier=${id}`;
      console.log(`HIB Search URL: ${targetUrl}`);
      
      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      // If we get an HTML response (likely an error page or redirect), return error
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
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
    } catch (error: any) {
      const errorData = error.response?.data;
      const status = error.response?.status || 500;
      console.error(`HIB Patient Search Error [${status}]:`, errorData || error.message);
      
      res.status(status).json({
        error: errorData?.message || errorData?.error || error.message || "Failed to search patient",
        details: errorData,
        status: status
      });
    }
  });

  app.get("/api/hib/coverage/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = (req.headers['x-hib-base-url'] as string);
      if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
        baseUrl = process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      }
      
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      const targetUrl = `${baseUrl}/api/api_fhir/Coverage?identifier=${id}`;
      
      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true // Handle all status codes
      });
      
      // If we get an HTML response (likely an error page or redirect), return empty bundle or error
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
        console.error("HIB Coverage returned HTML instead of FHIR bundle for ID:", id);
        // If it's a 401/403, it's an auth error
        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ error: "HIB Authentication Failed. Please check your credentials." });
        }
        return res.json({ resourceType: "Bundle", entry: [] });
      }
      
      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error("HIB Coverage Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search coverage" });
    }
  });

  app.post("/api/hib/eligibility", async (req, res) => {
    try {
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.post(`${baseUrl}api/api_fhir/EligibilityRequest/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Eligibility Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to check eligibility" });
    }
  });

  app.post("/api/hib/claim", async (req, res) => {
    try {
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.post(`${baseUrl}api/api_fhir/Claim/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Claim Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to submit claim" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
