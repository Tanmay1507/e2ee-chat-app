"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Write all logs with importance level of `info` or less to `combined.log`
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
// If we're not in production then log to the `console`
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }));
}
exports.default = logger;
