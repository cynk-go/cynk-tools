import { promises as fs } from 'fs';
import { join, dirname, extname } from 'path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { expand } from 'dotenv-expand';
import { config } from 'dotenv';

export interface ConfigSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, ConfigSchema>;
  items?: ConfigSchema;
  required?: string[];
  enum?: any[];
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'uri' | 'uuid' | 'date-time' | 'hostname' | 'ipv4' | 'ipv6';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PathValidation {
  valid: boolean;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  type: 'file' | 'directory' | 'unknown';
}

export interface ConfigOptions {
  envPrefix?: string;
  envFiles?: string[];
  strict?: boolean;
  caseSensitive?: boolean;
  allowUnknown?: boolean;
  coerceTypes?: boolean;
}

class ConfigUtils {
  private static readonly SUPPORTED_EXTENSIONS = ['.json', '.yaml', '.yml', '.js', '.cjs', '.mjs'];
  private static readonly DEFAULT_ENV_FILES = ['.env.local', '.env'];

  async loadConfig(filePath: string, schema?: ConfigSchema): Promise<any> {
    try {
      await this.validateConfigPath(filePath);

      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileExt = extname(filePath).toLowerCase();

      let configData: any;

      switch (fileExt) {
        case '.json':
          configData = JSON.parse(fileContent);
          break;
        case '.yaml':
        case '.yml':
          configData = parse(fileContent);
          break;
        case '.js':
        case '.cjs':
        case '.mjs':
          const module = require(filePath);
          configData = module.default || module;
          break;
        default:
          throw new Error(`Unsupported config file format: ${fileExt}`);
      }

      if (schema) {
        const validation = await this.validateConfig(configData, schema);
        if (!validation.valid) {
          throw new Error(`Config validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const resolvedConfig = await this.resolveEnvVars(configData);
      return resolvedConfig;
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${(error as Error).message}`);
    }
  }

  async validateConfig(configData: any, schema: ConfigSchema): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const zodSchema = this.convertToZodSchema(schema);
      const result = zodSchema.safeParse(configData);

      if (!result.success) {
        result.error.issues.forEach(issue => {
          const path = issue.path.join('.');
          errors.push(`[${path}]: ${issue.message}`);
        });
      }

      if (schema.required) {
        for (const requiredField of schema.required) {
          if (configData[requiredField] === undefined) {
            errors.push(`Missing required field: ${requiredField}`);
          }
        }
      }

      this.validateConfigValues(configData, schema, '', errors, warnings);
    } catch (error) {
      errors.push(`Schema validation error: ${(error as Error).message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async mergeConfigs(baseConfig: any, overrideConfig: any): Promise<any> {
    const mergeObjects = (target: any, source: any): any => {
      const result = { ...target };

      for (const key in source) {
        if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
          if (Array.isArray(source[key]) && Array.isArray(target[key])) {
            result[key] = [...target[key], ...source[key]];
          } else if (Array.isArray(source[key]) || Array.isArray(target[key])) {
            result[key] = source[key];
          } else {
            result[key] = mergeObjects(target[key], source[key]);
          }
        } else {
          result[key] = source[key];
        }
      }

      return result;
    };

    return mergeObjects(baseConfig, overrideConfig);
  }

  async resolveEnvVars(configData: any, options: ConfigOptions = {}): Promise<any> {
    const { envPrefix = '', envFiles = ConfigUtils.DEFAULT_ENV_FILES } = options;

    this.loadEnvFiles(envFiles);

    const resolveValue = (value: any): any => {
      if (typeof value === 'string') {
        return this.resolveEnvString(value, envPrefix);
      } else if (Array.isArray(value)) {
        return value.map(resolveValue);
      } else if (value && typeof value === 'object') {
        const resolved: any = {};
        for (const key in value) {
          resolved[key] = resolveValue(value[key]);
        }
        return resolved;
      }
      return value;
    };

    return resolveValue(configData);
  }

  async generateConfigTemplate(schema: ConfigSchema): Promise<string> {
    const generateTemplate = (currentSchema: ConfigSchema, path: string = ''): any => {
      if (currentSchema.type === 'object' && currentSchema.properties) {
        const template: any = {};
        for (const [key, propSchema] of Object.entries(currentSchema.properties)) {
          const fullPath = path ? `${path}.${key}` : key;
          template[key] = generateTemplate(propSchema, fullPath);
        }
        return template;
      } else if (currentSchema.type === 'array' && currentSchema.items) {
        return [generateTemplate(currentSchema.items, path)];
      } else {
        if (currentSchema.enum && currentSchema.enum.length > 0) {
          return `[${currentSchema.enum.map(val => JSON.stringify(val)).join(' | ')}]`;
        }
        return currentSchema.default !== undefined ? currentSchema.default : this.getTypeDefault(currentSchema.type);
      }
    };

    const template = generateTemplate(schema);
    return stringify(template, { indent: 2 });
  }

  async validateConfigPath(path: string): Promise<PathValidation> {
    const result: PathValidation = {
      valid: false,
      exists: false,
      readable: false,
      writable: false,
      type: 'unknown'
    };

    try {
      const stats = await fs.stat(path);
      result.exists = true;
      result.type = stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'unknown';

      try {
        await fs.access(path, constants.R_OK);
        result.readable = true;
      } catch {}

      try {
        await fs.access(path, constants.W_OK);
        result.writable = true;
      } catch {}

      result.valid = result.exists && result.readable;
    } catch {
      result.exists = false;
    }

    return result;
  }

  async saveConfig(configData: any, filePath: string, format: 'json' | 'yaml' = 'json'): Promise<void> {
    try {
      await this.ensureDirectory(dirname(filePath));

      let content: string;
      switch (format) {
        case 'json':
          content = JSON.stringify(configData, null, 2);
          break;
        case 'yaml':
          content = stringify(configData, { indent: 2 });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config to ${filePath}: ${(error as Error).message}`);
    }
  }

  async loadConfigFromDir(directory: string, schema?: ConfigSchema): Promise<any> {
    let configData: any = {};

    try {
      const files = await fs.readdir(directory);
      const configFiles = files.filter(file => 
        ConfigUtils.SUPPORTED_EXTENSIONS.includes(extname(file).toLowerCase())
      ).sort();

      for (const file of configFiles) {
        const filePath = join(directory, file);
        const fileConfig = await this.loadConfig(filePath);
        configData = await this.mergeConfigs(configData, fileConfig);
      }

      if (schema) {
        const validation = await this.validateConfig(configData, schema);
        if (!validation.valid) {
          throw new Error(`Config validation failed: ${validation.errors.join(', ')}`);
        }
      }

      return configData;
    } catch (error) {
      throw new Error(`Failed to load config from directory ${directory}: ${(error as Error).message}`);
    }
  }

  async watchConfig(filePath: string, callback: (config: any) => void): Promise<() => void> {
    const fs = require('fs').promises;

    let lastModified = 0;

    const checkForChanges = async () => {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() > lastModified) {
          lastModified = stats.mtime.getTime();
          const configData = await this.loadConfig(filePath);
          callback(configData);
        }
      } catch (error) {
        console.error(`Error watching config file ${filePath}:`, error);
      }
    };

    const interval = setInterval(checkForChanges, 5000);

    return () => {
      clearInterval(interval);
    };
  }

  private convertToZodSchema(schema: ConfigSchema): z.ZodTypeAny> {
    let zodSchema: z.ZodTypeAny>;

    switch (schema.type) {
      case 'string':
        zodSchema = z.string();
        if (schema.minLength !== undefined) {
          zodSchema = zodSchema.min(schema.minLength);
        }
        if (schema.maxLength !== undefined) {
          zodSchema = zodSchema.max(schema.maxLength);
        }
        if (schema.pattern) {
          zodSchema = zodSchema.regex(new RegExp(schema.pattern));
        }
        if (schema.format) {
          zodSchema = this.addFormatValidation(zodSchema, schema.format);
        }
        break;

      case 'number':
        zodSchema = z.number();
        if (schema.minimum !== undefined) {
          zodSchema = zodSchema.min(schema.minimum);
        }
        if (schema.maximum !== undefined) {
          zodSchema = zodSchema.max(schema.maximum);
        }
        break;

      case 'boolean':
        zodSchema = z.boolean();
        break;

      case 'array':
        zodSchema = z.array(
          schema.items ? this.convertToZodSchema(schema.items) : z.any()
        );
        break;

      case 'object':
        if (schema.properties) {
          const objectSchema: Record<string, z.ZodTypeAny> = {};
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            objectSchema[key] = this.convertToZodSchema(propSchema);
          }
          zodSchema = z.object(objectSchema);
        } else {
          zodSchema = z.record(z.any());
        }
        break;

      case 'null':
        zodSchema = z.null();
        break;

      default:
        zodSchema = z.any();
    }

    if (schema.enum && schema.enum.length > 0) {
      zodSchema = zodSchema.refine((val) => schema.enum!.includes(val), {
        message: `Value must be one of: ${schema.enum.join(', ')}`
      });
    }

    if (schema.default !== undefined) {
      zodSchema = zodSchema.default(schema.default);
    }

    return zodSchema;
  }

  private addFormatValidation(schema: z.ZodString, format: string): z.ZodString> {
    switch (format) {
      case 'email':
        return schema.email();
      case 'uri':
        return schema.url();
      case 'uuid':
        return schema.uuid();
      case 'date-time':
        return schema.datetime();
      case 'hostname':
        return schema.refine((val) => /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(val), {
          message: 'Invalid hostname format'
        });
      case 'ipv4':
        return schema.refine((val) => /^(\d{1,3}\.){3}\d{1,3}$/.test(val), {
          message: 'Invalid IPv4 address format'
        });
      case 'ipv6':
        return schema.refine((val) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(val), {
          message: 'Invalid IPv6 address format'
        });
      default:
        return schema;
    }
  }

  private validateConfigValues(config: any, schema: ConfigSchema, path: string, errors: string[], warnings: string[]): void {
    if (schema.type === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (config[key] === undefined) {
          if (schema.required?.includes(key)) {
            errors.push(`Missing required field: ${fullPath}`);
          }
        } else {
          this.validateConfigValues(config[key], propSchema, fullPath, errors, warnings);
        }
      }

      for (const key in config) {
        if (!schema.properties?.[key] && !schema.properties?.[key.toLowerCase()]) {
          warnings.push(`Unknown configuration field: ${path ? `${path}.${key}` : key}`);
        }
      }
    } else if (schema.type === 'array' && schema.items && Array.isArray(config)) {
      config.forEach((item, index) => {
        this.validateConfigValues(item, schema.items!, `${path}[${index}]`, errors, warnings);
      });
    } else {
      if (schema.enum && schema.enum.length > 0 && !schema.enum.includes(config)) {
        errors.push(`Invalid value for ${path}: must be one of ${schema.enum.join(', ')}`);
      }

      if (schema.type === 'string' && typeof config === 'string') {
        if (schema.minLength !== undefined && config.length < schema.minLength) {
          errors.push(`Value too short for ${path}: minimum length is ${schema.minLength}`);
        }
        if (schema.maxLength !== undefined && config.length > schema.maxLength) {
          errors.push(`Value too long for ${path}: maximum length is ${schema.maxLength}`);
        }
        if (schema.pattern && !new RegExp(schema.pattern).test(config)) {
          errors.push(`Value for ${path} does not match pattern: ${schema.pattern}`);
        }
      }

      if (schema.type === 'number' && typeof config === 'number') {
        if (schema.minimum !== undefined && config < schema.minimum) {
          errors.push(`Value too small for ${path}: minimum is ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && config > schema.maximum) {
          errors.push(`Value too large for ${path}: maximum is ${schema.maximum}`);
        }
      }
    }
  }

  private resolveEnvString(value: string, envPrefix: string): string {
    return value.replace(/\$\{?([A-Z_][A-Z0-9_]*)\}?/gi, (match, envVar) => {
      const fullEnvVar = envPrefix ? `${envPrefix}_${envVar}` : envVar;
      return process.env[fullEnvVar] || process.env[envVar] || match;
    });
  }

  private loadEnvFiles(envFiles: string[]): void {
    for (const envFile of envFiles) {
      try {
        const result = config({ path: envFile });
        if (result.parsed) {
          expand(result);
        }
      } catch {
      }
    }
  }

  private getTypeDefault(type: string): any {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'null':
        return null;
      default:
        return undefined;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

export class ConfigManager {
  private configUtils: ConfigUtils;
  private configCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTtl: number;

  constructor(cacheTtl: number = 300000) {
    this.configUtils = new ConfigUtils();
    this.cacheTtl = cacheTtl;
  }

  async getConfig(filePath: string, schema?: ConfigSchema, forceReload: boolean = false): Promise<any> {
    const cacheKey = `${filePath}:${JSON.stringify(schema)}`;
    
    if (!forceReload) {
      const cached = this.configCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.data;
      }
    }

    const configData = await this.configUtils.loadConfig(filePath, schema);
    this.configCache.set(cacheKey, { data: configData, timestamp: Date.now() });
    
    return configData;
  }

  async setConfig(filePath: string, configData: any, format: 'json' | 'yaml' = 'json'): Promise<void> {
    await this.configUtils.saveConfig(configData, filePath, format);
    
    const cacheKeys = Array.from(this.configCache.keys()).filter(key => key.startsWith(filePath));
    for (const key of cacheKeys) {
      this.configCache.delete(key);
    }
  }

  async updateConfig(filePath: string, updates: any, format: 'json' | 'yaml' = 'json'): Promise<void> {
    const currentConfig = await this.getConfig(filePath);
    const mergedConfig = await this.configUtils.mergeConfigs(currentConfig, updates);
    await this.setConfig(filePath, mergedConfig, format);
  }

  async validateConfigFile(filePath: string, schema: ConfigSchema): Promise<ValidationResult> {
    try {
      const configData = await this.configUtils.loadConfig(filePath);
      return await this.configUtils.validateConfig(configData, schema);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate config: ${(error as Error).message}`],
        warnings: []
      };
    }
  }

  clearCache(filePath?: string): void {
    if (filePath) {
      const cacheKeys = Array.from(this.configCache.keys()).filter(key => key.startsWith(filePath));
      for (const key of cacheKeys) {
        this.configCache.delete(key);
      }
    } else {
      this.configCache.clear();
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.configCache.size,
      keys: Array.from(this.configCache.keys())
    };
  }

  setCacheTtl(ttl: number): void {
    this.cacheTtl = ttl;
  }
}

export const configUtils = new ConfigUtils();
export const configManager = new ConfigManager();

export async function loadConfig(filePath: string, schema?: ConfigSchema): Promise<any> {
  return configUtils.loadConfig(filePath, schema);
}

export async function validateConfig(configData: any, schema: ConfigSchema): Promise<ValidationResult> {
  return configUtils.validateConfig(configData, schema);
}

export async function mergeConfigs(baseConfig: any, overrideConfig: any): Promise<any> {
  return configUtils.mergeConfigs(baseConfig, overrideConfig);
}

export async function resolveEnvVars(configData: any, options?: ConfigOptions): Promise<any> {
  return configUtils.resolveEnvVars(configData, options);
}

export async function generateConfigTemplate(schema: ConfigSchema): Promise<string> {
  return configUtils.generateConfigTemplate(schema);
}

export async function validateConfigPath(path: string): Promise<PathValidation> {
  return configUtils.validateConfigPath(path);
}

export async function saveConfig(configData: any, filePath: string, format?: 'json' | 'yaml'): Promise<void> {
  return configUtils.saveConfig(configData, filePath, format);
}

export async function loadConfigFromDir(directory: string, schema?: ConfigSchema): Promise<any> {
  return configUtils.loadConfigFromDir(directory, schema);
}

export async function watchConfig(filePath: string, callback: (config: any) => void): Promise<() => void> {
  return configUtils.watchConfig(filePath, callback);
}

export const CommonSchemas = {
  string: (options?: { minLength?: number; maxLength?: number; pattern?: string; format?: string }): ConfigSchema => ({
    type: 'string',
    minLength: options?.minLength,
    maxLength: options?.maxLength,
    pattern: options?.pattern,
    format: options?.format as any
  }),
  number: (options?: { minimum?: number; maximum?: number }): ConfigSchema => ({
    type: 'number',
    minimum: options?.minimum,
    maximum: options?.maximum
  }),
  boolean: (): ConfigSchema => ({ type: 'boolean' }),
  array: (items: ConfigSchema): ConfigSchema => ({ type: 'array', items }),
  object: (properties: Record<string, ConfigSchema>, required?: string[]): ConfigSchema => ({
    type: 'object',
    properties,
    required
  })
};