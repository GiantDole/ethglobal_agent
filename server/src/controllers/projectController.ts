import { Request, Response } from "express";
import {
  getAllProjects,
  getProjectById,
  createProjectWithConfig,
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
    const bondingCurveProgress = await evmService.getBondingCurveProgress(token.token_address);
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

export const createProject = async (req: Request, res: Response) => {
  try {
    const { projectData, bouncerConfigData } = req.body;

    // Validate projectData: all required fields must be present and non-empty.
    if (!projectData || typeof projectData !== 'object') {
      res.status(400).json({ error: "projectData is required and must be an object." });
      return;
    }
    const requiredProjectFields = [
      "author",
      "name",
      "long_description",
      "short_description",
      "category",
      "exclusivity",
      "image_url",
      "token_address",
      "token_ticker"
    ];
    for (const field of requiredProjectFields) {
      if (
        projectData[field] === undefined ||
        projectData[field] === null ||
        (typeof projectData[field] === "string" && projectData[field].trim() === "")
      ) {
        res.status(400).json({ error: `Missing required projectData field: ${field}` });
        return;
      }
    }
    projectData.status = 1;

    // Validate bouncerConfigData: all required fields must be present and non-empty.
    if (!bouncerConfigData || typeof bouncerConfigData !== 'object') {
      res.status(400).json({ error: "bouncerConfigData is required and must be an object." });
      return;
    }
    const requiredBouncerFields = [
      "character_choice",
      "mandatory_knowledge",
      "project_desc",
      "whitepaper_knowledge",
    ];
    for (const field of requiredBouncerFields) {
      if (
        bouncerConfigData[field] === undefined ||
        bouncerConfigData[field] === null ||
        (typeof bouncerConfigData[field] === "string" && bouncerConfigData[field].trim() === "")
      ) {
        res.status(400).json({ error: `Missing required bouncerConfigData field: ${field}` });
        return;
      }
    }

    const result = await createProjectWithConfig(projectData, bouncerConfigData);
    res.status(201).json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error creating project: ${errorMessage}`, error);
    res.status(500).json({ error: "Failed to create project" });
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