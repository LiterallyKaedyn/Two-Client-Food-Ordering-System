export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // JSONBin.io configuration (free service)
    const BIN_ID = process.env.JSONBIN_ID || 'your-bin-id'; // You'll set this in Vercel env vars
    const API_KEY = process.env.JSONBIN_KEY || 'your-api-key'; // You'll set this in Vercel env vars
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    try {
        // Check if this is a kitchen-status request by looking at the URL path
        const isKitchenStatusRequest = req.url && req.url.includes('kitchen-status');
        
        if (isKitchenStatusRequest) {
            // Handle kitchen status endpoints
            if (req.method === 'GET') {
                try {
                    const response = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const data = await response.json();
                    const isOpen = data.record?.kitchenOpen || false;
                    res.status(200).json({ isOpen });
                } catch (error) {
                    res.status(200).json({ isOpen: false }); // Default to closed
                }
            } else if (req.method === 'POST') {
                try {
                    // Get current data
                    const getResponse = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const currentData = await getResponse.json();
                    const currentRecord = currentData.record || {};
                    
                    // Update kitchen status
                    const { isOpen } = req.body;
                    currentRecord.kitchenOpen = isOpen;
                    
                    // Save updated data
                    await fetch(JSONBIN_URL, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Master-Key': API_KEY
                        },
                        body: JSON.stringify(currentRecord)
                    });
                    
                    res.status(200).json({ message: 'Kitchen status updated', isOpen });
                } catch (error) {
                    res.status(500).json({ error: 'Failed to update kitchen status' });
                }
            }
        } else {
            // Handle orders endpoints
            switch (req.method) {
                case 'GET':
                    try {
                        const response = await fetch(JSONBIN_URL + '/latest', {
                            headers: {
                                'X-Master-Key': API_KEY
                            }
                        });
                        const data = await response.json();
                        const orders = data.record?.orders || [];
                        res.status(200).json({ orders });
                    } catch (error) {
                        res.status(200).json({ orders: [] });
                    }
                    break;

                case 'POST':
                    try {
                        // Get current orders
                        const getResponse = await fetch(JSONBIN_URL + '/latest', {
                            headers: {
                                'X-Master-Key': API_KEY
                            }
                        });
                        const currentData = await getResponse.json();
                        const currentRecord = currentData.record || {};
                        const currentOrders = currentRecord.orders || [];

                        // Add new order
                        const newOrder = {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            ...req.body,
                            timestamp: new Date().toLocaleString()
                        };
                        currentOrders.push(newOrder);
                        currentRecord.orders = currentOrders;

                        // Update storage
                        await fetch(JSONBIN_URL, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Master-Key': API_KEY
                            },
                            body: JSON.stringify(currentRecord)
                        });

                        res.status(201).json({ message: 'Order created', order: newOrder });
                    } catch (error) {
                        res.status(500).json({ error: 'Failed to create order' });
                    }
                    break;

                case 'DELETE':
                    try {
                        const { query } = req;
                        
                        // Get current data
                        const getResponse = await fetch(JSONBIN_URL + '/latest', {
                            headers: {
                                'X-Master-Key': API_KEY
                            }
                        });
                        const currentData = await getResponse.json();
                        const currentRecord = currentData.record || {};
                        const currentOrders = currentRecord.orders || [];

                        let updatedOrders;
                        if (query.id) {
                            // Delete specific order
                            updatedOrders = currentOrders.filter(order => order.id !== query.id);
                        } else {
                            // Clear all orders
                            updatedOrders = [];
                        }
                        
                        currentRecord.orders = updatedOrders;

                        // Update storage
                        await fetch(JSONBIN_URL, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Master-Key': API_KEY
                            },
                            body: JSON.stringify(currentRecord)
                        });

                        res.status(200).json({ message: query.id ? 'Order deleted' : 'All orders cleared' });
                    } catch (error) {
                        res.status(500).json({ error: 'Failed to delete orders' });
                    }
                    break;

                default:
                    res.status(405).json({ error: 'Method not allowed' });
            }
        }
    } catch (error) {
        console.error('Handler error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
}