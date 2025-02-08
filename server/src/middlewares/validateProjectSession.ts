import { Request, Response, NextFunction } from "express";
import redis from "../database/redis";
import { privyService } from "../services/privyServiceSingleton";

export const successfulProjectInteractionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    // Assume the user id is available on req.userId from previous authentication middleware.
    const userId = await privyService.getUserIdFromAccessToken(req);
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized: Invalid privy token' });
      return;
    }

    const sessionKey = `session:${userId}`;
    const sessionString = await redis.get(sessionKey);
    if (!sessionString) {
      return res.status(400).json({ error: "User session not found." });
    }
    
    const sessionData = JSON.parse(sessionString);
    const projectSession = sessionData.projects[projectId];
    if (!projectSession) {
      return res.status(400).json({ error: "Project session not found." });
    }
    
    if (!projectSession.final) {
      return res.status(400).json({ error: "Project session is not finalized." });
    }
    
    if (!projectSession.access) {
      return res.status(400).json({ error: "Project session does not have access." });
    }
    
    if (typeof projectSession.tokenAllocation !== "number") {
      return res.status(400).json({ error: "Invalid token allocation in project session." });
    }
    
    // Attach the validated projectSession for downstream use.
    res.locals.projectSession = projectSession;
    next();
  } catch (error) {
    console.error("Failed to validate project session:", error);
    res.status(500).json({ error: "Internal server error validating project session." });
  }
};