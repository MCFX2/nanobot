import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";


module.exports = {
    data: new SlashCommandBuilder()
        .setName("minegems")
        .setDescription("Go out mining for gems"),
        async execute(interaction: ChatInputCommandInteraction) {
        }
}