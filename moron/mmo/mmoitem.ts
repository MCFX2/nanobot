import { commitSaveData, getPlayerSave } from "./mmofile";

export enum ItemBuffType {
    WoodchopFaster,
    MiningFaster,
    FishingFaster,
    ForagingFaster,
    CombatFaster,
    WoodchopBetter,
    MiningBetter,
    FishingBetter,
    ForagingBetter,
    CombatBetter,
    EverythingFaster,
    EverythingBetter,
    Lucky,
}

export interface MMOItem {
    type: "item";
    displayName: string;
    itemEffect: ItemBuffType;
    power: number;
}

export interface MMORandomEvent {
    type: "event";
    impactText: string;
    doEffect: (userId: string) => void;
    isBad: boolean;
}

export const LuckyCharms: MMOItem[] = [
    {
        type: "item",
        displayName: "Lucky Groche's Foot",
        itemEffect: ItemBuffType.Lucky,
        power: 1,
    },
    {
        type: "item",
        displayName: "Lucky Groche's Hand",
        itemEffect: ItemBuffType.Lucky,
        power: 2,
    },
    {
        type: "item",
        displayName: "Lucky Groche's Eye",
        itemEffect: ItemBuffType.Lucky,
        power: 5,
    },
    {
        type: "item",
        displayName: "Lucky Groche's Brain",
        itemEffect: ItemBuffType.Lucky,
        power: 7,
    },
    {
        type: "item",
        displayName: "Magical Groche Companion",
        itemEffect: ItemBuffType.Lucky,
        power: 10,
    },
];

export const UnluckyCharms: MMOItem[] = [
    {
        type: "item",
        displayName: "Black Cat Who Keeps Crossing Your Path",
        itemEffect: ItemBuffType.Lucky,
        power: -1,
    },
    {
        type: "item",
        displayName: "Mirror That You Broke",
        itemEffect: ItemBuffType.Lucky,
        power: -2,
    },
    {
        type: "item",
        displayName: "Ladder That You Walked Under",
        itemEffect: ItemBuffType.Lucky,
        power: -3,
    },
    {
        type: "item",
        displayName: "Magical Groche's Curse",
        itemEffect: ItemBuffType.Lucky,
        power: -5,
    }
];

export const RandomEvents: MMORandomEvent[] = [
    {
        type: "event",
        impactText: "A tree falls on you! You've forgotten some of your woodchopping skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp = Math.max(0, save.woodchop.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "A fish bites you! You've forgotten some of your fishing skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.fishing.xp = Math.max(0, save.fishing.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "You fell on a rock. You've forgotten some of your mining skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.mining.xp = Math.max(0, save.mining.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "You cut yourself on... something. You forgor some of your foraging skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.foraging.xp = Math.max(0, save.foraging.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "You got in a fight with your own shadow. And lost. You've forgotten some of your combat skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.combat.xp = Math.max(0, save.combat.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "Your axe broke, but you found out you can just use your hands. You've gained some woodchopping skills.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp += 150;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "You've become much, much better at holding your breath. Consequently, your fishing skills have improved.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.fishing.xp += 150;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "You found an abandoned dwarf mine. You learned a lot about mining technique.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.mining.xp += 150;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "You found a book on foraging. Then you tried to eat it. But the book helpfully explained why that's a bad idea. Your foraging skills have improved.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.foraging.xp += 150;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "You found a book on combat. You didn't understand a word of it, but you feel stronger anyway.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.combat.xp += 150;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "What the hell happened, man? Your skills seem to have noticeably degraded.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp = Math.max(0, save.woodchop.xp - 50);
            save.fishing.xp = Math.max(0, save.fishing.xp - 50);
            save.mining.xp = Math.max(0, save.mining.xp - 50);
            save.foraging.xp = Math.max(0, save.foraging.xp - 50);
            save.combat.xp = Math.max(0, save.combat.xp - 50);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "You ate a really, really, really bad sandwich. You didn't even know sandwiches could be that bad. Your skills have permanently decreased as a result of eating that sandwich.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp = Math.max(0, save.woodchop.xp - 100);
            save.fishing.xp = Math.max(0, save.fishing.xp - 100);
            save.mining.xp = Math.max(0, save.mining.xp - 100);
            save.foraging.xp = Math.max(0, save.foraging.xp - 100);
            save.combat.xp = Math.max(0, save.combat.xp - 100);
            commitSaveData();
        },
        isBad: true
    },
    {
        type: "event",
        impactText: "You're feeling weirdly good about yourself. You've gained some skills in all areas.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp += 75;
            save.fishing.xp += 75;
            save.mining.xp += 75;
            save.foraging.xp += 75;
            save.combat.xp += 75;
            commitSaveData();
        },
        isBad: false
    },
    {
        type: "event",
        impactText: "You found a magical troll, AND you solved his riddles three, four, five, and even six! In exchange, he improved your abilities across the board.",
        doEffect: (userId: string) => {
            const save = getPlayerSave(userId);
            save.woodchop.xp += 200;
            save.fishing.xp += 200;
            save.mining.xp += 200;
            save.foraging.xp += 200;
            save.combat.xp += 200;
            commitSaveData();
        },
        isBad: false
    }
];

export const miscItems: MMOItem[] = [
    {
        type: "item",
        displayName: "Axe-Sharpening Stone",
        itemEffect: ItemBuffType.WoodchopBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "Pickaxe-Sharpening Stone",
        itemEffect: ItemBuffType.MiningBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "Fishing Rod-Sharpening Stone",
        itemEffect: ItemBuffType.FishingBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "Ant Companion",
        itemEffect: ItemBuffType.ForagingBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "Coffee",
        itemEffect: ItemBuffType.CombatBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "Wood-Seeking Axe",
        itemEffect: ItemBuffType.WoodchopBetter,
        power: 2,
    },
    {
        type: "item",
        displayName: "Dowsing Pickaxe",
        itemEffect: ItemBuffType.MiningBetter,
        power: 2,
    },
    {
        type: "item",
        displayName: "Addictive Fishing Bait",
        itemEffect: ItemBuffType.FishingBetter,
        power: 2,
    },
    {
        type: "item",
        displayName: "Dog Companion",
        itemEffect: ItemBuffType.ForagingBetter,
        power: 2,
    },
    {
        type: "item",
        displayName: "Ketamine",
        itemEffect: ItemBuffType.CombatBetter,
        power: 2,
    },
    {
        type: "item",
        displayName: "Loraxbane",
        itemEffect: ItemBuffType.WoodchopBetter,
        power: 5,
    },
    {
        type: "item",
        displayName: "Dwarf Sigil",
        itemEffect: ItemBuffType.MiningBetter,
        power: 5,
    },
    {
        type: "item",
        displayName: "Whalewatcher's Sounding Rod",
        itemEffect: ItemBuffType.FishingBetter,
        power: 5,
    },
    {
        type: "item",
        displayName: "Giraffe Companion",
        itemEffect: ItemBuffType.ForagingBetter,
        power: 5,
    },
    {
        type: "item",
        displayName: "Sword of a Thousand Half-Truths",
        itemEffect: ItemBuffType.CombatBetter,
        power: 5,
    },
    {
        type: "item",
        displayName: "Axe-celerant",
        itemEffect: ItemBuffType.WoodchopFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "Enchanted Efficiency II Book",
        itemEffect: ItemBuffType.MiningFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "The Impatient Fisherman (book)",
        itemEffect: ItemBuffType.FishingFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "Rideable Horse Companion",
        itemEffect: ItemBuffType.ForagingFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "Cocaine",
        itemEffect: ItemBuffType.CombatFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "Environmental De-Regulation",
        itemEffect: ItemBuffType.WoodchopFaster,
        power: 2,
    },
    {
        type: "item",
        displayName: "TnT Duplication Glitch",
        itemEffect: ItemBuffType.MiningFaster,
        power: 2,
    },
    {
        type: "item",
        displayName: "The Impatient Fisherman (YouTube Short)",
        itemEffect: ItemBuffType.FishingFaster,
        power: 2,
    },
    {
        type: "item",
        displayName: "Rideable Cheetah Companion",
        itemEffect: ItemBuffType.ForagingFaster,
        power: 2,
    },
    {
        type: "item",
        displayName: "meth",
        itemEffect: ItemBuffType.CombatFaster,
        power: 2,
    },
    {
        type: "item",
        displayName: "The Groche's Blessing",
        itemEffect: ItemBuffType.EverythingBetter,
        power: 1,
    },
    {
        type: "item",
        displayName: "The Groche's Curse",
        itemEffect: ItemBuffType.EverythingBetter,
        power: -1,
    },
    {
        type: "item",
        displayName: "Subway Surfers (engaging)",
        itemEffect: ItemBuffType.EverythingFaster,
        power: 1,
    },
    {
        type: "item",
        displayName: "Subway Surfers (distracting)",
        itemEffect: ItemBuffType.EverythingFaster,
        power: -1,
    },
    {
        type: "item",
        displayName: "Lorax Companion",
        itemEffect: ItemBuffType.WoodchopBetter,
        power: -1,
    },
    {
        type: "item",
        displayName: "Creeper Companion",
        itemEffect: ItemBuffType.MiningBetter,
        power: -1,
    },
    {
        type: "item",
        displayName: "Whale Companion",
        itemEffect: ItemBuffType.FishingBetter,
        power: -1,
    },
    {
        type: "item",
        displayName: "Swarm Of Angry Bees \"Companion\"",
        itemEffect: ItemBuffType.ForagingBetter,
        power: -1,
    },
    {
        type: "item",
        displayName: "Sword of a Billion Misconceptions",
        itemEffect: ItemBuffType.CombatBetter,
        power: -1,
    },
]

export function generateDescription(item: MMOItem) {
    switch(item.itemEffect) {
        case ItemBuffType.WoodchopFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} woodchop speed`;
        case ItemBuffType.MiningFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} mining speed`;
        case ItemBuffType.FishingFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} fishing speed`;
        case ItemBuffType.ForagingFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} foraging speed`;
        case ItemBuffType.CombatFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} combat speed`;
        case ItemBuffType.WoodchopBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} woodchopping`;
        case ItemBuffType.MiningBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} mining`;
        case ItemBuffType.FishingBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} fishing`;
        case ItemBuffType.ForagingBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} foraging`;
        case ItemBuffType.CombatBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} combat`;
        case ItemBuffType.EverythingFaster:
            return `${item.power > 0 ? "+" : "-"}${item.power} to all skill speeds`;
        case ItemBuffType.EverythingBetter:
            return `${item.power > 0 ? "+" : "-"}${item.power} to all skills`;
        case ItemBuffType.Lucky:
            return `${item.power > 0 ? "+" : "-"}${item.power} luck`;
        default:
            return `junk item`;
    }
}

export function generateDrop(luck: number): MMOItem | MMORandomEvent | undefined {
    
    // if luck > 25, only good drops are possible
    // if luck < 25, only bad drops are possible
    if (luck < 25)
    {
        if (luck < 5)
        { // guarantee an unlucky charm
            if (luck < -5) {
                // if they're here, it means they're stuck in a hole they literally cant get out of
                return LuckyCharms[Math.floor(Math.random() * LuckyCharms.length)];
            }
            return UnluckyCharms[Math.floor(Math.random() * LuckyCharms.length)];
        }
        else
        {
            if (luck % 2 === 0) {
                if (luck % 4 === 0) {
                    const badItems = miscItems.filter(item => item.power < 0);
                    return badItems[Math.floor(Math.random() * badItems.length)];
                }
                
                const badEvents = RandomEvents.filter(e => e.isBad);
                return badEvents[Math.floor(Math.random() * badEvents.length)];
            }
        }
    } else {
        if (luck > 45)
        { // guarantee a lucky charm
            if (luck > 55) {
                // if they're here, it means they're stuck in a hole they literally cant get out of
                return UnluckyCharms[Math.floor(Math.random() * LuckyCharms.length)];
            }
            return LuckyCharms[Math.floor(Math.random() * LuckyCharms.length)];
        }
        if (luck % 2 === 0) {
            if (luck % 4 === 0) {
                const goodItems = miscItems.filter(item => item.power > 0);
                return goodItems[Math.floor(Math.random() * goodItems.length)];
            }
            const goodEvents = RandomEvents.filter(e => !e.isBad);
            return goodEvents[Math.floor(Math.random() * goodEvents.length)];
        }
    }
}