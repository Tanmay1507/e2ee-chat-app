"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined in production environment');
}
const fallbackSecret = 'fallback_secret'; // Temporary fallback for dev if not set
const authMiddleware = (req, res, next) => {
    const token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET || fallbackSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
