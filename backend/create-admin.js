const Employee = require('./models/Employee');
const connectDB = require('./config/db');

async function createAdminUsers() {
    try {
        await connectDB();

        console.log('Seeding / updating Admin accounts...');

        // 1. Remove existing admin accounts if any to ensure clean hash
        await Employee.deleteMany({ emp_no: { $in: ['ADMIN001', 'ADMIN'] } });

        // 2. Create ADMIN001 (password: stackvil)
        const admin1 = new Employee({
            emp_no: 'ADMIN001',
            name: 'admin',
            email: 'admin@stackvil.com',
            password: 'stackvil',
            full_name: 'Stackvil Admin',
            role: 'admin',
            status: 'active',
            profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'
        });
        await admin1.save();
        console.log('✅ Admin account created: Employee ID = ADMIN001 | Password = stackvil');

        // 3. Create ADMIN (password: admin123)
        const admin2 = new Employee({
            emp_no: 'ADMIN',
            name: 'admin2',
            email: 'admin2@stackvil.com',
            password: 'admin123',
            full_name: 'Admin User',
            role: 'admin',
            status: 'active',
            profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'
        });
        await admin2.save();
        console.log('✅ Admin account created: Employee ID = ADMIN | Password = admin123');

        console.log('\n🚀 Admin credentials setup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating admin:', err);
        process.exit(1);
    }
}

createAdminUsers();
