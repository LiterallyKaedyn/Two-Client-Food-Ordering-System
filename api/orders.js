// api/orders.js - Clean working version
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, method } = req;
    console.log(`[API] ${method} ${url}`);

    // Parse URL and query parameters
    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // Environment variables for JSONBin
    const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY;
    const JSONBIN_DATA_ID = process.env.JSONBIN_DATA_ID;

    console.log(`[API] Environment check:`);
    console.log(`[API] - JSONBIN_API_KEY: ${JSONBIN_API_KEY ? 'Set (' + JSONBIN_API_KEY.substring(0, 10) + '...)' : 'Missing'}`);
    console.log(`[API] - JSONBIN_DATA_ID: ${JSONBIN_DATA_ID ? 'Set (' + JSONBIN_DATA_ID + ')' : 'Missing'}`);

    if (!JSONBIN_API_KEY || !JSONBIN_DATA_ID) {
      console.error('[API] Missing required environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error - missing API keys',
        details: {
          hasApiKey: !!JSONBIN_API_KEY,
          hasDataId: !!JSONBIN_DATA_ID
        }
      });
    }

    // Helper to call JSONBin
    async function callJSONBin(binId, options = {}) {
      const url = `https://api.jsonbin.io/v3/b/${binId}`;
      try {
        console.log(`[API] Calling JSONBin: ${options.method || 'GET'} ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'X-Master-Key': JSONBIN_API_KEY,
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options,
        });

        console.log(`[API] JSONBin response status: ${response.status}`);
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`[API] JSONBin error (${response.status}): ${text}`);
          throw new Error(`JSONBin responded with ${response.status}: ${text}`);
        }

        const result = await response.json();
        console.log(`[API] JSONBin success - data keys:`, Object.keys(result));
        return result;
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
            reject(new Error('Invalid JSON in request body'));
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
    
    // Only handle /api/orders path
    if (pathname !== '/api/orders') {
      console.log(`[API] Invalid path: ${pathname}`);
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // Handle kitchen status routes
    if (searchParams.has('kitchen-status')) {
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
    if (searchParams.has('completed-orders')) {
      console.log('[API] Completed orders route');
      
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
          // Return recent orders (active + completed, limited to 10 most recent)
          const allRecentOrders = [
            ...data.orders.map(order => ({ ...order, isActive: true })),
            ...data.completedOrders.map(order => ({ ...order, isActive: false }))
          ]
          .sort((a, b) => {
            const timeA = new Date(a.timestamp);
            const timeB = new Date(b.timestamp);
            return timeB - timeA;
          })
          .slice(0, 10);
          
          return res.status(200).json(allRecentOrders);
        } catch (err) {
          console.error('[API] Failed to get completed orders:', err.message);
          return res.status(200).json([]);
        }
      }
    }

    // Handle update order status using query parameter
    if (searchParams.has('update-order')) {
      console.log('[API] Update order route');
      
      if (method === 'PUT' || method === 'POST') {
        try {
          const body = await parseBody(req);
          const data = await getCurrentData();
          
          const orderId = searchParams.get('update-order');
          console.log(`[API] Update request for order ${orderId} with status: ${body.status}`);
          
          const orderIndex = data.orders.findIndex(order => order.id === orderId);
          
          if (orderIndex === -1) {
            console.log(`[API] Order ${orderId} not found in active orders`);
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
          
          console.log(`[API] Order ${orderId} updated successfully to status: ${body.status}`);
          return res.status(200).json({
            success: true,
            message: 'Order updated',
            order: body.status === 'completed' ? 
              data.completedOrders[data.completedOrders.length - 1] : 
              data.orders[orderIndex] || data.orders.find(o => o.id === orderId)
          });
          
        } catch (err) {
          console.error('[API] Failed to update order:', err.message);
          return res.status(500).json({ error: "Failed to update order: " + err.message });
        }
      }
    }

    // Handle delete order using query parameter
    if (searchParams.has('delete-order')) {
      console.log('[API] Delete order route');
      
      if (method === 'DELETE') {
        try {
          const data = await getCurrentData();
          
          const orderId = searchParams.get('delete-order');
          console.log(`[API] Delete request for order ${orderId}`);
          
          const orderIndex = data.orders.findIndex(order => order.id === orderId);
          
          if (orderIndex === -1) {
            console.log(`[API] Order ${orderId} not found in active orders`);
            return res.status(404).json({ error: 'Order not found' });
          }
          
          // Remove the order completely (no trace)
          const deletedOrder = data.orders[orderIndex];
          data.orders.splice(orderIndex, 1);
          
          await saveData(data);
          
          console.log(`[API] Order ${orderId} deleted permanently`);
          return res.status(200).json({
            success: true,
            message: 'Order deleted permanently',
            deletedOrder: {
              id: deletedOrder.id,
              food: deletedOrder.food,
              customer: deletedOrder.name
            }
          });
          
        } catch (err) {
          console.error('[API] Failed to delete order:', err.message);
          return res.status(500).json({ error: "Failed to delete order: " + err.message });
        }
      }
    }

    // Handle main orders routes (no query parameters)
    if (!searchParams.has('kitchen-status') && !searchParams.has('completed-orders') && !searchParams.has('update-order') && !searchParams.has('delete-order')) {
      
      // GET all orders (active orders only)
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
          console.log(`[API] Returning ${data.orders.length} active orders`);
          return res.status(200).json(data.orders);
        } catch (err) {
          console.error('[API] Failed to get orders:', err.message);
          return res.status(500).json({ error: 'Failed to get orders: ' + err.message });
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
    }

    // 404 for everything else
    console.log(`[API] No matching route for ${method} ${pathname} with params:`, Object.fromEntries(searchParams));
    return res.status(404).json({ error: "Endpoint not found" });

  } catch (err) {
    // Global error handler - catches any unhandled errors
    console.error('[API] Unhandled error:', err);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}