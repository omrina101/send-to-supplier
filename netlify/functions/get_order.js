import { getBlobs } from '@netlify/blobs';
import fetch from 'node-fetch';

// The main handler for the Netlify Function
exports.handler = async (event, context) => {
    // Extract the order number from the request path
    const orderNumber = event.path.split('/').pop();

    if (!orderNumber) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Order number is missing.' }),
        };
    }
    
    // The actual API URL and key from your request
    const API_URL = 'https://restapi.e-shops.co.il/api/getorder';
    const API_KEY = '8DE6EE65-64D3-45F3-B49F-DD1312AA9CC4';

    // Construct the full URL with the order number
    const url = `${API_URL}?key=${API_KEY}&orderid=${orderNumber}`;

    // Get the blobs client for a specific store
    const blobs = getBlobs({ name: 'orders' });

    try {
        // Step 1: Check if the order already exists in the database
        const existingOrder = await blobs.get(orderNumber, { type: 'json' });

        if (existingOrder) {
            console.log('Order already exists in database, skipping fetch.');
            return {
                statusCode: 200,
                body: JSON.stringify(existingOrder),
            };
        }
        
        // Step 2: Fetch the order from the external API
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API returned a status of ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();

        // Step 3: Save the fetched order to the Blobs database
        await blobs.setJSON(orderNumber, data);
        console.log('Order saved to Blobs database.');

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch or save order.' }),
        };
    }
};
