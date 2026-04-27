
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../api/.env') });

async function cleanup() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'e2ee_chat'
    });
    
    console.log('Cleaning up duplicate indexes...');
    const [indexes] = await connection.query('SHOW INDEX FROM users');
    
    const seenKeys = new Set();
    for (const row of indexes) {
      const keyName = row.Key_name;
      const columnName = row.Column_name;
      
      if (keyName === 'PRIMARY' || keyName === columnName) {
        continue;
      }

      // If it looks like a duplicate index (e.g. employeeId_1, employeeId_2)
      if (keyName.startsWith('employeeId_') || keyName.startsWith('username_')) {
        console.log(`Dropping duplicate index: ${keyName}`);
        await connection.query(`ALTER TABLE users DROP INDEX \`${keyName}\``);
      }
    }

    console.log('Success');
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

cleanup();
