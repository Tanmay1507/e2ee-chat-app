import express from 'express';
import { clearAllMessages } from '../controllers/chatController';
import { authMiddleware } from '../utils/authMiddleware';

const router = express.Router();

// Delete all messages from the database (Restricted to Admins)
router.delete('/clear', authMiddleware, (req, res, next) => {
    if ((req as any).user.role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can clear chat history' });
    }
    next();
}, clearAllMessages);

export default router;
