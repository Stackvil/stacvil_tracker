const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
const testConnection = async () => {
  try {
    const connection = await pool.promise().getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.code || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 MySQL is not running. Please start MySQL service.');
      console.error('   Run: node scripts/check-mysql.ps1 (PowerShell) or start MySQL manually');
    }
  }
};

// Test connection after a short delay to allow server to start
setTimeout(testConnection, 1000);

module.exports = pool.promise();
