const GCPLogger = require("./gcp_logging");
const { get_new_hash_id } = require("./hash_id");
const uuid = require('uuid');
const LoggerStateManager = require("./logger_state_manager");
const DBLogger = require("./database_logging");


class PipeLinedLogger {

	// programData must satisfy the prototype: { projectId: object(ID string for each platform), programName: string, programType: string }. Valid ID string for each platform: { "GCP": string, "SQLDB": string, "MONGODB": string }
	// credentials must satisfy the prototype: { GCP: string(file name), SQLDB: string(file name) }.
	constructor(programData, credentials) {
		this._programData = programData;
		this._loggerStateManager = new LoggerStateManager();

		this._gcp_logger = null;
		this._sqldb_logger = null;
		this._mongodb_logger = null;
		this._sitedb_logger = null;

		if (this._programData.projectId.GCP) {
			const GCPProgramData = { ...programData, projectId: programData.projectId.GCP };
        		this._gcp_logger = new GCPLogger(GCPProgramData, credentials.GCP, this._loggerStateManager);
		}

		if (this._programData.projectId.SQLDB) {
			this._sqldb_logger = new DBLogger(credentials.SQLDB, this._loggerStateManager);
		}

		if (this._programData.projectId.SITEDB) {
			if (credentials.SITEDB == credentials.SQLDB) this._sitedb_logger = this._sqldb_logger;
			else this._sitedb_logger = new DBLogger(credentials.SITEDB, this._loggerStateManager);
		}
	}


	// log must satisfy the prototype: { metadata: obj, content: string|object, note: string, systemHealthTraceRecord: undefined|object }
	async writeLogEntry(log) {
		if (this._gcp_logger) {
			await this._gcp_logger.writeLogEntry(log.metadata, log.content);
		}

		if (this._sqldb_logger) {
			const programDataRef = this._programData;
			const SQLDBProgramData = { ...programDataRef, projectId: programDataRef.projectId.SQLDB };
        		await this._sqldb_logger.client_run(async (dbClient) => {
                		await this._sqldb_logger.writeLogEntry(dbClient, SQLDBProgramData, this._loggerStateManager.getState(GCPLogger.LOG_METADATA_STATE), log.note);
        		});
		}

		if (this._sitedb_logger) {
			const programDataRef = this._programData;
			const SITEDBProgramData = { ...programDataRef, projectId: programDataRef.projectId.SITEDB };
			await this._sitedb_logger.client_run(async (dbClient) => {
				await this._sitedb_logger.writeHostStatusLog(dbClient, SITEDBProgramData, log.systemHealthTraceRecord);
			});
		}

        	this._loggerStateManager.clearStates();
	}


}


module.exports = PipeLinedLogger;
