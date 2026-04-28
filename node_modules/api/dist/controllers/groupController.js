"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRole = exports.deleteMessage = exports.removeMember = exports.getGroupMembers = exports.getGroupMessages = exports.addMember = exports.updateGroup = exports.getMyGroups = exports.createGroup = void 0;
const Group_1 = __importDefault(require("../models/Group"));
const GroupMember_1 = __importDefault(require("../models/GroupMember"));
const GroupMessage_1 = __importDefault(require("../models/GroupMessage"));
const createGroup = async (req, res) => {
    try {
        const { name, members } = req.body; // members: [{ username, encryptedGroupKey }]
        const creatorUsername = req.user.username;
        const group = await Group_1.default.create({
            name,
            creatorUsername: creatorUsername.toLowerCase()
        });
        // Add members with their encrypted keys
        const memberRecords = members.map((m) => ({
            groupId: group.id,
            username: m.username.toLowerCase(),
            encryptedGroupKey: m.encryptedGroupKey,
            role: m.username.toLowerCase() === creatorUsername.toLowerCase() ? 'admin' : 'member'
        }));
        await GroupMember_1.default.bulkCreate(memberRecords);
        res.status(201).json(group);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create group' });
    }
};
exports.createGroup = createGroup;
const getMyGroups = async (req, res) => {
    try {
        const username = req.user.username.toLowerCase();
        // Find all group IDs the user is a member of
        const memberships = await GroupMember_1.default.findAll({
            where: { username }
        });
        const groupIds = memberships.map(m => m.groupId);
        const groups = await Group_1.default.findAll({
            where: { id: groupIds }
        });
        // Get member counts for these groups
        const memberCounts = await GroupMember_1.default.findAll({
            where: { groupId: groupIds },
            attributes: [
                'groupId',
                [GroupMember_1.default.sequelize.fn('COUNT', GroupMember_1.default.sequelize.col('username')), 'count']
            ],
            group: ['groupId']
        });
        // Attach the encrypted key, role, description, and member count for each group object
        const result = groups.map(g => {
            const membership = memberships.find(m => m.groupId === g.id);
            const countData = memberCounts.find(c => c.getDataValue('groupId') === g.id);
            const membersCount = countData ? parseInt(countData.getDataValue('count'), 10) : 0;
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch groups' });
    }
};
exports.getMyGroups = getMyGroups;
const updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name, description } = req.body;
        const username = req.user.username.toLowerCase();
        // Check if requester is admin
        const membership = await GroupMember_1.default.findOne({
            where: { groupId: groupId, username, role: 'admin' }
        });
        if (!membership) {
            return res.status(403).json({ message: 'Only admins can update group details' });
        }
        const group = await Group_1.default.findByPk(groupId);
        if (!group)
            return res.status(404).json({ message: 'Group not found' });
        if (name)
            group.name = name;
        if (description !== undefined)
            group.description = description;
        await group.save();
        res.json(group);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update group' });
    }
};
exports.updateGroup = updateGroup;
const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { username, encryptedGroupKey } = req.body;
        const adminUsername = req.user.username.toLowerCase();
        // Check if requester is admin
        const adminMembership = await GroupMember_1.default.findOne({
            where: { groupId, username: adminUsername, role: 'admin' }
        });
        if (!adminMembership) {
            return res.status(403).json({ message: 'Only admins can add members' });
        }
        // Check if user already in group
        const existing = await GroupMember_1.default.findOne({
            where: { groupId: groupId, username: username.toLowerCase() }
        });
        if (existing)
            return res.status(400).json({ message: 'User already in group' });
        await GroupMember_1.default.create({
            groupId: groupId,
            username: username.toLowerCase(),
            role: 'member',
            encryptedGroupKey
        });
        res.status(201).json({ message: 'Member added successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add member' });
    }
};
exports.addMember = addMember;
const getGroupMessages = async (req, res) => {
    try {
        const groupId = req.params.groupId.trim().toLowerCase();
        const username = req.user.username.toLowerCase();
        console.log(`📥 History Request: Group ${groupId} from user ${username}`);
        // Verify membership
        const membership = await GroupMember_1.default.findOne({
            where: { groupId, username }
        });
        if (!membership) {
            return res.status(403).json({ message: 'Not a member of this group' });
        }
        const messages = await GroupMessage_1.default.findAll({
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
            }
            catch (e) {
                return null;
            }
        }).filter(Boolean));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch group messages' });
    }
};
exports.getGroupMessages = getGroupMessages;
const getGroupMembers = async (req, res) => {
    try {
        const groupId = req.params.groupId.trim().toLowerCase();
        const members = await GroupMember_1.default.findAll({
            where: { groupId },
            attributes: ['username', 'role']
        });
        res.json(members);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch group members' });
    }
};
exports.getGroupMembers = getGroupMembers;
const removeMember = async (req, res) => {
    try {
        const { groupId, memberUsername } = req.params;
        const adminUsername = req.user.username.toLowerCase();
        const adminMembership = await GroupMember_1.default.findOne({
            where: { groupId: groupId, username: adminUsername, role: 'admin' }
        });
        if (!adminMembership) {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }
        await GroupMember_1.default.destroy({
            where: { groupId: groupId, username: memberUsername.toLowerCase() }
        });
        res.json({ message: 'Member removed successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to remove member' });
    }
};
exports.removeMember = removeMember;
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const username = req.user.username.toLowerCase();
        const message = await GroupMessage_1.default.findByPk(messageId);
        if (!message)
            return res.status(404).json({ message: 'Message not found' });
        const isAdmin = await GroupMember_1.default.findOne({
            where: { groupId: message.groupId, username, role: 'admin' }
        });
        if (message.fromUsername.toLowerCase() !== username && !isAdmin) {
            return res.status(403).json({ message: 'Unauthorized to delete this message' });
        }
        await message.destroy();
        res.json({ message: 'Message deleted successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete message' });
    }
};
exports.deleteMessage = deleteMessage;
const updateMemberRole = async (req, res) => {
    try {
        const { groupId, memberUsername } = req.params;
        const { role } = req.body; // 'admin' or 'member'
        const adminUsername = req.user.username.toLowerCase();
        // Verify requester is an admin
        const adminMembership = await GroupMember_1.default.findOne({
            where: { groupId: groupId, username: adminUsername, role: 'admin' }
        });
        if (!adminMembership) {
            return res.status(403).json({ message: 'Only admins can manage roles' });
        }
        const member = await GroupMember_1.default.findOne({
            where: { groupId: groupId, username: memberUsername.toLowerCase() }
        });
        if (!member)
            return res.status(404).json({ message: 'Member not found' });
        member.role = role;
        await member.save();
        res.json({ message: `Member role updated to ${role}` });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update member role' });
    }
};
exports.updateMemberRole = updateMemberRole;
