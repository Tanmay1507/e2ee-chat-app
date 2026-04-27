
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
    
    const [groups] = await connection.query('SELECT id, name FROM \`groups\`');
    console.log(groups);

    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

check();
