import express from 'express';
import { getTokens, getToken, registerToken } from '../controllers/tokenController';

const router = express.Router();

router.get('/', getTokens);

router.get('/:id', getToken);

router.post('/register', registerToken);

export default router;
