// api/orders.js - Updated API route for managing orders & kitchen status
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;
  const urlParts = url.split('/');
  console.log(`[orders.js] Incoming ${method} request to ${url}`);

  // Environment variables for JSONBin
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const JSONBIN_ORDER_ID = process.env.JSONBIN_ORDER_ID;
  const JSONBIN_KITCHEN_STATUS_ID = process.env.JSONBIN_KITCHEN_STATUS_ID;

  if (!JSONBIN_API_KEY || !JSONBIN_ORDER_ID || !JSONBIN_KITCHEN_STATUS_ID) {
    console.error('[orders.js] Missing required environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

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

  // Helper to parse request body
  async function parseBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  }

  // ========== ROUTES ==========
  
  // Handle kitchen status routes first (more specific)
  if (url.includes('/kitchen-status')) {
    if (method === 'GET') {
      try {
        const data = await callJSONBin(JSONBIN_KITCHEN_STATUS_ID);
        return res.status(200).json(data.record || { isOpen: false });
      } catch (err) {
        console.error('[orders.js] Failed to get kitchen status:', err);
        return res.status(200).json({ isOpen: false }); // Default to closed
      }
    }
    
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        
        await callJSONBin(JSONBIN_KITCHEN_STATUS_ID, {
          method: "PUT",
          body: JSON.stringify(body),
        });

        return res.status(200).json({ success: true, ...body });
      } catch (err) {
        console.error('[orders.js] Failed to update kitchen status:', err);
        return res.status(500).json({ error: "Failed to update kitchen status" });
      }
    }
  }

  // Handle orders routes
  if (url.includes('/orders') && !url.includes('/kitchen-status')) {
    // GET all orders
    if (method === 'GET') {
      try {
        const data = await callJSONBin(JSONBIN_ORDER_ID);
        const orders = data.record || [];
        return res.status(200).json(Array.isArray(orders) ? orders : []);
      } catch (err) {
        console.error('[orders.js] Failed to get orders:', err);
        return res.status(200).json([]); // Return empty array on error
      }
    }

    // POST - Add new order or update entire orders array
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        
        // If body is an array, replace entire orders array
        if (Array.isArray(body)) {
          await callJSONBin(JSONBIN_ORDER_ID, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          
          return res.status(200).json({ 
            success: true, 
            message: body.length === 0 ? 'All orders cleared' : 'Orders updated',
            count: body.length 
          });
        } else {
          // Single order - add to existing orders
          const existing = await callJSONBin(JSONBIN_ORDER_ID);
          const existingOrders = Array.isArray(existing.record) ? existing.record : [];
          const updatedOrders = [...existingOrders, body];

          await callJSONBin(JSONBIN_ORDER_ID, {
            method: "PUT",
            body: JSON.stringify(updatedOrders),
          });

          return res.status(201).json({ 
            success: true, 
            message: 'Order created',
            order: body 
          });
        }
      } catch (err) {
        console.error('[orders.js] Failed to process orders:', err);
        return res.status(500).json({ error: "Failed to process orders" });
      }
    }
  }

  // 404 for everything else
  console.warn(`[orders.js] No matching route for ${method} ${url}`);
  return res.status(404).json({ error: "Endpoint not found" });
}