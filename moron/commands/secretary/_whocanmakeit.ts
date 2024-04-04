import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { whoCanMakeIt } from "../../secretary";

module.exports = {
	data: new SlashCommandBuilder()
		.setName("whocanmakeit")
		.setDescription("Return a list of users who can make it to a given event")
		.addStringOption((option) => {
			return option
				.setName("time")
				.setRequired(true)
				.setDescription("When the event is. Format: [day:]start[-end]");
		})
		.addIntegerOption((option) => {
			return option
				.setName("priority")
				.setDescription("How important this event is (default is 1)")
				.setRequired(false)
				.setChoices()
				.addChoices({ name: "uwu if its not too much twoubwe...", value: 0 })
				.addChoices({ name: "da boyss", value: 1 })
				.addChoices({ name: "business lunch", value: 2 })
				.addChoices({ name: "this better be good", value: 3 })
				.addChoices({ name: "kinda clingy at this point ngl", value: 4 })
				.addChoices({ name: "LIFE OR DEATH SCENARIO", value: 5 });
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		whoCanMakeIt(interaction);
	},
};
