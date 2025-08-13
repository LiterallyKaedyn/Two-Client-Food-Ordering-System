// ============= api/orders.js (Vercel serverless function) =============
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Simple in-memory storage (resets on function cold starts)
    // For persistent storage, you'd need a database like Vercel KV or external DB
    if (!global.orders) {
        global.orders = [];
    }

    try {
        switch (req.method) {
            case 'GET':
                res.status(200).json({ orders: global.orders });
                break;

            case 'POST':
                const newOrder = {
                    id: Date.now().toString(),
                    ...req.body,
                    timestamp: new Date().toLocaleString()
                };
                global.orders.push(newOrder);
                res.status(201).json({ message: 'Order created', order: newOrder });
                break;

            case 'DELETE':
                const { query } = req;
                if (query.id) {
                    // Delete specific order
                    global.orders = global.orders.filter(order => order.id !== query.id);
                    res.status(200).json({ message: 'Order deleted' });
                } else {
                    // Clear all orders
                    global.orders = [];
                    res.status(200).json({ message: 'All orders cleared' });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}