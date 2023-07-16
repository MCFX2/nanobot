import { ChatInputCommandInteraction } from 'discord.js';

const planeswalkerAbilities = {
	'+2': [
		'uhhhh shit. uh draw a card?',
		'wait who tf actually uses this one. uhhhhh scry 3',
		'FUCK i forgot to write these. just exile target artifact and call it good',
		'uh, heal 5 life to target player? idk man',
		'ok ok ok... draw 2 cards and discard one. that should work right',
		'put a couple +1/+1 counters on target creature. like 2? yeah',
		'i dunno man. destroy target permanent. but not a creature',
		'destroy a target creature, that should work right',
		'why not make a 1/1 zombie token with deathtouch',
		'how about make a 4/1 angel token with lifelink and flying',
		'lets have you make a 2/2 gaming moron baby token (artifact creature) with googoo gaga. that token can represent how you sound right now. useless fuck',
		"draw five cards. then discard any that aren't lands. that is kinda funny right",
		'you have 30 seconds to write a haiku about me (gaming moron). if you make a valid haiku in time then draw four cards. otherwise discard four cards.',
		'target player sacrifices a permanent',
		'deal 3 damage to target creature',
		'do literally nothing. you just get the loyalty and thats all. now you finally know how it feels to have your time wasted',
	],
	'+6': [
		'wow, getting greedy here. take six damage to your fucking face',
		'sacrifice two artifacts. if you dont have 2 artifacts, im doing -3 loyalty.',
		'target creature you control attacks you. wow, the betrayal',
		'mill ten cards. yeah you heard me right',
		'all players EXCEPT YOU draw a card. >:)',
		'lick your elbow in the next 20 seconds or lose 12 life',
		"hit an A note with your voice (440hz) and hold it, then someone look up 440hz on youtube and see how close you are. if you're like, pretty close, draw a card. otherwise discard two cards",
		'give target enchantment or artifact you control to an opponent (they now control it)',
		'gaming moron loses 4 loyalty',
		'until your next upkeep you take double damage',
		'until your next upkeep, all your opponents cards cost 1 colorless mana less to cast',
	],
	'-2': [
		'all creatures take 3 damage.',
		'gain control of target creature. hehe',
		'activate the +2 ability twice (run the command and resolve the effect, but do not get the loyalty)',
		'target player discards two cards',
		'target player mills four cards',
		'exile target creature',
		'target player sacrifices TWO creatures',
		'make a 6/7 oger token with good stats for the cost, but it has to be an oger.',
		'put five -1/-1 counter on target creature. draw a card for each creature you kill with this effect',
		'target players life total is now 15 and a half. if they die, they die.',
		'put a +1/+1 counter on each creature you control. then put a -1/-1 counter on each creature your opponents control. ' +
			'then put a +1/+1 counter on each creature you control. then put a -1/-1 counter on each creature your opponents control.' +
		'then put a -1/+1 counter on each creature you control.then put a +1/-1 counter on each creature your opponents control.' +
		'then put a -1/+2 counter on each creature you control. then click on door 430 five times. then put a -2/-1 counter on each creature your opponents control. then remove all the counters you just put on. then put a +1/+1 counter on yourself. it doesnt do anything but dont you feel accomplished',
	],
	'-10': [
		'you get an emblem with "whenever you cast a spell, draw 2 cards"',
		'you gain 200 life',
		'every creature takes 12 damage, and your next spell is copied',
		'your next spell is copied twice (three times total)',
		'your LAST spell is copied three times, and cast right fucking now. hope you remember which one that was. also if its a legendary uhhh do the one before that i guess',
		'you get an emblem with "whenever a card is played with a \'e\' in its name, draw a card"',
		'every player (even you) mills 20 cards',
		'every other player (not you) sacrifices 5 permanents. choose two of them, they enter the battlefield under your control.',
		'every player (even you) discards their hand. you draw 7 cards.',
		'every player (even you) loses 10 life. you gain 10 life. yes, this can kill you. its funny. shut up',
		'every player exiles 3 cards from their library. you can cast any of them without paying their mana cost',
		'you get an emblem with "every time a spell is cast, roll a 6 sided die. if you roll a 6, counter the spell. if you roll a 1, the spell is copied (the original caster controls the copy).',
		'roll 1d4, 1d6, 1d8, 2d10, 1d12, and 1d20. for every number that appears more than once, every player loses that much life. for every number that appeasr only once, every player mills that many cards.',
		'tap everything. nothing untaps for any reason, even other card effects, until somebody casts a spell with cmc exactly 2. then untap everything. hope you guys still have some lands in your hand',
		'you get an emblem with "whenever a player says something that doesnt rhyme, they must sacrifice a permanent. this only triggers once per player per turn. players have to say the names of any cards they play."',
		'you get to have a 1v1 game with gaming moron. if you win, you win the game. if you lose, you lose the game. if you draw, you lose the game. just kidding. everyone loses the game, including gaming moron. ok but for real the effect is to draw 20 cards and gain 10 life.',
		'you have to play rock paper scissors with target player. if you choose scissors and lose, sacrifice gaming moron and take 20 damage. if you win (with any throw) then you get an emblem with \'pay 2 mana to tap target permanent.',
		'you get an emblem with "whenever your deck runs out of cards, you win the game"',
	],
};

function hasKey<O extends object>(obj: O, key: PropertyKey): key is keyof O {
	return key in obj;
}

export function planeswalkerAbility(interaction: ChatInputCommandInteraction) {
	const effect = interaction.options.get('effect');

	if (!effect) {
		interaction.reply('idiot');
		return;
	}

	const effectString = effect.value as string;

	if (hasKey(planeswalkerAbilities, effectString)) {
		const table = planeswalkerAbilities[effectString] as string[];
		const idx = Math.random() * table.length;
		interaction.reply(table[Math.floor(idx)]);
		return;
	} else {
		interaction.reply(
			effectString +
				' is not an ability i have. maybe ur the moron here, ever think of that',
		);
		return;
	}
}
