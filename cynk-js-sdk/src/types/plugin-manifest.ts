import { z } from 'zod';

export const DependencySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  optional: z.boolean().default(false),
  integrity: z.string().optional(),
  dependencies: z.array(z.lazy(() => DependencySchema)).default([])
});

export const RuntimeRequirementSchema = z.object({
  node: z.string().optional(),
  cynk: z.string().optional(),
  os: z.array(z.string()).default([]),
  arch: z.array(z.string()).default([]),
  memory: z.number().optional(),
  storage: z.number().optional()
});

export const CompatibilityInfoSchema = z.object({
  minCynkVersion: z.string(),
  maxCynkVersion: z.string().optional(),
  testedVersions: z.array(z.string()).default([]),
  deprecated: z.boolean().default(false),
  migrationPath: z.string().optional()
});

export const PluginMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().max(1000).optional(),
  author: z.string().min(1).max(100),
  license: z.string().min(1),
  homepage: z.string().url().optional(),
  repository: z.object({
    type: z.string(),
    url: z.string().url()
  }).optional(),
  keywords: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([])
});

export const PluginManifestSchema = z.object({
  metadata: PluginMetadataSchema,
  entryPoint: z.string().min(1),
  dependencies: z.array(DependencySchema).default([]),
  peerDependencies: z.array(DependencySchema).default([]),
  devDependencies: z.array(DependencySchema).default([]),
  runtime: RuntimeRequirementSchema,
  compatibility: CompatibilityInfoSchema,
  permissions: z.array(z.string()).default([]),
  configuration: z.record(z.any()).default({}),
  hooks: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  build: z.object({
    target: z.string().default('es2020'),
    format: z.enum(['commonjs', 'module']).default('commonjs'),
    minify: z.boolean().default(false),
    sourceMap: z.boolean().default(true)
  }).default({}),
  signatures: z.array(z.object({
    algorithm: z.string(),
    value: z.string(),
    timestamp: z.string().datetime()
  })).default([])
});

export type Dependency = z.infer<typeof DependencySchema>;
export type RuntimeRequirement = z.infer<typeof RuntimeRequirementSchema>;
export type CompatibilityInfo = z.infer<typeof CompatibilityInfoSchema>;
export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export class ManifestValidator {
  static validateManifest(data: unknown): { success: boolean; manifest?: PluginManifest; errors?: string[] } {
    try {
      const manifest = PluginManifestSchema.parse(data);
      return { success: true, manifest };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateMetadata(metadata: unknown): { success: boolean; metadata?: PluginMetadata; errors?: string[] } {
    try {
      const validated = PluginMetadataSchema.parse(metadata);
      return { success: true, metadata: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateDependencies(dependencies: unknown): { success: boolean; dependencies?: Dependency[]; errors?: string[] } {
    try {
      const validated = z.array(DependencySchema).parse(dependencies);
      return { success: true, dependencies: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  static validateRuntimeRequirements(runtime: unknown): { success: boolean; runtime?: RuntimeRequirement; errors?: string[] } {
    try {
      const validated = RuntimeRequirementSchema.parse(runtime);
      return { success: true, runtime: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }
}

export class ManifestParser {
  static parseManifest(jsonString: string): { success: boolean; manifest?: PluginManifest; errors?: string[] } {
    try {
      const data = JSON.parse(jsonString);
      return ManifestValidator.validateManifest(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { success: false, errors: ['Invalid JSON format'] };
      }
      return { success: false, errors: ['Failed to parse manifest'] };
    }
  }

  static serializeManifest(manifest: PluginManifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  static extractMetadata(manifest: PluginManifest): PluginMetadata {
    return manifest.metadata;
  }

  static extractDependencies(manifest: PluginManifest): { dependencies: Dependency[]; peerDependencies: Dependency[]; devDependencies: Dependency[] } {
    return {
      dependencies: manifest.dependencies,
      peerDependencies: manifest.peerDependencies,
      devDependencies: manifest.devDependencies
    };
  }
}

export class DependencyResolver {
  static flattenDependencies(dependencies: Dependency[]): Map<string, string> {
    const result = new Map<string, string>();
    
    const processDependency = (dep: Dependency) => {
      if (!result.has(dep.name) || !dep.optional) {
        result.set(dep.name, dep.version);
      }
      
      for (const subDep of dep.dependencies) {
        processDependency(subDep);
      }
    };
    
    for (const dep of dependencies) {
      processDependency(dep);
    }
    
    return result;
  }

  static findDependency(dependencies: Dependency[], name: string): Dependency | undefined {
    for (const dep of dependencies) {
      if (dep.name === name) {
        return dep;
      }
      
      const foundInSub = this.findDependency(dep.dependencies, name);
      if (foundInSub) {
        return foundInSub;
      }
    }
    
    return undefined;
  }

  static validateDependencyTree(dependencies: Dependency[]): { valid: boolean; cycles: string[][]; conflicts: Array<{ name: string; versions: string[] }> } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const versionMap = new Map<string, Set<string>>();
    const cycles: string[][] = [];
    const conflicts: Array<{ name: string; versions: string[] }> = [];

    const dfs = (dep: Dependency, path: string[]) => {
      const currentPath = [...path, dep.name];
      
      if (recursionStack.has(dep.name)) {
        cycles.push([...currentPath]);
        return;
      }
      
      if (visited.has(dep.name)) {
        return;
      }
      
      visited.add(dep.name);
      recursionStack.add(dep.name);
      
      if (!versionMap.has(dep.name)) {
        versionMap.set(dep.name, new Set());
      }
      versionMap.get(dep.name)!.add(dep.version);
      
      for (const subDep of dep.dependencies) {
        dfs(subDep, currentPath);
      }
      
      recursionStack.delete(dep.name);
    };

    for (const dep of dependencies) {
      if (!visited.has(dep.name)) {
        dfs(dep, []);
      }
    }

    for (const [name, versions] of versionMap) {
      if (versions.size > 1) {
        conflicts.push({ name, versions: Array.from(versions) });
      }
    }

    return {
      valid: cycles.length === 0 && conflicts.length === 0,
      cycles,
      conflicts
    };
  }
}

export class CompatibilityChecker {
  static checkRuntimeCompatibility(requirements: RuntimeRequirement, current: { node: string; cynk: string; os: string; arch: string }): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    if (requirements.node) {
      if (!this.satisfiesVersion(current.node, requirements.node)) {
        issues.push(`Node.js version ${current.node} does not satisfy requirement: ${requirements.node}`);
      }
    }

    if (requirements.cynk) {
      if (!this.satisfiesVersion(current.cynk, requirements.cynk)) {
        issues.push(`Cynk version ${current.cynk} does not satisfy requirement: ${requirements.cynk}`);
      }
    }

    if (requirements.os.length > 0 && !requirements.os.includes(current.os)) {
      issues.push(`OS ${current.os} is not in supported list: ${requirements.os.join(', ')}`);
    }

    if (requirements.arch.length > 0 && !requirements.arch.includes(current.arch)) {
      issues.push(`Architecture ${current.arch} is not in supported list: ${requirements.arch.join(', ')}`);
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  static checkCompatibilityInfo(compatibility: CompatibilityInfo, cynkVersion: string): { compatible: boolean; deprecated: boolean; migrationRequired: boolean; issues: string[] } {
    const issues: string[] = [];
    let deprecated = compatibility.deprecated;
    let migrationRequired = false;

    if (!this.satisfiesVersion(cynkVersion, compatibility.minCynkVersion)) {
      issues.push(`Cynk version ${cynkVersion} is below minimum required version ${compatibility.minCynkVersion}`);
    }

    if (compatibility.maxCynkVersion && !this.satisfiesVersion(cynkVersion, `<=${compatibility.maxCynkVersion}`)) {
      issues.push(`Cynk version ${cynkVersion} exceeds maximum supported version ${compatibility.maxCynkVersion}`);
      migrationRequired = true;
    }

    if (compatibility.deprecated) {
      issues.push('This plugin version is deprecated');
      if (compatibility.migrationPath) {
        issues.push(`Migration path: ${compatibility.migrationPath}`);
      }
    }

    return {
      compatible: issues.length === 0,
      deprecated,
      migrationRequired,
      issues
    };
  }

  private static satisfiesVersion(version: string, range: string): boolean {
    try {
      const semver = require('semver');
      return semver.satisfies(version, range);
    } catch {
      return this.basicVersionCheck(version, range);
    }
  }

  private static basicVersionCheck(version: string, range: string): boolean {
    const cleanVersion = version.replace(/^[vV]/, '');
    const cleanRange = range.replace(/^[vV]/, '');
    
    if (cleanRange.startsWith('>=')) {
      const minVersion = cleanRange.slice(2);
      return this.compareVersions(cleanVersion, minVersion) >= 0;
    } else if (cleanRange.startsWith('<=')) {
      const maxVersion = cleanRange.slice(2);
      return this.compareVersions(cleanVersion, maxVersion) <= 0;
    } else if (cleanRange.startsWith('>')) {
      const minVersion = cleanRange.slice(1);
      return this.compareVersions(cleanVersion, minVersion) > 0;
    } else if (cleanRange.startsWith('<')) {
      const maxVersion = cleanRange.slice(1);
      return this.compareVersions(cleanVersion, maxVersion) < 0;
    } else if (cleanRange.startsWith('^')) {
      const baseVersion = cleanRange.slice(1);
      return this.caretRangeCheck(cleanVersion, baseVersion);
    } else if (cleanRange.startsWith('~')) {
      const baseVersion = cleanRange.slice(1);
      return this.tildeRangeCheck(cleanVersion, baseVersion);
    } else {
      return this.compareVersions(cleanVersion, cleanRange) === 0;
    }
  }

  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(part => parseInt(part, 10) || 0);
    const parts2 = v2.split('.').map(part => parseInt(part, 10) || 0);
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  private static caretRangeCheck(version: string, base: string): boolean {
    const vParts = version.split('.').map(part => parseInt(part, 10) || 0);
    const bParts = base.split('.').map(part => parseInt(part, 10) || 0);
    
    if (bParts[0] === 0) {
      if (bParts[1] === 0) {
        return vParts[0] === 0 && vParts[1] === 0 && vParts[2] === bParts[2];
      }
      return vParts[0] === 0 && vParts[1] === bParts[1] && vParts[2] >= bParts[2];
    }
    
    return vParts[0] === bParts[0] && this.compareVersions(version, base) >= 0;
  }

  private static tildeRangeCheck(version: string, base: string): boolean {
    const vParts = version.split('.').map(part => parseInt(part, 10) || 0);
    const bParts = base.split('.').map(part => parseInt(part, 10) || 0);
    
    return vParts[0] === bParts[0] && vParts[1] === bParts[1] && vParts[2] >= bParts[2];
  }
}

export class ManifestBuilder {
  static createDefaultManifest(): PluginManifest {
    return {
      metadata: {
        id: this.generateUUID(),
        name: '',
        version: '0.1.0',
        author: '',
        license: 'MIT'
      },
      entryPoint: 'index.js',
      dependencies: [],
      peerDependencies: [],
      devDependencies: [],
      runtime: {
        os: [],
        arch: []
      },
      compatibility: {
        minCynkVersion: '1.0.0',
        testedVersions: [],
        deprecated: false
      },
      permissions: [],
      configuration: {},
      hooks: [],
      capabilities: [],
      build: {
        target: 'es2020',
        format: 'commonjs',
        minify: false,
        sourceMap: true
      },
      signatures: []
    };
  }

  static mergeManifests(base: PluginManifest, overrides: Partial<PluginManifest>): PluginManifest {
    return {
      ...base,
      ...overrides,
      metadata: { ...base.metadata, ...overrides.metadata },
      runtime: { ...base.runtime, ...overrides.runtime },
      compatibility: { ...base.compatibility, ...overrides.compatibility },
      build: { ...base.build, ...overrides.build },
      dependencies: overrides.dependencies ?? base.dependencies,
      peerDependencies: overrides.peerDependencies ?? base.peerDependencies,
      devDependencies: overrides.devDependencies ?? base.devDependencies,
      permissions: overrides.permissions ?? base.permissions,
      configuration: overrides.configuration ?? base.configuration,
      hooks: overrides.hooks ?? base.hooks,
      capabilities: overrides.capabilities ?? base.capabilities,
      signatures: overrides.signatures ?? base.signatures
    };
  }

  static updateMetadata(manifest: PluginManifest, updates: Partial<PluginMetadata>): PluginManifest {
    return {
      ...manifest,
      metadata: { ...manifest.metadata, ...updates }
    };
  }

  static addDependency(manifest: PluginManifest, dependency: Dependency, type: 'dependencies' | 'peerDependencies' | 'devDependencies' = 'dependencies'): PluginManifest {
    const existingIndex = manifest[type].findIndex(dep => dep.name === dependency.name);
    
    if (existingIndex >= 0) {
      const updated = [...manifest[type]];
      updated[existingIndex] = dependency;
      return { ...manifest, [type]: updated };
    }
    
    return { ...manifest, [type]: [...manifest[type], dependency] };
  }

  static removeDependency(manifest: PluginManifest, name: string, type: 'dependencies' | 'peerDependencies' | 'devDependencies' = 'dependencies'): PluginManifest {
    return {
      ...manifest,
      [type]: manifest[type].filter(dep => dep.name !== name)
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