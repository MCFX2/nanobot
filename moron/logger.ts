export const forceTraceMode: boolean = true;

const warningLevels = ["", "[Info] ", "[Warning] ", "[ERROR] "];

export enum WarningLevel {
	Notice = 0,
	Info = 1,
	Warning = 2,
	Error = 3,
	Disabled = 4,
}

export class Logger {
	constructor(moduleName: string, minWarningLevel: number) {
		this.moduleName = moduleName;
		this.minWarningLevel = minWarningLevel;
	}

	moduleName: string;
	minWarningLevel: number;

	log(msg: unknown | undefined, warningLevel = 0) {
		if (
			forceTraceMode ||
			(warningLevel >= this.minWarningLevel &&
				warningLevel < WarningLevel.Disabled)
		) {
			const now = new Date();
			console.log(
				`[${now.getHours().toString().padStart(2, "0")}:${now
					.getMinutes()
					.toString()
					.padStart(2, "0")}:${now
					.getSeconds()
					.toString()
					.padStart(2, "0")}] [moron/${this.moduleName}] ${
					warningLevels[warningLevel]
				}${msg}` ?? "undefined",
			);
		}
	}
}
