import { Request } from 'express';
import { Socket } from 'socket.io';

export interface UserPayload {
  id: number;
  username: string;
  employeeId: string;
  department: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: UserPayload;
}

export interface AuthenticatedSocket extends Socket {
  user: UserPayload;
}
