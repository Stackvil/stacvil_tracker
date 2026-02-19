async function debugProdLogin() {
    try {
        console.log('Attempting login on PRODUCTION: https://track.stackvil.com/api/auth/login');
        const response = await fetch('https://track.stackvil.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emp_no: 'EMP001',
                password: 'password123',
                device_info: 'Debug Script'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);

    } catch (error) {
        console.error('Fetch Error:', error.message);
    }
}

debugProdLogin();
