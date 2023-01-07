import { Client } from 'discord.js';
import { Logger, WarningLevel } from './logger';
import { MoronModule } from './moronmodule';

let client: Client;

const logger: Logger = new Logger('grochegames', WarningLevel.Notice);

export const GrocheGames: MoronModule = {
	name: 'grochegames',
	onInit: onInit,
};

async function onInit(discordClient: Client) {
	client = discordClient;
	logger.log('initialized grochegames');
}
