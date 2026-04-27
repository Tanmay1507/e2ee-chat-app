import express from 'express';
import { clearAllMessages } from '../controllers/chatController';
import { authMiddleware } from '../utils/authMiddleware';

const router = express.Router();

// Delete all messages from the database
router.delete('/clear', authMiddleware, clearAllMessages);

export default router;
