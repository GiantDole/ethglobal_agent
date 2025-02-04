import { Request, Response } from "express";
import {
  createToken,
  getTokenById,
  getAllTokens,
} from "../services/tokenService";

export const getTokens = async (req: Request, res: Response) => {
  try {
    const tokens = await getAllTokens();
    res.status(200).json(tokens);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
};

export const getToken = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const token = await getTokenById(id);
    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch token" });
  }
};

export const registerToken = async (req: Request, res: Response) => {
  const { name, symbol, supply } = req.body;

  if (!name || !symbol || !supply) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  try {
    const newToken = await createToken({ name, symbol, supply });
    res.status(201).json("Token created Successfully");
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "Failed to register token" });
  }
};
