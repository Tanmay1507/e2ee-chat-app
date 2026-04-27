import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import groupRoutes from './routes/group';
import * as chatController from './controllers/chatController';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const app = express();

// Trust proxy for rate limiting (needed since we use Next.js proxy)
app.set('trust proxy', 1);

// Production Security
app.use(helmet());

// Rate Limiting (Prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: 'Too many requests, please try again later.' }
});
app.use('/auth', limiter); // Only apply to auth routes for now

app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(cookieParser());

// Auth Routes (Proxied paths from Next.js)
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/groups', groupRoutes);

// Global Error Handler (Ensures JSON response)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// --- SOCKET AUTH MIDDLEWARE ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET is not defined in environment variables!');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}
const effectiveSecret = JWT_SECRET || 'fallback_secret';

io.use((socket, next) => {
  try {
    const cookies = parse(socket.handshake.headers.cookie || '');
    const token = socket.handshake.auth?.token || cookies.jwt;

    if (!token) {
      logger.error('Socket authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, effectiveSecret, (err: any, decoded: any) => {
      if (err) {
        logger.error('Socket authentication failed: Invalid token');
        return next(new Error('Authentication error: Invalid token'));
      }
      (socket as any).user = decoded; // Attach user info to socket
      next();
    });
  } catch (err) {
    logger.error('Socket authentication error:', err);
    next(new Error('Authentication error'));
  }
});

const startServer = async () => {
  try {
    logger.info('🚀 Signaling server starting up...');
    // 1. Connect to Database FIRST
    await connectDB();

    // 2. Setup Socket.io
    io.on('connection', (socket) => chatController.handleConnection(io, socket));

    // 3. Start Retention Cleanup Task (Runs every 24 hours)
    const runCleanup = async () => {
      try {
        const { Op } = require('sequelize');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180); // ~6 months

        const { Message } = require('./models/Message');
        const { GroupMessage } = require('./models/GroupMessage');

        const deletedPrivate = await Message.destroy({
          where: { timestamp: { [Op.lt]: sixMonthsAgo } }
        });
        const deletedGroup = await GroupMessage.destroy({
          where: { timestamp: { [Op.lt]: sixMonthsAgo } }
        });

        if (deletedPrivate > 0 || deletedGroup > 0) {
          console.log(`🧹 Retention Policy: Deleted ${deletedPrivate} private and ${deletedGroup} group messages older than 6 months.`);
        }
      } catch (err) {
        console.error('❌ Retention Cleanup Failed:', err);
      }
    };

    // Run once on startup, then every 24 hours
    runCleanup();
    setInterval(runCleanup, 24 * 60 * 60 * 1000);

    // 4. Start Listening
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`✅ Signaling server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
