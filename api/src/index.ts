import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './config/db';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import * as chatController from './controllers/chatController';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';
import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';

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
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// --- SOCKET AUTH MIDDLEWARE ---
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

io.use((socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = socket.handshake.auth?.token || cookies.jwt;

    if (!token) {
      logger.error('Socket authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
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

    // 3. Start Listening
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
