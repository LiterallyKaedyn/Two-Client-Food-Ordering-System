// api/orders.js - Enhanced with Request Tracking and Environment Variable Authentication
import { Redis } from '@upstash/redis';

// Request tracking middleware
const trackRequest = async (redis, method, endpoint, status, data = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status,
      data: data ? JSON.stringify(data).substring(0, 100) : '', // Limit data size
      ip: data.ip || 'unknown'
    };
    
    // Store in a circular buffer of last 100 requests
    const LOG_KEY = 'food_order_request_log';
    await redis.lpush(LOG_KEY, JSON.stringify(logEntry));
    await redis.ltrim(LOG_KEY, 0, 99);
    await redis.expire(LOG_KEY, 86400); // Keep for 24 hours
  } catch (error) {
    console.error('[REQUEST TRACKING] Failed to log request:', error);
  }
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Manager-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = Redis.fromEnv();
  const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

  try {
    const { method } = req;
    console.log(`[API] ${method} ${req.url} from ${clientIp}`);

    // Parse URL and query parameters
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    console.log(`[API] Parsed URL - pathname: ${pathname}, search: ${urlObj.search}`);
    
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
        
        await redis.lpush(EVENTS_KEY, JSON.stringify(event));
        await redis.expire(EVENTS_KEY, 300);
        await redis.ltrim(EVENTS_KEY, 0, 99);
        
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

        console.log(`[API] Data loaded - ${validatedData.orders.length} active, ${validatedData.completedOrders.length} completed`);
        return validatedData;
      } catch (err) {
        console.error('[API] Could not read from Redis:', err.message);
        const defaultData = {
          orders: [],
          completedOrders: [],
          kitchenOpen: false,
          nextOrderId: 1,
          lastUpdated: new Date().toISOString()
        };
        
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
        data.lastUpdated = new Date().toISOString();
        await redis.set(DATA_KEY, data);
        console.log('[API] Data saved successfully to Upstash Redis');
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

    // Check manager authentication
    function checkManagerAuth(req) {
      const managerKey = req.headers['x-manager-key'];
      const expectedKey = process.env.MANAGER_PORTAL_KEY;
      
      if (!expectedKey) {
        console.error('[AUTH] MANAGER_PORTAL_KEY environment variable not set');
        return false;
      }
      
      return managerKey === expectedKey;
    }

    // Generate order ID with proper formatting
    function generateOrderId(nextId) {
      return nextId.toString().padStart(3, '0');
    }

    // ========== ROUTES ==========
    
    // Only handle /api/orders path
    if (pathname !== '/api/orders') {
      console.log(`[API] Invalid path: ${pathname}`);
      await trackRequest(redis, method, pathname, 404, { ip: clientIp });
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // Request log endpoint (manager only)
    if (searchParams.has('request-log')) {
      if (!checkManagerAuth(req)) {
        await trackRequest(redis, method, 'request-log', 401, { ip: clientIp });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (method === 'GET') {
        try {
          const logs = await redis.lrange('food_order_request_log', 0, 99);
          const parsedLogs = logs.map(log => {
            try {
              return JSON.parse(log);
            } catch (e) {
              return log;
            }
          });
          
          await trackRequest(redis, method, 'request-log', 200, { ip: clientIp });
          return res.status(200).json({ logs: parsedLogs });
        } catch (err) {
          console.error('[API] Failed to get request logs:', err.message);
          await trackRequest(redis, method, 'request-log', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: 'Failed to retrieve logs' });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for request-log` });
    }

    // Manager authentication check endpoint
    if (searchParams.has('check-auth')) {
      if (method === 'POST') {
        const body = await parseBody(req);
        const providedKey = body.key;
        const expectedKey = process.env.MANAGER_PORTAL_KEY;
        
        if (!expectedKey) {
          console.error('[AUTH] MANAGER_PORTAL_KEY environment variable not set');
          await trackRequest(redis, method, 'check-auth', 500, { ip: clientIp });
          return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const isValid = providedKey === expectedKey;
        await trackRequest(redis, method, 'check-auth', isValid ? 200 : 401, { ip: clientIp });
        
        if (isValid) {
          return res.status(200).json({ valid: true });
        } else {
          return res.status(401).json({ valid: false });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for check-auth` });
    }

    // Handle kitchen status routes
    if (searchParams.has('kitchen-status')) {
      console.log('[API] Kitchen status route detected');
      
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
          await trackRequest(redis, method, 'kitchen-status-get', 200, { ip: clientIp, isOpen: data.kitchenOpen });
          return res.status(200).json({ 
            isOpen: data.kitchenOpen,
            lastUpdated: data.lastUpdated
          });
        } catch (err) {
          await trackRequest(redis, method, 'kitchen-status-get', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: 'Failed to get kitchen status' });
        }
      }
      
      if (method === 'POST') {
        // Require manager auth for changing kitchen status
        if (!checkManagerAuth(req)) {
          await trackRequest(redis, method, 'kitchen-status-post', 401, { ip: clientIp });
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        try {
          const body = await parseBody(req);
          const data = await getCurrentData();
          const previousStatus = data.kitchenOpen;
          
          data.kitchenOpen = Boolean(body.isOpen);
          await saveData(data);

          if (previousStatus !== data.kitchenOpen) {
            await broadcastEvent('KITCHEN_STATUS_CHANGED', {
              isOpen: data.kitchenOpen,
              previousStatus
            });
          }

          await trackRequest(redis, method, 'kitchen-status-post', 200, { 
            ip: clientIp, 
            isOpen: data.kitchenOpen,
            changed: previousStatus !== data.kitchenOpen 
          });
          
          return res.status(200).json({ 
            success: true, 
            isOpen: data.kitchenOpen,
            lastUpdated: data.lastUpdated
          });
        } catch (err) {
          await trackRequest(redis, method, 'kitchen-status-post', 500, { ip: clientIp, error: err.message });
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
          
          await trackRequest(redis, method, 'completed-orders', 200, { ip: clientIp, count: allRecentOrders.length });
          return res.status(200).json(allRecentOrders);
        } catch (err) {
          await trackRequest(redis, method, 'completed-orders', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: 'Failed to get completed orders' });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for completed-orders` });
    }

    // Handle update order status
    if (searchParams.has('update-order')) {
      // Require manager auth for updating orders
      if (!checkManagerAuth(req)) {
        await trackRequest(redis, method, 'update-order', 401, { ip: clientIp });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (method === 'PUT' || method === 'POST') {
        try {
          const body = await parseBody(req);
          const data = await getCurrentData();
          const orderId = searchParams.get('update-order');
          const orderIndex = data.orders.findIndex(order => order.id === orderId);
          
          if (orderIndex === -1) {
            await trackRequest(redis, method, 'update-order', 404, { ip: clientIp, orderId });
            return res.status(404).json({ error: 'Order not found' });
          }
          
          const previousStatus = data.orders[orderIndex].status;
          data.orders[orderIndex] = { ...data.orders[orderIndex], ...body };
          
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
          await broadcastEvent('ORDER_STATUS_UPDATED', {
            orderId,
            newStatus: body.status,
            previousStatus,
            order: body.status === 'completed' ? 
              data.completedOrders[data.completedOrders.length - 1] : 
              data.orders[orderIndex] || data.orders.find(o => o.id === orderId)
          });
          
          await trackRequest(redis, method, 'update-order', 200, { 
            ip: clientIp, 
            orderId, 
            newStatus: body.status,
            previousStatus 
          });
          
          return res.status(200).json({
            success: true,
            message: 'Order updated',
            order: body.status === 'completed' ? 
              data.completedOrders[data.completedOrders.length - 1] : 
              data.orders[orderIndex] || data.orders.find(o => o.id === orderId)
          });
          
        } catch (err) {
          await trackRequest(redis, method, 'update-order', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: "Failed to update order: " + err.message });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for update-order` });
    }

    // Handle delete order
    if (searchParams.has('delete-order')) {
      // Require manager auth for deleting orders
      if (!checkManagerAuth(req)) {
        await trackRequest(redis, method, 'delete-order', 401, { ip: clientIp });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (method === 'DELETE') {
        try {
          const data = await getCurrentData();
          const orderId = searchParams.get('delete-order');
          const orderIndex = data.orders.findIndex(order => order.id === orderId);
          
          if (orderIndex === -1) {
            await trackRequest(redis, method, 'delete-order', 404, { ip: clientIp, orderId });
            return res.status(404).json({ error: 'Order not found' });
          }
          
          const deletedOrder = data.orders[orderIndex];
          data.orders.splice(orderIndex, 1);
          
          await saveData(data);
          await broadcastEvent('ORDER_DELETED', {
            orderId,
            deletedOrder: {
              id: deletedOrder.id,
              food: deletedOrder.food,
              customer: deletedOrder.name
            }
          });
          
          await trackRequest(redis, method, 'delete-order', 200, { ip: clientIp, orderId });
          
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
          await trackRequest(redis, method, 'delete-order', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: "Failed to delete order: " + err.message });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for delete-order` });
    }

    // Handle main orders routes
    if (!searchParams.has('kitchen-status') && !searchParams.has('completed-orders') && 
        !searchParams.has('update-order') && !searchParams.has('delete-order') &&
        !searchParams.has('check-auth') && !searchParams.has('request-log')) {
      
      // GET all orders
      if (method === 'GET') {
        try {
          const data = await getCurrentData();
          await trackRequest(redis, method, 'get-orders', 200, { ip: clientIp, count: data.orders.length });
          return res.status(200).json(data.orders);
        } catch (err) {
          await trackRequest(redis, method, 'get-orders', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ error: 'Failed to get orders: ' + err.message });
        }
      }

      // POST - Add new order or clear all orders
      if (method === 'POST') {
        try {
          const body = await parseBody(req);
          const data = await getCurrentData();
          
          // Clear all orders (manager only)
          if (Array.isArray(body) && body.length === 0) {
            if (!checkManagerAuth(req)) {
              await trackRequest(redis, method, 'clear-orders', 401, { ip: clientIp });
              return res.status(401).json({ error: 'Unauthorized' });
            }
            
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
            await broadcastEvent('ORDERS_CLEARED', {
              clearedCount: activeOrders.length
            });
            
            await trackRequest(redis, method, 'clear-orders', 200, { ip: clientIp, clearedCount: activeOrders.length });
            
            return res.status(200).json({ 
              success: true, 
              message: 'All orders cleared'
            });
          } 
          // Add new order
          else if (body && typeof body === 'object' && body.food && body.room && body.name) {
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
              status: 'pending',
              submittedBy: clientIp
            };
            
            data.orders.push(newOrder);
            data.nextOrderId += 1;
            
            await saveData(data);
            await broadcastEvent('NEW_ORDER', {
              order: newOrder,
              totalOrders: data.orders.length
            });

            await trackRequest(redis, method, 'create-order', 201, { 
              ip: clientIp, 
              orderId,
              food: body.food,
              room: body.room 
            });
            
            return res.status(201).json({ 
              success: true, 
              message: 'Order created',
              order: newOrder
            });
          } else {
            await trackRequest(redis, method, 'create-order', 400, { ip: clientIp });
            return res.status(400).json({ error: 'Invalid order data' });
          }
        } catch (err) {
          await trackRequest(redis, method, 'post-orders', 500, { ip: clientIp, error: err.message });
          return res.status(500).json({ 
            error: "Failed to process order", 
            details: err.message
          });
        }
      }
      
      return res.status(405).json({ error: `Method ${method} not allowed for main orders route` });
    }

    // 404 for everything else
    await trackRequest(redis, method, pathname, 404, { ip: clientIp });
    return res.status(404).json({ error: "Endpoint not found" });

  } catch (err) {
    // Global error handler
    console.error('[API] Unhandled error:', err);
    await trackRequest(redis, 'ERROR', 'unhandled', 500, { ip: clientIp, error: err.message });
    return res.status(500).json({ 
      error: "Internal server error", 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}