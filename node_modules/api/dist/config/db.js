"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DB_NAME = process.env.DB_NAME || 'e2ee_chat';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const sequelize = new sequelize_1.Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
});
const connectDB = async () => {
    try {
        // Attempt to connect to MySQL without a specific database to create it if needed
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASS,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await connection.end();
        await sequelize.authenticate();
        console.log('✅ MySQL Database connected via XAMPP.');
        // REMOVED: sequelize.sync() - We use migrations to manage the schema.
    }
    catch (error) {
        console.error('❌ Unable to connect to the database:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
exports.default = sequelize;
