import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("fish")
        .setDescription("Fish around for some fish"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}