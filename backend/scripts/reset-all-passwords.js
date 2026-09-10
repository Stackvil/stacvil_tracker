const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const filePath = path.join(__dirname, '../data/employee.json');
const defaultPassword = process.argv[2] || 'admin123';

try {
    const employees = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    employees.forEach(emp => {
        emp.password = hash;
    });

    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2), 'utf8');
    console.log(`✅ All ${employees.length} employee passwords successfully reset to: "${defaultPassword}"`);
} catch (err) {
    console.error('❌ Error resetting passwords:', err.message);
}
