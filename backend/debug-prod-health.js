async function debugProdHealth() {
    try {
        console.log('Checking health on PRODUCTION: https://track.stackvil.com/api/health');
        const response = await fetch('https://track.stackvil.com/api/health');

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);

    } catch (error) {
        console.error('Fetch Error:', error.message);
    }
}

debugProdHealth();
