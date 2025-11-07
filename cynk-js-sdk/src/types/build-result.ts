import { z } from 'zod';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, relative, dirname, basename } from 'path';

export const BuildStatusSchema = z.enum(['success', 'failed', 'cancelled', 'pending']);
export const BuildTargetSchema = z.enum(['es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']);
export const ModuleFormatSchema = z.enum(['commonjs', 'module', 'umd', 'amd', 'system']);
export const OptimizationLevelSchema = z.enum(['none', 'basic', 'advanced']);

export const BuildArtifactSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  type: z.enum(['bundle', 'chunk', 'asset', 'sourcemap', 'declaration', 'metadata']),
  size: z.number().min(0),
  checksum: z.string().min(1),
  mimeType: z.string().optional(),
  encoding: z.string().default('utf-8'),
  integrity: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  entryPoint: z.boolean().default(false),
  compressed: z.boolean().default(false),
  lastModified: z.string().datetime()
});

export const CompileResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  errors: z.array(z.object({
    file: z.string().optional(),
    line: z.number().optional(),
    column: z.number().optional(),
    message: z.string(),
    code: z.string().optional(),
    severity: z.enum(['error', 'warning', 'info']).default('error')
  })).default([]),
  warnings: z.array(z.string()).default([]),
  duration: z.number().min(0),
  emittedFiles: z.array(z.string()).default([]),
  typeCheck: z.boolean().default(false),
  declarationFiles: z.array(z.string()).default([])
});

export const DependencyResolutionSchema = z.object({
  resolved: z.record(z.string(), z.string()),
  conflicts: z.array(z.object({
    package: z.string(),
    versions: z.array(z.string()),
    resolved: z.string().optional()
  })).default([]),
  tree: z.record(z.string(), z.object({
    version: z.string(),
    dependencies: z.record(z.string(), z.string())
  })),
  hoisted: z.array(z.string()).default([]),
  external: z.array(z.string()).default([]),
  peerDependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({})
});

export const OptimizationMetricsSchema = z.object({
  originalSize: z.number().min(0),
  optimizedSize: z.number().min(0),
  compressionRatio: z.number().min(0),
  treeshakenModules: z.number().min(0),
  removedExports: z.number().min(0),
  chunkCount: z.number().min(0),
  assetCount: z.number().min(0),
  bundleAnalysis: z.record(z.string(), z.number()).default({}),
  performanceScore: z.number().min(0).max(100),
  loadTimeEstimate: z.number().min(0)
});

export const BuildResultSchema = z.object({
  id: z.string().uuid(),
  status: BuildStatusSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  duration: z.number().min(0).optional(),
  artifacts: z.array(BuildArtifactSchema).default([]),
  compilation: CompileResultSchema.optional(),
  dependencies: DependencyResolutionSchema.optional(),
  optimization: OptimizationMetricsSchema.optional(),
  outputDir: z.string().min(1),
  buildConfig: z.record(z.any()).default({}),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  cacheHit: z.boolean().default(false),
  hash: z.string().min(1),
  signature: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export type BuildStatus = z.infer<typeof BuildStatusSchema>;
export type BuildTarget = z.infer<typeof BuildTargetSchema>;
export type ModuleFormat = z.infer<typeof ModuleFormatSchema>;
export type OptimizationLevel = z.infer<typeof OptimizationLevelSchema>;
export type BuildArtifact = z.infer<typeof BuildArtifactSchema>;
export type CompileResult = z.infer<typeof CompileResultSchema>;
export type DependencyResolution = z.infer<typeof DependencyResolutionSchema>;
export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;
export type BuildResult = z.infer<typeof BuildResultSchema>;

export class BuildResultValidator {
  static validateBuildResult(data: unknown): { success: boolean; result?: BuildResult; errors?: string[] } {
    try {
      const result = BuildResultSchema.parse(data);
      return { success: true, result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateBuildArtifact(data: unknown): { success: boolean; artifact?: BuildArtifact; errors?: string[] } {
    try {
      const artifact = BuildArtifactSchema.parse(data);
      return { success: true, artifact };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateCompileResult(data: unknown): { success: boolean; compilation?: CompileResult; errors?: string[] } {
    try {
      const compilation = CompileResultSchema.parse(data);
      return { success: true, compilation };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
}

export class BuildResultGenerator {
  static createBuildResult(outputDir: string, buildConfig: Record<string, any> = {}): BuildResult {
    const startTime = new Date().toISOString();
    
    return {
      id: this.generateUUID(),
      status: 'pending',
      startTime,
      outputDir,
      buildConfig,
      artifacts: [],
      hash: this.generateBuildHash(outputDir, buildConfig),
      metadata: {}
    };
  }

  static async createBuildArtifact(filePath: string, type: BuildArtifact['type'], entryPoint: boolean = false): Promise<BuildArtifact> {
    const stats = await fs.stat(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const checksum = createHash('sha256').update(fileBuffer).digest('hex');
    
    const mimeType = this.detectMimeType(filePath);
    const integrity = this.generateIntegrityHash(fileBuffer);
    
    return {
      id: this.generateUUID(),
      name: basename(filePath),
      path: filePath,
      type,
      size: stats.size,
      checksum,
      mimeType,
      integrity,
      dependencies: [],
      entryPoint,
      lastModified: stats.mtime.toISOString()
    };
  }

  static createCompileResult(success: boolean, duration: number, output?: string): CompileResult {
    return {
      success,
      output,
      duration,
      errors: [],
      warnings: [],
      emittedFiles: [],
      typeCheck: false,
      declarationFiles: []
    };
  }

  static createDependencyResolution(resolved: Record<string, string>): DependencyResolution {
    const tree: Record<string, { version: string; dependencies: Record<string, string> }> = {};
    const conflicts: Array<{ package: string; versions: string[]; resolved?: string }> = [];
    const versionMap = new Map<string, Set<string>>();

    for (const [pkg, version] of Object.entries(resolved)) {
      if (!versionMap.has(pkg)) {
        versionMap.set(pkg, new Set());
      }
      versionMap.get(pkg)!.add(version);
    }

    for (const [pkg, versions] of versionMap) {
      if (versions.size > 1) {
        conflicts.push({
          package: pkg,
          versions: Array.from(versions),
          resolved: resolved[pkg]
        });
      }

      tree[pkg] = {
        version: resolved[pkg],
        dependencies: {}
      };
    }

    return {
      resolved,
      conflicts,
      tree,
      hoisted: [],
      external: [],
      peerDependencies: {},
      devDependencies: {}
    };
  }

  static createOptimizationMetrics(originalSize: number, optimizedSize: number): OptimizationMetrics {
    const compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;
    const performanceScore = Math.max(0, Math.min(100, 100 - (compressionRatio * 100)));
    const loadTimeEstimate = optimizedSize / 1024 / 1024 * 100;

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      treeshakenModules: 0,
      removedExports: 0,
      chunkCount: 0,
      assetCount: 0,
      bundleAnalysis: {},
      performanceScore,
      loadTimeEstimate
    };
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private static generateBuildHash(outputDir: string, buildConfig: Record<string, any>): string {
    const configString = JSON.stringify(buildConfig);
    const input = `${outputDir}:${configString}:${Date.now()}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  private static detectMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'css': 'text/css',
      'html': 'text/html',
      'txt': 'text/plain',
      'map': 'application/json',
      'd.ts': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private static generateIntegrityHash(data: Buffer): string {
    const sha384 = createHash('sha384').update(data).digest('base64');
    return `sha384-${sha384}`;
  }
}

export class BuildResultAnalyzer {
  static calculateBuildDuration(result: BuildResult): number {
    if (result.endTime && result.startTime) {
      const start = new Date(result.startTime).getTime();
      const end = new Date(result.endTime).getTime();
      return end - start;
    }
    return 0;
  }

  static getArtifactByType(result: BuildResult, type: BuildArtifact['type']): BuildArtifact[] {
    return result.artifacts.filter(artifact => artifact.type === type);
  }

  static getEntryArtifacts(result: BuildResult): BuildArtifact[] {
    return result.artifacts.filter(artifact => artifact.entryPoint);
  }

  static getTotalSize(result: BuildResult): number {
    return result.artifacts.reduce((total, artifact) => total + artifact.size, 0);
  }

  static getSizeByType(result: BuildResult, type: BuildArtifact['type']): number {
    return this.getArtifactByType(result, type).reduce((total, artifact) => total + artifact.size, 0);
  }

  static getCompressionEfficiency(result: BuildResult): number {
    if (!result.optimization) return 0;
    return (1 - result.optimization.compressionRatio) * 100;
  }

  static hasErrors(result: BuildResult): boolean {
    return result.errors.length > 0 || 
           (result.compilation?.errors?.length || 0) > 0 ||
           result.status === 'failed';
  }

  static hasWarnings(result: BuildResult): boolean {
    return result.warnings.length > 0 || 
           (result.compilation?.warnings?.length || 0) > 0;
  }

  static getErrorSummary(result: BuildResult): { total: number; compilation: number; build: number; bySeverity: Record<string, number> } {
    const compilationErrors = result.compilation?.errors || [];
    const buildErrors = result.errors.length;
    const total = compilationErrors.length + buildErrors;

    const bySeverity = compilationErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      compilation: compilationErrors.length,
      build: buildErrors,
      bySeverity
    };
  }

  static findArtifactByName(result: BuildResult, name: string): BuildArtifact | undefined {
    return result.artifacts.find(artifact => artifact.name === name);
  }

  static findArtifactByPath(result: BuildResult, path: string): BuildArtifact | undefined {
    return result.artifacts.find(artifact => artifact.path === path);
  }

  static validateArtifactIntegrity(result: BuildResult): Array<{ artifact: BuildArtifact; valid: boolean; reason?: string }> {
    const validations: Array<{ artifact: BuildArtifact; valid: boolean; reason?: string }> = [];

    for (const artifact of result.artifacts) {
      try {
        const stats = fs.statSync(artifact.path);
        if (stats.size !== artifact.size) {
          validations.push({
            artifact,
            valid: false,
            reason: `Size mismatch: expected ${artifact.size}, got ${stats.size}`
          });
          continue;
        }

        const fileBuffer = fs.readFileSync(artifact.path);
        const currentChecksum = createHash('sha256').update(fileBuffer).digest('hex');
        
        if (currentChecksum !== artifact.checksum) {
          validations.push({
            artifact,
            valid: false,
            reason: 'Checksum mismatch'
          });
          continue;
        }

        if (artifact.integrity) {
          const currentIntegrity = this.generateIntegrityHash(fileBuffer);
          if (currentIntegrity !== artifact.integrity) {
            validations.push({
              artifact,
              valid: false,
              reason: 'Integrity hash mismatch'
            });
            continue;
          }
        }

        validations.push({ artifact, valid: true });
      } catch (error) {
        validations.push({
          artifact,
          valid: false,
          reason: `File access error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return validations;
  }

  private static generateIntegrityHash(data: Buffer): string {
    const sha384 = createHash('sha384').update(data).digest('base64');
    return `sha384-${sha384}`;
  }
}

export class BuildResultSerializer {
  static serializeBuildResult(result: BuildResult): string {
    return JSON.stringify(result, null, 2);
  }

  static deserializeBuildResult(jsonString: string): { success: boolean; result?: BuildResult; errors?: string[] } {
    try {
      const data = JSON.parse(jsonString);
      return BuildResultValidator.validateBuildResult(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
      return { success: false, errors: ['Failed to parse build result'] };
    }
  }

  static toSummary(result: BuildResult): Record<string, any> {
    const duration = BuildResultAnalyzer.calculateBuildDuration(result);
    const totalSize = BuildResultAnalyzer.getTotalSize(result);
    const hasErrors = BuildResultAnalyzer.hasErrors(result);
    const hasWarnings = BuildResultAnalyzer.hasWarnings(result);
    const errorSummary = BuildResultAnalyzer.getErrorSummary(result);
    const compressionEfficiency = BuildResultAnalyzer.getCompressionEfficiency(result);

    return {
      id: result.id,
      status: result.status,
      duration: `${duration}ms`,
      artifacts: result.artifacts.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      hasErrors,
      hasWarnings,
      errors: errorSummary.total,
      warnings: result.warnings.length + (result.compilation?.warnings.length || 0),
      compressionEfficiency: `${compressionEfficiency.toFixed(1)}%`,
      cacheHit: result.cacheHit,
      outputDir: result.outputDir
    };
  }

  static toCSV(result: BuildResult): string {
    const headers = ['Name', 'Type', 'Size', 'Checksum', 'Path', 'EntryPoint'];
    const artifacts = result.artifacts;
    
    const csvRows = [
      headers.join(','),
      ...artifacts.map(artifact => [
        `"${artifact.name.replace(/"/g, '""')}"`,
        artifact.type,
        artifact.size,
        artifact.checksum,
        `"${artifact.path.replace(/"/g, '""')}"`,
        artifact.entryPoint
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }

  static async saveToFile(result: BuildResult, filePath: string): Promise<void> {
    const serialized = this.serializeBuildResult(result);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, serialized, 'utf-8');
  }

  static async loadFromFile(filePath: string): Promise<{ success: boolean; result?: BuildResult; errors?: string[] }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.deserializeBuildResult(content);
    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to load build result: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }
}

export class BuildResultMerger {
  static mergeBuildResults(results: BuildResult[]): BuildResult {
    if (results.length === 0) {
      throw new Error('No build results to merge');
    }

    const baseResult = results[0];
    const mergedArtifacts: BuildArtifact[] = [];
    const mergedErrors: string[] = [];
    const mergedWarnings: string[] = [];
    
    let totalDuration = 0;
    let hasFailure = false;

    for (const result of results) {
      mergedArtifacts.push(...result.artifacts);
      mergedErrors.push(...result.errors);
      mergedWarnings.push(...result.warnings);
      totalDuration += BuildResultAnalyzer.calculateBuildDuration(result);
      
      if (result.status === 'failed') {
        hasFailure = true;
      }
    }

    const uniqueArtifacts = this.deduplicateArtifacts(mergedArtifacts);

    return {
      ...baseResult,
      id: BuildResultGenerator.generateUUID(),
      status: hasFailure ? 'failed' : 'success',
      artifacts: uniqueArtifacts,
      errors: mergedErrors,
      warnings: mergedWarnings,
      duration: totalDuration,
      endTime: new Date().toISOString(),
      hash: createHash('sha256')
        .update(uniqueArtifacts.map(a => a.checksum).join(''))
        .digest('hex')
        .substring(0, 16)
    };
  }

  private static deduplicateArtifacts(artifacts: BuildArtifact[]): BuildArtifact[] {
    const uniqueMap = new Map<string, BuildArtifact>();
    
    for (const artifact of artifacts) {
      const key = `${artifact.path}:${artifact.checksum}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, artifact);
      }
    }
    
    return Array.from(uniqueMap.values());
  }
}

export class BuildCacheManager {
  private cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  async getCachedResult(buildHash: string): Promise<BuildResult | null> {
    const cachePath = join(this.cacheDir, `${buildHash}.json`);
    
    try {
      const result = await BuildResultSerializer.loadFromFile(cachePath);
      if (result.success && result.result) {
        const integrityValid = BuildResultAnalyzer.validateArtifactIntegrity(result.result)
          .every(validation => validation.valid);
        
        if (integrityValid) {
          return result.result;
        }
      }
    } catch {
    }
    
    return null;
  }

  async cacheResult(result: BuildResult): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const cachePath = join(this.cacheDir, `${result.hash}.json`);
    await BuildResultSerializer.saveToFile(result, cachePath);
  }

  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(join(this.cacheDir, file));
        }
      }
    } catch {
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(join(this.cacheDir, file));
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }
}