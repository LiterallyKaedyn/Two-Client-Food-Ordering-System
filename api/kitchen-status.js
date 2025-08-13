export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // JSONBin.io configuration
    const BIN_ID = process.env.JSONBIN_ID || 'your-bin-id';
    const API_KEY = process.env.JSONBIN_KEY || 'your-api-key';
    const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    try {
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
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Kitchen status handler error:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
}