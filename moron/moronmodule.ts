import type {
	CacheType,
	Client,
	Interaction,
	Message,
	MessageReaction,
	User,
} from "discord.js";

export class MoronModule {
	name = "unnamed module";

	onInit?: (client: Client) => void;
	onMessageSend?: (msg: Message) => void;
	onReactionAdd?: (react: MessageReaction, user: User) => void;
	onReactionRemove?: (react: MessageReaction) => void;
	onInteract?: (interaction: Interaction<CacheType>) => boolean;
}
