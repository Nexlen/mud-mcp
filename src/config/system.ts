// filepath: c:\src\mud-mcp\src\config\system.ts
import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * System configuration settings for the MCP server
 */
export interface SystemConfig {
  /**
   * Logging configuration
   */
  logging: {
    /**
     * Directory where log files will be stored
     */
    logDirectory: string;
    
    /**
     * Enable or disable logging
     */
    enabled: boolean;
    
    /**
     * Log level (error, warn, info, debug)
     */
    level: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Default system configuration
 */
export const systemConfig: SystemConfig = {
  logging: {
    // By default, logs go to a logs directory in the project root
    logDirectory: path.join(process.cwd(), 'logs'),
    enabled: true,
    level: 'info',
  }
};

/**
 * Get the full path to a log file
 * @param filename The name of the log file
 * @returns The full path to the log file
 */
export function getLogFilePath(filename: string): string {
  return path.join(systemConfig.logging.logDirectory, filename);
}

/**
 * Initialize the logging system
 */
export function initializeLogging(): void {
  // Ensure log directory exists
  if (!fs.existsSync(systemConfig.logging.logDirectory)) {
    fs.mkdirSync(systemConfig.logging.logDirectory, { recursive: true });
  }
}

/**
 * Write a log message to a file
 * @param message The message to log
 * @param logFile The name of the log file
 */
export function logToFile(message: string, logFile: string): void {
  // Skip logging if disabled in configuration
  if (!systemConfig.logging.enabled) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  const logPath = getLogFilePath(logFile);

  fs.appendFile(logPath, logMessage, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}