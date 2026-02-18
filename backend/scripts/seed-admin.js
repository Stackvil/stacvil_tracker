const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedAdmin() {
    console.log('Creating default admin user...\n');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD?.replace(/^"|"$/g, '') || process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT) || 3306
    });

    try {
        // Default admin credentials
        const adminData = {
            emp_no: 'ADMIN001',
            name: 'Admin User',
            email: 'admin@company.com',
            password: 'admin123', // Default password - change this!
            role: 'admin'
        };

        // Check if admin already exists
        const [existing] = await connection.execute(
            'SELECT * FROM employees WHERE emp_no = ? OR email = ?',
            [adminData.emp_no, adminData.email]
        );

        if (existing.length > 0) {
            console.log('⚠️  Admin user already exists!');
            console.log(`   Employee ID: ${existing[0].emp_no}`);
            console.log(`   Email: ${existing[0].email}`);
            console.log(`   Role: ${existing[0].role}`);
            console.log('\n💡 To create a new admin, use the registration endpoint or modify this script.');
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminData.password, salt);

        // Insert admin
        await connection.execute(
            'INSERT INTO employees (emp_no, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
            [adminData.emp_no, adminData.name, adminData.email, hashedPassword, adminData.role]
        );

        console.log('✅ Default admin user created successfully!\n');
        console.log('📋 Login Credentials:');
        console.log(`   Employee ID: ${adminData.emp_no}`);
        console.log(`   Password: ${adminData.password}`);
        console.log(`   Email: ${adminData.email}`);
        console.log(`   Role: ${adminData.role}`);
        console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
        console.log('   You can create more users via the registration endpoint or admin panel.\n');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('💡 Run "npm run setup-db" first to create the database tables.');
        }
        process.exit(1);
    } finally {
        await connection.end();
    }
}

seedAdmin();
