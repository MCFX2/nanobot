import { BaseSkill } from "./mmoskill";
import { ItemBuffType } from "./mmoitem";
import { MMOSaveFile, MMOSkillSave } from "./mmofile";

export class WoodchopSkill extends BaseSkill {
    public constructor() {
        super();
        this.BetterBuff = ItemBuffType.WoodchopBetter;
        this.FasterBuff = ItemBuffType.WoodchopFaster;
        this.baseTime = 180;
        this.beginPrompt = "You begin hacking away at a nearby tree.";
        this.levelUpPrompt = "You and your axe have grown closer.";
        this.finishPrompt = "The forests look just a bit thinner";
        this.skillMaxedMessage = "There are no trees left for you to cut. You've chopped them all down. I hope you're happy.";
        this.ranks = [
            "Unfamiliar With The Concept", // 1
            "Done It Before",
            "Familiar With The Concept",
            "Inexperienced",
            "Danger To Himself", // 5
            "Splinter Magnet",
            "You're Not Supposed To Use Your Teeth",
            "Woodchipper",
            "A Bit Axe-centric",
            "Lumberjack", // 10
            "Lumberjill",
            "Lorax Exterminator",
            "Axe Murderer",
            "Onceler Acolyte",
            "Woodland Terror", // 15
            "Danger To Others",
            "Onceler",
            "Modern-day Paul Bunyan",
            "Twiceler",
            "Ultimate Woodsman" // 20
        ];
    }
    
    protected override getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
        return userSave.woodchop;
    }
}

export const WoodChop = new WoodchopSkill();

export class FishingSkill extends BaseSkill {
    public constructor() {
        super();
        this.BetterBuff = ItemBuffType.FishingBetter;
        this.FasterBuff = ItemBuffType.FishingFaster;
        this.baseTime = 300;
        this.beginPrompt = "You sit down and begin to fish.";
        this.levelUpPrompt = "The seas are calling out to you.";
        this.finishPrompt = "Another great catch";
        this.skillMaxedMessage = "You're a master of the seas already, captain. Shouldn't you get back to your family?";
        this.ranks = [
            "Can't Handle Their Rod", // 1
            "Fell Off The Boat",
            "Stowaway",
            "Krill Catcher",
            "Bluegill Buddy", // 5
            "Asleep At The Oar",
            "Hot Rod",
            "Stowaway",
            "River Fisher",
            "Lake Fisher", // 10
            "Ocean Fisher",
            "First Mate",
            "Captain",
            "Whale Hunter",
            "Pirate", // 15
            "Solo Whale Hunter",
            "Captain Ahab",
            "Captain B Hab",
            "Prince Of Whales",
            "King of King Tides" // 20
        ];
    }
    
    protected override getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
        return userSave.fishing;
    }
}

export const FishSkill = new FishingSkill();

export class ForagingSkill extends BaseSkill {
    public constructor() {
        super();
        this.BetterBuff = ItemBuffType.ForagingBetter;
        this.FasterBuff = ItemBuffType.ForagingFaster;
        this.baseTime = 30;
        this.beginPrompt = "You set out in search of something edible.";
        this.levelUpPrompt = "The forest reveals more of its secrets to you.";
        this.finishPrompt = "You find something edible. You think";
        this.skillMaxedMessage = "You are so good at foraging that you have found all the food in the world. You should probably stop now.";
        this.ranks = [
            "Three-ager", // 1
            "Game Show Contestant",
            "Lost Kitten",
            "Blind To Berries",
            "Watcher of Woods", // 5
            "Berry Bulldozer",
            "Animal Whisperer",
            "Animal Shouter",
            "Fruit Ninja",
            "Forest Guide", // 10
            "Adept Ranger",
            "Ethical Hunter",
            "Forest Guardian",
            "Biome Bandit",
            "Ted Bear Crew", // 15
            "Ferocious Food Finder",
            "Ted Bear Himself",
            "Whisper on the Wind",
            "The Lorax",
            "The Berry Best" // 20
        ];
    }
    
    protected override getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
        return userSave.foraging;
    }
}

export const ForageSkill = new ForagingSkill();

export class CombatSkill extends BaseSkill {
    public constructor() {
        super();
        this.BetterBuff = ItemBuffType.CombatBetter;
        this.FasterBuff = ItemBuffType.CombatFaster;
        this.baseTime = 60;
        this.beginPrompt = "You travel out in search of something to fight.";
        this.levelUpPrompt = "You get a little stronger and a little angrier.";
        this.finishPrompt = "Claiming another victory, your confidence grows";
        this.skillMaxedMessage = "There is nobody left. You killed everyone. You can't kill anymore. You're done.";
        this.ranks = [
            "Weakling", // 1
            "Wimp",
            "Punching Bag",
            "Glass Joe",
            "Bug Stomper", // 5
            "Lionhearted",
            "Junior Warrior",
            "Senior Warrior",
            "Gladiator",
            "Fierce Rival", // 10
            "Champion",
            "Hero",
            "Minor Legend",
            "Renowned Adventurer",
            "Scourge of Evil", // 15
            "Merciless",
            "Feared By All",
            "The Angel of Death",
            "The Reaper",
            "The Grand Grocher" // 20
        ];
    }
    
    protected override getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
        return userSave.combat;
    }
}

export const Combat = new CombatSkill();

export class MiningSkill extends BaseSkill {
    public constructor() {
        super();
        this.BetterBuff = ItemBuffType.MiningBetter;
        this.FasterBuff = ItemBuffType.MiningFaster;
        this.baseTime = 120;
        this.beginPrompt = "You journey into the earth in search of minerals.";
        this.levelUpPrompt = "You've struck gold! Or iron. Or something.";
        this.finishPrompt = "You got a bunch of rocks. Nice";
        this.skillMaxedMessage = "The earth is hollow. It has nothing more to give you. You've taken it all.";
        this.ranks = [
            "Unlikely Denizen", // 1
            "Rock Hound",
            "Coal Carrier",
            "Iron Wrangler",
            "Dwarf Fanboy", // 5
            "Cave Explorer",
            "Tunnel Rat",
            "Digger",
            "Strip Miner",
            "Earthen Cockroach", // 10
            "Boulder Breaker",
            "Gem Hunter",
            "Emerald Excavator",
            "Earth Elemental",
            "Tunnel Snake", // 15
            "Rock Lobster",
            "Pitch Black Prospector",
            "Steve",
            "Dwarf Lord",
            "Overseer of the Underneath" // 20
        ];
    }
    
    protected override getRelevantSkillSave(userSave: MMOSaveFile): MMOSkillSave {
        return userSave.woodchop;
    }
}

export const MineSkill = new MiningSkill();