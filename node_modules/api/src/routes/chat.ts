import express from 'express';
import { clearAllMessages } from '../controllers/chatController';

const router = express.Router();

// Delete all messages from the database
router.delete('/clear', clearAllMessages);

export default router;
