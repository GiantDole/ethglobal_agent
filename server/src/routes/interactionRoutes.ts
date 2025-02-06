import express, { Request, Response, NextFunction } from "express";
import { handleConversation, generateSignature } from "../controllers/interactionController";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";
import { successfulProjectInteractionMiddleware } from "../middlewares/validateProjectSession";

const router = express.Router();

router.post('/:projectId', sessionMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await handleConversation(req, res); 
    } catch (error) {
        next(error); 
    }
});

router.get('/:projectId/signature', successfulProjectInteractionMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await generateSignature(req, res);
    } catch (error) {
        next(error); 
    }
});

export default router;
