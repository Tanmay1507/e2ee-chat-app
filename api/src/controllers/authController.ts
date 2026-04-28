import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { signupSchema, loginSchema } from '../validators/authValidator';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be defined in production');
}
const effectiveSecret = JWT_SECRET || 'fallback_secret';

export const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    // 1. Validate Input
    const validated = signupSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ 
        message: 'Invalid input data', 
        errors: validated.error.format() 
      });
    }

    const { username, password, publicKey, encryptedPrivateKey, keySalt, department, role, employeeId } = validated.data;

    const existingUser = await User.findOne({ where: { employeeId } });
    if (existingUser) {
      return res.status(400).json({ message: 'Employee ID already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      employeeId,
      username: username.toLowerCase(),
      password: hashedPassword,
      publicKey,
      encryptedPrivateKey,
      keySalt,
      department,
      role
    });

    const token = jwt.sign({ id: user.id, username: user.username }, effectiveSecret, { expiresIn: '1d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(201).json({ username: user.username, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error during signup' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    const { employeeId, password } = validated.data;

    const user = await User.findOne({ where: { employeeId } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, effectiveSecret, { expiresIn: '1d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({ 
      username: user.username, 
      token,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      keySalt: user.keySalt 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error during login' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.findAll({
      attributes: ['username', 'department', 'role', 'employeeId', 'publicKey']
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt');
  res.json({ message: 'Logged out' });
};
