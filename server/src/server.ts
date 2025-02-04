import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import tokenRoutes from "./routes/tokenRoutes";
import bouncerRoutes from "./routes/bouncerRoutes";

dotenv.config();
const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tokens", tokenRoutes);
app.use("/bouncer", bouncerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
