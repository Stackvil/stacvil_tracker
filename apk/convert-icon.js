const fs = require('fs');
const path = require('path');

// Use canvas-free approach: copy webp and add a script to convert
// First check if sharp is available
try {
    const sharp = require('sharp');
    sharp(path.join(__dirname, 'assets/images/stackvil logo.webp'))
        .resize(1024, 1024)
        .png()
        .toFile(path.join(__dirname, 'assets/images/icon.png'))
        .then(info => console.log('Icon converted successfully:', info))
        .catch(err => console.error('Error:', err));
} catch(e) {
    console.log('sharp not available, trying jimp...');
    try {
        const Jimp = require('jimp');
        Jimp.read(path.join(__dirname, 'assets/images/stackvil logo.webp'))
            .then(img => img.resize(1024, 1024).writeAsync(path.join(__dirname, 'assets/images/icon.png')))
            .then(() => console.log('Icon converted with jimp'))
            .catch(err => console.error('jimp error:', err));
    } catch(e2) {
        console.log('No image converter available. Please install: npm install -g sharp');
    }
}
