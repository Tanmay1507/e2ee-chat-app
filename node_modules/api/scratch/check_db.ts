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

async function checkDB() {
  try {
    const [users] = await sequelize.query('SELECT username FROM users');
    const [messages] = await sequelize.query('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 3');
    console.log('USERS:', users);
    console.log('MESSAGES:', messages);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDB();
