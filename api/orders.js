// api/orders.js - Fixed API route for managing orders & kitchen status
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
  console.log(`[API] ${method} ${url}`);

  // Environment variables for JSONBin
  const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
  const JSONBIN_DATA_ID = process.env.JSONBIN_DATA_ID;

  if (!JSONBIN_API_KEY || !JSONBIN_DATA_ID) {
    console.error('[API] Missing required environment variables');
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
        console.error(`[API] JSONBin error (${response.status}): ${text}`);
        throw new Error(`JSONBin responded with ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`[API] Failed to call JSONBin:`, err.message);
      throw err;
    }
  }

  // Helper to get current data structure
  async function getCurrentData() {
    try {
      const response = await callJSONBin(JSONBIN_DATA_ID);
      const data = response.record || {};
      
      // Ensure proper data structure and validate orders
      const validatedData = {
        orders: [],
        completedOrders: Array.isArray(data.completedOrders) ? data.completedOrders : [],
        kitchenOpen: typeof data.kitchenOpen === 'boolean' ? data.kitchenOpen : false,
        nextOrderId: typeof data.nextOrderId === 'number' ? data.nextOrderId : 1
      };

      // Validate and filter orders array
      if (Array.isArray(data.orders)) {
        validatedData.orders = data.orders.filter(order => {
          // Must have required fields and not be kitchen status data
          return order && 
                 typeof order.id === 'string' && 
                 typeof order.food === 'string' &&
                 typeof order.room === 'string' &&
                 typeof order.name === 'string' &&
                 typeof order.status === 'string' &&
                 !order.hasOwnProperty('isOpen') && // Filter out kitchen status data
                 !order.hasOwnProperty('lastUpdated');
        });
      }

      return validatedData;
    } catch (err) {
      console.error('[API] Could not get existing data:', err.message);
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
    try {
      await callJSONBin(JSONBIN_DATA_ID, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      console.log('[API] Data saved successfully');
    } catch (err) {
      console.error('[API] Failed to save data:', err.message);
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

  // Generate order ID with proper formatting
  function generateOrderId(nextId) {
    return nextId.toString().padStart(3, '0');
  }

  // ========== ROUTES ==========
  
  // Handle kitchen status routes (check for query param or path)
  if (url.includes('kitchen-status')) {
    console.log('[API] Kitchen status route');
    
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        return res.status(200).json({ 
          isOpen: data.kitchenOpen
        });
      } catch (err) {
        console.error('[API] Failed to get kitchen status:', err.message);
        return res.status(200).json({ isOpen: false });
      }
    }
    
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        const data = await getCurrentData();
        
        // Update kitchen status only
        data.kitchenOpen = Boolean(body.isOpen);
        
        await saveData(data);

        console.log(`[API] Kitchen status updated to: ${data.kitchenOpen}`);
        return res.status(200).json({ 
          success: true, 
          isOpen: data.kitchenOpen
        });
      } catch (err) {
        console.error('[API] Failed to update kitchen status:', err.message);
        return res.status(500).json({ error: "Failed to update kitchen status" });
      }
    }
  }

  // Handle completed orders route
  if (url.includes('completed-orders')) {
    console.log('[API] Completed orders route');
    
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        // Return recent orders (active + completed, limited to 10 most recent)
        const allRecentOrders = [
          ...data.orders.map(order => ({ ...order, isActive: true })),
          ...data.completedOrders.map(order => ({ ...order, isActive: false }))
        ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
        
        return res.status(200).json(allRecentOrders);
      } catch (err) {
        console.error('[API] Failed to get completed orders:', err.message);
        return res.status(200).json([]);
      }
    }
  }

  // Handle main orders routes
  if (url === '/api/orders' || (url.includes('/orders') && !url.includes('kitchen-status') && !url.includes('completed-orders'))) {
    
    // GET all orders (active orders only)
    if (method === 'GET') {
      try {
        const data = await getCurrentData();
        console.log(`[API] Returning ${data.orders.length} active orders`);
        return res.status(200).json(data.orders);
      } catch (err) {
        console.error('[API] Failed to get orders:', err.message);
        return res.status(500).json({ error: 'Failed to get orders' });
      }
    }

    // POST - Add new order or clear all orders
    if (method === 'POST') {
      try {
        const body = await parseBody(req);
        const data = await getCurrentData();
        
        // If body is an empty array, clear all orders
        if (Array.isArray(body) && body.length === 0) {
          console.log('[API] Clearing all orders');
          
          // Move active orders to completed before clearing
          const activeOrders = data.orders.map(order => ({
            ...order,
            status: 'completed',
            completedAt: new Date().toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          }));
          
          data.completedOrders = [...data.completedOrders, ...activeOrders];
          
          // Keep only recent 50 completed orders
          if (data.completedOrders.length > 50) {
            data.completedOrders = data.completedOrders.slice(-50);
          }
          
          data.orders = [];
          
          await saveData(data);
          
          return res.status(200).json({ 
            success: true, 
            message: 'All orders cleared'
          });
        } 
        // Single order - add to existing orders
        else if (body && typeof body === 'object' && body.food && body.room && body.name) {
          console.log('[API] Adding new order');
          
          const orderId = generateOrderId(data.nextOrderId);
          
          const newOrder = {
            id: orderId,
            food: body.food,
            room: body.room,
            name: body.name,
            comments: body.comments || '',
            timestamp: new Date().toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            status: 'pending'
          };
          
          data.orders.push(newOrder);
          data.nextOrderId += 1;
          
          await saveData(data);

          console.log(`[API] Order ${orderId} created successfully`);
          return res.status(201).json({ 
            success: true, 
            message: 'Order created',
            order: newOrder
          });
        } else {
          return res.status(400).json({ error: 'Invalid order data' });
        }
      } catch (err) {
        console.error('[API] Failed to process order:', err.message);
        return res.status(500).json({ 
          error: "Failed to process order", 
          details: err.message
        });
      }
    }

    // PUT - Update specific order status
    if (method === 'PUT') {
      try {
        const body = await parseBody(req);
        const data = await getCurrentData();
        
        // Extract order ID from URL
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
          const completedOrder = {
            ...data.orders[orderIndex],
            completedAt: new Date().toLocaleString('en-NZ', {
              timeZone: 'Pacific/Auckland',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          };
          
          // Move to completed orders
          data.completedOrders.push(completedOrder);
          data.orders.splice(orderIndex, 1);
          
          // Keep only recent completed orders
          if (data.completedOrders.length > 50) {
            data.completedOrders = data.completedOrders.slice(-50);
          }
        }
        
        await saveData(data);
        
        console.log(`[API] Order ${orderId} updated to status: ${body.status}`);
        return res.status(200).json({
          success: true,
          message: 'Order updated'
        });
        
      } catch (err) {
        console.error('[API] Failed to update order:', err.message);
        return res.status(500).json({ error: "Failed to update order" });
      }
    }
  }

  // 404 for everything else
  console.log(`[API] No matching route for ${method} ${url}`);
  return res.status(404).json({ error: "Endpoint not found" });
}