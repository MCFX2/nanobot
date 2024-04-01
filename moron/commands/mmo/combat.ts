import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("combat")
        .setDescription("go pick a fight with someone (or something)"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}