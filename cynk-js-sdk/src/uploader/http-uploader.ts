import { createReadStream, promises as fs } from 'fs';
import { basename } from 'path';
import { createHash } from 'crypto';
import { request, RequestOptions, IncomingMessage } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import { UploadResult,  UploadSession , ProgressInfo, ChunkResult, UploadError, CompletionVerification } from '../types/upload-result';

export interface UploadConfig {
  chunkSize?: number;
  maxRetries?: number;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: AuthCredentials;
  progressCallback?: ProgressCallback;
  checksumAlgorithm?: string;
}

export interface AuthCredentials {
  type: 'basic' | 'bearer' | 'apiKey';
  credentials: string;
  headerName?: string;
}

export interface UploadSession {
  id: string;
  endpoint: string;
  totalSize: number;
  totalChunks: number;
  chunkSize: number;
  uploadedSize: number;
  createdAt: Date;
  expiresAt?: Date;
  checksum: string;
  metadata: Record<string, any>;
  authToken?: string;
  resumeUrl?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  path: string;
  mimeType: string;
  checksum: string;
  lastModified: Date;
}

export interface ProgressCallback {
  (progress: ProgressInfo): void;
}

export interface UploadError {
  code: string;
  message: string;
  chunkIndex?: number;
  retryable: boolean;
  timestamp: Date;
  details: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'resume' | 'abort';
  delay?: number;
  chunkIndex?: number;
}

class HTTPUploader {
  private static readonly DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_TIMEOUT = 30000;
  private static readonly DEFAULT_CHECKSUM_ALGORITHM = 'sha256';

  async uploadFile(filePath: string, endpoint: string, config: UploadConfig = {}): Promise<UploadResult> {
    const fileInfo = await this.getFileInfo(filePath);
    const checksum = await this.calculateFileChecksum(filePath, config.checksumAlgorithm);
    
    const session = await this.createUploadSession(endpoint, fileInfo, checksum, config);
    const uploadResult = await this.performUpload(session, filePath, config);
    
    const verification = await this.verifyUploadCompletion(filePath, uploadResult.finalUrl!, config);
    
    return {
      ...uploadResult,
      verification
    };
  }

  async createUploadSession(endpoint: string, fileInfo: FileInfo, checksum: string, config: UploadConfig): Promise<UploadSession> {
    const url = new URL(endpoint);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const options: RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(config.auth),
        ...config.headers
      },
      timeout: config.timeout || HTTPUploader.DEFAULT_TIMEOUT
    };

    const sessionData = {
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      fileChecksum: checksum,
      chunkSize: config.chunkSize || HTTPUploader.DEFAULT_CHUNK_SIZE,
      mimeType: fileInfo.mimeType
    };

    return new Promise((resolve, reject) => {
      const req = requestFn(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data);
              const session: UploadSession = {
                id: response.sessionId,
                endpoint: endpoint,
                totalSize: fileInfo.size,
                totalChunks: Math.ceil(fileInfo.size / (config.chunkSize || HTTPUploader.DEFAULT_CHUNK_SIZE)),
                chunkSize: config.chunkSize || HTTPUploader.DEFAULT_CHUNK_SIZE,
                uploadedSize: 0,
                createdAt: new Date(),
                expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined,
                checksum: checksum,
                metadata: response.metadata || {},
                authToken: response.authToken,
                resumeUrl: response.resumeUrl
              };
              resolve(session);
            } catch (error) {
              reject(this.createUploadError('PARSE_ERROR', 'Failed to parse session response', false, { error: error instanceof Error ? error.message : 'Unknown error' }));
            }
          } else {
            reject(this.createUploadError('SESSION_CREATION_FAILED', `Failed to create upload session: ${res.statusCode}`, true, { statusCode: res.statusCode, body: data }));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(this.createUploadError('NETWORK_ERROR', 'Network error during session creation', true, { error: error.message }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(this.createUploadError('TIMEOUT', 'Session creation timeout', true));
      });

      req.write(JSON.stringify(sessionData));
      req.end();
    });
  }

  async authenticateUpload(endpoint: string, credentials: AuthCredentials): Promise<string> {
    const url = new URL(endpoint);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const options: RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(credentials)
      }
    };

    return new Promise((resolve, reject) => {
      const req = requestFn(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data);
              resolve(response.token || response.authToken);
            } catch {
              reject(this.createUploadError('AUTH_PARSE_ERROR', 'Failed to parse authentication response', false));
            }
          } else {
            reject(this.createUploadError('AUTH_FAILED', `Authentication failed: ${res.statusCode}`, false, { statusCode: res.statusCode }));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(this.createUploadError('AUTH_NETWORK_ERROR', 'Network error during authentication', true, { error: error.message }));
      });

      req.end();
    });
  }

  async uploadChunk(session: UploadSession, chunk: Buffer, chunkIndex: number, config: UploadConfig): Promise<ChunkResult> {
    const url = new URL(session.endpoint);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const startByte = chunkIndex * session.chunkSize;
    const endByte = Math.min(startByte + session.chunkSize - 1, session.totalSize - 1);
    const chunkChecksum = createHash(config.checksumAlgorithm || HTTPUploader.DEFAULT_CHECKSUM_ALGORITHM).update(chunk).digest('hex');

    const options: RequestOptions = {
      method: 'PUT',
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}/${session.id}/chunks/${chunkIndex}`,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': chunk.length.toString(),
        'Content-Range': `bytes ${startByte}-${endByte}/${session.totalSize}`,
        'X-Chunk-Checksum': chunkChecksum,
        ...this.getAuthHeaders(config.auth),
        ...config.headers
      },
      timeout: config.timeout || HTTPUploader.DEFAULT_TIMEOUT
    };

    let retryCount = 0;
    const maxRetries = config.maxRetries || HTTPUploader.DEFAULT_MAX_RETRIES;

    while (retryCount <= maxRetries) {
      try {
        return await this.executeChunkUpload(requestFn, options, chunk, chunkIndex, startByte, endByte, chunkChecksum);
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          throw error;
        }

        const recovery = this.handleUploadError(error as UploadError, session);
        if (recovery.type === 'abort') {
          throw error;
        }

        if (recovery.delay) {
          await this.delay(recovery.delay);
        }
      }
    }

    throw this.createUploadError('MAX_RETRIES_EXCEEDED', 'Maximum retry attempts exceeded', false, { chunkIndex, maxRetries });
  }

  async resumeUpload(sessionId: string, endpoint: string, config: UploadConfig): Promise<UploadSession> {
    const url = new URL(endpoint);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const options: RequestOptions = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}/${sessionId}`,
      headers: {
        ...this.getAuthHeaders(config.auth),
        ...config.headers
      },
      timeout: config.timeout || HTTPUploader.DEFAULT_TIMEOUT
    };

    return new Promise((resolve, reject) => {
      const req = requestFn(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data);
              const session: UploadSession = {
                id: response.sessionId,
                endpoint: endpoint,
                totalSize: response.totalSize,
                totalChunks: response.totalChunks,
                chunkSize: response.chunkSize,
                uploadedSize: response.uploadedSize,
                createdAt: new Date(response.createdAt),
                expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined,
                checksum: response.checksum,
                metadata: response.metadata || {},
                authToken: response.authToken,
                resumeUrl: response.resumeUrl
              };
              resolve(session);
            } catch (error) {
              reject(this.createUploadError('RESUME_PARSE_ERROR', 'Failed to parse resume response', false, { error: error instanceof Error ? error.message : 'Unknown error' }));
            }
          } else if (res.statusCode === 404) {
            reject(this.createUploadError('SESSION_NOT_FOUND', 'Upload session not found', false));
          } else {
            reject(this.createUploadError('RESUME_FAILED', `Failed to resume upload: ${res.statusCode}`, true, { statusCode: res.statusCode }));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(this.createUploadError('RESUME_NETWORK_ERROR', 'Network error during resume', true, { error: error.message }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(this.createUploadError('RESUME_TIMEOUT', 'Resume operation timeout', true));
      });

      req.end();
    });
  }

  async monitorUploadProgress(session: UploadSession, callback: ProgressCallback): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const progress = await this.getUploadProgress(session);
        callback(progress);
        
        if (progress.percentage >= 100) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1000);
  }

  async verifyUploadCompletion(filePath: string, remoteUrl: string, config: UploadConfig): Promise<CompletionVerification> {
    const localChecksum = await this.calculateFileChecksum(filePath, config.checksumAlgorithm);
    
    const url = new URL(remoteUrl);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const options: RequestOptions = {
      method: 'HEAD',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      headers: {
        ...this.getAuthHeaders(config.auth),
        ...config.headers
      }
    };

    try {
      const remoteChecksum = await new Promise<string>((resolve, reject) => {
        const req = requestFn(options, (res: IncomingMessage) => {
          const checksum = res.headers['x-file-checksum'] as string;
          if (checksum) {
            resolve(checksum);
          } else {
            reject(this.createUploadError('VERIFICATION_FAILED', 'Remote checksum not available', false));
          }
        });

        req.on('error', (error: Error) => {
          reject(this.createUploadError('VERIFICATION_NETWORK_ERROR', 'Network error during verification', true, { error: error.message }));
        });

        req.end();
      });

      const verified = localChecksum === remoteChecksum;
      
      return {
        verified,
        localChecksum,
        remoteChecksum,
        verifiedAt: new Date(),
        method: 'checksum',
        evidence: verified ? ['Checksum match verified'] : ['Checksum mismatch detected'],
        issues: verified ? [] : ['Integrity verification failed']
      };
    } catch (error) {
      return {
        verified: false,
        localChecksum,
        remoteChecksum: 'unknown',
        verifiedAt: new Date(),
        method: 'checksum',
        evidence: ['Verification process failed'],
        issues: ['Unable to verify remote file integrity']
      };
    }
  }

  private async performUpload(session: UploadSession, filePath: string, config: UploadConfig): Promise<UploadResult> {
    const startTime = new Date();
    const chunks: ChunkResult[] = [];
    const errors: UploadError[] = [];
    
    const totalChunks = session.totalChunks;
    let uploadedSize = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      try {
        const chunk = await this.readChunk(filePath, chunkIndex, session.chunkSize, session.totalSize);
        const chunkResult = await this.uploadChunk(session, chunk, chunkIndex, config);
        
        chunks.push(chunkResult);
        uploadedSize += chunk.length;

        if (config.progressCallback) {
          const progress: ProgressInfo = {
            sessionId: session.id,
            bytesUploaded: uploadedSize,
            bytesTotal: session.totalSize,
            percentage: (uploadedSize / session.totalSize) * 100,
            chunksCompleted: chunkIndex + 1,
            chunksTotal: totalChunks,
            currentChunk: chunkIndex,
            uploadSpeed: this.calculateUploadSpeed(startTime, uploadedSize),
            estimatedTimeRemaining: this.calculateETA(startTime, uploadedSize, session.totalSize),
            startedAt: startTime,
            lastUpdate: new Date()
          };
          config.progressCallback(progress);
        }
      } catch (error) {
        const uploadError = error as UploadError;
        errors.push(uploadError);
        
        if (!uploadError.retryable) {
          break;
        }
      }
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startTime.getTime();
    const allChunksCompleted = chunks.length === totalChunks;

    return {
      id: this.generateId(),
      session: {
        ...session,
        uploadedSize
      },
      status: allChunksCompleted ? 'completed' : 'failed',
      progress: {
        sessionId: session.id,
        bytesUploaded: uploadedSize,
        bytesTotal: session.totalSize,
        percentage: (uploadedSize / session.totalSize) * 100,
        chunksCompleted: chunks.length,
        chunksTotal: totalChunks,
        uploadSpeed: this.calculateUploadSpeed(startTime, uploadedSize),
        estimatedTimeRemaining: allChunksCompleted ? 0 : this.calculateETA(startTime, uploadedSize, session.totalSize),
        startedAt: startTime,
        lastUpdate: completedAt
      },
      chunks,
      errors,
      startedAt: startTime,
      completedAt: allChunksCompleted ? completedAt : undefined,
      duration: allChunksCompleted ? duration : undefined,
      finalUrl: allChunksCompleted ? session.endpoint : undefined
    };
  }

  private async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const name = basename(filePath);
    
    const mimeType = this.detectMimeType(name);
    
    return {
      name,
      size: stats.size,
      path: filePath,
      mimeType,
      checksum: '',
      lastModified: stats.mtime
    };
  }

  private async calculateFileChecksum(filePath: string, algorithm: string = HTTPUploader.DEFAULT_CHECKSUM_ALGORITHM): Promise<string> {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async readChunk(filePath: string, chunkIndex: number, chunkSize: number, totalSize: number): Promise<Buffer> {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const length = end - start;

    const buffer = Buffer.alloc(length);
    const fd = await fs.open(filePath, 'r');
    
    try {
      await fs.read(fd, buffer, 0, length, start);
      return buffer;
    } finally {
      await fs.close(fd);
    }
  }

  private executeChunkUpload(
    requestFn: typeof request,
    options: RequestOptions,
    chunk: Buffer,
    chunkIndex: number,
    startByte: number,
    endByte: number,
    chunkChecksum: string
  ): Promise<ChunkResult> {
    return new Promise((resolve, reject) => {
      const req = requestFn(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const chunkResult: ChunkResult = {
              chunkIndex,
              startByte,
              endByte,
              size: chunk.length,
              status: 'completed',
              checksum: chunkChecksum,
              uploadedAt: new Date(),
              verified: false,
              retryCount: 0
            };
            resolve(chunkResult);
          } else {
            reject(this.createUploadError('CHUNK_UPLOAD_FAILED', `Chunk upload failed: ${res.statusCode}`, true, { 
              chunkIndex, 
              statusCode: res.statusCode,
              body: data 
            }));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(this.createUploadError('CHUNK_NETWORK_ERROR', 'Network error during chunk upload', true, { 
          chunkIndex, 
          error: error.message 
        }));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(this.createUploadError('CHUNK_TIMEOUT', 'Chunk upload timeout', true, { chunkIndex }));
      });

      req.write(chunk);
      req.end();
    });
  }

  private async getUploadProgress(session: UploadSession): Promise<ProgressInfo> {
    const url = new URL(session.endpoint);
    const isSecure = url.protocol === 'https:';
    const requestFn = isSecure ? httpsRequest : request;
    
    const options: RequestOptions = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}/${session.id}/progress`,
      headers: {
        ...this.getAuthHeaders({ type: 'bearer', credentials: session.authToken || '' })
      }
    };

    return new Promise((resolve, reject) => {
      const req = requestFn(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode === 200) {
            try {
              const progress = JSON.parse(data);
              resolve(progress);
            } catch {
              reject(this.createUploadError('PROGRESS_PARSE_ERROR', 'Failed to parse progress response', true));
            }
          } else {
            reject(this.createUploadError('PROGRESS_FETCH_FAILED', 'Failed to fetch upload progress', true));
          }
        });
      });

      req.on('error', () => {
        reject(this.createUploadError('PROGRESS_NETWORK_ERROR', 'Network error during progress fetch', true));
      });

      req.end();
    });
  }

  private handleUploadError(error: UploadError, session: UploadSession): RecoveryAction {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return { type: 'retry', delay: 1000 };
      
      case 'AUTH_FAILED':
        return { type: 'abort' };
      
      case 'SESSION_NOT_FOUND':
        return { type: 'resume' };
      
      default:
        return error.retryable ? { type: 'retry', delay: 2000 } : { type: 'abort' };
    }
  }

  private getAuthHeaders(auth?: AuthCredentials): Record<string, string> {
    if (!auth) return {};

    switch (auth.type) {
      case 'basic':
        const credentials = Buffer.from(auth.credentials).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      
      case 'bearer':
        return { 'Authorization': `Bearer ${auth.credentials}` };
      
      case 'apiKey':
        const headerName = auth.headerName || 'X-API-Key';
        return { [headerName]: auth.credentials };
      
      default:
        return {};
    }
  }

  private detectMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'json': 'application/json',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private calculateUploadSpeed(startTime: Date, bytesUploaded: number): number {
    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    return elapsed > 0 ? bytesUploaded / elapsed : 0;
  }

  private calculateETA(startTime: Date, bytesUploaded: number, totalBytes: number): number {
    const elapsed = (Date.now() - startTime.getTime()) / 1000;
    const bytesPerSecond = bytesUploaded / elapsed;
    const remainingBytes = totalBytes - bytesUploaded;
    return bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : 0;
  }

  private createUploadError(code: string, message: string, retryable: boolean, details: Record<string, any> = {}): UploadError {
    return {
      code,
      message,
      retryable,
      timestamp: new Date(),
      details
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const httpUploader = new HTTPUploader();

export async function uploadFile(filePath: string, endpoint: string, config?: UploadConfig): Promise<UploadResult> {
  return httpUploader.uploadFile(filePath, endpoint, config);
}

export async function createUploadSession(endpoint: string, fileInfo: FileInfo, checksum: string, config?: UploadConfig): Promise<UploadSession> {
  return httpUploader.createUploadSession(endpoint, fileInfo, checksum, config);
}

export async function authenticateUpload(endpoint: string, credentials: AuthCredentials): Promise<string> {
  return httpUploader.authenticateUpload(endpoint, credentials);
}

export async function uploadChunk(session: UploadSession, chunk: Buffer, chunkIndex: number, config?: UploadConfig): Promise<ChunkResult> {
  return httpUploader.uploadChunk(session, chunk, chunkIndex, config);
}

export async function resumeUpload(sessionId: string, endpoint: string, config?: UploadConfig): Promise<UploadSession> {
  return httpUploader.resumeUpload(sessionId, endpoint, config);
}

export async function monitorUploadProgress(session: UploadSession, callback: ProgressCallback): Promise<void> {
  return httpUploader.monitorUploadProgress(session, callback);
}

export async function verifyUploadCompletion(filePath: string, remoteUrl: string, config?: UploadConfig): Promise<CompletionVerification> {
  return httpUploader.verifyUploadCompletion(filePath, remoteUrl, config);
}