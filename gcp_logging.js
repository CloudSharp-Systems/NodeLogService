const os = require('os');
const { get_new_hash_id } = require("./hash_id");
const LoggerStateManager = require("./logger_state_manager");
const { Logging } = require('@google-cloud/logging');


class GCPLogger {

	static LOG_METADATA_STATE = "GCP_LOG_METADATA_STATE";

	// programData must satisfy the prototype: { projectId: string, programName: string, programType: string }
	constructor(programData, credentialsKeyFileName, loggerStateManager=new LoggerStateManager()) {
		const logService = new Logging({
       			projectId: programData.projectId,
        		keyFilename: credentialsKeyFileName
		});
		this._programName = programData.programName;
		this._logger = logService.log(programData.programName);
		this._loggerStateManager = loggerStateManager;
	}

	async writeLogEntry(logMetadata, logContent) {
		const metadata = {
			...logMetadata,
			insertId: get_new_hash_id(this._programName),
			labels: { ...logMetadata.labels, instance_name: os.hostname() }
		};

		if (this._loggerStateManager) {
			this._loggerStateManager.setState(GCPLogger.LOG_METADATA_STATE, metadata);
		}

		const entry = this._logger.entry(metadata, logContent);
		await this._logger.write(entry);
	}


}



module.exports = GCPLogger;
