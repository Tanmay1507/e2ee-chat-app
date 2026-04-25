const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function nuclearReset() {
  console.log('🚀 Starting TOTAL WIPEOUT (JS Version)...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'e2ee_chat'
  });

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const [msgs] = await connection.query('DELETE FROM messages');
    console.log('✅ Deleted messages:', msgs.affectedRows);
    
    const [users] = await connection.query('DELETE FROM users');
    console.log('✅ Deleted users:', users.affectedRows);
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✨ DATABASE IS NOW 100% EMPTY.');
  } catch (err) {
    console.error('❌ Wipeout failed:', err);
  } finally {
    await connection.end();
  }
}

nuclearReset();
