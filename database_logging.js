const sql = require("mssql");
const uuid = require("uuid");
const os = require("os");
const fs = require('node:fs');
const LoggerStateManager = require("./logger_state_manager");



class DBLogger {

	static #SEVERITY_MAPPER = {
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

	// job is an async function with database actions taking in a SQL connection client as parameter.
	async client_run(job) {
		var poolConnection = await sql.connect(this._connectionConfig);

		await job(poolConnection);

		poolConnection.close();
	}

	// programData must satisfy the prototype { projectId: string, programName: string, programType: string }
	// logMetadata must satisfy the prototype { insertId: string, severity: string, resource: object }
        async writeLogEntry(dbClient, programData, logMetadata, logNote) {

		const current_time = new Date();
		const formatted_time = current_time.toISOString()
                	.replace(/-/g, '')
                	.replace(/:/g, '')
                	.replace('T', '')
                	.split('.')[0];

		const result = await dbClient.request()
				.input("log_id", sql.VarChar, `${formatted_time}_${uuid.v4()}`)
				.input("app_id", sql.VarChar, programData.projectId)
				.input("system_name", sql.VarChar, os.hostname())
				.input("trace_id", sql.VarChar, logMetadata.insertId)
				.input("record_type", sql.VarChar, DBLogger.#SEVERITY_MAPPER[logMetadata.severity])
				.input("record_key", sql.VarChar, programData.programType)
				.input("record_value1", sql.VarChar, `program: ${programData.programName}`)
				.input("record_value2", sql.VarChar, `logName: projects/${programData.projectId}/logs/${programData.programName}`)
				.input("record_value3", sql.VarChar, `resource: ${JSON.stringify(logMetadata.resource)}`)
				.input("record_value4", sql.VarChar, `severity: ${logMetadata.severity}`)
				.input("record_value5", sql.VarChar, `details: see Google Cloud Logging (insertId is in the TRACE_ID column)`)
				.input("record_message", sql.VarChar, `message: see Google Cloud Logging (insertId is in the TRACE_ID column)`)
				.input("record_note", sql.VarChar, logNote)
				.input("edit_by", sql.VarChar, programData.programName)
				.input("edit_time", sql.DateTime, current_time)
				.query(`INSERT INTO [APPLICATIONS].[TB_CENTRAL_SYSTEM_LOG]
					SELECT @log_id, @app_id, @system_name, @trace_id, @record_type, @record_key, @record_value1, @record_value2, @record_value3, @record_value4, @record_value5, @record_message, @record_note, @edit_by, @edit_time`);
        }


}


module.exports = DBLogger;


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