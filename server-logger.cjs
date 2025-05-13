const path = require('path');

const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

class ServerLogger {
    constructor() {
        this.minLevel = LogLevel.DEBUG;
    }

    formatMessage(level, topic, message, data, component) {
        const time = new Date().toISOString();
        const prefix = component
            ? `[${time}][${level}][${topic}][${component}]`
            : `[${time}][${level}][${topic}]`;
        
        const formattedMessage = data
            ? `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`
            : `${prefix} ${message}`;

        return formattedMessage;
    }

    log(level, topic, message, data, component) {
        const formattedMessage = this.formatMessage(level, topic, message, data, component);
        
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    debug(topic, message, data, component) {
        this.log(LogLevel.DEBUG, topic, message, data, component);
    }

    info(topic, message, data, component) {
        this.log(LogLevel.INFO, topic, message, data, component);
    }

    warn(topic, message, data, component) {
        this.log(LogLevel.WARN, topic, message, data, component);
    }

    error(topic, message, data, component) {
        this.log(LogLevel.ERROR, topic, message, data, component);
    }
}

module.exports = {
    logger: new ServerLogger(),
    LogLevel
};