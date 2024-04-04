import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { debugStatCommand } from "../../mmo/mmocmds";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("mmostats")
		.setDescription("debug stats")
		.setDefaultMemberPermissions("0")
		.addStringOption((option) => {
			return option.setDescription("user").setName("user").setRequired(true);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		debugStatCommand(interaction);
	},
};
