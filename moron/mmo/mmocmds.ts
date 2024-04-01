import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getPlayerSave } from "./mmofile";
import { BaseSkill, SkillStarter, startSkill } from "./mmoskill";
import { Combat, FishSkill, ForageSkill, MineSkill, WoodChop } from "./mmolistskills";

export function levelsCommand(interaction: ChatInputCommandInteraction) {
    const save = getPlayerSave(interaction.user.id);
    const preferredName = save.selectedTitle === "" ? interaction.user.displayName : save.selectedTitle;

    const totalLevels = save.woodchop.level + save.mining.level + save.fishing.level + save.foraging.level + save.combat.level;
    if (totalLevels === 100) {
        const victoryImages = [
            "https://i.imgur.com/ql7zYxd.jpeg",
            "https://i.imgur.com/Ux7PvC3.png",
            "https://i.imgur.com/CTzYJJv.png",
            "https://i.imgur.com/ZRNqdTO.jpeg",
            "https://i.imgur.com/iHO71Ue.png",
            "https://i.imgur.com/ILhQxuy.gif",
            "https://i.imgur.com/yGL4RwH.png",
            "https://i.imgur.com/JuWyrBd.jpeg"
        ]
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setImage(victoryImages[Math.floor(Math.random() * victoryImages.length)])
                    .setTitle(preferredName)
                    .setDescription("# You have mastered the five skills, and have earned the title of **The Ultimate Groche**! See MCFX2 for your reward.")
            ]
        });
        return;
    }

    interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setImage(interaction.user.displayAvatarURL())
                .setTitle(preferredName)
                .setDescription(`**Wood Chopping:** ${save.woodchop.level} / 20 (${save.woodchop.xp} XP)
                Rank: ${WoodChop.getCurrentRank(save.userId)}\n
                **Mining:** ${save.mining.level} / 20 (${save.mining.xp} XP)
                Rank: ${MineSkill.getCurrentRank(save.userId)}\n
                **Fishing:** ${save.fishing.level} / 20 (${save.fishing.xp} XP)
                Rank: ${FishSkill.getCurrentRank(save.userId)}\n
                **Foraging:** ${save.foraging.level} / 20 (${save.foraging.xp} XP)
                Rank: ${ForageSkill.getCurrentRank(save.userId)}\n
                **Combat:** ${save.combat.level} / 20 (${save.combat.xp} XP)
                Rank: ${Combat.getCurrentRank(save.userId)}`)
        ]
    });
}

function handleSkillCommand(interaction: ChatInputCommandInteraction, skill: BaseSkill)
{
    const skillResult = skill.doSkill(interaction.user.id);
    if(skillResult.startType === "accepted")
    {
        interaction.reply(skillResult.acceptedMessage);
        startSkill(interaction, skillResult);
    }
    else
    {
        interaction.reply(skillResult.rejectionMessage);
    }

}

export function chopWoodCommand(interaction: ChatInputCommandInteraction) {
    handleSkillCommand(interaction, WoodChop);
}

export function combatCommand(interaction: ChatInputCommandInteraction) {
    handleSkillCommand(interaction, WoodChop);
}

export function forageCommand(interaction: ChatInputCommandInteraction) {
    handleSkillCommand(interaction, WoodChop);
}

export function fishCommand(interaction: ChatInputCommandInteraction) {
    handleSkillCommand(interaction, WoodChop);
}

export function mineCommand(interaction: ChatInputCommandInteraction) {
    handleSkillCommand(interaction, WoodChop);
}