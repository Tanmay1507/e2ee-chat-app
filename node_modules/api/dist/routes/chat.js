"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = express_1.default.Router();
// Delete all messages from the database (Restricted to Admins)
router.delete('/clear', authMiddleware_1.authMiddleware, (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can clear chat history' });
    }
    next();
}, chatController_1.clearAllMessages);
exports.default = router;
