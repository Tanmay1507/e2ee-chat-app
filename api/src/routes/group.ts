import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import { authMiddleware } from '../utils/authMiddleware';

const router = Router();

router.use(authMiddleware); // Protect all group routes

router.post('/', groupController.createGroup);
router.get('/', groupController.getMyGroups);
router.put('/:groupId', groupController.updateGroup);
router.get('/:groupId/messages', groupController.getGroupMessages);
router.get('/:groupId/members', groupController.getGroupMembers);
router.post('/:groupId/members', groupController.addMember);
router.put('/:groupId/members/:memberUsername', groupController.updateMemberRole);
router.delete('/:groupId/members/:memberUsername', groupController.removeMember);
router.delete('/:groupId', groupController.deleteGroup);
router.delete('/messages/:messageId', groupController.deleteMessage);

export default router;
