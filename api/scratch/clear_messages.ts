import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'e2ee_chat',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function clearMessages() {
  try {
    await sequelize.authenticate();
    console.log('📡 Connected to database...');
    
    // Using raw query to be safe
    await sequelize.query('TRUNCATE TABLE messages');
    
    console.log('✅ ALL MESSAGES DELETED SUCCESSFULLY.');
    console.log('You can now refresh your browser and start a fresh, secure chat!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to clear messages:', error);
    process.exit(1);
  }
}

clearMessages();
