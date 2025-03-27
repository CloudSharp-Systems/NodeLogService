//const GCPLogger = require("./gcp_logging");
const CONFIG = require("./config.json");


const PipelinedLogger = require("./pipelined_logging");

credentials = {
	GCP: "credentials/gcp_service_account_secrets.json",
	SQLDB: "credentials/mssql_connection_config.json",
	COCKROACHDB: "credentials/cockroachdb_connection_config.json",
	SITEDB: "credentials/mssql_connection_config.json"
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

const mockSystemHealthTraceRecord = {
	host_IP: "CloudSharp-Mongo",
	port: "27017",
	system_status: "NORMAL",
	trace_ID: `CloudSharpWebMonitor_CloudSharp-Mongo_${new Date()}`,
	message: "MOCK get success - 200",
	latency: 6.389
};

var log = {
	metadata: metadata,
	content: `Test logged with host status update. ${new Date()}.`,
	note: "Test pipelined logging, inconsequential.",
	systemHealthTraceRecord: mockSystemHealthTraceRecord
};
pipelinedLogger.writeLogEntry(log);
