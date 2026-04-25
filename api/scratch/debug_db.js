const mysql = require('mysql2/promise');
require('dotenv').config();

async function debug() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'e2ee_chat'
    });
    
    console.log('--- USERS ---');
    const [userCols] = await connection.query('DESCRIBE users');
    console.log('Columns:', userCols.map(r => r.Field));
    
    console.log('\n--- MESSAGES ---');
    const [msgCols] = await connection.query('DESCRIBE messages');
    console.log('Columns:', msgCols.map(r => r.Field));
    msgCols.forEach(c => console.log(`${c.Field}: ${c.Type}`));
    
    const [msgs] = await connection.query('SELECT * FROM messages');
    console.log('Count of messages:', msgs.length);
    
    await connection.end();
  } catch (err) {
    console.error('Debug failed:', err.message);
  }
}

debug();
