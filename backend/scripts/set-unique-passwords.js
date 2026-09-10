const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const filePath = path.join(__dirname, '../data/employee.json');

// Generate distinct random alphanumeric passwords (e.g. Stk@7k9X2m)
function generateRandomPassword(prefix = 'Stk') {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    const special = ['@', '#', '$', '!'][crypto.randomInt(0, 4)];
    return `${prefix}${special}${code}`;
}

try {
    const employees = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const credentials = [];

    employees.forEach(emp => {
        let prefix = 'Stk';
        if (emp.role === 'admin') prefix = 'Adm';
        else if (emp.role === 'manager') prefix = 'Mgr';
        else if (emp.role === 'hr') prefix = 'HR';
        else prefix = 'Emp';

        const rawPassword = generateRandomPassword(prefix);
        const salt = bcrypt.genSaltSync(10);
        emp.password = bcrypt.hashSync(rawPassword, salt);

        credentials.push({
            emp_no: emp.emp_no,
            full_name: emp.full_name || emp.name,
            role: emp.role,
            email: emp.email,
            password: rawPassword
        });
    });

    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2), 'utf8');
    fs.writeFileSync(path.join(__dirname, '../data/credentials_export.json'), JSON.stringify(credentials, null, 2), 'utf8');

    console.log(JSON.stringify(credentials, null, 2));
} catch (err) {
    console.error('Error generating random passwords:', err);
}
