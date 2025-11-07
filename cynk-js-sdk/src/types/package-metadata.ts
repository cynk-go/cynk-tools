import { z } from 'zod';
import { createHash } from 'crypto';
import { PluginManifest } from './plugin-manifest';
import { SecurityReport } from './security-report';
import { BuildResult } from './build-result';

export const ChecksumAlgorithmSchema = z.enum(['sha256', 'sha384', 'sha512', 'blake2b']);
export const SignatureAlgorithmSchema = z.enum(['rsa-pss', 'rsa', 'ecdsa', 'ed25519']);
export const PackageFormatVersionSchema = z.enum(['1.0.0', '1.1.0', '1.2.0']);

export const FileChecksumSchema = z.object({
  path: z.string().min(1),
  algorithm: ChecksumAlgorithmSchema,
  value: z.string().min(1),
  size: z.number().min(0),
  lastModified: z.string().datetime()
});

export const SignatureDataSchema = z.object({
  algorithm: SignatureAlgorithmSchema,
  value: z.string().min(1),
  certificate: z.string().optional(),
  chain: z.array(z.string()).default([]),
  timestamp: z.string().datetime(),
  signer: z.string().min(1),
  verified: z.boolean().default(false)
});

export const BuildInformationSchema = z.object({
  buildId: z.uuid(),
  buildTime: z.string().datetime(),
  buildTool: z.string().min(1),
  buildToolVersion: z.string().min(1),
  nodeVersion: z.string().min(1),
  platform: z.string().min(1),
  arch: z.string().min(1),
  dependenciesHash: z.string().min(1),
  environment: z.record(z.string()).default({})
});

export const ComplianceInfoSchema = z.object({
  standards: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  licenses: z.array(z.string()).default([]),
  auditDate: z.string().datetime().optional(),
  auditor: z.string().optional(),
  complianceLevel: z.enum(['compliant', 'partial', 'non-compliant']).default('non-compliant'),
  evidence: z.array(z.string()).default([])
});

export const PackageMetadataSchema = z.object({
  formatVersion: PackageFormatVersionSchema,
  packageId: z.string().uuid(),
  pluginId: z.string().uuid(),
  pluginVersion: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  manifest: z.any(),
  securityReport: z.any().optional(),
  buildInfo: BuildInformationSchema,
  fileChecksums: z.array(FileChecksumSchema).default([]),
  signatures: z.array(SignatureDataSchema).default([]),
  compliance: ComplianceInfoSchema,
  dependencies: z.array(z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    integrity: z.string().optional(),
    bundled: z.boolean().default(false)
  })).default([]),
  bundle: z.object({
    totalSize: z.number().min(0),
    fileCount: z.number().min(0),
    entryPoints: z.array(z.string()).default([]),
    formats: z.array(z.string()).default([]),
    compression: z.object({
      algorithm: z.string().optional(),
      ratio: z.number().min(0).max(1).optional()
    }).default({})
  }),
  provenance: z.object({
    source: z.string().optional(),
    repository: z.string().url().optional(),
    commit: z.string().optional(),
    builder: z.string().optional(),
    buildUrl: z.string().url().optional()
  }).default({}),
  metadata: z.record(z.any()).default({})
});

export type ChecksumAlgorithm = z.infer<typeof ChecksumAlgorithmSchema>;
export type SignatureAlgorithm = z.infer<typeof SignatureAlgorithmSchema>;
export type PackageFormatVersion = z.infer<typeof PackageFormatVersionSchema>;
export type FileChecksum = z.infer<typeof FileChecksumSchema>;
export type SignatureData = z.infer<typeof SignatureDataSchema>;
export type BuildInformation = z.infer<typeof BuildInformationSchema>;
export type ComplianceInfo = z.infer<typeof ComplianceInfoSchema>;
export type PackageMetadata = z.infer<typeof PackageMetadataSchema>;

export class PackageMetadataValidator {
  static validatePackageMetadata(data: unknown): { success: boolean; metadata?: PackageMetadata; errors?: string[] } {
    try {
      const metadata = PackageMetadataSchema.parse(data);
      return { success: true, metadata };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateFileChecksum(data: unknown): { success: boolean; checksum?: FileChecksum; errors?: string[] } {
    try {
      const checksum = FileChecksumSchema.parse(data);
      return { success: true, checksum };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateSignatureData(data: unknown): { success: boolean; signature?: SignatureData; errors?: string[] } {
    try {
      const signature = SignatureDataSchema.parse(data);
      return { success: true, signature };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
}

export class PackageMetadataGenerator {
  static generatePackageMetadata(
    pluginId: string,
    pluginVersion: string,
    manifest: PluginManifest,
    buildInfo: BuildInformation,
    securityReport?: SecurityReport
  ): PackageMetadata {
    const now = new Date().toISOString();
    
    return {
      formatVersion: '1.2.0',
      packageId: this.generateUUID(),
      pluginId,
      pluginVersion,
      createdAt: now,
      manifest,
      securityReport,
      buildInfo,
      fileChecksums: [],
      signatures: [],
      compliance: {
        standards: [],
        certifications: [],
        licenses: [manifest.metadata.license],
        complianceLevel: 'non-compliant'
      },
      dependencies: this.extractDependencies(manifest),
      bundle: {
        totalSize: 0,
        fileCount: 0,
        entryPoints: [manifest.entryPoint],
        formats: [manifest.build.format],
        compression: {}
      },
      provenance: {
        source: manifest.metadata.repository?.url,
        repository: manifest.metadata.repository?.url
      },
      metadata: {}
    };
  }

  static createBuildInformation(
    buildId: string,
    buildTool: string,
    buildToolVersion: string,
    nodeVersion: string,
    platform: string,
    arch: string
  ): BuildInformation {
    return {
      buildId,
      buildTime: new Date().toISOString(),
      buildTool,
      buildToolVersion,
      nodeVersion,
      platform,
      arch,
      dependenciesHash: '',
      environment: process.env
    };
  }

  static createFileChecksum(path: string, data: Buffer, algorithm: ChecksumAlgorithm = 'sha256'): FileChecksum {
    const hash = createHash(algorithm);
    hash.update(data);
    const value = hash.digest('hex');
    
    return {
      path,
      algorithm,
      value,
      size: data.length,
      lastModified: new Date().toISOString()
    };
  }

  static createSignatureData(
    algorithm: SignatureAlgorithm,
    value: string,
    signer: string,
    certificate?: string,
    chain: string[] = []
  ): SignatureData {
    return {
      algorithm,
      value,
      certificate,
      chain,
      timestamp: new Date().toISOString(),
      signer,
      verified: false
    };
  }

  static updateBundleInfo(metadata: PackageMetadata, buildResult: BuildResult): PackageMetadata {
    const totalSize = buildResult.artifacts.reduce((sum, artifact) => sum + artifact.size, 0);
    const fileCount = buildResult.artifacts.length;
    const entryPoints = buildResult.artifacts
      .filter(artifact => artifact.entryPoint)
      .map(artifact => artifact.name);
    
    const formats = Array.from(new Set(buildResult.artifacts.map(artifact => {
      const ext = artifact.name.split('.').pop();
      return ext || 'unknown';
    })));

    const compressionRatio = buildResult.optimization?.compressionRatio || 1;

    return {
      ...metadata,
      bundle: {
        ...metadata.bundle,
        totalSize,
        fileCount,
        entryPoints,
        formats,
        compression: {
          algorithm: 'gzip',
          ratio: compressionRatio
        }
      }
    };
  }

  static updateFileChecksums(metadata: PackageMetadata, checksums: FileChecksum[]): PackageMetadata {
    const checksumMap = new Map(metadata.fileChecksums.map(cs => [cs.path, cs]));
    
    for (const checksum of checksums) {
      checksumMap.set(checksum.path, checksum);
    }
    
    return {
      ...metadata,
      fileChecksums: Array.from(checksumMap.values())
    };
  }

  static addSignature(metadata: PackageMetadata, signature: SignatureData): PackageMetadata {
    return {
      ...metadata,
      signatures: [...metadata.signatures, signature],
      updatedAt: new Date().toISOString()
    };
  }

  static updateComplianceInfo(metadata: PackageMetadata, compliance: Partial<ComplianceInfo>): PackageMetadata {
    return {
      ...metadata,
      compliance: {
        ...metadata.compliance,
        ...compliance
      },
      updatedAt: new Date().toISOString()
    };
  }

  private static extractDependencies(manifest: PluginManifest): Array<{ name: string; version: string; integrity?: string; bundled: boolean }> {
    const dependencies: Array<{ name: string; version: string; integrity?: string; bundled: boolean }> = [];
    
    const processDependencyList = (deps: any[], bundled: boolean = false) => {
      for (const dep of deps) {
        dependencies.push({
          name: dep.name,
          version: dep.version,
          integrity: dep.integrity,
          bundled
        });
      }
    };
    
    processDependencyList(manifest.dependencies);
    processDependencyList(manifest.peerDependencies);
    processDependencyList(manifest.devDependencies, true);
    
    return dependencies;
  }

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export class PackageMetadataAnalyzer {
  static verifyFileIntegrity(metadata: PackageMetadata, fileData: Map<string, Buffer>): { valid: boolean; errors: Array<{ path: string; error: string }> } {
    const errors: Array<{ path: string; error: string }> = [];
    
    for (const checksum of metadata.fileChecksums) {
      const fileBuffer = fileData.get(checksum.path);
      
      if (!fileBuffer) {
        errors.push({ path: checksum.path, error: 'File not found' });
        continue;
      }
      
      if (fileBuffer.length !== checksum.size) {
        errors.push({ 
          path: checksum.path, 
          error: `Size mismatch: expected ${checksum.size}, got ${fileBuffer.length}` 
        });
        continue;
      }
      
      const hash = createHash(checksum.algorithm);
      hash.update(fileBuffer);
      const computedValue = hash.digest('hex');
      
      if (computedValue !== checksum.value) {
        errors.push({ 
          path: checksum.path, 
          error: `Checksum mismatch for algorithm ${checksum.algorithm}` 
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  static verifySignatures(metadata: PackageMetadata): { valid: boolean; verified: number; total: number; errors: string[] } {
    const errors: string[] = [];
    let verified = 0;
    
    for (const signature of metadata.signatures) {
      if (signature.verified) {
        verified++;
      } else {
        errors.push(`Signature from ${signature.signer} is not verified`);
      }
    }
    
    return {
      valid: verified === metadata.signatures.length && metadata.signatures.length > 0,
      verified,
      total: metadata.signatures.length,
      errors
    };
  }

  static getDependencyTree(metadata: PackageMetadata): Map<string, Set<string>> {
    const tree = new Map<string, Set<string>>();
    
    for (const dep of metadata.dependencies) {
      if (!tree.has(dep.name)) {
        tree.set(dep.name, new Set());
      }
      tree.get(dep.name)!.add(dep.version);
    }
    
    return tree;
  }

  static findConflictingDependencies(metadata: PackageMetadata): Array<{ name: string; versions: string[] }> {
    const tree = this.getDependencyTree(metadata);
    const conflicts: Array<{ name: string; versions: string[] }> = [];
    
    for (const [name, versions] of tree) {
      if (versions.size > 1) {
        conflicts.push({
          name,
          versions: Array.from(versions)
        });
      }
    }
    
    return conflicts;
  }

  static calculateBundleEfficiency(metadata: PackageMetadata): { efficiency: number; compressionRatio: number; fileCount: number; totalSize: number } {
    const totalSize = metadata.bundle.totalSize;
    const fileCount = metadata.bundle.fileCount;
    const compressionRatio = metadata.bundle.compression.ratio || 1;
    const efficiency = compressionRatio < 1 ? (1 - compressionRatio) * 100 : 0;
    
    return {
      efficiency,
      compressionRatio,
      fileCount,
      totalSize
    };
  }

  static getSecuritySummary(metadata: PackageMetadata): { hasSecurityReport: boolean; riskLevel?: string; vulnerabilities?: number } {
    if (!metadata.securityReport) {
      return { hasSecurityReport: false };
    }
    
    const securityReport = metadata.securityReport as SecurityReport;
    return {
      hasSecurityReport: true,
      riskLevel: securityReport.risk.riskLevel,
      vulnerabilities: securityReport.assessment.vulnerabilities.length
    };
  }

  static isCompliant(metadata: PackageMetadata, standards: string[]): boolean {
    if (standards.length === 0) return true;
    
    const missingStandards = standards.filter(standard => 
      !metadata.compliance.standards.includes(standard)
    );
    
    return missingStandards.length === 0 && metadata.compliance.complianceLevel === 'compliant';
  }

  static getPackageAge(metadata: PackageMetadata): number {
    const created = new Date(metadata.createdAt).getTime();
    const now = Date.now();
    return now - created;
  }
}

export class PackageMetadataSerializer {
  static serializeMetadata(metadata: PackageMetadata): string {
    return JSON.stringify(metadata, null, 2);
  }

  static deserializeMetadata(jsonString: string): { success: boolean; metadata?: PackageMetadata; errors?: string[] } {
    try {
      const data = JSON.parse(jsonString);
      return PackageMetadataValidator.validatePackageMetadata(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
      return { success: false, errors: ['Failed to parse package metadata'] };
    }
  }

  static toCompactRepresentation(metadata: PackageMetadata): Record<string, any> {
    const securitySummary = PackageMetadataAnalyzer.getSecuritySummary(metadata);
    const bundleEfficiency = PackageMetadataAnalyzer.calculateBundleEfficiency(metadata);
    const dependencyConflicts = PackageMetadataAnalyzer.findConflictingDependencies(metadata);
    
    return {
      packageId: metadata.packageId,
      pluginId: metadata.pluginId,
      pluginVersion: metadata.pluginVersion,
      formatVersion: metadata.formatVersion,
      createdAt: metadata.createdAt,
      bundle: {
        size: metadata.bundle.totalSize,
        files: metadata.bundle.fileCount,
        efficiency: `${bundleEfficiency.efficiency.toFixed(1)}%`
      },
      security: securitySummary,
      signatures: {
        count: metadata.signatures.length,
        verified: metadata.signatures.filter(s => s.verified).length
      },
      dependencies: {
        total: metadata.dependencies.length,
        conflicts: dependencyConflicts.length
      },
      compliance: metadata.compliance.complianceLevel
    };
  }

  static toBinaryFormat(metadata: PackageMetadata): Buffer {
    const serialized = this.serializeMetadata(metadata);
    const buffer = Buffer.from(serialized, 'utf-8');
    
    const header = Buffer.alloc(8);
    header.writeUInt32BE(0x43504B47, 0);
    header.writeUInt32BE(buffer.length, 4);
    
    return Buffer.concat([header, buffer]);
  }

  static fromBinaryFormat(data: Buffer): { success: boolean; metadata?: PackageMetadata; errors?: string[] } {
    try {
      const magic = data.readUInt32BE(0);
      if (magic !== 0x43504B47) {
        return { success: false, errors: ['Invalid binary format magic number'] };
      }
      
      const length = data.readUInt32BE(4);
      const jsonData = data.subarray(8, 8 + length).toString('utf-8');
      
      return this.deserializeMetadata(jsonData);
    } catch (error) {
      return { success: false, errors: ['Failed to parse binary format'] };
    }
  }
}

export class PackageMetadataManager {
  private metadata: PackageMetadata;

  constructor(metadata: PackageMetadata) {
    this.metadata = metadata;
  }

  getMetadata(): PackageMetadata {
    return this.metadata;
  }

  updateMetadata(updates: Partial<PackageMetadata>): void {
    this.metadata = {
      ...this.metadata,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  }

  addFileChecksum(checksum: FileChecksum): void {
    const existingIndex = this.metadata.fileChecksums.findIndex(cs => cs.path === checksum.path);
    
    if (existingIndex >= 0) {
      this.metadata.fileChecksums[existingIndex] = checksum;
    } else {
      this.metadata.fileChecksums.push(checksum);
    }
    
    this.metadata.updatedAt = new Date().toISOString();
  }

  addSignature(signature: SignatureData): void {
    this.metadata.signatures.push(signature);
    this.metadata.updatedAt = new Date().toISOString();
  }

  verifyIntegrity(fileData: Map<string, Buffer>): boolean {
    const result = PackageMetadataAnalyzer.verifyFileIntegrity(this.metadata, fileData);
    return result.valid;
  }

  getIntegrityReport(fileData: Map<string, Buffer>): { valid: boolean; errors: Array<{ path: string; error: string }> } {
    return PackageMetadataAnalyzer.verifyFileIntegrity(this.metadata, fileData);
  }

  getDependencyReport(): { total: number; bundled: number; conflicts: Array<{ name: string; versions: string[] }> } {
    const conflicts = PackageMetadataAnalyzer.findConflictingDependencies(this.metadata);
    const bundled = this.metadata.dependencies.filter(dep => dep.bundled).length;
    
    return {
      total: this.metadata.dependencies.length,
      bundled,
      conflicts
    };
  }

  serialize(): string {
    return PackageMetadataSerializer.serializeMetadata(this.metadata);
  }

  static deserialize(jsonString: string): { success: boolean; manager?: PackageMetadataManager; errors?: string[] } {
    const result = PackageMetadataSerializer.deserializeMetadata(jsonString);
    if (result.success && result.metadata) {
      return { success: true, manager: new PackageMetadataManager(result.metadata) };
    }
    return { success: false, errors: result.errors };
  }
}