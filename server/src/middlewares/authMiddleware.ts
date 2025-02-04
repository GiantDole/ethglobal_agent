import { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../services/authService";

declare global {
  namespace Express {
    interface Request {
      user?: any; 
    }
  }
}

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Unauthorized" }); 
        return; 
    }

    const user = verifyJWT(token);
    if (!user) {
        res.status(401).json({ error: "Invalid token" }); 
        return; 
    }

    req.user = user; 
    next(); 
}
