//const GCPLogger = require("./gcp_logging");
const CONFIG = require("./config.json");

//var testStr = "./credentials/mssql_connection_config.json";
//const MSSQL_CRED = require(testStr);
//const { get_new_hash_id } = require("./hash_id");
//const uuid = require('uuid');
//const LoggerStateManager = require("./logger_state_manager");
//const DBLogger = require("./database_logging");

const PipelinedLogger = require("./pipelined_logging");


/*
const current_time = new Date();
console.log(
	current_time.toISOString()
		.replace(/-/g, '')
		.replace(/:/g, '')
		.replace('T', '')
		.split('.')[0]
);

console.log("Unique ID: ", uuid.v4());
*/

//const loggerStateManager = new LoggerStateManager();
//loggerStateManager.setState("testProperty", new Date());
//console.log(loggerStateManager.getState("testProperty"));
//console.log(loggerStateManager.getState("noneExist") || "Wrap")
//loggerStateManager.clearStates();

//const ID = get_new_hash_id("TestNPM");
//console.log(ID);

/*
const run = async() => {
	const loggerStateManager = new LoggerStateManager();

	const GCPProgramData = { projectId: CONFIG.projectId.GCP, programName: CONFIG.programName, programType: CONFIG.programType };
	var gcp_logger = new GCPLogger(GCPProgramData, "credentials/gcp_service_account_secrets.json", loggerStateManager);
	const metadata = {
		labels: { log_type: CONFIG.gcpLogConfig.log_type },
		resource: {
			labels: { ...CONFIG.gcpLogConfig, project_id: GCPProgramData.projectId },
			type: "gce_instance"
		},
		// See: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logsev>
        	severity: "INFO",
	};
	const text = `Module log test with DB. ${new Date()}`;
	await gcp_logger.writeLogEntry(metadata, text);

	//console.log(loggerStateManager.getState(GCPLogger.LOG_METADATA_STATE));


	var db_logger = new DBLogger("credentials/mssql_connection_config.json", loggerStateManager);
	const SQLDBProgramData = { projectId: CONFIG.projectId.SQLDB, programName: CONFIG.programName, programType: CONFIG.programType };
	await db_logger.client_run(async (dbClient) => {
		await db_logger.writeLogEntry(dbClient, SQLDBProgramData, loggerStateManager.getState(GCPLogger.LOG_METADATA_STATE), "test log, inconsequential.");
	});

	loggerStateManager.clearStates();
}


run();
*/

credentials = {
	GCP: "credentials/gcp_service_account_secrets.json",
	SQLDB: "credentials/mssql_connection_config.json"
};
var pipelinedLogger = new PipelinedLogger(CONFIG, credentials);


const metadata = {
	labels: { log_type: CONFIG.gcpLogConfig.log_type },
	resource: {
		labels: { ...CONFIG.gcpLogConfig, project_id: CONFIG.projectId.GCP },
		type: "gce_instance"
        },
        // See: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logsev>
        severity: "INFO",
};

var log = {
	metadata: metadata,
	content: `Logged with pipelined logger. ${new Date()}.`,
	note: "Test pipelined logging, inconsequential."
};
pipelinedLogger.writeLogEntry(log);
