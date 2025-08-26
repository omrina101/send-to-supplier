import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Enable CORS for all requests
app.use(cors());
// Enable JSON body parsing for POST requests
app.use(express.json());

// Serve static files (like your index.html)
app.use(express.static('.'));

// --- Rivhit API Credentials (DEMO account) ---
const RIVHIT_API_URL = 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc/SetDocument';
const RIVHIT_API_TOKEN = 'decd03e5-e35c-41e8-84f7-fba2fb483928';
const RIVHIT_USERNAME = 'demo';
const RIVHIT_PASSWORD = '123';
const RIVHIT_COMPANY_ID = '123';
const RIVHIT_DOCUMENT_TYPE = 6; // 6 = Supplier Order (הזמנת ספק)

// --- Existing API endpoint to fetch a single order from your e-shops account ---
app.get('/api/orders/:orderNumber', async (req, res) => {
    const { orderNumber } = req.params;
    
    // The actual API URL and key from your request
    const API_URL = 'https://restapi.e-shops.co.il/api/getorder';
    const API_KEY = '8DE6EE65-64D3-45F3-B49F-DD1312AA9CC4';

    const url = `${API_URL}?key=${API_KEY}&orderid=${orderNumber}`;

    try {
        const response = await axios.get(url);
        
        if (response.status !== 200) {
            throw new Error(`API returned a status of ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data from external API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch data from external API' });
    }
});

// --- New API endpoint to create a supplier order in Rivhit ---
app.post('/api/create-supplier-order', async (req, res) => {
    const { orderNumber } = req.body;

    if (!orderNumber) {
        return res.status(400).json({ error: 'Order number is required' });
    }

    try {
        // Step 1: Fetch the order data from your existing endpoint
        // This ensures the data is always up-to-date and consistent
        const orderDataResponse = await axios.get(`http://localhost:${PORT}/api/orders/${orderNumber}`);
        const orderData = orderDataResponse.data;

        if (!orderData || !orderData.Order || orderData.Order.length === 0) {
            return res.status(404).json({ error: 'Order not found in your system.' });
        }

        const order = orderData.Order[0];
        const billingAddress = orderData.BillingAddress[0];
        const products = orderData.Products;
        const comments = orderData.Comments[0];

        // Step 2: Construct the payload for the Rivhit API
        // This payload must match the structure required by Rivhit's documentation
        const payload = {
            API_TOKEN: RIVHIT_API_TOKEN,
            USERNAME: RIVHIT_USERNAME,
            PASSWORD: RIVHIT_PASSWORD,
            COMPANY_ID: RIVHIT_COMPANY_ID,
            "DOCUMENT": {
                "DocumentType": RIVHIT_DOCUMENT_TYPE,
                "DocumentID": order.OrderNumber,
                "Partner": {
                    "PartnerType": 1, // 1 = Supplier (ספק)
                    "PartnerCode": billingAddress.CustomerNumber, // Use a customer/supplier number from your data
                    "PartnerName": `${billingAddress.BillingFirstName} ${billingAddress.BillingLastName}`
                },
                "DocumentRows": products.map(product => ({
                    "ItemID": product.SKU,
                    "ItemName": product.Name,
                    "Quantity": product.Quantity,
                    "Price": 0, // This is the cost price for the supplier, not the customer price
                    "RowDescription": `מחיר מכירה ללקוח: ${product.Price} ש"ח`
                })),
                "DocumentComments": [{
                    "Comment": `הערות מהאתר: ${comments.SuppliersComments}\nהערות לקוח: ${comments.CustomerMessage}`
                }]
            }
        };

        // Step 3: Send the request to the Rivhit API
        const rivhitResponse = await axios.post(RIVHIT_API_URL, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (rivhitResponse.data.error_code === 0) {
            res.status(200).json({
                success: true,
                rivhitData: rivhitResponse.data.data,
                message: 'Supplier order created successfully in Rivhit.'
            });
        } else {
            res.status(400).json({
                success: false,
                error: rivhitResponse.data.client_message,
                debug: rivhitResponse.data.debug_message
            });
        }
    } catch (error) {
        console.error('Error in Rivhit API process:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to create supplier order in Rivhit.',
            debug: error.message
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
