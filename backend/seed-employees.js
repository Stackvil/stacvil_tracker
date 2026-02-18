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

        // Clear existing non-admin employees if needed, or just upsert
        // For this task, we will create/update them

        for (const empData of employees) {
            const email = `${empData.name}@stackvil.com`;
            // Random 8-character password
            const password = Math.random().toString(36).slice(-8);

            console.log(`Setting up ${empData.name}...`);

            await Employee.findOneAndUpdate(
                { emp_no: empData.emp_no },
                {
                    name: empData.name,
                    email: email,
                    password: password, // Pre-save hook will hash it
                    full_name: empData.full_name,
                    role: 'employee',
                    status: 'active',
                    profile_picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(empData.full_name)}&background=random`
                },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );

            console.log(`✅ ${empData.name} - Email: ${email}, Password: ${password}`);
        }

        // Setup Admin
        console.log('Setting up Admin...');
        await Employee.findOneAndUpdate(
            { emp_no: 'ADMIN001' },
            {
                name: 'admin',
                email: 'admin@stackvil.com',
                password: 'stackvil',
                full_name: 'Stackvil Admin',
                role: 'admin',
                status: 'active',
                profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        console.log('✅ Admin setup complete - Email: admin@stackvil.com, Password: stackvil');

        console.log('\n🚀 All employees seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding employees:', error.message);
        process.exit(1);
    }
};

seedEmployees();
