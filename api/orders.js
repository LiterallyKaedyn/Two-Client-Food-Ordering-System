// orders.js - API route for managing orders & kitchen status
export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  console.log(`[orders.js] Incoming ${method} request to ${pathname}`);

  // Environment variables for JSONBin
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const JSONBIN_ORDER_ID = process.env.JSONBIN_ORDER_ID;
  const JSONBIN_KITCHEN_STATUS_ID = process.env.JSONBIN_KITCHEN_STATUS_ID;

  // Helper to call JSONBin
  async function callJSONBin(binId, options = {}) {
    const url = `https://api.jsonbin.io/v3/b/${binId}`;
    try {
      const response = await fetch(url, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'Content-Type': 'application/json',
        },
        ...options,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[orders.js] JSONBin error (${response.status}): ${text}`);
        throw new Error(`JSONBin responded with ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`[orders.js] Failed to call JSONBin:`, err);
      throw err;
    }
  }

  // ========== ROUTES ==========
  // GET all orders
  if (pathname === "/api/orders" && method === "GET") {
    try {
      const data = await callJSONBin(JSONBIN_ORDER_ID);
      return res.status(200).json(data.record || []);
    } catch (err) {
      return res.status(500).json({ error: "Failed to get orders" });
    }
  }

  // POST new order
  if (pathname === "/api/orders" && method === "POST") {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(JSON.parse(data || '{}')));
        req.on('error', reject);
      });

      const existing = await callJSONBin(JSONBIN_ORDER_ID);
      const updatedOrders = [...(existing.record || []), body];

      await callJSONBin(JSONBIN_ORDER_ID, {
        method: "PUT",
        body: JSON.stringify(updatedOrders),
      });

      return res.status(201).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to add order" });
    }
  }

  // GET kitchen status
  if (pathname === "/api/orders/kitchen-status" && method === "GET") {
    try {
      const data = await callJSONBin(JSONBIN_KITCHEN_STATUS_ID);
      return res.status(200).json(data.record || {});
    } catch (err) {
      return res.status(500).json({ error: "Failed to get kitchen status" });
    }
  }

  // POST kitchen status update
  if (pathname === "/api/orders/kitchen-status" && method === "POST") {
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(JSON.parse(data || '{}')));
        req.on('error', reject);
      });

      await callJSONBin(JSONBIN_KITCHEN_STATUS_ID, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update kitchen status" });
    }
  }

  // 404 for everything else
  console.warn(`[orders.js] No matching route for ${method} ${pathname}`);
  return res.status(404).json({ error: "Endpoint not found" });
}
