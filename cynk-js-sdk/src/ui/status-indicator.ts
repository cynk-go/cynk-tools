import { promises as fs } from 'fs';
import { dirname } from 'path';
import { Colorizer } from './colors';
import { Check, AlertTriangle, X, Info, MoreHorizontal, CheckCheck, XCircle, SkipForward } from 'lucide-node';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'complete' | 'failed' | 'skipped';

export interface Status {
  id: string;
  message: string;
  type: StatusType;
  timestamp: number;
  duration?: number;
  progress?: number;
  details?: string;
  metadata?: Record<string, any>;
}

export interface StatusOptions {
  showTimestamp?: boolean;
  showDuration?: boolean;
  showProgress?: boolean;
  showDetails?: boolean;
  persistent?: boolean;
  updateInterval?: number;
  maxHistory?: number;
}

export interface StatusManagerOptions {
  autoSave?: boolean;
  saveInterval?: number;
  maxStatusHistory?: number;
  logFile?: string;
}

class StatusIndicator {
  private static readonly STATUS_ICONS: Record<StatusType, any> = {
    success: Check,
    warning: AlertTriangle,
    error: X,
    info: Info,
    pending: MoreHorizontal,
    complete: CheckCheck,
    failed: XCircle,
    skipped: SkipForward
  };

  private static readonly STATUS_COLORS: Record<StatusType, string> = {
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    pending: 'cyan',
    complete: 'green',
    failed: 'red',
    skipped: 'gray'
  };

  createStatus(message: string, type: StatusType = 'info'): Status {
    return {
      id: this.generateId(),
      message,
      type,
      timestamp: Date.now(),
      metadata: {}
    };
  }

  updateStatus(status: Status, message: string, type?: StatusType): void {
    status.message = message;
    if (type) {
      status.type = type;
    }
    status.timestamp = Date.now();
  }

  showSuccess(message: string, details?: string): Status {
    const status = this.createStatus(message, 'success');
    if (details) {
      status.details = details;
    }
    this.renderStatus(status);
    return status;
  }

  showWarning(message: string, details?: string): Status {
    const status = this.createStatus(message, 'warning');
    if (details) {
      status.details = details;
    }
    this.renderStatus(status);
    return status;
  }

  showError(message: string, details?: string): Status {
    const status = this.createStatus(message, 'error');
    if (details) {
      status.details = details;
    }
    this.renderStatus(status);
    return status;
  }

  showInfo(message: string, details?: string): Status {
    const status = this.createStatus(message, 'info');
    if (details) {
      status.details = details;
    }
    this.renderStatus(status);
    return status;
  }

  showPending(message: string, progress?: number): Status {
    const status = this.createStatus(message, 'pending');
    if (progress !== undefined) {
      status.progress = progress;
    }
    this.renderStatus(status);
    return status;
  }

  persistStatus(status: Status, logFile: string): void {
    const logEntry = this.formatLogEntry(status);
    fs.appendFile(logFile, logEntry + '\n').catch(() => {});
  }

  private renderStatus(status: Status, options: StatusOptions = {}): void {
    const {
      showTimestamp = false,
      showDuration = false,
      showProgress = false,
      showDetails = true
    } = options;

    const IconComponent = StatusIndicator.STATUS_ICONS[status.type];
    const color = StatusIndicator.STATUS_COLORS[status.type];
    
    // Render the icon to a string
    const iconSvg = IconComponent.toString();
    const coloredIcon = Colorizer.colorize(iconSvg, color);

    let output = `${coloredIcon} ${status.message}`;

    if (showProgress && status.progress !== undefined) {
      const progressBar = this.createProgressBar(status.progress);
      output += ` ${progressBar}`;
    }

    if (showDuration && status.duration) {
      const durationText = this.formatDuration(status.duration);
      output += Colorizer.colorize(` (${durationText})`, 'gray');
    }

    if (showTimestamp) {
      const timestamp = new Date(status.timestamp).toLocaleTimeString();
      output += Colorizer.colorize(` [${timestamp}]`, 'gray');
    }

    console.log(output);

    if (showDetails && status.details) {
      const details = Colorizer.colorize(`  ${status.details}`, 'gray');
      console.log(details);
    }
  }

  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    
    const filledBar = Colorizer.colorize('█'.repeat(filled), 'green');
    const emptyBar = Colorizer.colorize('░'.repeat(empty), 'gray');
    
    return `[${filledBar}${emptyBar}] ${progress}%`;
  }

  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private formatLogEntry(status: Status): string {
    const timestamp = new Date(status.timestamp).toISOString();
    const type = status.type.toUpperCase();
    const message = status.message;
    const details = status.details ? ` - ${status.details}` : '';
    const duration = status.duration ? ` (${this.formatDuration(status.duration)})` : '';
    const progress = status.progress ? ` [${status.progress}%]` : '';

    return `[${timestamp}] ${type}: ${message}${details}${duration}${progress}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export class StatusManager {
  private statusHistory: Status[] = [];
  private activeStatuses: Map<string, Status> = new Map();
  private options: StatusManagerOptions;
  private saveInterval?: NodeJS.Timeout;

  constructor(options: StatusManagerOptions = {}) {
    this.options = {
      autoSave: false,
      saveInterval: 30000,
      maxStatusHistory: 1000,
      ...options
    };

    if (this.options.autoSave && this.options.logFile) {
      this.startAutoSave();
    }
  }

  createStatus(message: string, type: StatusType = 'info', metadata?: Record<string, any>): Status {
    const status: Status = {
      id: this.generateId(),
      message,
      type,
      timestamp: Date.now(),
      metadata: metadata || {}
    };

    this.activeStatuses.set(status.id, status);
    this.addToHistory(status);

    return status;
  }

  updateStatus(statusId: string, updates: Partial<Omit<Status, 'id' | 'timestamp'>>): boolean {
    const status = this.activeStatuses.get(statusId);
    if (!status) {
      return false;
    }

    Object.assign(status, updates);
    status.timestamp = Date.now();

    this.addToHistory({ ...status });

    return true;
  }

  completeStatus(statusId: string, message?: string): boolean {
    return this.updateStatus(statusId, {
      type: 'complete',
      ...(message && { message })
    });
  }

  failStatus(statusId: string, message?: string, details?: string): boolean {
    return this.updateStatus(statusId, {
      type: 'failed',
      ...(message && { message }),
      ...(details && { details })
    });
  }

  getStatus(statusId: string): Status | undefined {
    return this.activeStatuses.get(statusId);
  }

  getAllActiveStatuses(): Status[] {
    return Array.from(this.activeStatuses.values());
  }

  getStatusHistory(filter?: { type?: StatusType; startTime?: number; endTime?: number }): Status[] {
    let history = this.statusHistory;

    if (filter) {
      if (filter.type) {
        history = history.filter(status => status.type === filter.type);
      }
      if (filter.startTime) {
        history = history.filter(status => status.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        history = history.filter(status => status.timestamp <= filter.endTime!);
      }
    }

    return history;
  }

  removeStatus(statusId: string): boolean {
    const status = this.activeStatuses.get(statusId);
    if (status) {
      status.duration = Date.now() - status.timestamp;
      this.addToHistory(status);
    }
    return this.activeStatuses.delete(statusId);
  }

  clearCompletedStatuses(): void {
    const completedTypes: StatusType[] = ['success', 'complete', 'failed', 'skipped'];
    
    for (const [id, status] of this.activeStatuses) {
      if (completedTypes.includes(status.type)) {
        status.duration = Date.now() - status.timestamp;
        this.addToHistory(status);
        this.activeStatuses.delete(id);
      }
    }
  }

  clearAllStatuses(): void {
    for (const [id, status] of this.activeStatuses) {
      status.duration = Date.now() - status.timestamp;
      this.addToHistory(status);
    }
    this.activeStatuses.clear();
  }

  getStatusSummary(): {
    total: number;
    active: number;
    byType: Record<StatusType, number>;
    successRate: number;
  } {
    const byType: Record<StatusType, number> = {
      success: 0,
      warning: 0,
      error: 0,
      info: 0,
      pending: 0,
      complete: 0,
      failed: 0,
      skipped: 0
    };

    let completed = 0;
    let successful = 0;

    for (const status of this.statusHistory) {
      byType[status.type] = (byType[status.type] || 0) + 1;

      if (['success', 'complete', 'failed', 'skipped'].includes(status.type)) {
        completed++;
        if (['success', 'complete'].includes(status.type)) {
          successful++;
        }
      }
    }

    const successRate = completed > 0 ? (successful / completed) * 100 : 0;

    return {
      total: this.statusHistory.length,
      active: this.activeStatuses.size,
      byType,
      successRate
    };
  }

  async saveStatusHistory(filePath?: string): Promise<void> {
    const logFile = filePath || this.options.logFile;
    if (!logFile) {
      throw new Error('No log file specified');
    }

    await fs.mkdir(dirname(logFile), { recursive: true });
    
    const logEntries = this.statusHistory.map(status => this.formatStatusForLog(status));
    const logContent = logEntries.join('\n') + '\n';
    
    await fs.writeFile(logFile, logContent, 'utf-8');
  }

  async loadStatusHistory(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const loadedStatuses: Status[] = [];
      
      for (const line of lines) {
        const status = this.parseStatusFromLog(line);
        if (status) {
          loadedStatuses.push(status);
        }
      }
      
      this.statusHistory = loadedStatuses;
    } catch (error) {
      throw new Error(`Failed to load status history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addToHistory(status: Status): void {
    this.statusHistory.push(status);
    
    if (this.statusHistory.length > (this.options.maxStatusHistory || 1000)) {
      this.statusHistory = this.statusHistory.slice(-this.options.maxStatusHistory!);
    }
  }

  private startAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    this.saveInterval = setInterval(async () => {
      if (this.options.logFile) {
        try {
          await this.saveStatusHistory();
        } catch (err) {
         console.error(err)
        }
      }
    }, this.options.saveInterval);
  }

  private formatStatusForLog(status: Status): string {
    const timestamp = new Date(status.timestamp).toISOString();
    const duration = status.duration ? `, "duration": ${status.duration}` : '';
    const progress = status.progress ? `, "progress": ${status.progress}` : '';
    const details = status.details ? `, "details": ${JSON.stringify(status.details)}` : '';
    const metadata = status.metadata ? `, "metadata": ${JSON.stringify(status.metadata)}` : '';

    return `{"id": "${status.id}", "type": "${status.type}", "message": ${JSON.stringify(status.message)}, "timestamp": "${timestamp}"${duration}${progress}${details}${metadata}}`;
  }

  private parseStatusFromLog(line: string): Status | null {
    try {
      const data = JSON.parse(line);
      
      return {
        id: data.id,
        message: data.message,
        type: data.type,
        timestamp: new Date(data.timestamp).getTime(),
        duration: data.duration,
        progress: data.progress,
        details: data.details,
        metadata: data.metadata || {}
      };
    } catch {
      return null;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.clearAllStatuses();
    this.statusHistory = [];
  }
}

export class MultiStatusIndicator {
  private statusManager: StatusManager;
  private statusIndicator: StatusIndicator;
  private groupStatuses: Map<string, Status[]> = new Map();

  constructor(options: StatusManagerOptions = {}) {
    this.statusManager = new StatusManager(options);
    this.statusIndicator = new StatusIndicator();
  }

  createStatusGroup(groupId: string): void {
    if (!this.groupStatuses.has(groupId)) {
      this.groupStatuses.set(groupId, []);
    }
  }

  addStatusToGroup(groupId: string, message: string, type: StatusType = 'info'): string {
    const status = this.statusManager.createStatus(message, type);
    const group = this.groupStatuses.get(groupId);
    
    if (group) {
      group.push(status);
    } else {
      this.groupStatuses.set(groupId, [status]);
    }

    return status.id;
  }

  updateGroupStatus(groupId: string, statusId: string, updates: Partial<Omit<Status, 'id' | 'timestamp'>>): boolean {
    return this.statusManager.updateStatus(statusId, updates);
  }

  completeGroup(groupId: string, finalMessage?: string): void {
    const group = this.groupStatuses.get(groupId);
    if (!group) return;

    for (const status of group) {
      if (status.type === 'pending') {
        this.statusManager.completeStatus(status.id, finalMessage);
      }
    }

    this.renderGroupSummary(groupId);
  }

  failGroup(groupId: string, errorMessage?: string): void {
    const group = this.groupStatuses.get(groupId);
    if (!group) return;

    for (const status of group) {
      if (status.type === 'pending') {
        this.statusManager.failStatus(status.id, errorMessage);
      }
    }

    this.renderGroupSummary(groupId);
  }

  renderGroupStatus(groupId: string): void {
    const group = this.groupStatuses.get(groupId);
    if (!group) return;

    console.log(Colorizer.colorize(`\nGroup: ${groupId}`, 'brightBlue'));
    console.log(Colorizer.colorize('─'.repeat(50), 'gray'));

    for (const status of group) {
      this.statusIndicator.showInfo(status.message, status.details);
    }

    console.log('');
  }

  renderGroupSummary(groupId: string): void {
    const group = this.groupStatuses.get(groupId);
    if (!group) return;

    const summary = this.calculateGroupSummary(group);
    
    console.log(Colorizer.colorize(`\nSummary for ${groupId}:`, 'brightBlue'));
    console.log(Colorizer.colorize('─'.repeat(50), 'gray'));
    
    console.log(`Total: ${summary.total}`);
    console.log(`Success: ${Colorizer.colorize(summary.success.toString(), 'green')}`);
    console.log(`Failed: ${Colorizer.colorize(summary.failed.toString(), 'red')}`);
    console.log(`Pending: ${Colorizer.colorize(summary.pending.toString(), 'yellow')}`);
    
    const successRate = summary.total > 0 ? (summary.success / summary.total) * 100 : 0;
    console.log(`Success Rate: ${Colorizer.colorize(successRate.toFixed(1) + '%', successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red')}`);
    
    console.log('');
  }

  private calculateGroupSummary(group: Status[]): {
    total: number;
    success: number;
    failed: number;
    pending: number;
  } {
    let success = 0;
    let failed = 0;
    let pending = 0;

    for (const status of group) {
      if (status.type === 'success' || status.type === 'complete') {
        success++;
      } else if (status.type === 'error' || status.type === 'failed') {
        failed++;
      } else if (status.type === 'pending') {
        pending++;
      }
    }

    return {
      total: group.length,
      success,
      failed,
      pending
    };
  }

  removeGroup(groupId: string): boolean {
    return this.groupStatuses.delete(groupId);
  }

  getGroupStatuses(groupId: string): Status[] {
    return this.groupStatuses.get(groupId) || [];
  }

  getAllGroups(): string[] {
    return Array.from(this.groupStatuses.keys());
  }

  getStatusManager(): StatusManager {
    return this.statusManager;
  }
}

export const statusIndicator = new StatusIndicator();
export const statusManager = new StatusManager();
export const multiStatusIndicator = new MultiStatusIndicator();

export function createStatus(message: string, type?: StatusType): Status {
  return statusIndicator.createStatus(message, type);
}

export function updateStatus(status: Status, message: string, type?: StatusType): void {
  statusIndicator.updateStatus(status, message, type);
}

export function showSuccess(message: string, details?: string): Status {
  return statusIndicator.showSuccess(message, details);
}

export function showWarning(message: string, details?: string): Status {
  return statusIndicator.showWarning(message, details);
}

export function showError(message: string, details?: string): Status {
  return statusIndicator.showError(message, details);
}

export function showInfo(message: string, details?: string): Status {
  return statusIndicator.showInfo(message, details);
}

export function showPending(message: string, progress?: number): Status {
  return statusIndicator.showPending(message, progress);
}

export function persistStatus(status: Status, logFile: string): void {
  statusIndicator.persistStatus(status, logFile);
}

export function createStatusManager(options?: StatusManagerOptions): StatusManager {
  return new StatusManager(options);
}

export function createMultiStatusIndicator(options?: StatusManagerOptions): MultiStatusIndicator {
  return new MultiStatusIndicator(options);
}

export const StatusTypes: Record<StatusType, StatusType> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  pending: 'pending',
  complete: 'complete',
  failed: 'failed',
  skipped: 'skipped'
};


export const StatusIcons = StatusIndicator.STATUS_ICONS;
export const StatusColors = StatusIndicator.STATUS_COLORS;