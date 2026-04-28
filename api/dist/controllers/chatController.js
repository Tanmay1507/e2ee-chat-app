"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllMessages = exports.handleConnection = void 0;
const User_1 = __importDefault(require("../models/User"));
const Message_1 = __importDefault(require("../models/Message"));
const GroupMessage_1 = __importDefault(require("../models/GroupMessage"));
const GroupMember_1 = __importDefault(require("../models/GroupMember"));
const Notice_1 = __importDefault(require("../models/Notice"));
const logger_1 = __importDefault(require("../utils/logger"));
const sequelize_1 = require("sequelize");
const messageUtils_1 = require("../utils/messageUtils");
const onlineUsers = {};
const broadcastAllUsers = async (io) => {
    try {
        const allUsers = await User_1.default.findAll();
        const userList = allUsers.map(u => {
            const onlineData = Object.values(onlineUsers).find(ou => ou.username.trim().toLowerCase() === u.username.trim().toLowerCase());
            return {
                id: onlineData ? onlineData.id : u.id,
                username: u.username,
                employeeId: u.employeeId,
                department: u.department,
                role: u.role,
                publicKey: u.publicKey,
                isOnline: !!onlineData
            };
        });
        io.emit('user-list', userList);
    }
    catch (err) {
        logger_1.default.error('Error broadcasting users:', err);
    }
};
const handleConnection = (io, socket) => {
    const authUser = socket.user;
    if (!authUser) {
        console.error('Socket connected without user info!');
        return socket.disconnect();
    }
    logger_1.default.info(`📡 New Authenticated Socket Connection: ${authUser.username} (socket: ${socket.id})`);
    socket.on('join', async () => {
        try {
            const username = authUser.username.toLowerCase();
            // 1. Sync user with DB
            const user = await User_1.default.findOne({ where: { username } });
            if (user) {
                // DO NOT overwrite user.publicKey from socket payload!
                // We only use the one stored in DB during signup.
                onlineUsers[socket.id] = {
                    id: socket.id,
                    username: user.username.trim(),
                    employeeId: user.employeeId,
                    department: user.department,
                    role: user.role,
                    publicKey: user.publicKey
                };
            }
            // 2. Fetch History (Join with Users to get public keys)
            const history = await Message_1.default.findAll({
                where: {
                    [sequelize_1.Op.or]: [
                        { from: username },
                        { to: username }
                    ]
                },
                order: [['timestamp', 'ASC']],
                limit: 100
            });
            // Get all public keys for the users in history in one go
            const userUsernames = Array.from(new Set(history.flatMap(m => [m.from, m.to])));
            const userKeys = await User_1.default.findAll({
                where: { username: userUsernames },
                attributes: ['username', 'publicKey']
            });
            const keyMap = {};
            userKeys.forEach(u => keyMap[u.username.toLowerCase()] = u.publicKey);
            // 3. Send history to the user
            socket.emit('chat-history', history.map(m => {
                try {
                    const fromUser = m.from.toLowerCase();
                    const toUser = m.to.toLowerCase();
                    return {
                        id: m.id,
                        from: m.from,
                        to: m.to,
                        content: JSON.parse(m.content),
                        status: m.status,
                        timestamp: m.timestamp,
                        fromPublicKey: keyMap[fromUser], // Inject public key for instant decryption
                        toPublicKey: keyMap[toUser]
                    };
                }
                catch (e) {
                    return null;
                }
            }).filter(Boolean));
            // 4. Auto-mark messages as delivered for the joining user
            const [updatedCount] = await Message_1.default.update({ status: 'delivered' }, {
                where: {
                    to: username,
                    status: 'sent'
                }
            });
            if (updatedCount > 0) {
                // Only notify senders of messages that were JUST marked as delivered
                const deliveredMessages = await Message_1.default.findAll({
                    where: { to: username, status: 'delivered' },
                    order: [['timestamp', 'DESC']],
                    limit: updatedCount
                });
                deliveredMessages.forEach(m => {
                    const sender = Object.values(onlineUsers).find(u => u.username.toLowerCase() === m.from.toLowerCase());
                    if (sender) {
                        io.to(sender.id).emit('message-status-update', { messageId: m.id, status: 'delivered' });
                    }
                });
            }
            // 5. Broadcast updated all user list
            await broadcastAllUsers(io);
            logger_1.default.info(`User ${username} joined the faculty relay.`);
        }
        catch (err) {
            logger_1.default.error('Error in join event:', err);
        }
    });
    socket.on('send-message', async (data) => {
        logger_1.default.info(`📩 Received send-message event from ${authUser.username} to ${data.to}`);
        try {
            const toUsername = data.to.trim().toLowerCase();
            const fromUsername = authUser.username.trim().toLowerCase(); // Trust the authenticated username
            const livePublicKey = data.fromPublicKey;
            const recipient = Object.values(onlineUsers).find(u => u.username.trim().toLowerCase() === toUsername);
            const sender = Object.values(onlineUsers).find(u => u.username.trim().toLowerCase() === fromUsername);
            // Save to database
            logger_1.default.info(`Saving message to DB. from: ${fromUsername}, to: ${toUsername}`);
            if (!fromUsername || !toUsername) {
                logger_1.default.error('Invalid message data: from or to is missing');
                return;
            }
            let savedMsg;
            try {
                savedMsg = await Message_1.default.create({
                    from: fromUsername,
                    to: toUsername,
                    content: JSON.stringify(data.content),
                    status: recipient ? 'delivered' : 'sent', // If recipient is online, it's delivered immediately
                    timestamp: new Date()
                });
                logger_1.default.info(`💾 Message saved successfully to DB! ID: ${savedMsg.id}, Status: ${savedMsg.status}`);
            }
            catch (dbErr) {
                logger_1.default.error('❌ Database error during Message.create:', { error: dbErr });
                return;
            }
            // Relay to recipient and sender
            const payload = {
                id: savedMsg.id,
                from: fromUsername,
                fromName: fromUsername,
                fromPublicKey: livePublicKey || (sender ? sender.publicKey : null),
                content: data.content,
                to: toUsername,
                status: savedMsg.status,
                timestamp: savedMsg.timestamp
            };
            if (recipient) {
                io.to(recipient.id).emit('new-message', payload);
            }
            if (sender) {
                io.to(sender.id).emit('new-message', payload);
            }
        }
        catch (err) {
            logger_1.default.error('Error saving message:', err);
        }
    });
    socket.on('mark-read', async (data) => {
        try {
            const msg = await Message_1.default.findByPk(data.messageId);
            if (msg && msg.to.toLowerCase() === authUser.username.toLowerCase()) {
                msg.status = 'read';
                await msg.save();
                const sender = Object.values(onlineUsers).find(u => u.username.toLowerCase() === msg.from.toLowerCase());
                if (sender) {
                    io.to(sender.id).emit('message-status-update', { messageId: msg.id, status: 'read' });
                }
            }
        }
        catch (err) {
            logger_1.default.error('Error marking message as read:', err);
        }
    });
    socket.on('mark-all-read', async (data) => {
        try {
            const fromUsername = data.from.toLowerCase();
            const toUsername = authUser.username.toLowerCase();
            await Message_1.default.update({ status: 'read' }, {
                where: {
                    from: fromUsername,
                    to: toUsername,
                    status: { [sequelize_1.Op.ne]: 'read' }
                }
            });
            const sender = Object.values(onlineUsers).find(u => u.username.toLowerCase() === fromUsername);
            if (sender) {
                io.to(sender.id).emit('messages-read', { from: toUsername });
            }
        }
        catch (err) {
            logger_1.default.error('Error marking all messages as read:', err);
        }
    });
    socket.on('typing', (data) => {
        const recipient = Object.values(onlineUsers).find(u => u.username.toLowerCase() === data.to.toLowerCase());
        if (recipient) {
            io.to(recipient.id).emit('user-typing', { from: authUser.username, isTyping: data.isTyping });
        }
    });
    // --- GROUP MESSAGING ---
    socket.on('join-group', (data) => {
        logger_1.default.info(`👥 User ${authUser.username} joined group room: ${data.groupId}`);
        socket.join(data.groupId);
    });
    socket.on('send-group-message', async (data) => {
        logger_1.default.info(`📩 Group message from ${authUser.username} to group ${data.groupId} (Notice: ${!!data.isNotice})`);
        try {
            const fromUsername = authUser.username.trim().toLowerCase();
            const savedMsg = await GroupMessage_1.default.create({
                groupId: data.groupId,
                fromUsername: fromUsername,
                content: JSON.stringify(data.content),
                timestamp: new Date()
            });
            // Also save to Notice table if it's a notice
            try {
                if (data.isNotice) {
                    await Notice_1.default.create({
                        id: savedMsg.id, // Keep IDs synced
                        groupId: data.groupId,
                        fromUsername: fromUsername,
                        content: JSON.stringify(data.content),
                        timestamp: savedMsg.timestamp
                    });
                    logger_1.default.info(`📋 Notice saved to dedicated table. ID: ${savedMsg.id}`);
                }
            }
            catch (noticeErr) {
                logger_1.default.error('Failed to save to Notice table:', noticeErr);
            }
            // Relay to everyone in the group room
            io.to(data.groupId).emit('new-group-message', {
                id: savedMsg.id,
                groupId: data.groupId,
                from: fromUsername,
                fromName: fromUsername,
                content: data.content,
                timestamp: savedMsg.timestamp
            });
        }
        catch (err) {
            logger_1.default.error('Error saving group message:', err);
        }
    });
    // --- EDIT & DELETE LOGIC (24 Hour Rule) ---
    socket.on('edit-message', async (data) => {
        try {
            const msg = await Message_1.default.findByPk(data.messageId);
            if (!msg)
                return;
            // Verify ownership and time limit
            if (msg.from !== authUser.username.toLowerCase())
                return;
            if (!(0, messageUtils_1.canModifyMessage)(msg.timestamp)) {
                return socket.emit('error', { message: 'Edit period (24h) expired' });
            }
            msg.content = JSON.stringify(data.newContent);
            await msg.save();
            // Broadcast update to both parties
            const updatePayload = { messageId: data.messageId, newContent: data.newContent, type: 'private' };
            const recipient = Object.values(onlineUsers).find(u => u.username.toLowerCase() === msg.to.toLowerCase());
            if (recipient)
                io.to(recipient.id).emit('message-edited', updatePayload);
            socket.emit('message-edited', updatePayload);
        }
        catch (err) {
            logger_1.default.error('Edit error:', err);
        }
    });
    socket.on('delete-message', async (data) => {
        try {
            const msg = await Message_1.default.findByPk(data.messageId);
            if (!msg)
                return;
            // Verify ownership and time limit
            if (msg.from !== authUser.username.toLowerCase())
                return;
            if (!(0, messageUtils_1.canModifyMessage)(msg.timestamp)) {
                return socket.emit('error', { message: 'Delete period (24h) expired' });
            }
            await msg.destroy();
            // Broadcast deletion
            const deletePayload = { messageId: data.messageId, type: 'private' };
            const recipient = Object.values(onlineUsers).find(u => u.username.toLowerCase() === msg.to.toLowerCase());
            if (recipient)
                io.to(recipient.id).emit('message-deleted', deletePayload);
            socket.emit('message-deleted', deletePayload);
        }
        catch (err) {
            logger_1.default.error('Delete error:', err);
        }
    });
    socket.on('edit-group-message', async (data) => {
        try {
            const msg = await GroupMessage_1.default.findByPk(data.messageId);
            if (!msg)
                return;
            if (msg.fromUsername !== authUser.username.toLowerCase())
                return;
            if (!(0, messageUtils_1.canModifyMessage)(msg.timestamp)) {
                return socket.emit('error', { message: 'Edit period (24h) expired' });
            }
            msg.content = JSON.stringify(data.newContent);
            await msg.save();
            io.to(msg.groupId).emit('group-message-edited', {
                messageId: data.messageId,
                groupId: msg.groupId,
                newContent: data.newContent
            });
        }
        catch (err) {
            logger_1.default.error('Group edit error:', err);
        }
    });
    socket.on('delete-group-message', async (data) => {
        try {
            const msg = await GroupMessage_1.default.findByPk(data.messageId);
            if (!msg)
                return;
            // Allow deletion if user is the sender (within 24h) OR if user is a group admin
            const isAdmin = await GroupMember_1.default.findOne({
                where: { groupId: msg.groupId, username: authUser.username.toLowerCase(), role: 'admin' }
            });
            if (msg.fromUsername.toLowerCase() !== authUser.username.toLowerCase() && !isAdmin) {
                return socket.emit('error', { message: 'Unauthorized to delete this message' });
            }
            if (!isAdmin && !(0, messageUtils_1.canModifyMessage)(msg.timestamp)) {
                return socket.emit('error', { message: 'Delete period (24h) expired' });
            }
            await msg.destroy();
            io.to(msg.groupId).emit('group-message-deleted', {
                messageId: data.messageId,
                groupId: msg.groupId
            });
        }
        catch (err) {
            logger_1.default.error('Group delete error:', err);
        }
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete onlineUsers[socket.id];
        broadcastAllUsers(io);
    });
};
exports.handleConnection = handleConnection;
const clearAllMessages = async (req, res) => {
    try {
        await Message_1.default.destroy({ where: {}, truncate: true });
        res.json({ message: 'All messages cleared' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to clear messages' });
    }
};
exports.clearAllMessages = clearAllMessages;
