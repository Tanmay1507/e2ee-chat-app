import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import { authMiddleware } from '../utils/authMiddleware';

const router = Router();

router.use(authMiddleware); // Protect all group routes

router.post('/', groupController.createGroup);
router.get('/', groupController.getMyGroups);
router.get('/:groupId/messages', groupController.getGroupMessages);
router.get('/:groupId/members', groupController.getGroupMembers);

export default router;
