const fs = require('fs');
const path = require('path');
const { DATA_DIR, saveCollection } = require('../config/jsonStore');
const seedJsonData = require('../config/seedJsonData');

const wipeDatabase = async () => {
  console.log('🧹 Starting Complete JSON Database Wipe...\n');

  try {
    const collections = ['employee', 'attendance', 'task', 'leave', 'loginrequest', 'session', 'settings'];
    
    for (const name of collections) {
      saveCollection(name, []);
      console.log(`🗑️  Cleared local collection [${name}.json]`);
    }

    console.log('\n🌱 Re-seeding default Admin & Employee accounts...');
    await seedJsonData();

    console.log('\n✨ JSON DATABASE WIPE & RE-SEED COMPLETE!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error wiping JSON database:', err.message);
    process.exit(1);
  }
};

wipeDatabase();
