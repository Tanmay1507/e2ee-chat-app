
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../api/.env') });

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'e2ee_chat'
    });
    
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables:', rows);
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
