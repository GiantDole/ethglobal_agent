import express, { Request, Response, NextFunction } from "express";
import { handleConversation } from "../controllers/interactionController";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";

const router = express.Router();

router.post('/:projectId', sessionMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await handleConversation(req, res); 
    } catch (error) {
        next(error); 
    }
});

export default router;
