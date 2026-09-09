const Employee = require('../models/Employee');
const connectDB = require('../config/db');

async function seedStandardUsers() {
    try {
        await connectDB();

        console.log('Seeding standard test users...');

        // Clear existing test accounts
        await Employee.deleteMany({ emp_no: { $in: ['ADMIN001', 'ADMIN', 'EMPTEST', 'EMP001'] } });

        // 1. Admin account
        const admin = new Employee({
            emp_no: 'ADMIN001',
            name: 'admin',
            email: 'admin@stackvil.com',
            password: 'admin123',
            full_name: 'Stackvil Admin',
            role: 'admin',
            status: 'active',
            profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=000&color=fff'
        });
        await admin.save();
        console.log('✅ Admin: ADMIN001 / admin123');

        // 2. Test Employee account
        const emp = new Employee({
            emp_no: 'EMPTEST',
            name: 'test',
            email: 'test@stackvil.com',
            password: 'admin123',
            full_name: 'Alex Mercer',
            role: 'employee',
            status: 'active',
            is_face_enabled: false,
            is_wifi_login_enabled: false, // allow local testing without network restriction
            profile_picture: 'https://ui-avatars.com/api/?name=Alex+Mercer&background=000&color=fff'
        });
        await emp.save();
        console.log('✅ Employee: EMPTEST / admin123');

        console.log('🎉 Standard users seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding users:', err);
        process.exit(1);
    }
}

seedStandardUsers();
