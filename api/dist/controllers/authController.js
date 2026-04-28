"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getAllUsers = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authValidator_1 = require("../validators/authValidator");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be defined in production');
}
const effectiveSecret = JWT_SECRET || 'fallback_secret';
const signup = async (req, res) => {
    try {
        // 1. Validate Input
        const validated = authValidator_1.signupSchema.safeParse(req.body);
        if (!validated.success) {
            return res.status(400).json({
                message: 'Invalid input data',
                errors: validated.error.format()
            });
        }
        const { username, password, publicKey, encryptedPrivateKey, keySalt, department, role, employeeId } = validated.data;
        const existingUser = await User_1.default.findOne({ where: { employeeId } });
        if (existingUser) {
            return res.status(400).json({ message: 'Employee ID already registered' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.default.create({
            employeeId,
            username: username.toLowerCase(),
            password: hashedPassword,
            publicKey,
            encryptedPrivateKey,
            keySalt,
            department,
            role
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, effectiveSecret, { expiresIn: '1d' });
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.status(201).json({ username: user.username, token });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error during signup' });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const validated = authValidator_1.loginSchema.safeParse(req.body);
        if (!validated.success) {
            return res.status(400).json({ message: 'Invalid input data' });
        }
        const { employeeId, password } = validated.data;
        const user = await User_1.default.findOne({ where: { employeeId } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username }, effectiveSecret, { expiresIn: '1d' });
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.json({
            username: user.username,
            token,
            publicKey: user.publicKey,
            encryptedPrivateKey: user.encryptedPrivateKey,
            keySalt: user.keySalt
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error during login' });
    }
};
exports.login = login;
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.findAll({
            attributes: ['username', 'department', 'role', 'employeeId', 'publicKey']
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
const logout = (req, res) => {
    res.clearCookie('jwt');
    res.json({ message: 'Logged out' });
};
exports.logout = logout;
