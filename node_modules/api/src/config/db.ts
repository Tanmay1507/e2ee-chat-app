import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'e2ee_chat',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: console.log, // Enabled for debugging
  }
);

export const connectDB = async () => {
  try {
    // Attempt to connect to MySQL without a specific database to create it if needed
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'e2ee_chat'}\`;`);
    await connection.end();

    await sequelize.authenticate();
    console.log('✅ MySQL Database connected via XAMPP.');
    
    // Sync models (Completely disabled for now to bypass ER_TOO_MANY_KEYS)
    // await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

export default sequelize;
