import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("levels")
        .setDescription("See your levels and XP"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}