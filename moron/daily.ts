import { Logger, WarningLevel } from './logger';
import { Client } from 'discord.js';
import { check_xkcd, init_xkcd } from './feeds/xkcd';
import * as cron from 'cron';
import { check_normie, init_normie } from './feeds/normie';
import { check_smbc, init_smbc } from './feeds/smbc';
import { check_twitfollow, init_twitfollow } from './feeds/twitfollow';
import { storykeeper_closeSubmissions, storykeeper_finalizeVoting, storykeeper_postPrompt, storykeeper_postReminder, storykeeper_startVoting } from './storykeeper';

let client: Client;

let logger: Logger = new Logger('daily', WarningLevel.Warning);

interface Job {
	init: (clientInstance: Client) => void;
	schedule: string;
	callback: () => Promise<void>;
	name: string;
	options: JobOptions;
}

class JobOptions {
	enabled: boolean = true;
	runOnStart: boolean = false;
}

function make_job(
	schedule: string,
	init: (clientInstance: Client) => void,
	callback: () => Promise<void>,
	name: string,
	options?: JobOptions,
): Job {
	return {
		schedule: schedule,
		init: init,
		callback: callback,
		name: name,
		options: options ?? new JobOptions(),
	};
}

function run_job(job: Job) {
	try {
		logger.log('running job ' + job.name, WarningLevel.Notice);
		job.callback();
	} catch (err: any) {
		logger.log('Caught exception running job ' + job.name, WarningLevel.Error);
		logger.log(err, WarningLevel.Error);
	}
}

// https://crontab.guru/#*_*_*_*_*
// useful resource for writing cron schedules
const jobs: Job[] = [
	make_job('25 11 * * *', init_xkcd, check_xkcd, 'XKCD'),
	make_job('40 7,23 * * *', init_normie, check_normie, 'normie'),
	make_job('35 14 * * *', init_smbc, check_smbc, 'SMBC'),
	// run storykeeper every Monday at 6PM
	// make_job('0 18 * * 1', () => { }, storykeeper_postPrompt, 'storykeeper-postPrompt'),
	// make_job('0 6 * * 6', () => { }, storykeeper_postReminder, 'storykeeper-postReminder'),
	// make_job('0 18 * * 6', () => { }, storykeeper_closeSubmissions, 'storykeeper-closeSubmissions'),
	// make_job('0 18 * * 0', () => { }, storykeeper_startVoting, 'storykeeper-startVoting'),
	// make_job('0 18 * * 2', () => { }, storykeeper_finalizeVoting, 'storykeeper-finalizeVotes'),
];

let activeJobs: cron.CronJob[] = [];

export async function daily_init(clientInstance: Client) {
	client = clientInstance;

	jobs.forEach(job => {
		logger.log('initializing ' + job.name);
		job.init(client);

		if (job.options.enabled) {
			activeJobs.push(
				new cron.CronJob(job.schedule, async () => {
					run_job(job);
				}),
			);
		}

		if (job.options.runOnStart) {
			run_job(job);
		}
	});

	activeJobs.forEach(job => job.start());

	logger.log('finished starting with ' + activeJobs.length + ' active jobs');
}
