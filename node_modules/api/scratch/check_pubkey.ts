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

async function checkPubKey() {
  try {
    const [users] = await sequelize.query('SELECT username, publicKey FROM users');
    console.log('PUBLIC KEYS:');
    (users as any).forEach((u: any) => {
      console.log(`${u.username}: ${u.publicKey}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkPubKey();
