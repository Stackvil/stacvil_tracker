const path = require('path');
const seedJsonData = require('./seedJsonData');

let initialized = false;

const connectDB = async () => {
  if (!initialized) {
    console.log('✅ JSON File Database Initialized: backend/data/*.json');
    await seedJsonData();
    initialized = true;
  }
  return true;
};

module.exports = connectDB;
