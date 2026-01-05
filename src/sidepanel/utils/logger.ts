/**
 * Centralized logging utility
 */

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private listeners: Array<(entry: LogEntry) => void> = [];

  /**
   * Log a message
   */
  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console in development
    const consoleMethod = level === LogLevel.ERROR ? 'error' : level === LogLevel.WARN ? 'warn' : 'log';
    console[consoleMethod](`[${level}] ${message}`, data);

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));
  }

  debug(message: string, data?: unknown) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: unknown) {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Get all logged entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Subscribe to log events
   */
  subscribe(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Set max number of logs to keep
   */
  setMaxLogs(max: number) {
    this.maxLogs = max;
  }
}

export const logger = new Logger();
