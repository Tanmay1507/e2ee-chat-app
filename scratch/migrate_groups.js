
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../api/.env') });

async function migrate() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'e2ee_chat'
    });
    
    console.log('Migrating...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        \`id\` CHAR(36) BINARY PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`creatorUsername\` VARCHAR(255) NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`group_members\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`groupId\` CHAR(36) BINARY NOT NULL,
        \`username\` VARCHAR(255) NOT NULL,
        \`encryptedGroupKey\` TEXT NOT NULL,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        INDEX (\`groupId\`),
        INDEX (\`username\`)
      ) ENGINE=InnoDB;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`group_messages\` (
        \`id\` CHAR(36) BINARY PRIMARY KEY,
        \`groupId\` CHAR(36) BINARY NOT NULL,
        \`fromUsername\` VARCHAR(255) NOT NULL,
        \`content\` TEXT NOT NULL,
        \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`createdAt\` DATETIME NOT NULL,
        \`updatedAt\` DATETIME NOT NULL,
        INDEX (\`groupId\`)
      ) ENGINE=InnoDB;
    `);

    console.log('Success');
    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

migrate();
