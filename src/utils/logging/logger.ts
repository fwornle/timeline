/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  component: string;
  topic: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  storageKey: string;
  maxEntries: number;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  storageKey: 'timeline-logs',
  maxEntries: 1000,
};

/**
 * Simple logger implementation
 */
class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Log a debug message
   */
  debug(topic: string, message: string, data?: Record<string, any>) {
    this.log(LogLevel.DEBUG, 'app', topic, message, data);
  }

  /**
   * Log an info message
   */
  info(topic: string, message: string, data?: Record<string, any>) {
    this.log(LogLevel.INFO, 'app', topic, message, data);
  }

  /**
   * Log a warning message
   */
  warn(topic: string, message: string, data?: Record<string, any>) {
    this.log(LogLevel.WARN, 'app', topic, message, data);
  }

  /**
   * Log an error message
   */
  error(topic: string, message: string, data?: Record<string, any>) {
    this.log(LogLevel.ERROR, 'app', topic, message, data);
  }

  /**
   * Log a message with component context
   */
  log(
    level: LogLevel,
    component: string,
    topic: string,
    message: string,
    data?: Record<string, any>
  ) {
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      component,
      topic,
      message,
      data,
      timestamp: new Date(),
    };

    this.entries.push(entry);

    // Trim log if it exceeds max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Log to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Save to storage if enabled
    if (this.config.enableStorage) {
      this.saveToStorage();
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all log entries
   */
  clear() {
    this.entries = [];
    if (this.config.enableStorage) {
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [${entry.component}:${entry.topic}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.entries)
      );
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as LogEntry[];
        this.entries = parsed.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
