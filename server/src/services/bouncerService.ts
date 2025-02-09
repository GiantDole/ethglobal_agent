import supabase from "../database/supabase";
import { BouncerConfig } from "../types/bouncer";
import logger from "../config/logger";

export async function getBouncerConfig(
	tokenId: string
): Promise<BouncerConfig> {
	try {
		const { data, error } = await supabase
			.from("BouncerConfig")
			.select(
				"mandatory_knowledge, project_desc, whitepaper_knowledge, character_choice"
			)
			.eq("id", tokenId)
			.single();

		if (error) {
			logger.error({ error, tokenId }, "Error fetching bouncer config");
			throw error;
		}

		if (!data) {
			throw new Error(`No bouncer config found for token ${tokenId}`);
		}

		return data as BouncerConfig;
	} catch (error) {
		logger.error({ error, tokenId }, "Failed to get bouncer config");
		throw error;
	}
}
