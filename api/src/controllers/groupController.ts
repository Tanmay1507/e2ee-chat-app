import { Request, Response } from 'express';
import Group from '../models/Group';
import GroupMember from '../models/GroupMember';
import GroupMessage from '../models/GroupMessage';

export const createGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, members } = req.body; // members: [{ username, encryptedGroupKey }]
    const creatorUsername = (req as any).user.username;

    const group = await Group.create({
      name,
      creatorUsername: creatorUsername.toLowerCase()
    });
    
    // Add members with their encrypted keys
    const memberRecords = members.map((m: any) => ({
      groupId: group.id,
      username: m.username.toLowerCase(),
      encryptedGroupKey: m.encryptedGroupKey
    }));
    
    await GroupMember.bulkCreate(memberRecords);
    
    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create group' });
  }
};

export const getMyGroups = async (req: Request, res: Response): Promise<any> => {
  try {
    const username = (req as any).user.username.toLowerCase();
    
    // Find all group IDs the user is a member of
    const memberships = await GroupMember.findAll({
      where: { username }
    });

    const groupIds = memberships.map(m => m.groupId);

    const groups = await Group.findAll({
      where: { id: groupIds }
    });

    // Attach the encrypted key for the current user to each group object
    const result = groups.map(g => {
      const membership = memberships.find(m => m.groupId === g.id);
      return {
        ...g.toJSON(),
        encryptedGroupKey: membership?.encryptedGroupKey
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

export const getGroupMessages = async (req: Request, res: Response): Promise<any> => {
  try {
    const groupId = req.params.groupId.trim().toLowerCase();
    const username = (req as any).user.username.toLowerCase();

    console.log(`📥 History Request: Group ${groupId} from user ${username}`);

    // Verify membership
    const membership = await GroupMember.findOne({
      where: { groupId, username }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const messages = await GroupMessage.findAll({
      where: { groupId },
      order: [['timestamp', 'ASC']],
      limit: 100
    });

    console.log(`📡 Group History: Found ${messages.length} messages for group ${groupId}`);

    res.json(messages.map(m => ({
      ...m.toJSON(),
      content: JSON.parse(m.content)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch group messages' });
  }
};

export const getGroupMembers = async (req: Request, res: Response): Promise<any> => {
  try {
    const groupId = req.params.groupId.trim().toLowerCase();
    const members = await GroupMember.findAll({
      where: { groupId },
      attributes: ['username']
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
};
