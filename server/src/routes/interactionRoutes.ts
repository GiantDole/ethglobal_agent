import express, { Request, Response, NextFunction } from "express";
import {
	handleConversation,
	getSignature,
	interactionController,
} from "../controllers/interactionController";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";

const router = express.Router();

router.post(
	"/:projectId",
	sessionMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			await handleConversation(req, res);
		} catch (error) {
			next(error);
		}
	}
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

router.post(
	"/evaluate",
	sessionMiddleware,
	interactionController.evaluateResponse.bind(interactionController)
);

export default router;
