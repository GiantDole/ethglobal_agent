import { Request, Response } from "express";
import { verifyWalletSignature, generateJWT } from "../services/authService";

export async function handleWalletSignature(req: Request, res: Response): Promise<Response> {
    try {
        const { wallet, signature } = req.body;
        if (!wallet || !signature) {
            return res.status(400).json({ error: "Missing data" });
        }

        const isValid = await verifyWalletSignature(wallet, signature);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        const token = generateJWT(wallet);
        return res.json({ token });
    } catch (error) {
        console.error("Error in /wallet route:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
