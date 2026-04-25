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
    logging: console.log
  }
);

async function alterTable() {
  try {
    await sequelize.authenticate();
    console.log('📡 Connected to database...');
    
    await sequelize.query('ALTER TABLE users ADD COLUMN encryptedPrivateKey TEXT;');
    await sequelize.query('ALTER TABLE users ADD COLUMN keySalt VARCHAR(255);');
    
    console.log('✅ TABLE ALTERED SUCCESSFULLY.');
    process.exit(0);
  } catch (error: any) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
       console.log('✅ Columns already exist.');
       process.exit(0);
    }
    console.error('❌ Alter Table Failed:', error);
    process.exit(1);
  }
}

alterTable();
