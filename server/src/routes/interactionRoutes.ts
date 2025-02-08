import express, { Request, Response, NextFunction } from "express";
import {
	getSignature,
	interactionController,
} from "../controllers/interactionController";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";

const router = express.Router();

router.post(
	"/:projectId",
	sessionMiddleware,
	interactionController.evaluateResponse.bind(interactionController)
);

router.get(
	"/:projectId/signature",
	sessionMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			await getSignature(req, res);
		} catch (error) {
			next(error);
		}
	}
);

export default router;
