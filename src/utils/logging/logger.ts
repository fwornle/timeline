import { LogLevel, LogLevelColor, isLogLevelEnabled, type LogTopic, type LogEntry } from './types';

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private isDevelopment = import.meta.env.DEV;

  public setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private formatMessage({ level, topic, message, timestamp, data, component }: LogEntry): [string, string] {
    const time = timestamp.toISOString().split('T')[1].split('.')[0];
    const color = LogLevelColor[level];
    const prefix = component
      ? `[${time}][${level}][${topic}][${component}]`
      : `[${time}][${level}][${topic}]`;
    
    const formattedMessage = data
      ? `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`
      : `${prefix} ${message}`;

    return [formattedMessage, color];
  }

  private log(logMessage: LogEntry) {
    if (!isLogLevelEnabled(this.minLevel, logMessage.level)) {
      return;
    }

    const [formattedMessage, color] = this.formatMessage(logMessage);
    const style = `color: ${color}; font-weight: bold`;

    if (logMessage.level === LogLevel.ERROR) {
      console.error(`%c${formattedMessage}`, style);
    } else if (logMessage.level === LogLevel.WARN) {
      console.warn(`%c${formattedMessage}`, style);
    } else {
      console.log(`%c${formattedMessage}`, style);
    }
  }

  public debug(topic: LogTopic, message: string, data?: unknown, component?: string) {
    if (!this.isDevelopment) return;
    this.log({ level: LogLevel.DEBUG, topic, message, timestamp: new Date(), data, component });
  }

  public info(topic: LogTopic, message: string, data?: unknown, component?: string) {
    this.log({ level: LogLevel.INFO, topic, message, timestamp: new Date(), data, component });
  }

  public warn(topic: LogTopic, message: string, data?: unknown, component?: string) {
    this.log({ level: LogLevel.WARN, topic, message, timestamp: new Date(), data, component });
  }

  public error(topic: LogTopic, message: string, data?: unknown, component?: string) {
    this.log({ level: LogLevel.ERROR, topic, message, timestamp: new Date(), data, component });
  }
}

export const logger = new Logger();