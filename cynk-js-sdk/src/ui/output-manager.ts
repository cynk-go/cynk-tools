import { createWriteStream, WriteStream, promises as fs } from 'fs';
import {  dirname } from 'path';
import { Writable } from 'stream';
import { Colorizer } from './colors';

export type OutputLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type OutputContext = 'cli' | 'api' | 'build' | 'security' | 'upload' | 'validation';

export interface OutputContextConfig {
  prefix?: string;
  color?: string;
  timestamp?: boolean;
  level?: OutputLevel;
}

export interface OutputManagerOptions {
  defaultLevel?: OutputLevel;
  logFile?: string;
  maxLogSize?: number;
  maxLogFiles?: number;
  enableColors?: boolean;
  timestampFormat?: string;
  contexts?: Record<OutputContext, OutputContextConfig>;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: OutputContext;
  data?: any;
  error?: Error;
}

class OutputManager {
  private outputLevel: OutputLevel;
  private logStream?: WriteStream;
  private logFile?: string;
  private maxLogSize: number;
  private maxLogFiles: number;
  private enableColors: boolean;
  private timestampFormat: string;
  private contexts: Map<OutputContext, OutputContextConfig>;
  private customStreams: Writable[] = [];

  constructor(options: OutputManagerOptions = {}) {
    this.outputLevel = options.defaultLevel || 'info';
    this.logFile = options.logFile;
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024;
    this.maxLogFiles = options.maxLogFiles || 5;
    this.enableColors = options.enableColors ?? true;
    this.timestampFormat = options.timestampFormat || 'YYYY-MM-DD HH:mm:ss';
    this.contexts = new Map(Object.entries(options.contexts || {}) as [OutputContext, OutputContextConfig][]);

    this.initializeLogStream();
  }

  setOutputLevel(level: OutputLevel): void {
    this.outputLevel = level;
  }

  getOutputLevel(): OutputLevel {
    return this.outputLevel;
  }

  log(message: string, level: LogLevel = 'info', context?: OutputContext): void {
    if (!this.shouldOutput(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context
    };

    const formattedMessage = this.formatOutput(message, { level, context });
    console.log(formattedMessage);

    this.writeToLog(logEntry);
    this.writeToCustomStreams(logEntry);
  }

  error(message: string, error?: Error, context?: OutputContext): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      message,
      context,
      error
    };

    if (this.shouldOutput('error')) {
      const formattedMessage = this.formatOutput(message, { level: 'error', context, error });
      console.error(formattedMessage);

      if (error && this.outputLevel === 'verbose') {
        console.error(this.formatOutput(error.stack || error.message, { level: 'error', context }));
      }
    }

    this.writeToLog(logEntry);
    this.writeToCustomStreams(logEntry);
  }

  warn(message: string, context?: OutputContext): void {
    this.log(message, 'warn', context);
  }

  info(message: string, context?: OutputContext): void {
    this.log(message, 'info', context);
  }

  debug(message: string, data?: any, context?: OutputContext): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: 'debug',
      message,
      context,
      data
    };

    if (this.shouldOutput('debug')) {
      const formattedMessage = this.formatOutput(message, { level: 'debug', context });
      console.log(formattedMessage);

      if (data && this.outputLevel === 'verbose') {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        console.log(this.formatOutput(dataStr, { level: 'debug', context }));
      }
    }

    this.writeToLog(logEntry);
    this.writeToCustomStreams(logEntry);
  }

  redirectOutput(logFile: string): void {
    this.closeLogStream();
    this.logFile = logFile;
    this.initializeLogStream();
  }

  formatOutput(message: string, context: { level?: LogLevel; context?: OutputContext; error?: Error }): string {
    const { level = 'info', context: outputContext } = context;
    const contextConfig = outputContext ? this.contexts.get(outputContext) : undefined;

    let formatted = '';

    if (contextConfig?.timestamp ?? true) {
      const timestamp = this.formatTimestamp(new Date());
      formatted += this.enableColors ? 
        Colorizer.colorize(`[${timestamp}]`, 'gray') : 
        `[${timestamp}]`;
    }

    if (contextConfig?.prefix) {
      const prefix = contextConfig.prefix;
      const color = contextConfig.color || this.getLevelColor(level);
      formatted += this.enableColors ? 
        Colorizer.colorize(`[${prefix}]`, color as any) : 
        `[${prefix}]`;
    } else if (outputContext) {
      const color = contextConfig?.color || this.getLevelColor(level);
      formatted += this.enableColors ? 
        Colorizer.colorize(`[${outputContext}]`, color as any) : 
        `[${outputContext}]`;
    }

    const levelColor = this.getLevelColor(level);
    const levelText = level.toUpperCase().padEnd(5);
    formatted += this.enableColors ? 
      Colorizer.colorize(`[${levelText}]`, levelColor as any) : 
      `[${levelText}]`;

    const messageColor = this.getMessageColor(level);
    formatted += this.enableColors ? 
      Colorizer.colorize(` ${message}`, messageColor as any) : 
      ` ${message}`;

    return formatted;
  }

  addCustomStream(stream: Writable): void {
    this.customStreams.push(stream);
  }

  removeCustomStream(stream: Writable): boolean {
    const index = this.customStreams.indexOf(stream);
    if (index > -1) {
      this.customStreams.splice(index, 1);
      return true;
    }
    return false;
  }

  setContextConfig(context: OutputContext, config: OutputContextConfig): void {
    this.contexts.set(context, config);
  }

  getContextConfig(context: OutputContext): OutputContextConfig | undefined {
    return this.contexts.get(context);
  }

  async rotateLogs(): Promise<void> {
    if (!this.logFile) return;

    try {
      const stats = await fs.stat(this.logFile);
      if (stats.size >= this.maxLogSize) {
        await this.performLogRotation();
      }
    } catch {
    }
  }

  close(): void {
    this.closeLogStream();
    this.customStreams = [];
  }

  private shouldOutput(level: LogLevel): boolean {
    const levelPriority: Record<OutputLevel, number> = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      verbose: 5
    };

    const levelMap: Record<LogLevel, OutputLevel> = {
      error: 'error',
      warn: 'warn',
      info: 'info',
      debug: 'debug'
    };

    const currentPriority = levelPriority[this.outputLevel];
    const messagePriority = levelPriority[levelMap[level]];

    return messagePriority <= currentPriority;
  }

  private initializeLogStream(): void {
    if (!this.logFile) return;

    try {
      fs.mkdir(dirname(this.logFile), { recursive: true }).then(() => {
        this.logStream = createWriteStream(this.logFile, { 
          flags: 'a',
          encoding: 'utf8'
        });
      }).catch(() => {});
    } catch {
    }
  }

  private closeLogStream(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = undefined;
    }
  }

  private writeToLog(entry: LogEntry): void {
    if (!this.logStream) return;

    const logLine = this.formatLogEntry(entry);
    this.logStream.write(logLine + '\n');

    this.rotateLogs().catch(() => {});
  }

  private writeToCustomStreams(entry: LogEntry): void {
    const logLine = this.formatLogEntry(entry) + '\n';
    
    for (const stream of this.customStreams) {
      if (stream.writable) {
        stream.write(logLine);
      }
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const level = entry.level.toUpperCase();
    const context = entry.context ? ` [${entry.context}]` : '';
    const message = entry.message.replace(/\n/g, '\\n');
    
    let logLine = `[${timestamp}] [${level}]${context} ${message}`;

    if (entry.error) {
      const errorStack = entry.error.stack || entry.error.message;
      logLine += ` | Error: ${errorStack.replace(/\n/g, '\\n')}`;
    }

    if (entry.data) {
      const dataStr = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
      logLine += ` | Data: ${dataStr.replace(/\n/g, '\\n')}`;
    }

    return logLine;
  }

  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return this.timestampFormat
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      error: 'red',
      warn: 'yellow',
      info: 'blue',
      debug: 'cyan'
    };
    return colors[level];
  }

  private getMessageColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      error: 'white',
      warn: 'white',
      info: 'white',
      debug: 'gray'
    };
    return colors[level];
  }

  private async performLogRotation(): Promise<void> {
    if (!this.logFile) return;

    try {
      for (let i = this.maxLogFiles - 1; i > 0; i--) {
        const oldFile = `${this.logFile}.${i}`;
        const newFile = `${this.logFile}.${i + 1}`;
        
        try {
          await fs.access(oldFile);
          await fs.rename(oldFile, newFile);
        } catch {
        }
      }

      const firstBackup = `${this.logFile}.1`;
      await fs.rename(this.logFile, firstBackup);

      this.closeLogStream();
      this.initializeLogStream();
    } catch {
    }
  }
}

export class OutputBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  private enabled: boolean = true;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  write(message: string): void {
    if (!this.enabled) return;

    this.buffer.push(message);
    
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  readAll(): string[] {
    return [...this.buffer];
  }

  readLast(count: number): string[] {
    return this.buffer.slice(-count);
  }

  clear(): void {
    this.buffer = [];
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getSize(): number {
    return this.buffer.length;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export class MultiOutputManager {
  private managers: Map<string, OutputManager> = new Map();
  private defaultManager: OutputManager;

  constructor(defaultOptions: OutputManagerOptions = {}) {
    this.defaultManager = new OutputManager(defaultOptions);
  }

  createManager(name: string, options?: OutputManagerOptions): OutputManager {
    const manager = new OutputManager(options);
    this.managers.set(name, manager);
    return manager;
  }

  getManager(name: string): OutputManager | undefined {
    return this.managers.get(name);
  }

  removeManager(name: string): boolean {
    const manager = this.managers.get(name);
    if (manager) {
      manager.close();
      return this.managers.delete(name);
    }
    return false;
  }

  broadcast(message: string, level: LogLevel = 'info', context?: OutputContext): void {
    this.defaultManager.log(message, level, context);
    
    for (const manager of this.managers.values()) {
      manager.log(message, level, context);
    }
  }

  broadcastError(message: string, error?: Error, context?: OutputContext): void {
    this.defaultManager.error(message, error, context);
    
    for (const manager of this.managers.values()) {
      manager.error(message, error, context);
    }
  }

  setAllLevels(level: OutputLevel): void {
    this.defaultManager.setOutputLevel(level);
    
    for (const manager of this.managers.values()) {
      manager.setOutputLevel(level);
    }
  }

  getAllManagers(): OutputManager[] {
    return [this.defaultManager, ...Array.from(this.managers.values())];
  }

  closeAll(): void {
    this.defaultManager.close();
    
    for (const manager of this.managers.values()) {
      manager.close();
    }
    
    this.managers.clear();
  }
}

export class LogAnalyzer {
  static analyzeLogEntries(entries: LogEntry[]): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byContext: Record<string, number>;
    errorRate: number;
    timeRange: { start: Date; end: Date };
    mostFrequentMessages: Array<{ message: string; count: number }>;
  } {
    if (entries.length === 0) {
      return {
        total: 0,
        byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
        byContext: {},
        errorRate: 0,
        timeRange: { start: new Date(), end: new Date() },
        mostFrequentMessages: []
      };
    }

    const byLevel: Record<LogLevel, number> = { error: 0, warn: 0, info: 0, debug: 0 };
    const byContext: Record<string, number> = {};
    const messageCounts: Record<string, number> = {};
    
    let errorCount = 0;
    let startTime = entries[0].timestamp;
    let endTime = entries[0].timestamp;

    for (const entry of entries) {
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
      
      if (entry.context) {
        byContext[entry.context] = (byContext[entry.context] || 0) + 1;
      }
      
      if (entry.level === 'error') {
        errorCount++;
      }
      
      if (entry.timestamp < startTime) startTime = entry.timestamp;
      if (entry.timestamp > endTime) endTime = entry.timestamp;
      
      const messageKey = entry.message.substring(0, 100);
      messageCounts[messageKey] = (messageCounts[messageKey] || 0) + 1;
    }

    const errorRate = (errorCount / entries.length) * 100;
    
    const mostFrequentMessages = Object.entries(messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    return {
      total: entries.length,
      byLevel,
      byContext,
      errorRate,
      timeRange: { start: startTime, end: endTime },
      mostFrequentMessages
    };
  }

  static filterLogEntries(entries: LogEntry[], filters: {
    level?: LogLevel | LogLevel[];
    context?: OutputContext | OutputContext[];
    startTime?: Date;
    endTime?: Date;
    search?: string;
  }): LogEntry[] {
    return entries.filter(entry => {
      if (filters.level) {
        const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
        if (!levels.includes(entry.level)) return false;
      }
      
      if (filters.context) {
        const contexts = Array.isArray(filters.context) ? filters.context : [filters.context];
        if (!entry.context || !contexts.includes(entry.context)) return false;
      }
      
      if (filters.startTime && entry.timestamp < filters.startTime) return false;
      if (filters.endTime && entry.timestamp > filters.endTime) return false;
      
      if (filters.search && !entry.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }
}

export const outputManager = new OutputManager();
export const outputBuffer = new OutputBuffer();
export const multiOutputManager = new MultiOutputManager();

export function setOutputLevel(level: OutputLevel): void {
  outputManager.setOutputLevel(level);
}

export function log(message: string, level?: LogLevel, context?: OutputContext): void {
  outputManager.log(message, level, context);
}

export function error(message: string, error?: Error, context?: OutputContext): void {
  outputManager.error(message, error, context);
}

export function warn(message: string, context?: OutputContext): void {
  outputManager.warn(message, context);
}

export function info(message: string, context?: OutputContext): void {
  outputManager.info(message, context);
}

export function debug(message: string, data?: any, context?: OutputContext): void {
  outputManager.debug(message, data, context);
}

export function redirectOutput(logFile: string): void {
  outputManager.redirectOutput(logFile);
}

export function formatOutput(message: string, context: { level?: LogLevel; context?: OutputContext; error?: Error }): string {
  return outputManager.formatOutput(message, context);
}

export const OutputLevels: Record<OutputLevel, OutputLevel> = {
  silent: 'silent',
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  verbose: 'verbose'
};

export const LogLevels: Record<LogLevel, LogLevel> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug'
};

export const DefaultContexts: Record<OutputContext, OutputContextConfig> = {
  cli: { prefix: 'CLI', color: 'brightBlue', timestamp: true },
  api: { prefix: 'API', color: 'magenta', timestamp: true },
  build: { prefix: 'BUILD', color: 'yellow', timestamp: true },
  security: { prefix: 'SECURITY', color: 'red', timestamp: true },
  upload: { prefix: 'UPLOAD', color: 'cyan', timestamp: true },
  validation: { prefix: 'VALIDATION', color: 'green', timestamp: true }
};