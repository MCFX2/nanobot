import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("chopwood")
        .setDescription("Chop some wood"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}