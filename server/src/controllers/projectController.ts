import { Request, Response } from "express";
import {
  getAllProjects,
  getProjectById,
} from "../services/projectService";
import logger from "../config/logger";
import evmService from "../services/evmService";


export const getProjects = async (req: Request, res: Response) => {
  try {
    const tokens = await getAllProjects();
    res.status(200).json(tokens);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fetching projects: ${errorMessage}`, error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

export const getProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const token = await getProjectById(parseInt(id, 10));
    if (!token) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const bondingCurveProgress = await evmService.getBondingCurveProgress(token.bondingCurveAddress);
    res.status(200).json({
      ...token,
      bondingCurveProgress
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error fetching project with id ${id}: ${errorMessage}`, error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
};

/*
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
*/