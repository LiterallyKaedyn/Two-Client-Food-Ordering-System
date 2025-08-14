// api/events.js - Server-Sent Events endpoint for real-time updates
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  // Only allow GET requests for SSE
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[SSE] Setting up Server-Sent Events connection');
    
    // Initialize Upstash Redis client
    const redis = Redis.fromEnv();
    const EVENTS_KEY = 'food_order_events';
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Real-time updates connected'
    })}\n\n`);
    
    // Function to send events
    async function checkAndSendEvents() {
      try {
        // Get recent events from Redis
        const events = await redis.lrange(EVENTS_KEY, 0, 9); // Get last 10 events
        
        if (events && events.length > 0) {
          console.log(`[SSE] Sending ${events.length} events to client`);
          
          // Send each event
          for (const eventStr of events) {
            try {
              const event = JSON.parse(eventStr);
              res.write(`data: ${JSON.stringify(event)}\n\n`);
            } catch (e) {
              console.error('[SSE] Failed to parse event:', e);
            }
          }
          
          // Clear sent events to avoid duplicates
          await redis.del(EVENTS_KEY);
        }
        
      } catch (error) {
        console.error('[SSE] Event checker error:', error);
      }
    }
    
    // Check for events immediately
    await checkAndSendEvents();
    
    // Set up interval to check for new events
    const eventChecker = setInterval(async () => {
      await checkAndSendEvents();
      
      // Send heartbeat every 30 seconds to keep connection alive
      if (Date.now() % 30000 < 3000) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    }, 3000); // Check every 3 seconds
    
    // Clean up on client disconnect
    req.on('close', () => {
      console.log('[SSE] Client disconnected');
      clearInterval(eventChecker);
    });
    
    req.on('error', (error) => {
      console.log('[SSE] Client connection error:', error);
      clearInterval(eventChecker);
    });
    
    // Handle connection timeout (Vercel has 30 second timeout for serverless functions)
    const timeout = setTimeout(() => {
      console.log('[SSE] Connection timeout, closing');
      clearInterval(eventChecker);
      res.end();
    }, 25000); // Close after 25 seconds to avoid Vercel timeout
    
    req.on('close', () => {
      clearTimeout(timeout);
    });
    
  } catch (err) {
    console.error('[SSE] Setup error:', err);
    res.status(500).json({ 
      error: 'Failed to setup SSE connection',
      details: err.message 
    });
  }
}