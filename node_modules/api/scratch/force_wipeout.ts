import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function nuclearReset() {
  console.log('🚀 Starting TOTAL WIPEOUT...');
  console.log('DB_NAME:', process.env.DB_NAME);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'e2ee_chat'
  });

  try {
    // Disable checks to force delete everything
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const [msgs] = await connection.query('DELETE FROM messages');
    console.log('✅ Deleted messages:', (msgs as any).affectedRows);
    
    const [users] = await connection.query('DELETE FROM users');
    console.log('✅ Deleted users:', (users as any).affectedRows);
    
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('\n✨ DATABASE IS NOW 100% EMPTY.');
    console.log('Please RE-REGISTER your accounts now.');
  } catch (err) {
    console.error('❌ Wipeout failed:', err);
  } finally {
    await connection.end();
  }
}

nuclearReset();
