// ============= api/orders.js (Vercel serverless function) =============
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_FILE = join(process.cwd(), 'orders.json');

function readOrders() {
    try {
        if (!existsSync(DATA_FILE)) {
            return [];
        }
        const data = readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading orders:', error);
        return [];
    }
}

function writeOrders(orders) {
    try {
        writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
    } catch (error) {
        console.error('Error writing orders:', error);
        throw error;
    }
}

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const orders = readOrders();

        switch (req.method) {
            case 'GET':
                res.status(200).json({ orders });
                break;

            case 'POST':
                const newOrder = {
                    id: Date.now().toString(),
                    ...req.body,
                    timestamp: new Date().toLocaleString()
                };
                orders.push(newOrder);
                writeOrders(orders);
                res.status(201).json({ message: 'Order created', order: newOrder });
                break;

            case 'DELETE':
                if (req.url.includes('/orders/') && req.url.split('/').length > 3) {
                    // Delete specific order
                    const orderId = req.url.split('/')[3];
                    const filteredOrders = orders.filter(order => order.id !== orderId);
                    writeOrders(filteredOrders);
                    res.status(200).json({ message: 'Order deleted' });
                } else {
                    // Clear all orders
                    writeOrders([]);
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