import { z } from 'zod';
import { createHash } from 'crypto';

export const UploadStatusSchema = z.enum(['pending', 'uploading', 'completed', 'failed', 'cancelled', 'verifying']);
export const UploadProtocolSchema = z.enum(['http', 'https', 's3', 'gcs', 'azure']);
export const ChunkStatusSchema = z.enum(['pending', 'uploading', 'completed', 'failed', 'verified']);

export const UploadSessionSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string().url(),
  protocol: UploadProtocolSchema,
  totalSize: z.number().min(0),
  totalChunks: z.number().min(1),
  chunkSize: z.number().min(1),
  uploadedSize: z.number().min(0),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  checksum: z.string().min(1),
  metadata: z.record(z.any()).default({}),
  authToken: z.string().optional(),
  resumeUrl: z.string().url().optional()
});

export const ProgressInfoSchema = z.object({
  sessionId: z.uuid(),
  bytesUploaded: z.number().min(0),
  bytesTotal: z.number().min(0),
  percentage: z.number().min(0).max(100),
  chunksCompleted: z.number().min(0),
  chunksTotal: z.number().min(1),
  currentChunk: z.number().min(0).optional(),
  uploadSpeed: z.number().min(0),
  estimatedTimeRemaining: z.number().min(0),
  startedAt: z.string().datetime(),
  lastUpdate: z.string().datetime()
});

export const ChunkResultSchema = z.object({
  chunkIndex: z.number().min(0),
  startByte: z.number().min(0),
  endByte: z.number().min(0),
  size: z.number().min(0),
  status: ChunkStatusSchema,
  checksum: z.string().min(1),
  uploadedAt: z.string().datetime().optional(),
  verified: z.boolean().default(false),
  retryCount: z.number().min(0).default(0),
  error: z.string().optional()
});

export const CompletionVerificationSchema = z.object({
  verified: z.boolean(),
  localChecksum: z.string().min(1),
  remoteChecksum: z.string().min(1),
  verifiedAt: z.string().datetime(),
  method: z.enum(['checksum', 'signature', 'manual']),
  evidence: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([])
});

export const UploadErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  chunkIndex: z.number().optional(),
  retryable: z.boolean().default(true),
  timestamp: z.string().datetime(),
  details: z.record(z.any()).default({}),
  stack: z.string().optional()
});

export const UploadResultSchema = z.object({
  id: z.string().uuid(),
  session: UploadSessionSchema,
  status: UploadStatusSchema,
  progress: ProgressInfoSchema,
  chunks: z.array(ChunkResultSchema).default([]),
  verification: CompletionVerificationSchema.optional(),
  errors: z.array(UploadErrorSchema).default([]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  duration: z.number().min(0).optional(),
  finalUrl: z.string().url().optional(),
  accessToken: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export type UploadStatus = z.infer<typeof UploadStatusSchema>;
export type UploadProtocol = z.infer<typeof UploadProtocolSchema>;
export type ChunkStatus = z.infer<typeof ChunkStatusSchema>;
export type UploadSession = z.infer<typeof UploadSessionSchema>;
export type ProgressInfo = z.infer<typeof ProgressInfoSchema>;
export type ChunkResult = z.infer<typeof ChunkResultSchema>;
export type CompletionVerification = z.infer<typeof CompletionVerificationSchema>;
export type UploadError = z.infer<typeof UploadErrorSchema>;
export type UploadResult = z.infer<typeof UploadResultSchema>;

export class UploadResultValidator {
  static validateUploadResult(data: unknown): { success: boolean; result?: UploadResult; errors?: string[] } {
    try {
      const result = UploadResultSchema.parse(data);
      return { success: true, result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateUploadSession(data: unknown): { success: boolean; session?: UploadSession; errors?: string[] } {
    try {
      const session = UploadSessionSchema.parse(data);
      return { success: true, session };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateProgressInfo(data: unknown): { success: boolean; progress?: ProgressInfo; errors?: string[] } {
    try {
      const progress = ProgressInfoSchema.parse(data);
      return { success: true, progress };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
}

export class UploadResultGenerator {
  static createUploadResult(session: UploadSession): UploadResult {
    const startedAt = new Date().toISOString();
    
    const progress: ProgressInfo = {
      sessionId: session.id,
      bytesUploaded: 0,
      bytesTotal: session.totalSize,
      percentage: 0,
      chunksCompleted: 0,
      chunksTotal: session.totalChunks,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      startedAt,
      lastUpdate: startedAt
    };

    const chunks: ChunkResult[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const startByte = i * session.chunkSize;
      const endByte = Math.min(startByte + session.chunkSize - 1, session.totalSize - 1);
      const size = endByte - startByte + 1;
      
      chunks.push({
        chunkIndex: i,
        startByte,
        endByte,
        size,
        status: 'pending',
        checksum: '',
        retryCount: 0
      });
    }

    return {
      id: this.generateUUID(),
      session,
      status: 'pending',
      progress,
      chunks,
      startedAt,
      metadata: {}
    };
  }

  static createUploadSession(
    endpoint: string,
    totalSize: number,
    chunkSize: number,
    checksum: string,
    protocol: UploadProtocol = 'https'
  ): UploadSession {
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      id: this.generateUUID(),
      endpoint,
      protocol,
      totalSize,
      totalChunks,
      chunkSize,
      uploadedSize: 0,
      createdAt: new Date().toISOString(),
      expiresAt,
      checksum,
      metadata: {}
    };
  }

  static createProgressInfo(
    sessionId: string,
    bytesUploaded: number,
    bytesTotal: number,
    chunksCompleted: number,
    chunksTotal: number
  ): ProgressInfo {
    const percentage = bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;
    const now = new Date().toISOString();
    
    return {
      sessionId,
      bytesUploaded,
      bytesTotal,
      percentage,
      chunksCompleted,
      chunksTotal,
      uploadSpeed: 0,
      estimatedTimeRemaining: 0,
      startedAt: now,
      lastUpdate: now
    };
  }

  static createChunkResult(
    chunkIndex: number,
    startByte: number,
    endByte: number,
    size: number,
    checksum: string
  ): ChunkResult {
    return {
      chunkIndex,
      startByte,
      endByte,
      size,
      status: 'completed',
      checksum,
      uploadedAt: new Date().toISOString(),
      verified: false,
      retryCount: 0
    };
  }

  static createCompletionVerification(
    localChecksum: string,
    remoteChecksum: string,
    method: CompletionVerification['method']
  ): CompletionVerification {
    const verified = localChecksum === remoteChecksum;
    
    return {
      verified,
      localChecksum,
      remoteChecksum,
      verifiedAt: new Date().toISOString(),
      method,
      evidence: verified ? ['Checksum match verified'] : ['Checksum mismatch detected'],
      issues: verified ? [] : ['Integrity verification failed']
    };
  }

  static createUploadError(
    code: string,
    message: string,
    retryable: boolean = true,
    chunkIndex?: number,
    details: Record<string, any> = {}
  ): UploadError {
    return {
      code,
      message,
      chunkIndex,
      retryable,
      timestamp: new Date().toISOString(),
      details,
      stack: new Error().stack
    };
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export class UploadResultAnalyzer {
  static calculateUploadStats(result: UploadResult): {
    duration: number;
    averageSpeed: number;
    successRate: number;
    retryRate: number;
    efficiency: number;
  } {
    const startedAt = new Date(result.startedAt).getTime();
    const completedAt = result.completedAt ? new Date(result.completedAt).getTime() : Date.now();
    const duration = completedAt - startedAt;

    const totalBytes = result.session.totalSize;
    const averageSpeed = duration > 0 ? (totalBytes / duration) * 1000 : 0;

    const successfulChunks = result.chunks.filter(chunk => chunk.status === 'completed').length;
    const totalChunks = result.chunks.length;
    const successRate = totalChunks > 0 ? (successfulChunks / totalChunks) * 100 : 0;

    const totalRetries = result.chunks.reduce((sum, chunk) => sum + chunk.retryCount, 0);
    const retryRate = totalChunks > 0 ? (totalRetries / totalChunks) * 100 : 0;

    const expectedTime = totalBytes / averageSpeed;
    const efficiency = duration > 0 ? (expectedTime / duration) * 100 : 100;

    return {
      duration,
      averageSpeed,
      successRate,
      retryRate,
      efficiency
    };
  }

  static getFailedChunks(result: UploadResult): ChunkResult[] {
    return result.chunks.filter(chunk => chunk.status === 'failed');
  }

  static getPendingChunks(result: UploadResult): ChunkResult[] {
    return result.chunks.filter(chunk => chunk.status === 'pending');
  }

  static getChunksNeedingRetry(result: UploadResult, maxRetries: number = 3): ChunkResult[] {
    return result.chunks.filter(chunk => 
      chunk.status === 'failed' && 
      chunk.retryCount < maxRetries &&
      chunk.retryCount >= 0
    );
  }

  static getProgressSummary(result: UploadResult): {
    bytesUploaded: number;
    bytesTotal: number;
    percentage: number;
    chunksCompleted: number;
    chunksTotal: number;
    estimatedTimeRemaining: number;
  } {
    const bytesUploaded = result.chunks
      .filter(chunk => chunk.status === 'completed')
      .reduce((sum, chunk) => sum + chunk.size, 0);

    const bytesTotal = result.session.totalSize;
    const percentage = bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;
    const chunksCompleted = result.chunks.filter(chunk => chunk.status === 'completed').length;
    const chunksTotal = result.chunks.length;

    const startedAt = new Date(result.startedAt).getTime();
    const now = Date.now();
    const elapsedTime = now - startedAt;
    
    let estimatedTimeRemaining = 0;
    if (bytesUploaded > 0 && elapsedTime > 0) {
      const bytesPerMs = bytesUploaded / elapsedTime;
      const remainingBytes = bytesTotal - bytesUploaded;
      estimatedTimeRemaining = bytesPerMs > 0 ? remainingBytes / bytesPerMs : 0;
    }

    return {
      bytesUploaded,
      bytesTotal,
      percentage,
      chunksCompleted,
      chunksTotal,
      estimatedTimeRemaining
    };
  }

  static isUploadComplete(result: UploadResult): boolean {
    return result.status === 'completed' && 
           result.chunks.every(chunk => chunk.status === 'completed') &&
           result.verification?.verified === true;
  }

  static isUploadFailed(result: UploadResult): boolean {
    return result.status === 'failed' || 
           result.errors.some(error => !error.retryable) ||
           this.getFailedChunks(result).length > this.chunks.length * 0.5;
  }

  static canResumeUpload(result: UploadResult): boolean {
    if (result.status === 'completed') return false;
    if (result.status === 'cancelled') return true;
    
    const expired = result.session.expiresAt && 
                   new Date() > new Date(result.session.expiresAt);
    
    return !expired && 
           result.session.resumeUrl !== undefined && 
           this.getPendingChunks(result).length > 0;
  }

  static getErrorSummary(result: UploadResult): {
    total: number;
    retryable: number;
    nonRetryable: number;
    byCode: Record<string, number>;
    byChunk: Record<number, number>;
  } {
    const byCode: Record<string, number> = {};
    const byChunk: Record<number, number> = {};
    
    let retryable = 0;
    let nonRetryable = 0;

    for (const error of result.errors) {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      
      if (error.chunkIndex !== undefined) {
        byChunk[error.chunkIndex] = (byChunk[error.chunkIndex] || 0) + 1;
      }
      
      if (error.retryable) {
        retryable++;
      } else {
        nonRetryable++;
      }
    }

    return {
      total: result.errors.length,
      retryable,
      nonRetryable,
      byCode,
      byChunk
    };
  }

  static validateChunkIntegrity(result: UploadResult, chunkData: Map<number, Buffer>): { valid: boolean; errors: Array<{ chunkIndex: number; error: string }> } {
    const errors: Array<{ chunkIndex: number; error: string }> = [];
    
    for (const chunk of result.chunks) {
      if (chunk.status !== 'completed') continue;
      
      const data = chunkData.get(chunk.chunkIndex);
      if (!data) {
        errors.push({ chunkIndex: chunk.chunkIndex, error: 'Chunk data not found' });
        continue;
      }
      
      const computedChecksum = createHash('sha256').update(data).digest('hex');
      if (computedChecksum !== chunk.checksum) {
        errors.push({ 
          chunkIndex: chunk.chunkIndex, 
          error: `Checksum mismatch: expected ${chunk.checksum}, got ${computedChecksum}` 
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export class UploadResultSerializer {
  static serializeUploadResult(result: UploadResult): string {
    return JSON.stringify(result, null, 2);
  }

  static deserializeUploadResult(jsonString: string): { success: boolean; result?: UploadResult; errors?: string[] } {
    try {
      const data = JSON.parse(jsonString);
      return UploadResultValidator.validateUploadResult(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
      return { success: false, errors: ['Failed to parse upload result'] };
    }
  }

  static toSummary(result: UploadResult): Record<string, any> {
    const stats = UploadResultAnalyzer.calculateUploadStats(result);
    const progress = UploadResultAnalyzer.getProgressSummary(result);
    const errorSummary = UploadResultAnalyzer.getErrorSummary(result);
    
    return {
      id: result.id,
      status: result.status,
      duration: `${stats.duration}ms`,
      progress: `${progress.percentage.toFixed(1)}%`,
      speed: `${(stats.averageSpeed / 1024 / 1024).toFixed(2)} MB/s`,
      chunks: `${progress.chunksCompleted}/${progress.chunksTotal}`,
      successRate: `${stats.successRate.toFixed(1)}%`,
      retryRate: `${stats.retryRate.toFixed(1)}%`,
      efficiency: `${stats.efficiency.toFixed(1)}%`,
      errors: errorSummary.total,
      finalUrl: result.finalUrl ? 'Available' : 'Not available',
      verified: result.verification?.verified ? 'Yes' : 'No'
    };
  }

  static toCSV(result: UploadResult): string {
    const headers = ['ChunkIndex', 'Status', 'Size', 'StartByte', 'EndByte', 'Checksum', 'RetryCount', 'UploadedAt'];
    const chunks = result.chunks;
    
    const csvRows = [
      headers.join(','),
      ...chunks.map(chunk => [
        chunk.chunkIndex,
        chunk.status,
        chunk.size,
        chunk.startByte,
        chunk.endByte,
        chunk.checksum,
        chunk.retryCount,
        chunk.uploadedAt || ''
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }

  static async saveToFile(result: UploadResult, filePath: string): Promise<void> {
    const { promises: fs } = await import('fs');
    const { dirname } = await import('path');
    
    const serialized = this.serializeUploadResult(result);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, serialized, 'utf-8');
  }

  static async loadFromFile(filePath: string): Promise<{ success: boolean; result?: UploadResult; errors?: string[] }> {
    try {
      const { promises: fs } = await import('fs');
      const content = await fs.readFile(filePath, 'utf-8');
      return this.deserializeUploadResult(content);
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to load upload result: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}

export class UploadResumeManager {
  static createResumeData(result: UploadResult): { 
    sessionId: string; 
    endpoint: string; 
    pendingChunks: number[]; 
    checksum: string;
    metadata: Record<string, any>;
  } {
    const pendingChunks = UploadResultAnalyzer.getPendingChunks(result)
      .map(chunk => chunk.chunkIndex);
    
    return {
      sessionId: result.session.id,
      endpoint: result.session.endpoint,
      pendingChunks,
      checksum: result.session.checksum,
      metadata: result.metadata
    };
  }

  static canMergeResults(original: UploadResult, resumed: UploadResult): boolean {
    return original.session.id === resumed.session.id &&
           original.session.checksum === resumed.session.checksum &&
           original.session.totalSize === resumed.session.totalSize &&
           original.session.chunkSize === resumed.session.chunkSize;
  }

  static mergeUploadResults(original: UploadResult, resumed: UploadResult): UploadResult {
    if (!this.canMergeResults(original, resumed)) {
      throw new Error('Cannot merge incompatible upload results');
    }

    const mergedChunks: ChunkResult[] = [];
    const chunkMap = new Map(original.chunks.map(chunk => [chunk.chunkIndex, chunk]));
    
    for (const resumedChunk of resumed.chunks) {
      const originalChunk = chunkMap.get(resumedChunk.chunkIndex);
      
      if (!originalChunk || resumedChunk.status === 'completed') {
        chunkMap.set(resumedChunk.chunkIndex, resumedChunk);
      }
    }
    
    mergedChunks.push(...Array.from(chunkMap.values()).sort((a, b) => a.chunkIndex - b.chunkIndex));

    const progress = UploadResultAnalyzer.getProgressSummary({
      ...original,
      chunks: mergedChunks
    } as UploadResult);

    const mergedErrors = [...original.errors, ...resumed.errors];
    const uniqueErrors = this.deduplicateErrors(mergedErrors);

    const completedAt = resumed.completedAt || original.completedAt;
    const duration = completedAt ? 
      new Date(completedAt).getTime() - new Date(original.startedAt).getTime() : 
      undefined;

    return {
      ...original,
      chunks: mergedChunks,
      progress: {
        ...original.progress,
        bytesUploaded: progress.bytesUploaded,
        percentage: progress.percentage,
        chunksCompleted: progress.chunksCompleted,
        lastUpdate: new Date().toISOString()
      },
      errors: uniqueErrors,
      completedAt,
      duration,
      status: resumed.status,
      verification: resumed.verification || original.verification,
      finalUrl: resumed.finalUrl || original.finalUrl,
      metadata: { ...original.metadata, ...resumed.metadata }
    };
  }

  private static deduplicateErrors(errors: UploadError[]): UploadError[] {
    const errorMap = new Map<string, UploadError>();
    
    for (const error of errors) {
      const key = `${error.code}:${error.chunkIndex}:${error.message}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, error);
      }
    }
    
    return Array.from(errorMap.values());
  }
}

export class UploadResultMonitor {
  private result: UploadResult;
  private updateCallbacks: Array<(result: UploadResult) => void> = [];
  private errorCallbacks: Array<(error: UploadError) => void> = [];
  private progressCallbacks: Array<(progress: ProgressInfo) => void> = [];

  constructor(result: UploadResult) {
    this.result = result;
  }

  getResult(): UploadResult {
    return this.result;
  }

  updateProgress(progress: Partial<ProgressInfo>): void {
    this.result.progress = {
      ...this.result.progress,
      ...progress,
      lastUpdate: new Date().toISOString()
    };
    
    this.progressCallbacks.forEach(callback => callback(this.result.progress));
  }

  updateChunk(chunkIndex: number, updates: Partial<ChunkResult>): void {
    const chunk = this.result.chunks[chunkIndex];
    if (chunk) {
      this.result.chunks[chunkIndex] = { ...chunk, ...updates };
    }
  }

  addError(error: UploadError): void {
    this.result.errors.push(error);
    this.errorCallbacks.forEach(callback => callback(error));
  }

  completeUpload(verification: CompletionVerification, finalUrl?: string): void {
    this.result.status = 'completed';
    this.result.completedAt = new Date().toISOString();
    this.result.duration = new Date().getTime() - new Date(this.result.startedAt).getTime();
    this.result.verification = verification;
    this.result.finalUrl = finalUrl;
    
    this.updateCallbacks.forEach(callback => callback(this.result));
  }

  failUpload(error: UploadError): void {
    this.result.status = 'failed';
    this.result.errors.push(error);
    
    this.errorCallbacks.forEach(callback => callback(error));
    this.updateCallbacks.forEach(callback => callback(this.result));
  }

  onUpdate(callback: (result: UploadResult) => void): void {
    this.updateCallbacks.push(callback);
  }

  onError(callback: (error: UploadError) => void): void {
    this.errorCallbacks.push(callback);
  }

  onProgress(callback: (progress: ProgressInfo) => void): void {
    this.progressCallbacks.push(callback);
  }

  removeUpdateCallback(callback: (result: UploadResult) => void): void {
    this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
  }

  removeErrorCallback(callback: (error: UploadError) => void): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  removeProgressCallback(callback: (progress: ProgressInfo) => void): void {
    this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
  }
}