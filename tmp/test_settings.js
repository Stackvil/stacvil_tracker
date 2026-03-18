const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function testSettings() {
    try {
        console.log('Testing /api/admin/settings...');
        // We need an admin token. I'll just check if it returns 401 (expected) vs 404 (bad).
        const response = await axios.get(`${API_URL}/admin/settings`).catch(err => err.response);
        console.log('Status:', response.status);
        console.log('Data:', response.data);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSettings();
