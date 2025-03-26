const sql = require("mssql");
const pg = require("pg");
const uuid = require("uuid");
const os = require("os");
const fs = require('node:fs');
const LoggerStateManager = require("./logger_state_manager");



class DBLogger {

	static SEVERITY_MAPPER = {
		// GCP - Google Cloud Logging
		DEFAULT: "NOTE",
		DEBUG: "NOTE",
		INFO: "GOOD",
		NOTICE: "NOTE",
		WARNING: "WARNING",
		ERROR: "ERROR",
		CRITICAL: "ERROR",
		ALERT: "WARNING",
		EMERGENCY: "ERROR",

		// CloudSharp SQL DB
		GOOD: "GOOD",
		NOTE: "NOTE"
	};


    constructor(connectionConfigFileName, loggerStateManager=new LoggerStateManager()) {
		this._connectionConfig = JSON.parse(fs.readFileSync(connectionConfigFileName).toString());
		this._loggerStateManager = loggerStateManager;
    }

	// @abstract
	// job is an async function with database actions taking in a SQL connection client as parameter.
	async client_run(job) {
		throw new Error("Not Implemented!");
	}

	// @abstract
	async transact(dbClient) {
		throw new Error("Not Implemented!");
	}

	// @abstract
	// programData must satisfy the prototype { projectId: string, programName: string, programType: string }
	// logMetadata must satisfy the prototype { insertId: string, severity: string, resource: object }
    async writeLogEntry(dbClient, programData, logMetadata, logNote) {
		throw new Error("Not Implemented!");
	}

	// @abstract
	// programData must satisfy the prototype { programName: string }
    // systemHealthTraceRecord must satisfy the prototype {
	//	host_IP: string,
	//	port: string,
	//	system_status: "NORMAL"|"ERROR"
	//	trace_ID: string
	//	message: string
	//	recorded_by: string (optional)
	//	latency: number
	// }
    async writeHostStatusLog(dbClient, programData, systemHealthTraceRecord) {
		throw new Error("Not Implemented!");
	}


}



// Tidy input data into a data structure for formatted log writing in DB.
function makeLogEntryParams(programData, logMetadata, logNote) {
	const current_time = new Date();
	const formatted_time = current_time.toISOString()
        .replace(/-/g, '')
        .replace(/:/g, '')
        .replace('T', '')
        .split('.')[0];
	const severity = DBLogger.SEVERITY_MAPPER[logMetadata.severity];

	let system_log_param_lst = [
		"log_id", `${formatted_time}_${uuid.v4()}`, String,
		"app_id", programData.projectId, String,
		"system_name", os.hostname(), String,
		"trace_id", logMetadata.insertId, String,
		"record_type", severity, String,
		"record_key", programData.programType, String,
		"record_value1", `program: ${programData.programName}`, String,
		"record_value2", `logName: projects/${programData.projectId}/logs/${programData.programName}`, String,
		"record_value3", `resource: ${JSON.stringify(logMetadata.resource)}`, String,
		"record_value4", `severity: ${logMetadata.severity}`, String,
		"record_value5", `details: see Google Cloud Logging (insertId is in the TRACE_ID column)`, String,
		"record_message", `message: see Google Cloud Logging (insertId is in the TRACE_ID column)`, String,
		"record_note", logNote, String,
		"edit_by", programData.programName, String,
		"edit_time", current_time, Date
	];

	let program_status_param_lst = [
		"trace_id", logMetadata.insertId, String,
		"severity", severity, String,
		"log_time", current_time, Date,
		"record_note", logNote, String,
		"edit_by", programData.programName, String,
		"edit_time", current_time, Date,
		"program_name", rogramData.programName, String,
		"app_id", programData.projectId, String
	];

	return {
		system_log_params: system_log_param_lst,
		program_status_params: program_status_param_lst
	};
}


function makeHostStatusLogParams(programData, systemHealthTraceRecord) {

	let host_status_param_lst = [
		"HOST_IP", systemHealthTraceRecord.host_IP, String,
		"PORT", systemHealthTraceRecord.port, String,
		"STATUS", systemHealthTraceRecord.system_status, String,
		"EDIT_BY", programData.programName, String,
		"TRACE_ID", systemHealthTraceRecord.trace_ID, String,
		"INPUT_MESSAGE", systemHealthTraceRecord.message, String,
		"LATENCY", systemHealthTraceRecord.latency, Number,
		
	];

	return {
		host_status_log_params: host_status_param_lst
	}
    	
}



class MSSQLDBLogger extends DBLogger {

	static __DB_TYPE_MAP = {
		"String": sql.VarChar,
		"Date": sql.DateTime,
		"Number": sql.Float
	};

	static db_type_map(js_type) {
		return MSSQLDBLogger.__DB_TYPE_MAP[js_type.name];
	}

	constructor(connectionConfigFileName, loggerStateManager=new LoggerStateManager()) {
		super();
    }

	async client_run(job) {
		var poolConnection = await sql.connect(this._connectionConfig);

		await job(poolConnection);

		poolConnection.close();
	}

	async transact(dbClient, job) {
		const transaction = new sql.Transaction(dbClient);
		try {
			await transaction.begin();
			await job(transaction);
			await transaction.commit();
		} catch (err) {
			await transaction.rollback();
			throw err;
		}
	}

	build_request(db_request, params) {
		let params = params_collection.system_log_params;
		let pnames = new Array(Math.floor(params.length / 3));
		for (let i = 0; i < pnames.length; ++i) {
			let j = 3*i;
			db_request = db_request.input(params[j], MSSQLDBLogger.db_type_map(params[j+2]), params[j+1]);
			pnames[i] = params[j];
		}
		return {
			request: db_request,
			param_names: pnames
		};
	}

	async writeLogEntry(dbClient, programData, logMetadata, logNote) {

		this.transact(dbClient, async (transaction) => {

			const params_collection = makeLogEntryParams(programData, logMetadata, logNote);
			
			let builder = this.build_request(transaction.request(), params_collection.system_log_params);
			let pnames = builder.param_names;
			const insert_result = await builder.request.query(
				`INSERT INTO [APPLICATIONS].[TB_CENTRAL_SYSTEM_LOG]
				SELECT @${pnames[0]}, @${pnames[1]}, @${pnames[2]}, @${pnames[3]}, @${pnames[4]}, @${pnames[5]}, @${pnames[6]}, @${pnames[7]}, @${pnames[8]}, @${pnames[9]}, @${pnames[10]}, @${pnames[11]}, @${pnames[12]}, @${pnames[13]}, @${pnames[14]}`
			);

			if (severity != DBLogger.SEVERITY_MAPPER.NOTE) {
				builder = this.build_request(transaction.request(), params_collection.program_status_params);
				pnames = builder.param_names;
				const status_result = await builder.request.query(
					`UPDATE APPLICATIONS.TB_PROGRAM_STATUS
					SET LAST_TRACE_ID=@${pnames[0]}, PROGRAM_STATUS=@${pnames[1]}, LAST_LOG_TIME=@${pnames[2]}, NOTES=@${pnames[3]}, EDIT_BY=@${pnames[4]}, EDIT_TIME=@${pnames[5]}
					WHERE PROGRAM_ID=@${pnames[6]} AND APP_ID=@${pnames[7]}`
				);
			}
		
		});

	}

	async writeHostStatusLog(dbClient, programData, systemHealthTraceRecord) {

		this.transact(dbClient, async (transaction) => {
			const params_collection = makeHostStatusLogParams();
			let builder = this.build_request(transaction.request(), params_collection.host_status_log_params);
			let pnames = builder.param_names; 
			const status_result = await builder.request.query(
				`EXEC NETWORK.UPDATE_HOST_STATUS @${pnames[0]}, @${pnames[1]}, @${pnames[2]}, @${pnames[3]}, @${pnames[4]}, @${pnames[5]}, @${pnames[6]}`
			);

			await transaction.commit();
		});
	}

}



class PGDBLogger extends DBLogger {
	constructor(connectionConfigFileName, loggerStateManager=new LoggerStateManager()) {
		super();
    }

	async client_run(job) {
		let client = new pg.Client(this._connectionConfig);
		let DBConnection = await client.connect(this._connectionConfig);

		await job(DBConnection);

		DBConnection.end();
	}
}


exports.DBLogger = DBLogger;
exports.MSSQLDBLogger = MSSQLDBLogger;
exports.PGDBLogger = PGDBLogger;
//module.exports = DBLogger;


/*
console.log("Starting...");
//connectAndQuery();

async function connectAndQuery() {
    try {
        var poolConnection = await sql.connect(config);

        console.log("Reading rows from the Table...");
        var resultSet = await poolConnection.request().query(`SELECT TOP 20 * 
            FROM [APPLICATIONS].[TB_CENTRAL_SYSTEM_LOG] lg`);

        console.log(`${resultSet.recordset.length} rows returned.`);

        // output column headers
        var columns = "";
        for (var column in resultSet.recordset.columns) {
            columns += column + ", ";
        }
        console.log("%s\t", columns.substring(0, columns.length - 2));

        // ouput row contents from default record set
        resultSet.recordset.forEach(row => {
            console.log(row.RECORD_VALUE4);
        });

        // close connection only when we're certain application is finished
        poolConnection.close();
    } catch (err) {
        console.error(err.message);
    }
}


connectAndQuery();
*/
