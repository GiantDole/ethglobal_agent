import { Request, Response, NextFunction } from 'express';
import redis from '../database/redis';
import { privyService } from '../services/privyServiceSingleton';

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log("Checking session...");
  // Use an existing cookie field, "privy-token", instead of a separate "userId"
  const userId = await privyService.getUserIdFromAccessToken(req);
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized: Invalid privy token' });
    return;
  }

  console.log("User ID:", userId);

  try {
    const sessionKey = `session:${userId}`;
    const sessionData = await redis.get(sessionKey);
    if (!sessionData) {
      res.status(401).json({ message: 'Unauthorized: Session does not exist or has expired' });
      return;
    }

    console.log("Session data:", sessionData);

    // Attach session data to the request for later use
    (req as any).session = JSON.parse(sessionData);
    next();
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 