import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zerov_secret_key_2026';

// Request 객체에 user 타입 추가
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const checkLevel = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  req.user = { level: 1 }; // 기본값: 비회원(Level 1)

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // { id, loginId, name, level }
    } catch (err) {
      console.warn('JWT 토큰 검증 실패 또는 만료');
    }
  }
  next();
};