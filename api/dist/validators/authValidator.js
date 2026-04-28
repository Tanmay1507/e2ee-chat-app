"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(3).max(20).trim(),
    username: zod_1.z.string().min(2).max(50).trim(),
    password: zod_1.z.string().min(8).max(100),
    publicKey: zod_1.z.string(),
    encryptedPrivateKey: zod_1.z.string().optional(),
    keySalt: zod_1.z.string().optional(),
    department: zod_1.z.string().trim(),
    role: zod_1.z.string().trim()
});
exports.loginSchema = zod_1.z.object({
    employeeId: zod_1.z.string().trim(),
    password: zod_1.z.string()
});
