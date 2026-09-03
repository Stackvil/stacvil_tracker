const { saveCollection } = require('./config/jsonStore');
const Employee = require('./models/Employee');
const connectDB = require('./config/db');

async function wipeAllEmployeesAndData() {
    try {
        console.log('🧹 Clearing all non-admin employees and database history...');
        await connectDB();

        // 1. Clear all non-admin employees
        await Employee.deleteMany({ role: { $ne: 'admin' } });
        console.log('✅ Removed all non-admin employees.');

        // Ensure Admin accounts are present
        const admins = await Employee.find({ role: 'admin' });
        if (admins.length === 0) {
            console.log('Creating fresh Admin account...');
            await Employee.create({
                emp_no: 'ADMIN001',
                name: 'admin',
                email: 'admin@stackvil.com',
                password: 'stackvil',
                full_name: 'Stackvil Admin',
                role: 'admin',
                status: 'active',
                profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'
            });
            await Employee.create({
                emp_no: 'ADMIN',
                name: 'admin2',
                email: 'admin2@stackvil.com',
                password: 'admin123',
                full_name: 'Admin User',
                role: 'admin',
                status: 'active',
                profile_picture: 'https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff'
            });
        }

        // 2. Wipe attendance, task, leave, loginrequest, session collections
        const collectionsToClear = ['attendance', 'task', 'leave', 'loginrequest', 'session'];
        for (const col of collectionsToClear) {
            saveCollection(col, []);
            console.log(`🗑️  Cleared collection: ${col}.json`);
        }

        console.log('\n✨ Database successfully wiped! Only Admin accounts remain.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error wiping data:', err.message);
        process.exit(1);
    }
}

wipeAllEmployeesAndData();
