import { z } from 'zod';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { isIP, isFQDN, isEmail, isURL, isHexadecimal, isISO8601, isISO31661Alpha2, isISO31661Alpha3 } from 'validator';
import { parse, isValid } from 'date-fns';

export interface ValidationRule {
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  value: any;
  rule: string;
}

export interface SchemaValidation {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

export interface TypeValidation {
  valid: boolean;
  expected: string;
  actual: string;
}

export interface Constraint {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not-in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface ConstraintValidation {
  valid: boolean;
  violations: Array<{ constraint: Constraint; actual: any }>;
}

export interface Validator {
  (value: any): ValidationResult;
}

class ValidationUtils {
  validateInput(input: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const result = this.applyRule(input, rule, '');
      if (!result.valid) {
        errors.push(...result.errors);
      }
      warnings.push(...result.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async checkSchema(data: any, schema: any): Promise<SchemaValidation> {
    try {
      let zodSchema: z.ZodTypeAny;

      if (schema instanceof z.ZodType) {
        zodSchema = schema;
      } else {
        zodSchema = this.convertToZodSchema(schema);
      }

      const result = zodSchema.safeParse(data);

      if (result.success) {
        return {
          valid: true,
          errors: [],
          data: result.data
        };
      } else {
        const errors: ValidationError[] = result.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          value: this.getValueByPath(data, issue.path),
          rule: issue.code
        }));

        return {
          valid: false,
          errors
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Schema validation error: ${(error as Error).message}`,
          value: data,
          rule: 'schema_error'
        }]
      };
    }
  }

  validateDataType(value: any, expectedType: string): TypeValidation {
    let actualType = typeof value;
    
    if (value === null) {
      actualType = 'null';
    } else if (Array.isArray(value)) {
      actualType = 'array';
    } else if (value instanceof Date) {
      actualType = 'date';
    }

    const valid = this.isTypeMatch(actualType, expectedType);

    return {
      valid,
      expected: expectedType,
      actual: actualType
    };
  }

  enforceConstraints(data: any, constraints: Constraint[]): ConstraintValidation {
    const violations: Array<{ constraint: Constraint; actual: any }> = [];

    for (const constraint of constraints) {
      const value = this.getValueByPath(data, constraint.field.split('.'));
      const isValid = this.checkConstraint(value, constraint);

      if (!isValid) {
        violations.push({
          constraint,
          actual: value
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => {
      const path = error.path ? `[${error.path}]` : '';
      return `${path} ${error.message} (value: ${JSON.stringify(error.value)})`;
    }).join('\n');
  }

  createValidator(rules: ValidationRule[]): Validator {
    return (value: any): ValidationResult => {
      return this.validateInput(value, rules);
    };
  }

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!email) {
      errors.push({
        path: 'email',
        message: 'Email is required',
        value: email,
        rule: 'required'
      });
    } else if (!isEmail(email)) {
      errors.push({
        path: 'email',
        message: 'Invalid email format',
        value: email,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateURL(url: string, options: { protocols?: string[]; requireProtocol?: boolean } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!url) {
      errors.push({
        path: 'url',
        message: 'URL is required',
        value: url,
        rule: 'required'
      });
    } else if (!isURL(url, options)) {
      errors.push({
        path: 'url',
        message: 'Invalid URL format',
        value: url,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateUUID(uuid: string, version?: 1 | 2 | 3 | 4 | 5): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!uuid) {
      errors.push({
        path: 'uuid',
        message: 'UUID is required',
        value: uuid,
        rule: 'required'
      });
    } else if (!uuidValidate(uuid)) {
      errors.push({
        path: 'uuid',
        message: 'Invalid UUID format',
        value: uuid,
        rule: 'format'
      });
    } else if (version && uuidVersion(uuid) !== version) {
      errors.push({
        path: 'uuid',
        message: `UUID must be version ${version}`,
        value: uuid,
        rule: 'version'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateIP(ip: string, version?: 4 | 6): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!ip) {
      errors.push({
        path: 'ip',
        message: 'IP address is required',
        value: ip,
        rule: 'required'
      });
    } else if (!isIP(ip, version)) {
      errors.push({
        path: 'ip',
        message: version ? `Invalid IPv${version} address` : 'Invalid IP address',
        value: ip,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateDomain(domain: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!domain) {
      errors.push({
        path: 'domain',
        message: 'Domain is required',
        value: domain,
        rule: 'required'
      });
    } else if (!isFQDN(domain)) {
      errors.push({
        path: 'domain',
        message: 'Invalid domain format',
        value: domain,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateDate(date: string | Date, format?: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!date) {
      errors.push({
        path: 'date',
        message: 'Date is required',
        value: date,
        rule: 'required'
      });
    } else {
      let parsedDate: Date | null = null;
      
      if (date instanceof Date) {
        parsedDate = date;
      } else if (format) {
        parsedDate = parse(date, format, new Date());
      } else {
        parsedDate = new Date(date);
      }
      
      if (!isValid(parsedDate)) {
        errors.push({
          path: 'date',
          message: 'Invalid date format',
          value: date,
          rule: 'format'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateHex(color: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!color) {
      errors.push({
        path: 'color',
        message: 'Hex color is required',
        value: color,
        rule: 'required'
      });
    } else if (!isHexadecimal(color)) {
      errors.push({
        path: 'color',
        message: 'Invalid hex color format',
        value: color,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateISO8601(dateString: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!dateString) {
      errors.push({
        path: 'date',
        message: 'Date string is required',
        value: dateString,
        rule: 'required'
      });
    } else if (!isISO8601(dateString)) {
      errors.push({
        path: 'date',
        message: 'Invalid ISO 8601 date format',
        value: dateString,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateCountryCode(code: string, format: 'alpha2' | 'alpha3' = 'alpha2'): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!code) {
      errors.push({
        path: 'country',
        message: 'Country code is required',
        value: code,
        rule: 'required'
      });
    } else if (format === 'alpha2' && !isISO31661Alpha2(code)) {
      errors.push({
        path: 'country',
        message: 'Invalid ISO 3166-1 alpha-2 country code',
        value: code,
        rule: 'format'
      });
    } else if (format === 'alpha3' && !isISO31661Alpha3(code)) {
      errors.push({
        path: 'country',
        message: 'Invalid ISO 3166-1 alpha-3 country code',
        value: code,
        rule: 'format'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateRange(value: number, min: number, max: number): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (value < min) {
      errors.push({
        path: 'value',
        message: `Value must be at least ${min}`,
        value,
        rule: 'min'
      });
    }
    
    if (value > max) {
      errors.push({
        path: 'value',
        message: `Value must be at most ${max}`,
        value,
        rule: 'max'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateLength(value: string, minLength: number, maxLength: number): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (value.length < minLength) {
      errors.push({
        path: 'value',
        message: `Value must be at least ${minLength} characters long`,
        value,
        rule: 'minLength'
      });
    }
    
    if (value.length > maxLength) {
      errors.push({
        path: 'value',
        message: `Value must be at most ${maxLength} characters long`,
        value,
        rule: 'maxLength'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validatePattern(value: string, pattern: RegExp): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!pattern.test(value)) {
      errors.push({
        path: 'value',
        message: `Value does not match required pattern: ${pattern}`,
        value,
        rule: 'pattern'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  validateEnum(value: any, allowedValues: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!allowedValues.includes(value)) {
      errors.push({
        path: 'value',
        message: `Value must be one of: ${allowedValues.join(', ')}`,
        value,
        rule: 'enum'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private applyRule(value: any, rule: ValidationRule, path: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        path,
        message: rule.message || 'Value is required',
        value,
        rule: 'required'
      });
      return { valid: false, errors, warnings };
    }

    if (value === undefined || value === null) {
      return { valid: true, errors, warnings };
    }

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            path,
            message: rule.message || 'Value must be a string',
            value,
            rule: 'type'
          });
        } else {
          if (rule.minLength !== undefined && value.length < rule.minLength) {
            errors.push({
              path,
              message: rule.message || `String must be at least ${rule.minLength} characters long`,
              value,
              rule: 'minLength'
            });
          }
          if (rule.maxLength !== undefined && value.length > rule.maxLength) {
            errors.push({
              path,
              message: rule.message || `String must be at most ${rule.maxLength} characters long`,
              value,
              rule: 'maxLength'
            });
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push({
              path,
              message: rule.message || 'String does not match required pattern',
              value,
              rule: 'pattern'
            });
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            path,
            message: rule.message || 'Value must be a number',
            value,
            rule: 'type'
          });
        } else {
          if (rule.min !== undefined && value < rule.min) {
            errors.push({
              path,
              message: rule.message || `Number must be at least ${rule.min}`,
              value,
              rule: 'min'
            });
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push({
              path,
              message: rule.message || `Number must be at most ${rule.max}`,
              value,
              rule: 'max'
            });
          }
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            path,
            message: rule.message || 'Value must be a boolean',
            value,
            rule: 'type'
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            path,
            message: rule.message || 'Value must be an array',
            value,
            rule: 'type'
          });
        } else {
          if (rule.min !== undefined && value.length < rule.min) {
            errors.push({
              path,
              message: rule.message || `Array must have at least ${rule.min} items`,
              value,
              rule: 'min'
            });
          }
          if (rule.max !== undefined && value.length > rule.max) {
            errors.push({
              path,
              message: rule.message || `Array must have at most ${rule.max} items`,
              value,
              rule: 'max'
            });
          }
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            path,
            message: rule.message || 'Value must be an object',
            value,
            rule: 'type'
          });
        }
        break;

      case 'date':
        const date = new Date(value);
        if (!isValid(date)) {
          errors.push({
            path,
            message: rule.message || 'Value must be a valid date',
            value,
            rule: 'type'
          });
        }
        break;

      case 'enum':
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push({
            path,
            message: rule.message || `Value must be one of: ${rule.enum.join(', ')}`,
            value,
            rule: 'enum'
          });
        }
        break;

      case 'custom':
        if (rule.custom && !rule.custom(value)) {
          errors.push({
            path,
            message: rule.message || 'Value failed custom validation',
            value,
            rule: 'custom'
          });
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private convertToZodSchema(schema: any): <z.ZodTypeAny> {
    if (schema.type === 'string') {
      let zodSchema: z.ZodString = z.string();
      
      if (schema.minLength !== undefined) {
        zodSchema = zodSchema.min(schema.minLength);
      }
      if (schema.maxLength !== undefined) {
        zodSchema = zodSchema.max(schema.maxLength);
      }
      if (schema.pattern) {
        zodSchema = zodSchema.regex(new RegExp(schema.pattern));
      }
      if (schema.format === 'email') {
        zodSchema = zodSchema.email();
      }
      if (schema.format === 'url') {
        zodSchema = zodSchema.url();
      }
      if (schema.format === 'uuid') {
        zodSchema = zodSchema.uuid();
      }
      
      return zodSchema;
    }

    if (schema.type === 'number') {
      let zodSchema: z.ZodNumber = z.number();
      
      if (schema.minimum !== undefined) {
        zodSchema = zodSchema.min(schema.minimum);
      }
      if (schema.maximum !== undefined) {
        zodSchema = zodSchema.max(schema.maximum);
      }
      
      return zodSchema;
    }

    if (schema.type === 'boolean') {
      return z.boolean();
    }

    if (schema.type === 'array') {
      return z.array(
        schema.items ? this.convertToZodSchema(schema.items) : z.any()
      );
    }

    if (schema.type === 'object') {
      if (schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          shape[key] = this.convertToZodSchema(propSchema);
        }
        return z.object(shape);
      }
      return z.record(z.any());
    }

    return z.any();
  }

  private isTypeMatch(actual: string, expected: string): boolean {
    const typeMap: Record<string, string[]> = {
      'string': ['string'],
      'number': ['number'],
      'boolean': ['boolean'],
      'array': ['array'],
      'object': ['object'],
      'null': ['null'],
      'date': ['date', 'string', 'object'],
      'any': ['string', 'number', 'boolean', 'array', 'object', 'null', 'date']
    };

    const allowedTypes = typeMap[expected] || [expected];
    return allowedTypes.includes(actual);
  }

  private checkConstraint(value: any, constraint: Constraint): boolean {
    switch (constraint.operator) {
      case 'eq':
        return value === constraint.value;
      case 'ne':
        return value !== constraint.value;
      case 'gt':
        return value > constraint.value;
      case 'gte':
        return value >= constraint.value;
      case 'lt':
        return value < constraint.value;
      case 'lte':
        return value <= constraint.value;
      case 'in':
        return Array.isArray(constraint.value) && constraint.value.includes(value);
      case 'not-in':
        return Array.isArray(constraint.value) && !constraint.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(constraint.value);
      case 'startsWith':
        return typeof value === 'string' && value.startsWith(constraint.value);
      case 'endsWith':
        return typeof value === 'string' && value.endsWith(constraint.value);
      default:
        return false;
    }
  }

  private getValueByPath(obj: any, path: (string | number)[]): any {
    return path.reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

export class ValidationManager {
  private validators: Map<string, Validator> = new Map();

  registerValidator(name: string, validator: Validator): void {
    this.validators.set(name, validator);
  }

  getValidator(name: string): Validator | undefined {
    return this.validators.get(name);
  }

  removeValidator(name: string): boolean {
    return this.validators.delete(name);
  }

  validateWith(name: string, value: any): ValidationResult {
    const validator = this.validators.get(name);
    if (!validator) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Validator not found: ${name}`,
          value,
          rule: 'validator_missing'
        }],
        warnings: []
      };
    }
    return validator(value);
  }

  listValidators(): string[] {
    return Array.from(this.validators.keys());
  }

  clearValidators(): void {
    this.validators.clear();
  }
}

export const validationUtils = new ValidationUtils();
export const validationManager = new ValidationManager();

export function validateInput(input: any, rules: ValidationRule[]): ValidationResult {
  return validationUtils.validateInput(input, rules);
}

export function checkSchema(data: any, schema: any): Promise<SchemaValidation> {
  return validationUtils.checkSchema(data, schema);
}

export function validateDataType(value: any, expectedType: string): TypeValidation {
  return validationUtils.validateDataType(value, expectedType);
}

export function enforceConstraints(data: any, constraints: Constraint[]): ConstraintValidation {
  return validationUtils.enforceConstraints(data, constraints);
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return validationUtils.formatValidationErrors(errors);
}

export function createValidator(rules: ValidationRule[]): Validator {
  return validationUtils.createValidator(rules);
}

export function validateEmail(email: string): ValidationResult {
  return validationUtils.validateEmail(email);
}

export function validateURL(url: string, options?: { protocols?: string[]; requireProtocol?: boolean }): ValidationResult {
  return validationUtils.validateURL(url, options);
}

export function validateUUID(uuid: string, version?: 1 | 2 | 3 | 4 | 5): ValidationResult {
  return validationUtils.validateUUID(uuid, version);
}

export function validateIP(ip: string, version?: 4 | 6): ValidationResult {
  return validationUtils.validateIP(ip, version);
}

export function validateDomain(domain: string): ValidationResult {
  return validationUtils.validateDomain(domain);
}

export function validateDate(date: string | Date, format?: string): ValidationResult {
  return validationUtils.validateDate(date, format);
}

export function validateHex(color: string): ValidationResult {
  return validationUtils.validateHex(color);
}

export function validateISO8601(dateString: string): ValidationResult {
  return validationUtils.validateISO8601(dateString);
}

export function validateCountryCode(code: string, format?: 'alpha2' | 'alpha3'): ValidationResult {
  return validationUtils.validateCountryCode(code, format);
}

export function validateRange(value: number, min: number, max: number): ValidationResult {
  return validationUtils.validateRange(value, min, max);
}

export function validateLength(value: string, minLength: number, maxLength: number): ValidationResult {
  return validationUtils.validateLength(value, minLength, maxLength);
}

export function validatePattern(value: string, pattern: RegExp): ValidationResult {
  return validationUtils.validatePattern(value, pattern);
}

export function validateEnum(value: any, allowedValues: any[]): ValidationResult {
  return validationUtils.validateEnum(value, allowedValues);
}

export const CommonValidators = {
  required: (message?: string): ValidationRule => ({
    type: 'custom',
    required: true,
    message: message || 'This field is required'
  }),
  email: (message?: string): ValidationRule => ({
    type: 'custom',
    custom: (value: any) => typeof value === 'string' && isEmail(value),
    message: message || 'Invalid email address'
  }),
  url: (message?: string): ValidationRule => ({
    type: 'custom',
    custom: (value: any) => typeof value === 'string' && isURL(value),
    message: message || 'Invalid URL'
  }),
  uuid: (message?: string): ValidationRule => ({
    type: 'custom',
    custom: (value: any) => typeof value === 'string' && uuidValidate(value),
    message: message || 'Invalid UUID'
  }),
  min: (min: number, message?: string): ValidationRule => ({
    type: 'number',
    min,
    message: message || `Value must be at least ${min}`
  }),
  max: (max: number, message?: string): ValidationRule => ({
    type: 'number',
    max,
    message: message || `Value must be at most ${max}`
  }),
  minLength: (minLength: number, message?: string): ValidationRule => ({
    type: 'string',
    minLength,
    message: message || `Must be at least ${minLength} characters long`
  }),
  maxLength: (maxLength: number, message?: string): ValidationRule => ({
    type: 'string',
    maxLength,
    message: message || `Must be at most ${maxLength} characters long`
  })
};