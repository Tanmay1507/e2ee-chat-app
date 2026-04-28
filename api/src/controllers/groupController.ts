import { Request, Response } from 'express';
import Group from '../models/Group';
import GroupMember from '../models/GroupMember';
import GroupMessage from '../models/GroupMessage';
import { AuthenticatedRequest } from '../types';

export const createGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, members } = req.body; // members: [{ username, encryptedGroupKey }]
    const creatorUsername = (req as AuthenticatedRequest).user.username.toLowerCase();

    const group = await Group.create({
      name,
      creatorUsername
    });
    
    // Add members with their encrypted keys
    const memberRecords = members.map((m: any) => ({
      groupId: group.id,
      username: m.username.toLowerCase(),
      encryptedGroupKey: m.encryptedGroupKey,
      role: m.username.toLowerCase() === creatorUsername ? 'admin' : 'member'
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
    const username = (req as AuthenticatedRequest).user.username.toLowerCase();
    
    // Find all group IDs the user is a member of
    const memberships = await GroupMember.findAll({
      where: { username }
    });

    const groupIds = memberships.map(m => m.groupId);

    const groups = await Group.findAll({
      where: { id: groupIds }
    });

    // Get member counts for these groups
    const memberCounts = await GroupMember.findAll({
      where: { groupId: groupIds },
      attributes: [
        'groupId',
        [GroupMember.sequelize!.fn('COUNT', GroupMember.sequelize!.col('username')), 'count']
      ],
      group: ['groupId']
    });

    // Attach the encrypted key, role, description, and member count for each group object
    const result = groups.map(g => {
      const membership = memberships.find(m => m.groupId === g.id);
      const countData = memberCounts.find(c => (c as any).getDataValue('groupId') === g.id);
      const membersCount = countData ? parseInt((countData as any).getDataValue('count'), 10) : 0;
      
      let role = membership?.role;
      
      // FALLBACK: If user is the creator, they MUST be an admin
      if (g.creatorUsername.toLowerCase() === username.toLowerCase()) {
        role = 'admin';
      }

      return {
        ...g.toJSON(),
        description: g.description,
        encryptedGroupKey: membership?.encryptedGroupKey,
        role: role,
        membersCount: membersCount
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

export const updateGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const username = (req as AuthenticatedRequest).user.username.toLowerCase();

    // Check if requester is admin or creator
    const group = await Group.findByPk(groupId);
    const membership = await GroupMember.findOne({
      where: { groupId: groupId as string, username, role: 'admin' }
    });

    const isCreator = group && group.creatorUsername.toLowerCase() === username;

    if (!membership && !isCreator) {
      return res.status(403).json({ message: 'Only admins can update group details' });
    }

    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    await group.save();

    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update group' });
  }
};

export const addMember = async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const { username, encryptedGroupKey } = req.body;
    const adminUsername = (req as AuthenticatedRequest).user.username.toLowerCase();

    console.log(`🔍 [BACKEND] addMember request: Group=${groupId}, Admin=${adminUsername}, Adding=${username}`);

    // Check if requester is admin or creator
    const group = await Group.findByPk(groupId);
    const adminMembership = await GroupMember.findOne({
      where: { groupId, username: adminUsername, role: 'admin' }
    });

    const isCreator = group && group.creatorUsername.toLowerCase() === adminUsername;

    if (!adminMembership && !isCreator) {
      console.warn(`⚠️ [BACKEND] Admin check failed for ${adminUsername} in group ${groupId}.`);
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    // Check if user already in group
    const existing = await GroupMember.findOne({
      where: { groupId: groupId as string, username: (username as string).toLowerCase() }
    });
    if (existing) return res.status(400).json({ message: 'User already in group' });

    await GroupMember.create({
      groupId: groupId as string,
      username: (username as string).toLowerCase(),
      role: 'member',
      encryptedGroupKey
    });

    res.status(201).json({ message: 'Member added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add member' });
  }
};

export const getGroupMessages = async (req: Request, res: Response): Promise<any> => {
  try {
    const groupId = (req.params.groupId as string).trim().toLowerCase();
    const username = (req as AuthenticatedRequest).user.username.toLowerCase();

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

    res.json(messages.map(m => {
      try {
        return {
          ...m.toJSON(),
          content: JSON.parse(m.content)
        };
      } catch (e) {
        return null;
      }
    }).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch group messages' });
  }
};

export const getGroupMembers = async (req: Request, res: Response): Promise<any> => {
  try {
    const groupId = (req.params.groupId as string).trim().toLowerCase();
    const members = await GroupMember.findAll({
      where: { groupId },
      attributes: ['username', 'role']
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
};

export const removeMember = async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId, memberUsername } = req.params;
    const adminUsername = (req as AuthenticatedRequest).user.username.toLowerCase();

    // Check if requester is admin or creator
    const group = await Group.findByPk(groupId);
    const adminMembership = await GroupMember.findOne({
      where: { groupId: groupId as string, username: adminUsername, role: 'admin' }
    });

    const isCreator = group && group.creatorUsername.toLowerCase() === adminUsername;

    if (!adminMembership && !isCreator) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    await GroupMember.destroy({
      where: { groupId: groupId as string, username: (memberUsername as string).toLowerCase() }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { messageId } = req.params;
    const username = (req as AuthenticatedRequest).user.username.toLowerCase();

    const message = await GroupMessage.findByPk(messageId as string);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const group = await Group.findByPk(message.groupId);
    const isAdmin = await GroupMember.findOne({
      where: { groupId: message.groupId, username, role: 'admin' }
    });

    const isCreator = group && group.creatorUsername.toLowerCase() === username;

    if (message.fromUsername.toLowerCase() !== username && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Unauthorized to delete this message' });
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

export const updateMemberRole = async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId, memberUsername } = req.params;
    const { role } = req.body; // 'admin' or 'member'
    const adminUsername = (req as AuthenticatedRequest).user.username.toLowerCase();

    // Verify requester is an admin or creator
    const group = await Group.findByPk(groupId);
    const adminMembership = await GroupMember.findOne({
      where: { groupId: groupId as string, username: adminUsername, role: 'admin' }
    });

    const isCreator = group && group.creatorUsername.toLowerCase() === adminUsername;

    if (!adminMembership && !isCreator) {
      return res.status(403).json({ message: 'Only admins can manage roles' });
    }

    const member = await GroupMember.findOne({
      where: { groupId: groupId as string, username: (memberUsername as string).toLowerCase() }
    });

    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.role = role;
    await member.save();

    res.json({ message: `Member role updated to ${role}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update member role' });
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId } = req.params;
    const username = (req as AuthenticatedRequest).user.username.toLowerCase();

    // Check if requester is admin or creator
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const adminMembership = await GroupMember.findOne({
      where: { groupId, username, role: 'admin' }
    });

    const isCreator = group.creatorUsername.toLowerCase() === username;

    if (!adminMembership && !isCreator) {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    // Delete group and all associated records
    await GroupMember.destroy({ where: { groupId } });
    await GroupMessage.destroy({ where: { groupId } });
    await group.destroy();

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete group' });
  }
};
