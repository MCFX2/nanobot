import type { Client } from "discord.js";
import { Logger, WarningLevel } from "../logger";
import type { MoronModule } from "../moronmodule";
import { init_mmofile } from "./mmofile";

export const mmoLogger: Logger = new Logger("mmo", WarningLevel.Notice);

export const MMO: MoronModule = {
	name: "MMO",
	onInit: init_mmo,
};

function init_mmo(_client: Client) {
	init_mmofile();
}
