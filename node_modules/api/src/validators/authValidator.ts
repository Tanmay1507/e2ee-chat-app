import { z } from 'zod';

export const signupSchema = z.object({
  employeeId: z.string().min(3).max(20).trim(),
  username: z.string().min(2).max(50).trim(),
  password: z.string().min(8).max(100),
  publicKey: z.string(),
  encryptedPrivateKey: z.string().optional(),
  keySalt: z.string().optional(),
  department: z.string().trim(),
  role: z.string().trim()
});

export const loginSchema = z.object({
  employeeId: z.string().trim(),
  password: z.string()
});
