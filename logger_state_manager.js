


class LoggerStateManager {

	constructor() {
		this.clearStates();
	}

	setState(propertyName, propertyValue) {
		this._loggerStates[propertyName] = propertyValue;
	}

	getState(propertyName) {
		return this._loggerStates[propertyName];
	}

	clearStates() {
		this._loggerStates = {};
	}

}



module.exports = LoggerStateManager;
