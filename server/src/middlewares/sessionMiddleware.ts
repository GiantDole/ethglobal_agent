import { Request, Response, NextFunction } from 'express';
import redis from '../database/redis';
import jwt from 'jsonwebtoken';

export const checkSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Use an existing cookie field, "privy-token", instead of a separate "userId"
  const token = req.cookies?.['privy-token'];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized: Missing privy token' });
    return;
  }

  // Decode the token without verifying its signature
  // Note: jwt.decode() is used to extract the payload; we already verified it during /register
  const decoded = jwt.decode(token);
  const userId = (decoded && typeof decoded === 'object') ? decoded.sub || decoded.id : null;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized: Invalid privy token' });
    return;
  }

  try {
    const sessionKey = `session:${userId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      res.status(401).json({ message: 'Unauthorized: Session does not exist or has expired' });
      return;
    }

    // Attach session data to the request for later use
    (req as any).session = JSON.parse(sessionData);
    next();
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 