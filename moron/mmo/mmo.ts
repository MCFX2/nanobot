import { Client } from "discord.js";
import { MoronModule } from "../moronmodule";
import { Logger, WarningLevel } from "../logger";
import { init_mmofile } from "./mmofile";

export const mmoLogger: Logger = new Logger("mmo", WarningLevel.Notice);

export const MMO: MoronModule = { 
    name: "MMO",
    onInit: init_mmo,
}

function init_mmo(_client: Client) {
    init_mmofile();
}