import { promises as fs, createReadStream, createWriteStream, chmod } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { createHash } from 'crypto';
import { platform } from 'os';
import { EventEmitter } from 'events';

export interface WriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
  createDir?: boolean;
}

export interface CopyOptions {
  overwrite?: boolean;
  preserveTimestamps?: boolean;
  recursive?: boolean;
  filter?: (src: string, dest: string) => boolean;
}

export interface FileType {
  type: 'file' | 'directory' | 'symlink' | 'unknown';
  mimeType?: string;
  size?: number;
  isExecutable?: boolean;
}

export interface FileWatcherOptions {
  persistent?: boolean;
  recursive?: boolean;
  encoding?: BufferEncoding;
  interval?: number;
}

export interface FileWatcher extends EventEmitter {
  on(event: 'change', listener: (filename: string, stats: fs.Stats) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  close(): void;
}

class FileUtils {
  async readFileSafe(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
    try {
      const content = await fs.readFile(path, encoding);
      return content;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${path}`);
      }
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Permission denied: ${path}`);
      }
      throw new Error(`Failed to read file: ${path} - ${(error as Error).message}`);
    }
  }

  async writeFileSafe(path: string, data: Buffer | string, options: WriteOptions = {}): Promise<void> {
    const {
      encoding = 'utf8',
      mode = 0o666,
      flag = 'w',
      createDir = true
    } = options;

    try {
      if (createDir) {
        await this.ensureDirectory(dirname(path));
      }

      await fs.writeFile(path, data, { encoding, mode, flag });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        throw new Error(`Permission denied: ${path}`);
      }
      throw new Error(`Failed to write file: ${path} - ${(error as Error).message}`);
    }
  }

  async ensureDirectory(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw new Error(`Failed to create directory: ${path} - ${(error as Error).message}`);
      }
    }
  }

  async copyDirectory(source: string, target: string, options: CopyOptions = {}): Promise<void> {
    const {
      overwrite = true,
      preserveTimestamps = true,
      recursive = true,
      filter
    } = options;

    await this.ensureDirectory(target);

    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(source, entry.name);
      const destPath = join(target, entry.name);

      if (filter && !filter(srcPath, destPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (recursive) {
          await this.copyDirectory(srcPath, destPath, options);
        }
      } else {
        await this.copyFile(srcPath, destPath, { overwrite, preserveTimestamps });
      }
    }
  }

  async copyFile(source: string, target: string, options: { overwrite?: boolean; preserveTimestamps?: boolean } = {}): Promise<void> {
    const { overwrite = true, preserveTimestamps = true } = options;

    try {
      if (!overwrite) {
        try {
          await fs.access(target);
          throw new Error(`File already exists: ${target}`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      await this.ensureDirectory(dirname(target));

      const readStream = createReadStream(source);
      const writeStream = createWriteStream(target);

      await new Promise<void>((resolve, reject) => {
        readStream.pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });

      if (preserveTimestamps) {
        const stats = await fs.stat(source);
        await fs.utimes(target, stats.atime, stats.mtime);
      }
    } catch (error) {
      throw new Error(`Failed to copy file: ${source} -> ${target} - ${(error as Error).message}`);
    }
  }

  async detectFileType(path: string): Promise<FileType> {
    try {
      const stats = await fs.stat(path);
      let fileType: FileType = { type: 'unknown' };

      if (stats.isFile()) {
        fileType = {
          type: 'file',
          size: stats.size,
          mimeType: this.detectMimeType(path),
          isExecutable: await this.isExecutable(path)
        };
      } else if (stats.isDirectory()) {
        fileType = { type: 'directory' };
      } else if (stats.isSymbolicLink()) {
        fileType = { type: 'symlink' };
      }

      return fileType;
    } catch (error) {
      throw new Error(`Failed to detect file type: ${path} - ${(error as Error).message}`);
    }
  }

  async calculateFileHash(path: string, algorithm: string = 'sha256'): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash(algorithm);
      const stream = createReadStream(path);

      stream.on('data', (chunk: Buffer) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error: Error) => {
        reject(new Error(`Failed to calculate file hash: ${path} - ${error.message}`));
      });
    });
  }

  async findFiles(directory: string, pattern: RegExp | string, recursive: boolean = true): Promise<string[]> {
    const results: string[] = [];

    const search = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory() && recursive) {
            await search(fullPath);
          } else if (entry.isFile()) {
            const matches = typeof pattern === 'string' 
              ? entry.name.includes(pattern)
              : pattern.test(entry.name);

            if (matches) {
              results.push(fullPath);
            }
          }
        }
      } catch (error) {
        throw new Error(`Failed to search directory: ${dir} - ${(error as Error).message}`);
      }
    };

    await search(directory);
    return results;
  }

  async getFileSize(path: string): Promise<number> {
    try {
      const stats = await fs.stat(path);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${path} - ${(error as Error).message}`);
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async createTempFile(prefix: string = 'tmp', suffix: string = '', directory?: string): Promise<string> {
    const tempDir = directory || await this.getTempDirectory();
    await this.ensureDirectory(tempDir);

    const random = Math.random().toString(36).substring(2, 15);
    const filename = `${prefix}${random}${suffix}`;
    const filepath = join(tempDir, filename);

    await fs.writeFile(filepath, '');
    return filepath;
  }

  async createTempDirectory(prefix: string = 'tmp', directory?: string): Promise<string> {
    const tempDir = directory || await this.getTempDirectory();
    await this.ensureDirectory(tempDir);

    const random = Math.random().toString(36).substring(2, 15);
    const dirname = `${prefix}${random}`;
    const dirpath = join(tempDir, dirname);

    await fs.mkdir(dirpath, { recursive: true });
    return dirpath;
  }

  async getTempDirectory(): Promise<string> {
    const tempDirs = [
      process.env.TMPDIR,
      process.env.TMP,
      process.env.TEMP,
      '/tmp',
      './tmp'
    ];

    for (const tempDir of tempDirs) {
      if (tempDir && await this.directoryExists(tempDir)) {
        return tempDir;
      }
    }

    throw new Error('No suitable temporary directory found');
  }

  async removeFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to remove file: ${path} - ${(error as Error).message}`);
      }
    }
  }

  async removeDirectory(path: string, recursive: boolean = true): Promise<void> {
    try {
      if (recursive) {
        await fs.rm(path, { recursive: true, force: true });
      } else {
        await fs.rmdir(path);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to remove directory: ${path} - ${(error as Error).message}`);
      }
    }
  }

  async listDirectory(path: string, options: { recursive?: boolean; includeStats?: boolean } = {}): Promise<string[] | Array<{ path: string; stats: fs.Stats }>> {
    const { recursive = false, includeStats = false } = options;
    const results: any[] = [];

    const list = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (includeStats) {
            const stats = await fs.stat(fullPath);
            results.push({ path: fullPath, stats });
          } else {
            results.push(fullPath);
          }

          if (entry.isDirectory() && recursive) {
            await list(fullPath);
          }
        }
      } catch (error) {
        throw new Error(`Failed to list directory: ${dir} - ${(error as Error).message}`);
      }
    };

    await list(path);
    return results;
  }

  async moveFile(source: string, target: string, options: { overwrite?: boolean } = {}): Promise<void> {
    const { overwrite = true } = options;

    try {
      if (!overwrite && await this.fileExists(target)) {
        throw new Error(`Target file already exists: ${target}`);
      }

      await this.ensureDirectory(dirname(target));
      await fs.rename(source, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
        await this.copyFile(source, target, { overwrite });
        await this.removeFile(source);
      } else {
        throw new Error(`Failed to move file: ${source} -> ${target} - ${(error as Error).message}`);
      }
    }
  }

  async changePermissions(path: string, mode: number | string): Promise<void> {
    try {
      await chmod(path, mode);
    } catch (error) {
      throw new Error(`Failed to change permissions: ${path} - ${(error as Error).message}`);
    }
  }

  async isExecutable(path: string): Promise<boolean> {
    try {
      if (platform() === 'win32') {
        const ext = extname(path).toLowerCase();
        return ['.exe', '.cmd', '.bat', '.com'].includes(ext);
      } else {
        const stats = await fs.stat(path);
        return !!(stats.mode & 0o111);
      }
    } catch {
      return false;
    }
  }

  async getFileMetadata(path: string): Promise<{
    size: number;
    birthtime: Date;
    mtime: Date;
    atime: Date;
    mode: number;
    uid: number;
    gid: number;
  }> {
    try {
      const stats = await fs.stat(path);
      return {
        size: stats.size,
        birthtime: stats.birthtime,
        mtime: stats.mtime,
        atime: stats.atime,
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${path} - ${(error as Error).message}`);
    }
  }

  async watchFile(path: string, options: FileWatcherOptions = {}): Promise<FileWatcher> {
    const { persistent = true, recursive = false, encoding = 'utf8', interval = 5007 } = options;
    
    const watcher = new EventEmitter() as FileWatcher;
    let timeout: NodeJS.Timeout;
    let lastStats: fs.Stats | null = null;

    const checkFile = async () => {
      try {
        const stats = await fs.stat(path);
        
        if (lastStats && (stats.mtime.getTime() !== lastStats.mtime.getTime() || stats.size !== lastStats.size)) {
          watcher.emit('change', path, stats);
        }
        
        lastStats = stats;
      } catch (error) {
        watcher.emit('error', error as Error);
      }

      if (timeout) {
        timeout = setTimeout(checkFile, interval);
      }
    };

    timeout = setTimeout(checkFile, interval);

    watcher.close = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null as any;
      }
    };

    return watcher;
  }

  async compareFiles(file1: string, file2: string): Promise<boolean> {
    try {
      const [hash1, hash2] = await Promise.all([
        this.calculateFileHash(file1),
        this.calculateFileHash(file2)
      ]);
      
      return hash1 === hash2;
    } catch (error) {
      throw new Error(`Failed to compare files: ${file1} vs ${file2} - ${(error as Error).message}`);
    }
  }

  async splitFile(inputPath: string, outputDir: string, chunkSize: number): Promise<string[]> {
    const chunks: string[] = [];
    
    await this.ensureDirectory(outputDir);
    
    const stats = await fs.stat(inputPath);
    const totalChunks = Math.ceil(stats.size / chunkSize);
    const baseName = basename(inputPath);

    const readStream = createReadStream(inputPath, { highWaterMark: chunkSize });
    let chunkIndex = 0;

    return new Promise((resolve, reject) => {
      readStream.on('data', async (chunk: Buffer) => {
        const chunkPath = join(outputDir, `${baseName}.part${chunkIndex.toString().padStart(4, '0')}`);
        
        try {
          await this.writeFileSafe(chunkPath, chunk);
          chunks.push(chunkPath);
          chunkIndex++;
        } catch (error) {
          reject(error);
        }
      });

      readStream.on('end', () => {
        resolve(chunks);
      });

      readStream.on('error', (error: Error) => {
        reject(new Error(`Failed to split file: ${inputPath} - ${error.message}`));
      });
    });
  }

  async joinFiles(inputFiles: string[], outputPath: string): Promise<void> {
    const writeStream = createWriteStream(outputPath);

    for (const inputFile of inputFiles) {
      const readStream = createReadStream(inputFile);
      
      await new Promise<void>((resolve, reject) => {
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', resolve);
        readStream.on('error', reject);
      });
    }

    writeStream.end();
  }

  private detectMimeType(path: string): string {
    const ext = extname(path).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.jsx': 'application/javascript',
      '.tsx': 'application/typescript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.html': 'text/html',
      '.htm': 'text/html',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export class FileSystemMonitor {
  private watchers: Map<string, fs.FileHandle> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  async monitorFileChanges(path: string, callback: (changes: { type: string; path: string; stats: fs.Stats }) => void, interval: number = 1000): Promise<void> {
    let lastStats: fs.Stats | null = null;

    const checkFile = async () => {
      try {
        const stats = await fs.stat(path);
        
        if (!lastStats) {
          lastStats = stats;
          return;
        }

        if (stats.mtime.getTime() !== lastStats.mtime.getTime()) {
          callback({ type: 'modified', path, stats });
        }
        
        if (stats.size !== lastStats.size) {
          callback({ type: 'resized', path, stats });
        }
        
        lastStats = stats;
      } catch (error) {
        callback({ type: 'error', path, stats: {} as fs.Stats });
      }
    };

    const intervalId = setInterval(checkFile, interval);
    this.intervals.set(path, intervalId);

    await checkFile();
  }

  stopMonitoring(path: string): void {
    const intervalId = this.intervals.get(path);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(path);
    }
  }

  stopAllMonitoring(): void {
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId);
    }
    this.intervals.clear();
  }
}

export const fileUtils = new FileUtils();
export const fileSystemMonitor = new FileSystemMonitor();

export async function readFileSafe(path: string, encoding?: BufferEncoding): Promise<Buffer | string> {
  return fileUtils.readFileSafe(path, encoding);
}

export async function writeFileSafe(path: string, data: Buffer | string, options?: WriteOptions): Promise<void> {
  return fileUtils.writeFileSafe(path, data, options);
}

export async function ensureDirectory(path: string): Promise<void> {
  return fileUtils.ensureDirectory(path);
}

export async function copyDirectory(source: string, target: string, options?: CopyOptions): Promise<void> {
  return fileUtils.copyDirectory(source, target, options);
}

export async function copyFile(source: string, target: string, options?: { overwrite?: boolean; preserveTimestamps?: boolean }): Promise<void> {
  return fileUtils.copyFile(source, target, options);
}

export async function detectFileType(path: string): Promise<FileType> {
  return fileUtils.detectFileType(path);
}

export async function calculateFileHash(path: string, algorithm?: string): Promise<string> {
  return fileUtils.calculateFileHash(path, algorithm);
}

export async function findFiles(directory: string, pattern: RegExp | string, recursive?: boolean): Promise<string[]> {
  return fileUtils.findFiles(directory, pattern, recursive);
}

export async function getFileSize(path: string): Promise<number> {
  return fileUtils.getFileSize(path);
}

export async function fileExists(path: string): Promise<boolean> {
  return fileUtils.fileExists(path);
}

export async function directoryExists(path: string): Promise<boolean> {
  return fileUtils.directoryExists(path);
}

export async function createTempFile(prefix?: string, suffix?: string, directory?: string): Promise<string> {
  return fileUtils.createTempFile(prefix, suffix, directory);
}

export async function createTempDirectory(prefix?: string, directory?: string): Promise<string> {
  return fileUtils.createTempDirectory(prefix, directory);
}

export async function getTempDirectory(): Promise<string> {
  return fileUtils.getTempDirectory();
}

export async function removeFile(path: string): Promise<void> {
  return fileUtils.removeFile(path);
}

export async function removeDirectory(path: string, recursive?: boolean): Promise<void> {
  return fileUtils.removeDirectory(path, recursive);
}

export async function listDirectory(path: string, options?: { recursive?: boolean; includeStats?: boolean }): Promise<string[] | Array<{ path: string; stats: fs.Stats }>> {
  return fileUtils.listDirectory(path, options);
}

export async function moveFile(source: string, target: string, options?: { overwrite?: boolean }): Promise<void> {
  return fileUtils.moveFile(source, target, options);
}

export async function changePermissions(path: string, mode: number | string): Promise<void> {
  return fileUtils.changePermissions(path, mode);
}

export async function isExecutable(path: string): Promise<boolean> {
  return fileUtils.isExecutable(path);
}

export async function getFileMetadata(path: string): Promise<{
  size: number;
  birthtime: Date;
  mtime: Date;
  atime: Date;
  mode: number;
  uid: number;
  gid: number;
}> {
  return fileUtils.getFileMetadata(path);
}

export async function watchFile(path: string, options?: FileWatcherOptions): Promise<FileWatcher> {
  return fileUtils.watchFile(path, options);
}

export async function compareFiles(file1: string, file2: string): Promise<boolean> {
  return fileUtils.compareFiles(file1, file2);
}

export async function splitFile(inputPath: string, outputDir: string, chunkSize: number): Promise<string[]> {
  return fileUtils.splitFile(inputPath, outputDir, chunkSize);
}

export async function joinFiles(inputFiles: string[], outputPath: string): Promise<void> {
  return fileUtils.joinFiles(inputFiles, outputPath);
}