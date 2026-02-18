const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Employee = require('./models/Employee');
const connectDB = require('./config/db');

dotenv.config();

const employees = [
    { name: 'sonali', emp_no: 'EMP001', full_name: 'Sonali Kumari' },
    { name: 'karthik', emp_no: 'EMP002', full_name: 'Karthik Raja' },
    { name: 'sravani', emp_no: 'EMP003', full_name: 'Sravani Bhat' },
    { name: 'ravi', emp_no: 'EMP004', full_name: 'Ravi Teja' },
    { name: 'nikhil', emp_no: 'EMP005', full_name: 'Nikhil Kumar' },
    { name: 'saikiran', emp_no: 'EMP006', full_name: 'Sai Kiran' },
    { name: 'kishore', emp_no: 'EMP007', full_name: 'Kishore Kumar' }
];

const seedEmployees = async () => {
    try {
        await connectDB();

        for (const empData of employees) {
            const email = `${empData.name}@stackvil.com`;
            const password = Math.random().toString(36).slice(-8);

            console.log(`Setting up ${empData.name}...`);

            let employee = await Employee.findOne({ emp_no: empData.emp_no });
            if (!employee) {
                employee = new Employee({ emp_no: empData.emp_no });
            }

            employee.name = empData.name;
            employee.email = email;
            employee.password = password; // Pre-save hook will hash this
            employee.full_name = empData.full_name;
            employee.role = 'employee';
            employee.status = 'active';
            employee.profile_picture = `https://ui-avatars.com/api/?name=${encodeURIComponent(empData.full_name)}&background=random`;

            await employee.save();

            console.log(`✅ ${empData.name} - Email: ${email}, Password: ${password}`);
        }

        // Setup Admin
        console.log('Setting up Admin...');
        let admin = await Employee.findOne({ emp_no: 'ADMIN001' });
        if (!admin) {
            admin = new Employee({ emp_no: 'ADMIN001' });
        }

        admin.name = 'admin';
        admin.email = 'admin@stackvil.com';
        admin.password = 'stackvil';
        admin.full_name = 'Stackvil Admin';
        admin.role = 'admin';
        admin.status = 'active';
        admin.profile_picture = 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff';

        await admin.save();
        console.log('✅ Admin setup complete - Email: admin@stackvil.com, Password: stackvil');

        console.log('\n🚀 All employees seeded successfully with SECURE hashes!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding employees:', error.message);
        process.exit(1);
    }
};

seedEmployees();
