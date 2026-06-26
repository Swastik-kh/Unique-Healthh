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
    const username = (req.headers['x-hib-username'] as string) || process.env.HIB_USERNAME || 'testuser';
    const password = (req.headers['x-hib-password'] as string) || process.env.HIB_PASSWORD || 'f/\\N6k@67';
    return Buffer.from(`${username}:${password}`).toString('base64');
  };

  const getHIBHeaders = (req: express.Request) => {
    const headers: any = {
      'Authorization': `Basic ${getHIBAuth(req)}`,
      'remote-user': (req.headers['x-hib-remote-user'] as string) || process.env.HIB_REMOTE_USER || 'hib_testuser_testfhir',
      'Content-Type': 'application/json'
    };

    if (req.headers['x-hib-partner-id']) {
      headers['partner-id'] = req.headers['x-hib-partner-id'];
    }
    if (req.headers['x-hib-location-id']) {
      headers['location-id'] = req.headers['x-hib-location-id'];
    }

    return headers;
  };

  // HIB API Routes
  app.get("/api/hib/patient/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.get(`${baseUrl}api/api_fhir/Patient/?identifier=${id}`, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Patient Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search patient" });
    }
  });

  app.get("/api/hib/coverage/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.get(`${baseUrl}api/api_fhir/Coverage/?identifier=${id}`, {
        headers: getHIBHeaders(req),
        validateStatus: () => true // Handle all status codes
      });
      
      // If we get an HTML response (likely an error page or redirect), return empty bundle
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
        console.error("HIB Coverage returned HTML instead of FHIR bundle for ID:", id);
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
