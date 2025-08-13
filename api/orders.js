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
  console.log(`[orders.js] Incoming ${method} request to ${url}`);

  // Environment variables for JSONBin
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const JSONBIN_DATA_ID = process.env.JSONBIN_DATA_ID; // Single bin for all data

  if (!JSONBIN_API_KEY || !JSONBIN_DATA_ID) {
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

  // Helper to get current data structure
  async function getCurrentData() {
    try {
      const response = await callJSONBin(JSONBIN_DATA_ID);
      const data = response.record || {};
      
      // Ensure proper data structure
      return {
        orders: Array.isArray(data.orders) ? data.orders : [],
        completedOrders: Array.isArray(data.completedOrders) ? data.completedOrders : [],
        kitchenOpen: typeof data.kitchenOpen === 'boolean' ? data.kitchenOpen : false,
        nextOrderId: typeof data.nextOrderId === 'number' ? data.nextOrderId : 1
      };
    } catch (err) {
      console.warn('[orders.js] Could not get existing data, using defaults:', err.message);
      return {
        orders: [],
        completedOrders: [],
        kitchenOpen: false,
        nextOrderId: 1
      };
    }
  }

  // Helper to save data structure
  async function saveData(data) {
    await callJSONBin(JSONBIN_DATA_ID, {
      method: "PUT",
      body: JSON.stringify(data),
    });
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

  // Generate order ID with proper formatting
  function generateOrderId(nextId) {
    return nextId.toString().padStart(3, '0');
  }

  // ========== ROUTES ==========
  
  // Handle kitchen status routes first (more specific)
  if (url.includes('/kitchen-status')) {
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        return res.status(200).json({ 
          isOpen: data.kitchenOpen,
          lastUpdated: data.lastUpdated || null
        });
      } catch (err) {
        console.error('[orders.js] Failed to get kitchen status:', err);
        return res.status(200).json({ isOpen: false }); // Default to closed
      }
    }
    
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        const data = await getCurrentData();
        
        // Update kitchen status
        data.kitchenOpen = body.isOpen;
        data.lastUpdated = body.lastUpdated || new Date().toISOString();
        
        await saveData(data);

        return res.status(200).json({ 
          success: true, 
          isOpen: data.kitchenOpen,
          lastUpdated: data.lastUpdated
        });
      } catch (err) {
        console.error('[orders.js] Failed to update kitchen status:', err);
        return res.status(500).json({ error: "Failed to update kitchen status" });
      }
    }
  }

  // Handle orders routes
  if (url.includes('/orders') && !url.includes('/kitchen-status')) {
    // GET all orders (active orders only for the frontend)
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        // Return all active orders (not completed ones)
        const activeOrders = data.orders || [];
        return res.status(200).json(activeOrders);
      } catch (err) {
        console.error('[orders.js] Failed to get orders:', err);
        return res.status(200).json([]); // Return empty array on error
      }
    }

    // POST - Add new order or update entire orders array
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        console.log('[orders.js] Received POST body:', JSON.stringify(body, null, 2));
        
        const data = await getCurrentData();
        
        // If body is an array, replace entire orders array (for bulk operations like clearing)
        if (Array.isArray(body)) {
          console.log('[orders.js] Replacing entire orders array with', body.length, 'orders');
          
          // Move completed orders to completedOrders array before clearing
          const completedOrders = data.orders.filter(order => order.status === 'completed');
          data.completedOrders = [...(data.completedOrders || []), ...completedOrders];
          
          // Keep only the most recent 50 completed orders
          if (data.completedOrders.length > 50) {
            data.completedOrders = data.completedOrders.slice(-50);
          }
          
          data.orders = body;
          
          await saveData(data);
          
          return res.status(200).json({ 
            success: true, 
            message: body.length === 0 ? 'All orders cleared' : 'Orders updated',
            count: body.length 
          });
        } else {
          // Single order - add to existing orders
          console.log('[orders.js] Adding single order');
          
          // Generate proper order ID
          const orderId = generateOrderId(data.nextOrderId);
          
          const newOrder = {
            id: orderId,
            ...body,
            timestamp: body.timestamp || new Date().toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            status: body.status || 'pending'
          };
          
          data.orders.push(newOrder);
          data.nextOrderId += 1;
          
          console.log('[orders.js] Saving order with ID:', orderId);

          await saveData(data);

          return res.status(201).json({ 
            success: true, 
            message: 'Order created',
            order: newOrder,
            totalOrders: data.orders.length
          });
        }
      } catch (err) {
        console.error('[orders.js] Failed to process orders:', err);
        return res.status(500).json({ 
          error: "Failed to process orders", 
          details: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
      }
    }

    // PUT - Update specific order (for status changes)
    if (method === 'PUT') {
      try {
        const body = await parseBody(req);
        const data = await getCurrentData();
        
        // Extract order ID from URL or body
        const urlParts = url.split('/');
        const orderId = urlParts[urlParts.length - 1];
        
        const orderIndex = data.orders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        // Update order
        data.orders[orderIndex] = { ...data.orders[orderIndex], ...body };
        
        // If order is completed, move it to completed orders
        if (body.status === 'completed') {
          data.orders[orderIndex].completedAt = new Date().toLocaleString('en-NZ', {
            timeZone: 'Pacific/Auckland',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          // Move to completed orders
          data.completedOrders.push(data.orders[orderIndex]);
          data.orders.splice(orderIndex, 1);
          
          // Keep only recent completed orders
          if (data.completedOrders.length > 50) {
            data.completedOrders = data.completedOrders.slice(-50);
          }
        }
        
        await saveData(data);
        
        return res.status(200).json({
          success: true,
          message: 'Order updated',
          order: body.status === 'completed' ? data.completedOrders[data.completedOrders.length - 1] : data.orders[orderIndex]
        });
        
      } catch (err) {
        console.error('[orders.js] Failed to update order:', err);
        return res.status(500).json({ error: "Failed to update order" });
      }
    }
  }

  // Handle completed orders route
  if (url.includes('/completed-orders')) {
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        // Return recent completed orders and current active orders for sidebar
        const allRecentOrders = [
          ...data.orders.map(order => ({ ...order, isActive: true })),
          ...data.completedOrders.map(order => ({ ...order, isActive: false }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
        
        return res.status(200).json(allRecentOrders);
      } catch (err) {
        console.error('[orders.js] Failed to get completed orders:', err);
        return res.status(200).json([]);
      }
    }
  }

  // 404 for everything else
  console.warn(`[orders.js] No matching route for ${method} ${url}`);
  return res.status(404).json({ error: "Endpoint not found" });
}