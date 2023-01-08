import { GrocheGamesItem } from './core';

export const AllGrocheGamesItems: GrocheGamesItem[] = [
	/// FLAVOR ITEMS ///
	{
		name: 'Death Locket',
		flavorText:
			'A locket that feels strangely heavy in your hand. It has a ridged skull pattern on it. You get the sense that you need to activate this somehow.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onKill() {
			if (this.holdingPlayer) {
				this.holdingPlayer.inventory.splice(
					this.holdingPlayer.inventory.indexOf(this),
					1,
				);
				const poweredLocket = AllGrocheGamesItems.find(
					item => item.name === 'Powered Death Locket',
				);
				// TODO: add callback trigger for "on item added" and use that instead of this
				if (poweredLocket) {
					this.holdingPlayer.inventory.push(poweredLocket);
				}
			}
		},
	},
	{
		name: 'Shadow Ankh',
		flavorText:
			"A small, dark, metal ankh. Symbols like this used to represent the afterlife. You're not sure what this does, but you feel like it's a good idea to hold on to it.",
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onDie() {
			if (this.holdingPlayer) {
				this.holdingPlayer.curHP = 1;
				// TODO: add callback trigger for this somehow
				// maybe move it to end-of-day?

				this.holdingPlayer.inventory.splice(
					this.holdingPlayer.inventory.indexOf(this),
					1,
				);
				const activatedAnkh = AllGrocheGamesItems.find(
					item => item.name === 'Activated Shadow Ankh',
				);
				// TODO: add callback trigger for "on item added" and use that instead of this
				if (activatedAnkh) {
					this.holdingPlayer.inventory.push(activatedAnkh);
				}
			}
		},
	},
	{
		name: 'Rockmite',
		flavorText:
			'A tiny roach-like bug. These are known for eating debris off of rocks. Maybe you can use it to clean up a stone somewhere?',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onItemPickedUp(otherItem: GrocheGamesItem) {
			// TODO: need callback for these too
			if (this.holdingPlayer) {
				if (otherItem.name === 'Rainbow Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Rainbow Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Rainbow Emblem',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Empty Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Empty Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Empty Insignia',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Split Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Split Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Split Pendant',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				}
			}
		},
	},
	{
		name: 'Polishing Kit',
		flavorText:
			"A small kit used to polish a stone. The polishing material, made of Rockmite, seems to only have one use's worth left. Maybe you can use it to clean up a stone somewhere?",
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onItemPickedUp(otherItem: GrocheGamesItem) {
			// TODO: need callback for these too
			if (this.holdingPlayer) {
				if (otherItem.name === 'Rainbow Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Rainbow Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Rainbow Emblem',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Empty Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Empty Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Empty Insignia',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Split Gem') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Split Gem',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Split Pendant',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				}
			}
		},
	},
	{
		name: 'Rainbow Gem',
		flavorText:
			'A shiny, colorful stone. You feel lucky to have found it. However it seems to be poorly taken care of. Perhaps if you had some way of polishing it up?',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onItemPickedUp(otherItem: GrocheGamesItem) {
			// TODO: need callback for these too
			if (this.holdingPlayer) {
				if (otherItem.name === 'Rockmite') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Rockmite',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Rainbow Emblem',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Polishing Kit') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Polishing Kit',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Rainbow Emblem',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				}
			}
		},
	},
	{
		name: 'Empty Gem',
		flavorText:
			'A hollow, transparent stone. It feels lighter than air. However it seems to be poorly taken care of. Perhaps if you had some way of polishing it up?',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onItemPickedUp(otherItem: GrocheGamesItem) {
			// TODO: need callback for these too
			if (this.holdingPlayer) {
				if (otherItem.name === 'Rockmite') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Rockmite',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Empty Insignia',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Polishing Kit') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Polishing Kit',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Empty Insignia',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				}
			}
		},
	},
	{
		name: 'Split Gem',
		flavorText:
			'A weighty, shiny stone with a distinct red and blue half. It looks almost like two different stones put together. However it seems to be poorly taken care of. Perhaps if you had some way of polishing it up?',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onItemPickedUp(otherItem: GrocheGamesItem) {
			// TODO: need callback for these too
			if (this.holdingPlayer) {
				if (otherItem.name === 'Rockmite') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Rockmite',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Split Pendant',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				} else if (otherItem.name === 'Polishing Kit') {
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.indexOf(this),
						1,
					);
					this.holdingPlayer.inventory.splice(
						this.holdingPlayer.inventory.findIndex(
							item => item.name === 'Polishing Kit',
						),
						1,
					);

					const upgradedGem = AllGrocheGamesItems.find(
						item => item.name === 'Split Pendant',
					);

					if (upgradedGem) {
						this.holdingPlayer.inventory.push(upgradedGem);
					}
				}
			}
		},
	},
	{
		name: 'Watchful Eye',
		flavorText:
			'A strange, glassy eyeball. It moves on its own occasionally. It seems rapt with attention on you.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onDayFinished() {
			if (this.timePassed) {
				this.timePassed++;
				if (this.timePassed === 2) {
					if (this.holdingPlayer) {
						this.holdingPlayer.inventory.splice(
							this.holdingPlayer.inventory.indexOf(this),
							1,
						);

						const twitchyEye = AllGrocheGamesItems.find(
							item => item.name === 'Twitchy Eye',
						);

						if (twitchyEye) {
							this.holdingPlayer.inventory.push(twitchyEye);
						}
					}
				}
			} else {
				this.timePassed = 0;
			}
		},
	},
	/// REGULAR ITEMS ///
	{
		name: 'Brass Knuckles',
		flavorText: 'Pretty much an exoskeleton for your fist.',
		strBonus: 1,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		special: false,
		legendary: false,
	},
	{
		name: 'Mil-spec Vest',
		flavorText: 'Sturdy, yet light. Might just save your life.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 1,
		mBonus: 0,
		special: false,
		legendary: false,
	},
	{
		name: 'Sweet Sneakers',
		flavorText:
			'So good at making you run faster, they were banned at the olympics.',
		strBonus: 0,
		spdBonus: 1,
		tghBonus: 0,
		mBonus: 0,
		special: false,
		legendary: false,
	},
	{
		name: 'Five-leaf clover',
		flavorText: 'Dang, so close.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		special: false,
		legendary: false,
	},
	{
		name: 'Medpack',
		flavorText: 'Dubious quality, but way better than nothing.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		special: false,
		legendary: false,
	},
	{
		name: 'Car Battery Backpack',
		flavorText:
			'A portable defibrillator. This will bring you back from death at full health. But the insane amount of power coursing through you will give you permanent injuries.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,

		onDie() {
			if (this.holdingPlayer) {
				this.holdingPlayer.curHP = this.holdingPlayer.maxHP;
				// apply random debuffs
				let debuffsLeft = Math.floor(Math.random() * 3);

				while (debuffsLeft > 0) {
					const randomDebuff = Math.floor(Math.random() * 7);

					// TODO: callbacks here so players know what happened
					switch (randomDebuff) {
						case 0:
							if (this.holdingPlayer.baseStrength > 1) {
								debuffsLeft--;
								this.holdingPlayer.baseStrength--;
							}
							break;
						case 1:
							if (this.holdingPlayer.baseSpeed > 1) {
								debuffsLeft--;
								this.holdingPlayer.baseSpeed--;
							}
							break;
						case 2:
							if (this.holdingPlayer.baseToughness > 1) {
								debuffsLeft--;
								this.holdingPlayer.baseToughness--;
							}
							break;
						case 3:
							if (!this.holdingPlayer.hasExpertMode) {
								debuffsLeft--;
								this.holdingPlayer.hasExpertMode = true;
							}
							break;
						case 4:
							if (!this.holdingPlayer.hasMoronicRage) {
								debuffsLeft--;
								this.holdingPlayer.hasMoronicRage = true;
							}
							break;
						case 5:
							if (!this.holdingPlayer.hasShortCircuit) {
								debuffsLeft--;
								this.holdingPlayer.hasShortCircuit = true;
							}
							break;
						case 6:
							break;
					}
				}
			}
		},
	},
	{
		name: 'Brass Knuckles',
		flavorText: 'Pretty much an exoskeleton for your fist.',
		strBonus: 1,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: false,
	},
	/// ACTIVATED FLAVOR ITEMS
	{
		name: 'Powered Death Locket',
		flavorText:
			"After feasting on the blood of an enemy, the locket's eyes glow with murderous intent. You feel it sharing some of its strength with you.",
		strBonus: 1,
		spdBonus: 0,
		tghBonus: 1,
		mBonus: 0,
		legendary: false,
		special: true,
	},
	{
		name: 'Activated Shadow Ankh',
		flavorText:
			'After dying and being brought back, you feel strangely in tune with the shadows. You can slip around much more easily.',
		strBonus: 0,
		spdBonus: 1,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: true,
	},
	{
		name: 'Rainbow Emblem',
		flavorText:
			'The rockmite has cut the gem into an emblem. It radiates with a loving warmth. You feel at ease while holding it.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: true,
	},
	{
		name: 'Empty Insignia',
		flavorText:
			'The rockmite has cut the gem into an insignia. It feels lighter than air. Wearing it, YOU feel lighter than air.',
		strBonus: 1,
		spdBonus: 1,
		tghBonus: 0,
		mBonus: 0,
		legendary: false,
		special: true,
	},
	{
		name: 'Split Pendant',
		flavorText:
			'The rockmite has cut the gem into a pendant. It radiates warmth from one side and cold from the other, keeping you a perfectly comfortable temperature. Wearing it, you get the sense that the environment will no longer pose a threat to you.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 1,
		mBonus: 0,
		legendary: false,
		special: true,
	},
	{
		name: 'Twitchy Eye',
		flavorText:
			'You realize now the eye is actually a camera, streaming your reaction to a now-massive audience of adoring fans. As long as you continue streaming with this you will receive many donations.',
		strBonus: 0,
		spdBonus: 0,
		tghBonus: 0,
		mBonus: 2,
		legendary: false,
		special: true,
	},
	/// LEGENDARY ITEMS ///
];
