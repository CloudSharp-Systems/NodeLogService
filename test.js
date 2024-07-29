const GCPLogger = require("./gcp_logging");
const CONFIG = require("./config.json");

var logger = new GCPLogger(CONFIG.projectId, "credentials/gcp_service_account_secrets.json", CONFIG.taskName);

const metadata = {
	labels: { log_type: CONFIG.gcpConfig.log_type },
	resource: {
		labels: { ...CONFIG.gcpConfig, project_id: CONFIG.projectId },
		type: "gce_instance"
	},
	// See: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logsev>
        severity: "INFO",
};
const text = "Module log test.";

logger.writeLogEntry(CONFIG.taskName, metadata, text);
