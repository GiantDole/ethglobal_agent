import { Router } from 'express';
import { registerUser } from '../controllers/userController';

const router = Router();

// Register the endpoint which validates the JWT and then executes the registerUser controller.
router.post('/register', registerUser);

export default router; 