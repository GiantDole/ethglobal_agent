import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import cookieParser from 'cookie-parser';
import projectRoutes from './routes/projectRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cookieParser());

app.use(express.json());


app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// Mount user routes on the "/api" path.
app.use('/api/user', userRoutes);
app.use('/api/project', projectRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 