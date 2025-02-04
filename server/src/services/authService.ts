import jwt from "jsonwebtoken";
// import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export const verifyWalletSignature = async (wallet: string, signature: string): Promise<boolean> => {
    return true;
};

export const generateJWT = (wallet: string): string => {
    return jwt.sign({ wallet }, process.env.JWT_SECRET!, { expiresIn: "24h" });
};

export const verifyJWT = (token: string): any => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return null;
    }
};
