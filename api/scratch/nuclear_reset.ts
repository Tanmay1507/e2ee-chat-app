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

async function nuclearReset() {
  try {
    await sequelize.authenticate();
    console.log('📡 Connected to database for Nuclear Reset...');
    
    // Disable foreign key checks to allow truncation
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('🧹 Wiping Messages...');
    await sequelize.query('TRUNCATE TABLE messages');
    
    console.log('🧹 Wiping Users...');
    await sequelize.query('TRUNCATE TABLE users');
    
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ DATABASE FULLY RESET.');
    console.log('Please refresh your browser, sign up again, and enjoy your perfect secure chat!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Nuclear Reset Failed:', error);
    process.exit(1);
  }
}

nuclearReset();
