import express, { Request, Response, NextFunction } from "express";
import { handleConversation } from "../controllers/tokenController";
import authMiddleware from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/:tokenId/conversation", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await handleConversation(req, res); 
    } catch (error) {
        next(error); 
    }
});

export default router;
