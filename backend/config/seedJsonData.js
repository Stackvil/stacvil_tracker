const { createModel } = require('./jsonStore');

const Employee = createModel('Employee');
const Settings = createModel('Settings');

const defaultEmployees = [
  { name: 'sonali', emp_no: 'EMP001', full_name: 'Sonali Kumari' },
  { name: 'karthik', emp_no: 'EMP002', full_name: 'Karthik Raja' },
  { name: 'sravani', emp_no: 'EMP003', full_name: 'Sravani Bhat' },
  { name: 'ravi', emp_no: 'EMP004', full_name: 'Ravi Teja' },
  { name: 'nikhil', emp_no: 'EMP005', full_name: 'Nikhil Kumar' },
  { name: 'saikiran', emp_no: 'EMP006', full_name: 'Sai Kiran' },
  { name: 'kishore', emp_no: 'EMP007', full_name: 'Kishore Kumar' }
];

async function seedJsonData() {
  try {
    const existingEmployees = await Employee.find();
    if (existingEmployees.length === 0) {
      console.log('🌱 Seeding Admin user into JSON store...');

      // Admin account 1
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

      // Admin account 2
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

      console.log('✅ Seeded Admin users in backend/data/employee.json');
    }

    const existingSettings = await Settings.find();
    if (existingSettings.length === 0) {
      await Settings.create({
        office_wifi_ssid: 'Your_Office_WiFi_Name',
        office_public_ip: '',
        is_wifi_restriction_enabled: true
      });
      console.log('✅ Seeded default settings in backend/data/settings.json');
    }
  } catch (err) {
    console.error('❌ Error seeding JSON data:', err.message);
  }
}

module.exports = seedJsonData;
