import express from 'express';
import { getProjects, getProject, createProject } from '../controllers/projectController';

const router = express.Router();

router.get('/', getProjects);
router.get('/:id', getProject);
router.post('/createProject', createProject);

export default router;
