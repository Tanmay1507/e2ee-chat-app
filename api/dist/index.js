"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = require("./config/db");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const group_1 = __importDefault(require("./routes/group"));
const chatController = __importStar(require("./controllers/chatController"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("./utils/logger"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_1 = require("cookie");
const Message_1 = __importDefault(require("./models/Message"));
const GroupMessage_1 = __importDefault(require("./models/GroupMessage"));
const sequelize_1 = require("sequelize");
const app = (0, express_1.default)();
// Trust proxy for rate limiting (needed since we use Next.js proxy)
app.set('trust proxy', 1);
// Production Security
app.use((0, helmet_1.default)());
// Rate Limiting (Prevent abuse)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { message: 'Too many requests, please try again later.' }
});
app.use('/auth', limiter); // Only apply to auth routes for now
app.use(express_1.default.json({ limit: '10kb' })); // Limit body size for security
app.use((0, cookie_parser_1.default)());
// Auth Routes (Proxied paths from Next.js)
app.use('/auth', auth_1.default);
app.use('/chat', chat_1.default);
app.use('/groups', group_1.default);
// Global Error Handler (Ensures JSON response)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});
// --- SOCKET AUTH MIDDLEWARE ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger_1.default.error('CRITICAL: JWT_SECRET is not defined in environment variables!');
    if (process.env.NODE_ENV === 'production')
        process.exit(1);
}
const effectiveSecret = JWT_SECRET || 'fallback_secret';
io.use((socket, next) => {
    try {
        const cookies = (0, cookie_1.parse)(socket.handshake.headers.cookie || '');
        const token = socket.handshake.auth?.token || cookies.jwt;
        if (!token) {
            logger_1.default.error('Socket authentication failed: No token provided');
            return next(new Error('Authentication error: No token provided'));
        }
        jsonwebtoken_1.default.verify(token, effectiveSecret, (err, decoded) => {
            if (err) {
                logger_1.default.error('Socket authentication failed: Invalid token');
                return next(new Error('Authentication error: Invalid token'));
            }
            socket.user = decoded; // Attach user info to socket
            next();
        });
    }
    catch (err) {
        logger_1.default.error('Socket authentication error:', err);
        next(new Error('Authentication error'));
    }
});
const startServer = async () => {
    try {
        logger_1.default.info('🚀 Signaling server starting up...');
        // 1. Connect to Database FIRST
        await (0, db_1.connectDB)();
        // 2. Setup Socket.io
        io.on('connection', (socket) => chatController.handleConnection(io, socket));
        // 3. Start Retention Cleanup Task (Runs every 24 hours)
        const runCleanup = async () => {
            try {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180); // ~6 months
                const deletedPrivate = await Message_1.default.destroy({
                    where: { timestamp: { [sequelize_1.Op.lt]: sixMonthsAgo } }
                });
                const deletedGroup = await GroupMessage_1.default.destroy({
                    where: { timestamp: { [sequelize_1.Op.lt]: sixMonthsAgo } }
                });
                if (deletedPrivate > 0 || deletedGroup > 0) {
                    logger_1.default.info(`🧹 Retention Policy: Deleted ${deletedPrivate} private and ${deletedGroup} group messages older than 6 months.`);
                }
            }
            catch (err) {
                logger_1.default.error('❌ Retention Cleanup Failed:', err);
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
    }
    catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
};
startServer();
