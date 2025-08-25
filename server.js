import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Enable CORS for all requests
app.use(cors());

// Serve static files (like your index.html)
app.use(express.static('.'));

// API endpoint to fetch a single order
app.get('/api/orders/:orderNumber', async (req, res) => {
    const { orderNumber } = req.params;
    
    // The actual API URL and key from your request
    const API_URL = 'https://restapi.e-shops.co.il/api/getorder';
    const API_KEY = '8DE6EE65-64D3-45F3-B49F-DD1312AA9CC4';

    // Construct the full URL with the order number
    const url = `${API_URL}?key=${API_KEY}&orderid=${orderNumber}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API returned a status of ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data from external API:', error);
        res.status(500).json({ error: 'Failed to fetch data from external API' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
