import { createInterface, Interface } from 'readline';
import { stdin, stdout } from 'process';
import { Colorizer } from './colors';

export interface Choice {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface TextPromptOptions {
  default?: string;
  required?: boolean;
  validate?: Validator;
  transform?: (input: string) => string;
  placeholder?: string;
  mask?: string;
  maxLength?: number;
  minLength?: number;
}

export interface SelectOptions {
  multiple?: boolean;
  pageSize?: number;
  required?: boolean;
  searchable?: boolean;
  instructions?: string;
}

export interface AutoCompleteOptions {
  limit?: number;
  caseSensitive?: boolean;
  fuzzy?: boolean;
}

export interface Validator {
  (input: string): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface SanitizationRules {
  trim?: boolean;
  lowerCase?: boolean;
  upperCase?: boolean;
  removeSpaces?: boolean;
  allowOnly?: RegExp;
  disallow?: RegExp;
  maxLength?: number;
  minLength?: number;
}

class InteractivePrompt {
  private rl: Interface;
  private isActive: boolean = false;

  constructor() {
    this.rl = createInterface({
      input: stdin,
      output: stdout,
      terminal: true
    });
  }

  async textPrompt(question: string, options: TextPromptOptions = {}): Promise<string> {
    return new Promise((resolve) => {
      const {
        default: defaultValue,
        required = false,
        validate,
        transform,
        placeholder,
        mask,
        maxLength,
        minLength
      } = options;

      const displayQuestion = this.formatQuestion(question, defaultValue, required, placeholder);
      this.writePrompt(displayQuestion);

      this.isActive = true;

      const handleInput = (input: string) => {
        if (!this.isActive) return;

        let processedInput = input.trim();
        
        if (processedInput === '' && defaultValue !== undefined) {
          processedInput = defaultValue;
        }

        if (required && processedInput === '') {
          this.writePrompt(this.formatError('This field is required'));
          this.writePrompt(displayQuestion);
          return;
        }

        if (minLength && processedInput.length < minLength) {
          this.writePrompt(this.formatError(`Input must be at least ${minLength} characters`));
          this.writePrompt(displayQuestion);
          return;
        }

        if (maxLength && processedInput.length > maxLength) {
          this.writePrompt(this.formatError(`Input must be at most ${maxLength} characters`));
          this.writePrompt(displayQuestion);
          return;
        }

        if (validate) {
          const validation = validate(processedInput);
          if (!validation.valid) {
            this.writePrompt(this.formatError(validation.message || 'Invalid input'));
            this.writePrompt(displayQuestion);
            return;
          }
        }

        if (transform) {
          processedInput = transform(processedInput);
        }

        this.isActive = false;
        this.rl.removeListener('line', handleInput);
        resolve(processedInput);
      };

      this.rl.on('line', handleInput);
    });
  }

  async selectPrompt(question: string, choices: Choice[], options: SelectOptions = {}): Promise<string> {
    return new Promise((resolve) => {
      const {
        multiple = false,
        pageSize = 10,
        required = true,
        searchable = false,
        instructions
      } = options;

      const availableChoices = choices.filter(choice => !choice.disabled);
      
      if (availableChoices.length === 0) {
        throw new Error('No available choices provided');
      }

      let currentPage = 0;
      let searchTerm = '';
      let selectedIndex = 0;
      let selectedValues: Set<string> = new Set();

      const renderPrompt = () => {
        this.clearScreen();
        
        const filteredChoices = this.filterChoices(availableChoices, searchTerm);
        const totalPages = Math.ceil(filteredChoices.length / pageSize);
        const startIndex = currentPage * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredChoices.length);
        const currentPageChoices = filteredChoices.slice(startIndex, endIndex);

        this.writePrompt(this.formatQuestion(question, undefined, required));
        
        if (instructions) {
          this.writePrompt(Colorizer.colorize(instructions, 'gray'));
        }

        if (searchable) {
          this.writePrompt(Colorizer.colorize(`Search: ${searchTerm}`, 'cyan'));
        }

        currentPageChoices.forEach((choice, index) => {
          const globalIndex = startIndex + index;
          const isSelected = multiple ? selectedValues.has(choice.value) : globalIndex === selectedIndex;
          const indicator = isSelected ? Colorizer.colorize('›', 'green') : ' ';
          const name = choice.disabled ? 
            Colorizer.colorize(choice.name, 'gray') : 
            Colorizer.colorize(choice.name, isSelected ? 'brightBlue' : 'white');
          
          let line = ` ${indicator} ${name}`;
          
          if (choice.description) {
            line += Colorizer.colorize(` - ${choice.description}`, 'gray');
          }

          this.writePrompt(line);
        });

        if (totalPages > 1) {
          this.writePrompt(Colorizer.colorize(`Page ${currentPage + 1} of ${totalPages}`, 'gray'));
        }

        if (multiple) {
          const selectedCount = selectedValues.size;
          this.writePrompt(Colorizer.colorize(`Selected: ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`, 'cyan'));
        }

        this.writePrompt(Colorizer.colorize('Use arrow keys to navigate, Enter to select, Ctrl+C to cancel', 'gray'));
      };

      const handleKeyPress = (str: string, key: any) => {
        if (!this.isActive) return;

        const filteredChoices = this.filterChoices(availableChoices, searchTerm);
        const totalPages = Math.ceil(filteredChoices.length / pageSize);

        if (key.name === 'up') {
          selectedIndex = Math.max(0, selectedIndex - 1);
          if (selectedIndex < currentPage * pageSize) {
            currentPage = Math.max(0, currentPage - 1);
          }
          renderPrompt();
        } else if (key.name === 'down') {
          selectedIndex = Math.min(filteredChoices.length - 1, selectedIndex + 1);
          if (selectedIndex >= (currentPage + 1) * pageSize) {
            currentPage = Math.min(totalPages - 1, currentPage + 1);
          }
          renderPrompt();
        } else if (key.name === 'left') {
          currentPage = Math.max(0, currentPage - 1);
          renderPrompt();
        } else if (key.name === 'right') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
          renderPrompt();
        } else if (key.name === 'return' || key.name === 'enter') {
          if (filteredChoices.length === 0) return;

          const selectedChoice = filteredChoices[selectedIndex];
          
          if (multiple) {
            if (selectedValues.has(selectedChoice.value)) {
              selectedValues.delete(selectedChoice.value);
            } else {
              selectedValues.add(selectedChoice.value);
            }
            renderPrompt();
          } else {
            this.isActive = false;
            stdin.removeListener('keypress', handleKeyPress);
            this.rl.pause();
            resolve(selectedChoice.value);
          }
        } else if (key.name === 'space' && multiple) {
          const selectedChoice = filteredChoices[selectedIndex];
          if (selectedValues.has(selectedChoice.value)) {
            selectedValues.delete(selectedChoice.value);
          } else {
            selectedValues.add(selectedChoice.value);
          }
          renderPrompt();
        } else if (searchable && str && str.length === 1) {
          if (key.name === 'backspace') {
            searchTerm = searchTerm.slice(0, -1);
          } else {
            searchTerm += str;
          }
          selectedIndex = 0;
          currentPage = 0;
          renderPrompt();
        } else if (key.ctrl && key.name === 'c') {
          this.isActive = false;
          stdin.removeListener('keypress', handleKeyPress);
          this.rl.pause();
          resolve('');
        }
      };

      this.isActive = true;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('keypress', handleKeyPress);

      renderPrompt();
    });
  }

  async confirmPrompt(question: string, defaultValue: boolean = false): Promise<boolean> {
    const choices: Choice[] = [
      { name: 'Yes', value: 'true' },
      { name: 'No', value: 'false' }
    ];

    const defaultChoice = defaultValue ? 'true' : 'false';
    
    const result = await this.selectPrompt(question, choices, {
      multiple: false,
      instructions: `Default: ${defaultValue ? 'Yes' : 'No'}`
    });

    return result === 'true';
  }

  async autocompletePrompt(question: string, choices: string[], options: AutoCompleteOptions = {}): Promise<string> {
    return new Promise((resolve) => {
      const {
        limit = 10,
        caseSensitive = false,
        fuzzy = false
      } = options;

      let input = '';
      let suggestions: string[] = [];
      let selectedIndex = 0;

      const getSuggestions = (search: string): string[] => {
        if (!search) return choices.slice(0, limit);

        const searchTerm = caseSensitive ? search : search.toLowerCase();
        
        const filtered = choices.filter(choice => {
          const choiceText = caseSensitive ? choice : choice.toLowerCase();
          
          if (fuzzy) {
            return this.fuzzyMatch(choiceText, searchTerm);
          } else {
            return choiceText.includes(searchTerm);
          }
        });

        return filtered.slice(0, limit);
      };

      const renderPrompt = () => {
        this.clearLine();
        
        suggestions = getSuggestions(input);
        const hasSuggestions = suggestions.length > 0;

        let prompt = this.formatQuestion(question);
        prompt += Colorizer.colorize(`> ${input}`, 'white');
        
        if (hasSuggestions) {
          prompt += '\n';
          
          suggestions.forEach((suggestion, index) => {
            const isSelected = index === selectedIndex;
            const indicator = isSelected ? Colorizer.colorize('›', 'green') : ' ';
            const text = isSelected ? 
              Colorizer.colorize(suggestion, 'brightBlue') : 
              Colorizer.colorize(suggestion, 'white');
            
            prompt += ` ${indicator} ${text}\n`;
          });
        }

        this.writePrompt(prompt);

        if (hasSuggestions) {
          stdout.write(`\x1b[${suggestions.length + 1}A`);
        }
      };

      const handleKeyPress = (str: string, key: any) => {
        if (!this.isActive) return;

        if (key.name === 'up') {
          selectedIndex = Math.max(0, selectedIndex - 1);
          renderPrompt();
        } else if (key.name === 'down') {
          selectedIndex = Math.min(suggestions.length - 1, selectedIndex + 1);
          renderPrompt();
        } else if (key.name === 'return' || key.name === 'enter') {
          if (suggestions.length > 0) {
            this.isActive = false;
            stdin.removeListener('keypress', handleKeyPress);
            this.rl.pause();
            resolve(suggestions[selectedIndex]);
          } else {
            this.isActive = false;
            stdin.removeListener('keypress', handleKeyPress);
            this.rl.pause();
            resolve(input);
          }
        } else if (key.name === 'tab' && suggestions.length > 0) {
          input = suggestions[selectedIndex];
          selectedIndex = 0;
          renderPrompt();
        } else if (key.name === 'backspace') {
          input = input.slice(0, -1);
          selectedIndex = 0;
          renderPrompt();
        } else if (key.ctrl && key.name === 'c') {
          this.isActive = false;
          stdin.removeListener('keypress', handleKeyPress);
          this.rl.pause();
          resolve('');
        } else if (str && str.length === 1) {
          input += str;
          selectedIndex = 0;
          renderPrompt();
        }
      };

      this.isActive = true;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('keypress', handleKeyPress);

      renderPrompt();
    });
  }

  validateInput(input: string, validator: Validator): ValidationResult {
    return validator(input);
  }

  sanitizeInput(input: string, rules: SanitizationRules): string {
    let sanitized = input;

    if (rules.trim) {
      sanitized = sanitized.trim();
    }

    if (rules.lowerCase) {
      sanitized = sanitized.toLowerCase();
    }

    if (rules.upperCase) {
      sanitized = sanitized.toUpperCase();
    }

    if (rules.removeSpaces) {
      sanitized = sanitized.replace(/\s+/g, '');
    }

    if (rules.allowOnly) {
      sanitized = sanitized.replace(new RegExp(`[^${rules.allowOnly.source}]`, 'g'), '');
    }

    if (rules.disallow) {
      sanitized = sanitized.replace(rules.disallow, '');
    }

    if (rules.maxLength && sanitized.length > rules.maxLength) {
      sanitized = sanitized.substring(0, rules.maxLength);
    }

    if (rules.minLength && sanitized.length < rules.minLength) {
      sanitized = sanitized.padEnd(rules.minLength, ' ');
    }

    return sanitized;
  }

  close(): void {
    this.isActive = false;
    this.rl.close();
  }

  private formatQuestion(question: string, defaultValue?: string, required?: boolean, placeholder?: string): string {
    let formatted = Colorizer.colorize('?', 'green') + ' ' + Colorizer.colorize(question, 'brightBlue');
    
    if (placeholder) {
      formatted += ' ' + Colorizer.colorize(`(${placeholder})`, 'gray');
    } else if (defaultValue !== undefined) {
      formatted += ' ' + Colorizer.colorize(`(${defaultValue})`, 'gray');
    }
    
    if (required) {
      formatted += Colorizer.colorize(' *', 'red');
    }
    
    return formatted + '\n> ';
  }

  private formatError(message: string): string {
    return Colorizer.colorize('✗', 'red') + ' ' + Colorizer.colorize(message, 'red') + '\n';
  }

  private writePrompt(message: string): void {
    stdout.write(message);
  }

  private clearLine(): void {
    stdout.write('\r\x1b[K');
  }

  private clearScreen(): void {
    stdout.write('\x1b[2J\x1b[0f');
  }

  private filterChoices(choices: Choice[], searchTerm: string): Choice[] {
    if (!searchTerm) return choices;

    const term = searchTerm.toLowerCase();
    return choices.filter(choice => 
      choice.name.toLowerCase().includes(term) ||
      choice.value.toLowerCase().includes(term) ||
      (choice.description && choice.description.toLowerCase().includes(term))
    );
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    let patternIdx = 0;
    let textIdx = 0;
    
    while (patternIdx < pattern.length && textIdx < text.length) {
      if (pattern[patternIdx] === text[textIdx]) {
        patternIdx++;
      }
      textIdx++;
    }
    
    return patternIdx === pattern.length;
  }
}

export class Validators {
  static required(message: string = 'This field is required'): Validator {
    return (input: string): ValidationResult => {
      return {
        valid: input.trim().length > 0,
        message: input.trim().length === 0 ? message : undefined
      };
    };
  }

  static minLength(min: number, message?: string): Validator {
    return (input: string): ValidationResult => {
      const valid = input.length >= min;
      return {
        valid,
        message: valid ? undefined : (message || `Input must be at least ${min} characters`)
      };
    };
  }

  static maxLength(max: number, message?: string): Validator {
    return (input: string): ValidationResult => {
      const valid = input.length <= max;
      return {
        valid,
        message: valid ? undefined : (message || `Input must be at most ${max} characters`)
      };
    };
  }

  static email(message: string = 'Please enter a valid email address'): Validator {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (input: string): ValidationResult => {
      return {
        valid: emailRegex.test(input),
        message: emailRegex.test(input) ? undefined : message
      };
    };
  }

  static url(message: string = 'Please enter a valid URL'): Validator {
    const urlRegex = /^https?:\/\/.+\..+$/;
    return (input: string): ValidationResult => {
      return {
        valid: urlRegex.test(input),
        message: urlRegex.test(input) ? undefined : message
      };
    };
  }

  static numeric(message: string = 'Please enter a valid number'): Validator {
    return (input: string): ValidationResult => {
      return {
        valid: !isNaN(Number(input)) && input.trim() !== '',
        message: !isNaN(Number(input)) && input.trim() !== '' ? undefined : message
      };
    };
  }

  static integer(message: string = 'Please enter a valid integer'): Validator {
    return (input: string): ValidationResult => {
      return {
        valid: /^-?\d+$/.test(input),
        message: /^-?\d+$/.test(input) ? undefined : message
      };
    };
  }

  static regex(pattern: RegExp, message: string): Validator {
    return (input: string): ValidationResult => {
      return {
        valid: pattern.test(input),
        message: pattern.test(input) ? undefined : message
      };
    };
  }

  static custom(validator: (input: string) => boolean, message: string): Validator {
    return (input: string): ValidationResult => {
      return {
        valid: validator(input),
        message: validator(input) ? undefined : message
      };
    };
  }
}

export class Sanitizers {
  static trim(): SanitizationRules {
    return { trim: true };
  }

  static lowerCase(): SanitizationRules {
    return { lowerCase: true };
  }

  static upperCase(): SanitizationRules {
    return { upperCase: true };
  }

  static removeSpaces(): SanitizationRules {
    return { removeSpaces: true };
  }

  static allowOnly(pattern: RegExp): SanitizationRules {
    return { allowOnly: pattern };
  }

  static disallow(pattern: RegExp): SanitizationRules {
    return { disallow: pattern };
  }

  static maxLength(max: number): SanitizationRules {
    return { maxLength: max };
  }

  static minLength(min: number): SanitizationRules {
    return { minLength: min };
  }

  static combine(...rules: SanitizationRules[]): SanitizationRules {
    return rules.reduce((combined, rule) => ({ ...combined, ...rule }), {});
  }
}

export class PromptManager {
  private prompts: Map<string, InteractivePrompt> = new Map();

  createPrompt(id: string): InteractivePrompt {
    const prompt = new InteractivePrompt();
    this.prompts.set(id, prompt);
    return prompt;
  }

  getPrompt(id: string): InteractivePrompt | undefined {
    return this.prompts.get(id);
  }

  removePrompt(id: string): boolean {
    const prompt = this.prompts.get(id);
    if (prompt) {
      prompt.close();
      return this.prompts.delete(id);
    }
    return false;
  }

  closeAll(): void {
    for (const prompt of this.prompts.values()) {
      prompt.close();
    }
    this.prompts.clear();
  }

  async textPrompt(id: string, question: string, options?: TextPromptOptions): Promise<string> {
    const prompt = this.getPrompt(id) || this.createPrompt(id);
    return prompt.textPrompt(question, options);
  }

  async selectPrompt(id: string, question: string, choices: Choice[], options?: SelectOptions): Promise<string> {
    const prompt = this.getPrompt(id) || this.createPrompt(id);
    return prompt.selectPrompt(question, choices, options);
  }

  async confirmPrompt(id: string, question: string, defaultValue?: boolean): Promise<boolean> {
    const prompt = this.getPrompt(id) || this.createPrompt(id);
    return prompt.confirmPrompt(question, defaultValue);
  }

  async autocompletePrompt(id: string, question: string, choices: string[], options?: AutoCompleteOptions): Promise<string> {
    const prompt = this.getPrompt(id) || this.createPrompt(id);
    return prompt.autocompletePrompt(question, choices, options);
  }
}

export const promptManager = new PromptManager();
export const interactivePrompt = new InteractivePrompt();

export async function textPrompt(question: string, options?: TextPromptOptions): Promise<string> {
  return interactivePrompt.textPrompt(question, options);
}

export async function selectPrompt(question: string, choices: Choice[], options?: SelectOptions): Promise<string> {
  return interactivePrompt.selectPrompt(question, choices, options);
}

export async function confirmPrompt(question: string, defaultValue?: boolean): Promise<boolean> {
  return interactivePrompt.confirmPrompt(question, defaultValue);
}

export async function autocompletePrompt(question: string, choices: string[], options?: AutoCompleteOptions): Promise<string> {
  return interactivePrompt.autocompletePrompt(question, choices, options);
}

export function validateInput(input: string, validator: Validator): ValidationResult {
  return interactivePrompt.validateInput(input, validator);
}

export function sanitizeInput(input: string, rules: SanitizationRules): string {
  return interactivePrompt.sanitizeInput(input, rules);
}

export function createValidator(rules: ValidationRule[]): Validator {
  return (input: string): ValidationResult => {
    for (const rule of rules) {
      const result = rule.validator(input);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

export interface ValidationRule {
  validator: Validator;
  message?: string;
}

export const CommonValidators = {
  required: Validators.required(),
  email: Validators.email(),
  url: Validators.url(),
  numeric: Validators.numeric(),
  integer: Validators.integer()
};

export const CommonSanitizers = {
  trim: Sanitizers.trim(),
  lowerCase: Sanitizers.lowerCase(),
  upperCase: Sanitizers.upperCase(),
  removeSpaces: Sanitizers.removeSpaces()
};