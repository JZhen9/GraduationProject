import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../entity/User'
import { RequestWithUser } from '../types/expressTypes'
import dotenv from 'dotenv';
dotenv.config();

interface TokenData {
  userId: number;
}

const secret = process.env.SECRET!;

const jwtTool = {
  generateToken: (user: User): string => {
    const tokenData: TokenData = {
      userId: user.id,
    };

    return jwt.sign(tokenData, secret);
  },

  verifyToken: (token: string): TokenData => {
    const decoded = jwt.verify(token, secret) as TokenData;
    return decoded;
  }
};

export default jwtTool;

const authenticateToken = (req: RequestWithUser, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

export { authenticateToken };