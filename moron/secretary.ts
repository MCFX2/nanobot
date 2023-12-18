import { ChatInputCommandInteraction } from 'discord.js';
import { Logger, WarningLevel } from './logger';
import { MoronModule } from './moronmodule';
import { readCacheFileAsJson, writeCacheFile } from './util';

export const Secretary: MoronModule = {
	name: 'secretary',
	onInit: onInit
};

const logger: Logger = new Logger('secretary', WarningLevel.Warning);

let schedules: Schedule[] = [];

function onInit() {
	const readObjs = readCacheFileAsJson('schedules.json') as Schedule[];

	readObjs.forEach(o => {
		// not fast but lol
		schedules.push(new Schedule(o.id));
		Object.assign(getSchedule(o.id)!, o);
	});

	logger.log('successfully initialized');
}



function getSchedule(id: string) {
	return schedules.find(s => s.id === id);
}

function commitSchedules() {
	writeCacheFile(
		'schedules.json',
		Buffer.from(JSON.stringify(schedules, null, '\t')),
	);
}

class Schedule {
	constructor(id: string) {
		this.id = id;
	}

	public id: string;

	private blocks: ScheduleBlock[] = [];

	public ReplaceBlocks = (newBlocks: ScheduleBlock[]) => {
		this.blocks = newBlocks;
	};

	public AppendBlocks = (newBlocks: ScheduleBlock[]) => {
		newBlocks.forEach(b => this.blocks.push(b));
	};

	public IsFreeAtTime(
		day: DaysOfWeek,
		time: number,
	): { isFree: boolean; reason?: string } {
		let result: { isFree: boolean; reason?: string } = {
			isFree: true,
			reason: undefined,
		};
		this.blocks.forEach(block => {
			if (doDaysOverlap(day, block.day)) {
				if (block.startTime <= time && block.endTime > time) {
					result.isFree = block.isFree;
					result.reason = block.reason;
				}
			}
		});
		return result;
	}
}

interface ScheduleBlock {
	day: DaysOfWeek;
	startTime: number;
	endTime: number;
	isFree: boolean;
	priority: number;
	reason?: string;
}

enum DaysOfWeek {
	Sunday,
	Monday,
	Tuesday,
	Wednesday,
	Thursday,
	Friday,
	Saturday,
	All,
}

function doDaysOverlap(day1: DaysOfWeek, day2: DaysOfWeek) {
	if (day1 === DaysOfWeek.All || day2 === DaysOfWeek.All) return true;
	if (day1 === day2) return true;
}

function getStandardizedDay(day: string) {
	const normalizedDay = day.toLowerCase();
	switch (normalizedDay) {
		case '*':
			return DaysOfWeek.All;
		case 'su':
		case 'sun':
		case 'sunday':
			return DaysOfWeek.Sunday;
		case 'm':
		case 'mon':
		case 'monday':
			return DaysOfWeek.Monday;
		case 't':
		case 'tue':
		case 'tues':
		case 'tuesday':
			return DaysOfWeek.Tuesday;
		case 'w':
		case 'wed':
		case 'wednesday':
			return DaysOfWeek.Wednesday;
		case 'th':
		case 'thur':
		case 'thurs':
		case 'thursday':
			return DaysOfWeek.Thursday;
		case 'f':
		case 'fri':
		case 'friday':
			return DaysOfWeek.Friday;
		case 'sa':
		case 'sat':
		case 'saturday':
			return DaysOfWeek.Saturday;
	}
}

function getStandardizedTime(time: string) {
	const isPm = time.toLowerCase().includes('p');
	const cleanTime = time.trim().replace(/\D/g, '');
	const timeNum = Number.parseInt(cleanTime);
	if (cleanTime.length < 3) {
		if (isPm) {
			return (timeNum + 12) * 100;
		}
		return timeNum * 100;
	}
	if (isPm) {
		return timeNum + 1200;
	}
	return timeNum;
}

function getNextDay(day: DaysOfWeek): DaysOfWeek {
	switch (day) {
		case DaysOfWeek.Sunday:
			return DaysOfWeek.Monday;
		case DaysOfWeek.Monday:
			return DaysOfWeek.Tuesday;
		case DaysOfWeek.Tuesday:
			return DaysOfWeek.Wednesday;
		case DaysOfWeek.Wednesday:
			return DaysOfWeek.Thursday;
		case DaysOfWeek.Thursday:
			return DaysOfWeek.Friday;
		case DaysOfWeek.Friday:
			return DaysOfWeek.Saturday;
		case DaysOfWeek.Saturday:
			return DaysOfWeek.Sunday;
	}

	logger.log('uhhh that one doesnt have a next day', WarningLevel.Warning);
	return DaysOfWeek.All;
}

export function setSchedule(interaction: ChatInputCommandInteraction) {
	const scheduleString = interaction.options.get('schdulestring')?.value;
	const shouldAppend = interaction.options.get('append')?.value;

	if (scheduleString === undefined || shouldAppend === undefined) {
		interaction.reply({ content: 'try again im kinda lost', ephemeral: true });
		return;
	}

	const scheduleRequests = scheduleString.toString().split(',');
	let err = false;
	let idx = 0;

	let userSchedule = getSchedule(interaction.user.id);
	let newBlocks: ScheduleBlock[] = [];

	scheduleRequests.forEach(schedule => {
		if (err) return;
		const args = schedule.split(':');
		const day = getStandardizedDay(args[0]);
		const isWeekend = args[0] === '^';
		const isWeekday = args[0] === '&';
		if (day === undefined && !isWeekday && !isWeekend) {
			interaction.reply({
				content:
					'good point. however, minor spelling mistake. you lose.' +
					`\n(syntax error: bad day of week on item #${idx})`,
				ephemeral: true,
			});
			err = true;
			return;
		}
		let isFree = false;
		let priority = 0;
		if (args[1] === '-') {
			isFree = true;
		} else {
			priority = Number.parseInt(args[1]);
			if (isNaN(priority)) {
				interaction.reply({
					content:
						'good point. however, minor spelling mistake. you lose.' +
						`\n(syntax error: bad priority value on item #${idx})`,
					ephemeral: true,
				});
				err = true;
				return;
			}
		}

		// args[2] contains [start]-[end][+reason]

		let plusPos = args[2].indexOf('+');
		const dashPos = args[2].indexOf('-');

		const reason =
			plusPos !== -1 ? args[2].substring(plusPos + 1, args[2].length) : undefined;

		if (plusPos === -1) plusPos = args[2].length;

		if (dashPos === -1) {
			interaction.reply({
				content:
					'good point. however, minor spelling mistake. you lose.' +
					`\n(syntax error: no '-' found on item #${idx})`,
				ephemeral: true,
			});
			err = true;
			return;
		}

		let startTime = 0;
		let endTime = 2400;

		if (dashPos !== 0) {
			startTime = getStandardizedTime(args[2].substring(0, dashPos));
		} else {
			startTime = -1;
		}

		if (dashPos === plusPos - 1) {
			endTime = 2401;
		} else {
			endTime = getStandardizedTime(args[2].substring(dashPos, plusPos));
		}

		// create blocks

		if (isWeekday) {
			newBlocks.push({
				day: DaysOfWeek.Monday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			newBlocks.push({
				day: DaysOfWeek.Tuesday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			newBlocks.push({
				day: DaysOfWeek.Wednesday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			newBlocks.push({
				day: DaysOfWeek.Thursday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			newBlocks.push({
				day: DaysOfWeek.Friday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});

			if (endTime === 2401) {
				newBlocks.push({
					day: DaysOfWeek.Tuesday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
				newBlocks.push({
					day: DaysOfWeek.Wednesday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
				newBlocks.push({
					day: DaysOfWeek.Thursday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
				newBlocks.push({
					day: DaysOfWeek.Friday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
				newBlocks.push({
					day: DaysOfWeek.Saturday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
			}
		} else if (isWeekend) {
			newBlocks.push({
				day: DaysOfWeek.Saturday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			newBlocks.push({
				day: DaysOfWeek.Sunday,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});

			if (endTime === 2401) {
				newBlocks.push({
					day: DaysOfWeek.Sunday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
				newBlocks.push({
					day: DaysOfWeek.Monday,
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
			}
		} else {
			newBlocks.push({
				day: day!,
				startTime: startTime === -1 ? 300 : startTime,
				endTime: endTime === 2401 ? 2400 : endTime,
				priority: priority,
				isFree: isFree,
				reason: reason,
			});
			if (endTime === 2401) {
				newBlocks.push({
					day: getNextDay(day!),
					startTime: 0,
					endTime: 300,
					priority: priority,
					isFree: isFree,
					reason: reason,
				});
			}
		}


		++idx;
	});

	if (err) return;

	if (!userSchedule) {
		schedules.push(new Schedule(interaction.user.id));
		userSchedule = getSchedule(interaction.user.id);
		if (!userSchedule) {
			logger.log('couldnt make a new schedule for some reason', WarningLevel.Error);
			interaction.reply({ content: 'oof ow ouch that hurt\n(internal error)', ephemeral: true });
			return;
		}
	}

	if (shouldAppend) {
		userSchedule.AppendBlocks(newBlocks);
	} else {
		userSchedule.ReplaceBlocks(newBlocks);
	}

	commitSchedules();

	interaction.reply({ content: 'ok', ephemeral: true });
}

export function whoCanMakeIt(interaction: ChatInputCommandInteraction) {
	const time = interaction.options.get('time', true);
	let users: string[] = [];
	schedules.forEach(s => {
		if (s.IsFreeAtTime(DaysOfWeek.Thursday, Number.parseInt(time.value!.toString())).isFree)
		{
			users.push(s.id);
			}
	});

	interaction.reply('these guys are probably around:\n' + users.join('\n'));
}

export function pingLiberals(interaction: ChatInputCommandInteraction) {}

