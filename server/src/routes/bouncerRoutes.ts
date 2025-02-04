import express, { Request, Response, NextFunction } from "express";
import { handleBouncerAction } from "../controllers/bouncerController";
import authMiddleware from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/:action", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    try {
        await handleBouncerAction(req, res); 
    } catch (error) {
        next(error); 
    }
});

export default router;
