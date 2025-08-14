// api/orders.js - Enhanced with Server-Sent Events for real-time updates
import { Redis } from '@upstash/redis';

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
    const { method } = req;
    console.log(`[API] ${method} ${req.url}`);

    // Parse URL and query parameters
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    console.log(`[API] Parsed URL - pathname: ${pathname}, search: ${urlObj.search}`);

    // Initialize Upstash Redis client
    const redis = Redis.fromEnv();
    
    // Redis keys
    const DATA_KEY = 'food_order_data';
    const EVENTS_KEY = 'food_order_events';

    // Helper to broadcast events to all connected clients
    async function broadcastEvent(eventType, data = {}) {
      try {
        const event = {
          type: eventType,
          data,
          timestamp: new Date().toISOString(),
          id: Math.random().toString(36).substr(2, 9)
        };
        
        // Store event in Redis with expiration
        await redis.lpush(EVENTS_KEY, JSON.stringify(event));
        await redis.expire(EVENTS_KEY, 300); // Keep events for 5 minutes
        await redis.ltrim(EVENTS_KEY, 0, 99); // Keep only last 100 events
        
        console.log(`[BROADCAST] Event sent: ${eventType}`, data);
      } catch (error) {
        console.error('[BROADCAST] Failed to send event:', error);
      }
    }

    // Helper to get data from Upstash Redis
    async function getCurrentData() {
      try {
        console.log('[API] Reading data from Upstash Redis');
        
        const data = await redis.get(DATA_KEY);
        
        if (!data) {
          console.log('[API] No data found in Redis, creating default data');
          const defaultData = {
            orders: [],
            completedOrders: [],
            kitchenOpen: false,
            nextOrderId: 1,
            lastUpdated: new Date().toISOString()
          };
          await redis.set(DATA_KEY, defaultData);
          return defaultData;
        }

        // Ensure proper data structure and validate orders
        const validatedData = {
          orders: [],
          completedOrders: Array.isArray(data.completedOrders) ? data.completedOrders : [],
          kitchenOpen: typeof data.kitchenOpen === 'boolean' ? data.kitchenOpen : false,
          nextOrderId: typeof data.nextOrderId === 'number' ? data.nextOrderId : 1,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        };

        // Validate and filter orders array
        if (Array.isArray(data.orders)) {
          validatedData.orders = data.orders.filter(order => {
            return order && 
                   typeof order.id === 'string' && 
                   typeof order.food === 'string' &&
                   typeof order.room === 'string' &&
                   typeof order.name === 'string' &&
                   typeof order.status === 'string';
          });
        }

        console.log(`[API] Data loaded from Redis - ${validatedData.orders.length} active, ${validatedData.completedOrders.length} completed, kitchen: ${validatedData.kitchenOpen}`);
        return validatedData;
      } catch (err) {
        console.error('[API] Could not read from Redis:', err.message);
        // Return default data structure
        const defaultData = {
          orders: [],
          completedOrders: [],
          kitchenOpen: false,
          nextOrderId: 1,
          lastUpdated: new Date().toISOString()
        };
        
        // Try to create the default data in Redis
        try {
          await redis.set(DATA_KEY, defaultData);
          console.log('[API] Created new data in Redis with defaults');
        } catch (createErr) {
          console.error('[API] Could not create data in Redis:', createErr.message);
        }
        
        return defaultData;
      }
    }

    // Helper to save data to Upstash Redis
    async function saveData(data) {
      try {
        // Add timestamp for debugging
        data.lastUpdated = new Date().toISOString();
        
        await redis.set(DATA_KEY, data);
        console.log('[API] Data saved successfully to Upstash Redis');
        
        // Optional: Set expiration for automatic cleanup (e.g., 30 days)
        await redis.expire(DATA_KEY, 30 * 24 * 60 * 60); // 30 days
      } catch (err) {
        console.error('[API] Failed to save data to Redis:', err.message);
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
      console.log('[API] Kitchen status route detected');
      
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
          console.log(`[API] Kitchen status GET - returning: ${data.kitchenOpen}`);
          return res.status(200).json({ 
            isOpen: data.kitchenOpen,
            lastUpdated: data.lastUpdated
          });
        } catch (err) {
          console.error('[API] Failed to get kitchen status:', err.message);
          return res.status(200).json({ isOpen: false });
        }
      }
      
      if (method === 'POST') {
        try {
          console.log('[API] Kitchen status POST - parsing body...');
          const body = await parseBody(req);
          console.log('[API] Kitchen status POST - body received:', body);
          
          const data = await getCurrentData();
          console.log('[API] Kitchen status POST - current data loaded');
          
          const previousStatus = data.kitchenOpen;
          
          // Update kitchen status only
          data.kitchenOpen = Boolean(body.isOpen);
          console.log(`[API] Kitchen status POST - updating to: ${data.kitchenOpen}`);
          
          await saveData(data);
          console.log('[API] Kitchen status POST - data saved successfully to Redis');

          // Broadcast kitchen status change event
          if (previousStatus !== data.kitchenOpen) {
            await broadcastEvent('KITCHEN_STATUS_CHANGED', {
              isOpen: data.kitchenOpen,
              previousStatus
            });
          }

          return res.status(200).json({ 
            success: true, 
            isOpen: data.kitchenOpen,
            lastUpdated: data.lastUpdated
          });
        } catch (err) {
          console.error('[API] Failed to update kitchen status:', err.message);
          return res.status(500).json({ 
            error: "Failed to update kitchen status",
            details: err.message 
          });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for kitchen-status` });
    }

    // Handle completed orders route
    if (searchParams.has('completed-orders')) {
      console.log('[API] Completed orders route');
      
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
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
      
      return res.status(405).json({ error: `Method ${method} not allowed for completed-orders` });
    }

    // Handle update order status
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
          
          const previousStatus = data.orders[orderIndex].status;
          
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
            
            data.completedOrders.push(completedOrder);
            data.orders.splice(orderIndex, 1);
            
            if (data.completedOrders.length > 50) {
              data.completedOrders = data.completedOrders.slice(-50);
            }
          }
          
          await saveData(data);
          
          // Broadcast order status update event
          await broadcastEvent('ORDER_STATUS_UPDATED', {
            orderId,
            newStatus: body.status,
            previousStatus,
            order: body.status === 'completed' ? 
              data.completedOrders[data.completedOrders.length - 1] : 
              data.orders[orderIndex] || data.orders.find(o => o.id === orderId)
          });
          
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
      
      return res.status(405).json({ error: `Method ${method} not allowed for update-order` });
    }

    // Handle delete order
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
          
          const deletedOrder = data.orders[orderIndex];
          data.orders.splice(orderIndex, 1);
          
          await saveData(data);
          
          // Broadcast order deletion event
          await broadcastEvent('ORDER_DELETED', {
            orderId,
            deletedOrder: {
              id: deletedOrder.id,
              food: deletedOrder.food,
              customer: deletedOrder.name
            }
          });
          
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
      
      return res.status(405).json({ error: `Method ${method} not allowed for delete-order` });
    }

    // Handle main orders routes
    if (!searchParams.has('kitchen-status') && !searchParams.has('completed-orders') && !searchParams.has('update-order') && !searchParams.has('delete-order')) {
      
      // GET all orders
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
          
          // Clear all orders
          if (Array.isArray(body) && body.length === 0) {
            console.log('[API] Clearing all orders');
            
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
            
            if (data.completedOrders.length > 50) {
              data.completedOrders = data.completedOrders.slice(-50);
            }
            
            data.orders = [];
            await saveData(data);
            
            // Broadcast orders cleared event
            await broadcastEvent('ORDERS_CLEARED', {
              clearedCount: activeOrders.length
            });
            
            return res.status(200).json({ 
              success: true, 
              message: 'All orders cleared'
            });
          } 
          // Add new order
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

            // Broadcast new order event
            await broadcastEvent('NEW_ORDER', {
              order: newOrder,
              totalOrders: data.orders.length
            });

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
      
      return res.status(405).json({ error: `Method ${method} not allowed for main orders route` });
    }

    // 404 for everything else
    console.log(`[API] No matching route for ${method} ${pathname} with params:`, Object.fromEntries(searchParams));
    return res.status(404).json({ error: "Endpoint not found" });

  } catch (err) {
    // Global error handler
    console.error('[API] Unhandled error:', err);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}