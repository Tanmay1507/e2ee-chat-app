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

async function checkEscrow() {
  try {
    const [users] = await sequelize.query('SELECT username, encryptedPrivateKey, keySalt FROM users');
    console.log('USERS ESCROW DATA:', users);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkEscrow();
