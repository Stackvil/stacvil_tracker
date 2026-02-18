const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Employee = require('./models/Employee');
const connectDB = require('./config/db');

dotenv.config();

const verifyLogin = async (emp_no, password) => {
    try {
        await connectDB();
        const employee = await Employee.findOne({ emp_no });
        if (!employee) {
            console.log(`❌ Employee ${emp_no} not found`);
            process.exit(1);
        }

        const isMatch = await employee.comparePassword(password);
        console.log(`\nVerification for ${emp_no}:`);
        console.log(`- Hash in DB: ${employee.password}`);
        console.log(`- Testing with password: ${password}`);
        console.log(`- Result: ${isMatch ? '✅ MATCH' : '❌ MISMATCH'}`);

        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

// Test both
(async () => {
    await verifyLogin('EMP001', 'password123');
    await verifyLogin('ADMIN001', 'stackvil');
})();
