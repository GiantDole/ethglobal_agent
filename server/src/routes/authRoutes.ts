import express, { Request, Response, NextFunction } from "express";
import { handleWalletSignature } from "../controllers/authController";

const router = express.Router();

router.post("/wallet", async (req: Request, res: Response, next: NextFunction) => {
    try {
        await handleWalletSignature(req, res); 
    } catch (error) {
        next(error); 
    }
});

export default router;
