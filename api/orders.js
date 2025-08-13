export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // JSONBin.io configuration
    const BIN_ID = process.env.JSONBIN_ID || 'your-bin-id';
    const API_KEY = process.env.JSONBIN_KEY || 'your-api-key';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    // Helper function to get NZ time
    function getNZTime() {
        return new Date().toLocaleString('en-NZ', {
            timeZone: 'Pacific/Auckland',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    try {
        // Check if this is a specific order request (has order ID in path)
        const pathParts = req.url.split('/');
        const orderId = pathParts[pathParts.length - 1];
        const isSpecificOrder = orderId && orderId !== 'orders' && !orderId.includes('?');

        // Check for completed orders endpoint
        const isCompletedOrders = req.url && req.url.includes('completed-orders');
        
        // Check for kitchen status endpoint
        const isKitchenStatus = req.url && req.url.includes('kitchen-status');

        if (isKitchenStatus) {
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
                    res.status(200).json({ isOpen: false });
                }
            } else if (req.method === 'POST') {
                try {
                    const getResponse = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const currentData = await getResponse.json();
                    const currentRecord = currentData.record || {};
                    
                    const { isOpen } = req.body;
                    currentRecord.kitchenOpen = isOpen;
                    
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
        } else if (isCompletedOrders) {
            // Handle completed orders endpoint
            if (req.method === 'GET') {
                try {
                    const response = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const data = await response.json();
                    const completedOrders = data.record?.completedOrders || [];
                    res.status(200).json({ orders: completedOrders });
                } catch (error) {
                    res.status(200).json({ orders: [] });
                }
            }
        } else if (isSpecificOrder) {
            // Handle specific order operations (GET, PUT)
            if (req.method === 'GET') {
                try {
                    const response = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const data = await response.json();
                    const orders = data.record?.orders || [];
                    const order = orders.find(o => o.id === orderId);
                    
                    res.status(200).json({ order: order || null });
                } catch (error) {
                    res.status(500).json({ error: 'Failed to get order' });
                }
            } else if (req.method === 'PUT') {
                try {
                    // Get current data
                    const getResponse = await fetch(JSONBIN_URL + '/latest', {
                        headers: { 'X-Master-Key': API_KEY }
                    });
                    const currentData = await getResponse.json();
                    const currentRecord = currentData.record || {};
                    const currentOrders = currentRecord.orders || [];
                    const completedOrders = currentRecord.completedOrders || [];

                    // Find and update the order
                    const orderIndex = currentOrders.findIndex(o => o.id === orderId);
                    if (orderIndex === -1) {
                        res.status(404).json({ error: 'Order not found' });
                        return;
                    }

                    const order = currentOrders[orderIndex];
                    const updates = req.body;
                    Object.assign(order, updates);

                    // If order is completed, move to completed orders
                    if (updates.status === 'completed') {
                        const completedOrder = {
                            ...order,
                            completedAt: getNZTime()
                        };
                        completedOrders.push(completedOrder);
                        currentOrders.splice(orderIndex, 1);
                        
                        currentRecord.orders = currentOrders;
                        currentRecord.completedOrders = completedOrders;
                    } else {
                        currentRecord.orders = currentOrders;
                    }

                    // Save updated data
                    await fetch(JSONBIN_URL, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Master-Key': API_KEY
                        },
                        body: JSON.stringify(currentRecord)
                    });

                    res.status(200).json({ message: 'Order updated', order });
                } catch (error) {
                    res.status(500).json({ error: 'Failed to update order' });
                }
            }
        } else {
            // Handle general orders endpoints
            switch (req.method) {
                case 'GET':
                    try {
                        const response = await fetch(JSONBIN_URL + '/latest', {
                            headers: { 'X-Master-Key': API_KEY }
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
                        // Get current orders and next ID
                        const getResponse = await fetch(JSONBIN_URL + '/latest', {
                            headers: { 'X-Master-Key': API_KEY }
                        });
                        const currentData = await getResponse.json();
                        const currentRecord = currentData.record || {};
                        const currentOrders = currentRecord.orders || [];
                        let nextOrderId = currentRecord.nextOrderId || 1;

                        // Create new order with sequential ID
                        const newOrder = {
                            id: nextOrderId.toString().padStart(3, '0'),
                            displayId: nextOrderId,
                            ...req.body,
                            timestamp: getNZTime(),
                            status: 'pending'
                        };

                        currentOrders.push(newOrder);
                        currentRecord.orders = currentOrders;
                        currentRecord.nextOrderId = nextOrderId + 1;

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
                            headers: { 'X-Master-Key': API_KEY }
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