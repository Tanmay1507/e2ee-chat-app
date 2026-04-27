import { Server, Socket } from 'socket.io';
import User from '../models/User';
import Message from '../models/Message';
import GroupMessage from '../models/GroupMessage';
import logger from '../utils/logger';
import { Op } from 'sequelize';

const onlineUsers: { [key: string]: any } = {};

const broadcastAllUsers = async (io: Server) => {
  try {
    const allUsers = await User.findAll();
    
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
  } catch (err) {
    logger.error('Error broadcasting users:', err);
  }
};

export const handleConnection = (io: Server, socket: Socket) => {
  const authUser = (socket as any).user;
  if (!authUser) {
    console.error('Socket connected without user info!');
    return socket.disconnect();
  }

  logger.info(`📡 New Authenticated Socket Connection: ${authUser.username} (socket: ${socket.id})`);

  socket.on('join', async () => {
    try {
      const username = authUser.username.toLowerCase();
      
      // 1. Sync user with DB
      const user = await User.findOne({ where: { username } });
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
      const history = await Message.findAll({
        where: {
          [Op.or]: [
            { from: username },
            { to: username }
          ]
        },
        order: [['timestamp', 'ASC']],
        limit: 100
      });

      // Get all public keys for the users in history in one go
      const userUsernames = Array.from(new Set(history.flatMap(m => [m.from, m.to])));
      const userKeys = await User.findAll({
        where: { username: userUsernames },
        attributes: ['username', 'publicKey']
      });
      const keyMap: any = {};
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
            timestamp: m.timestamp,
            fromPublicKey: keyMap[fromUser], // Inject public key for instant decryption
            toPublicKey: keyMap[toUser]
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean));

      // 4. Broadcast updated all user list
      await broadcastAllUsers(io);
      logger.info(`User ${username} joined the faculty relay.`);
    } catch (err) {
      logger.error('Error in join event:', err);
    }
  });

  socket.on('send-message', async (data: { to: string, fromPublicKey?: string, content: any }) => {
    logger.info(`📩 Received send-message event from ${authUser.username} to ${data.to}`);
    try {
      const toUsername = data.to.trim().toLowerCase();
      const fromUsername = authUser.username.trim().toLowerCase(); // Trust the authenticated username
      const livePublicKey = data.fromPublicKey;

      const recipient = Object.values(onlineUsers).find(u => 
        u.username.trim().toLowerCase() === toUsername
      );
      const sender = Object.values(onlineUsers).find(u => 
        u.username.trim().toLowerCase() === fromUsername
      );

      // Save to database
      logger.info(`Saving message to DB. from: ${fromUsername}, to: ${toUsername}`);
      if (!fromUsername || !toUsername) {
        logger.error('Invalid message data: from or to is missing');
        return;
      }

      let savedMsg;
      try {
        savedMsg = await Message.create({
          from: fromUsername,
          to: toUsername,
          content: JSON.stringify(data.content),
          timestamp: new Date()
        });
        logger.info(`💾 Message saved successfully to DB! ID: ${savedMsg.id}`);
      } catch (dbErr) {
        logger.error('❌ Database error during Message.create:', { error: dbErr });
        return;
      }

      // Relay to recipient if they are online
      if (recipient || sender) {
        const payload = {
          id: savedMsg.id,
          from: fromUsername,
          fromName: fromUsername,
          fromPublicKey: livePublicKey || (sender ? sender.publicKey : null), // Use live key from client first
          content: data.content,
          timestamp: savedMsg.timestamp
        };
        
        if (recipient) {
          io.to(recipient.id).emit('new-message', payload);
        }
        
        if (sender) {
          io.to(sender.id).emit('new-message', payload);
        }
      }
    } catch (err) {
      logger.error('Error saving message:', err);
    }
  });

  socket.on('typing', (data: { to: string, isTyping: boolean }) => {
    const recipient = Object.values(onlineUsers).find(u => u.username.toLowerCase() === data.to.toLowerCase());
    if (recipient) {
      io.to(recipient.id).emit('user-typing', { from: authUser.username, isTyping: data.isTyping });
    }
  });

  // --- GROUP MESSAGING ---
  socket.on('join-group', (data: { groupId: string }) => {
    logger.info(`👥 User ${authUser.username} joined group room: ${data.groupId}`);
    socket.join(data.groupId);
  });

  socket.on('send-group-message', async (data: { groupId: string, content: any }) => {
    logger.info(`📩 Group message from ${authUser.username} to group ${data.groupId}`);
    try {
      const fromUsername = authUser.username.trim().toLowerCase();
      
      const savedMsg = await GroupMessage.create({
        groupId: data.groupId,
        fromUsername: fromUsername,
        content: JSON.stringify(data.content),
        timestamp: new Date()
      });

      // Relay to everyone in the group room
      io.to(data.groupId).emit('new-group-message', {
        id: savedMsg.id,
        groupId: data.groupId,
        from: fromUsername,
        fromName: fromUsername,
        content: data.content,
        timestamp: savedMsg.timestamp
      });
    } catch (err) {
      logger.error('Error saving group message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete onlineUsers[socket.id];
    broadcastAllUsers(io);
  });
};

export const clearAllMessages = async (req: any, res: any) => {
  try {
    await Message.destroy({ where: {}, truncate: true });
    res.json({ message: 'All messages cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear messages' });
  }
};
