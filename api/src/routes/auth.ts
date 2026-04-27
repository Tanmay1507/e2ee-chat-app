import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../utils/authMiddleware';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/users', authMiddleware, authController.getAllUsers);

export default router;
