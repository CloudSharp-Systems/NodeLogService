const os = require('os');
const { get_new_hash_id } = require("./hash_id");
const { Logging } = require('@google-cloud/logging');


class GCPLogger {

	constructor(GCProjectID, credentialsKeyFileName, loggerName) {
		const logService = new Logging({
       			projectId: GCProjectID,
        		keyFilename: credentialsKeyFileName
		});
		this._logger = logService.log(loggerName);
	}

	async writeLogEntry(programName, logMetadata, logContent) {
		const metadata = {
			...logMetadata,
			insertId: get_new_hash_id(programName),
			labels: { ...logMetadata.labels, instance_name: os.hostname() }
		};

		const entry = this._logger.entry(metadata, logContent);
		await this._logger.write(entry);
	}


}



module.exports = GCPLogger;
