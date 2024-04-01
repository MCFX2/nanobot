import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("forage")
        .setDescription("Go foraging"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}