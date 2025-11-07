import { Colorizer } from './colors';
import { createTable, formatTable, TableOptions } from './table-formatter';

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  options?: Argument[];
  arguments?: Argument[];
  subcommands?: Command[];
  examples?: Example[];
  category?: string;
  version?: string;
  deprecated?: boolean;
}

export interface Argument {
  name: string;
  description: string;
  required?: boolean;
  type?: string;
  default?: any;
  choices?: string[];
  multiple?: boolean;
}

export interface Example {
  description: string;
  command: string;
}

export interface HelpOptions {
  width?: number;
  showAliases?: boolean;
  showExamples?: boolean;
  showSubcommands?: boolean;
  showDeprecated?: boolean;
  colorize?: boolean;
  compact?: boolean;
  maxDepth?: number;
}

export interface CommandTree {
  command: Command;
  children: CommandTree[];
  depth: number;
}

class CommandHelpGenerator {
  private static readonly DEFAULT_OPTIONS: HelpOptions = {
    width: 80,
    showAliases: true,
    showExamples: true,
    showSubcommands: true,
    showDeprecated: false,
    colorize: true,
    compact: false,
    maxDepth: 3
  };

  generateHelp(command: Command, options: HelpOptions = {}): string {
    const mergedOptions = { ...CommandHelpGenerator.DEFAULT_OPTIONS, ...options };
    const sections: string[] = [];

    sections.push(this.generateHeader(command, mergedOptions));
    sections.push(this.generateDescription(command, mergedOptions));
    sections.push(this.generateUsage(command, mergedOptions));
    
    if (command.arguments && command.arguments.length > 0) {
      sections.push(this.generateArguments(command.arguments, mergedOptions));
    }
    
    if (command.options && command.options.length > 0) {
      sections.push(this.generateOptions(command.options, mergedOptions));
    }
    
    if (mergedOptions.showAliases && command.aliases && command.aliases.length > 0) {
      sections.push(this.generateAliases(command.aliases, mergedOptions));
    }
    
    if (mergedOptions.showExamples && command.examples && command.examples.length > 0) {
      sections.push(this.generateExamples(command.examples, mergedOptions));
    }
    
    if (mergedOptions.showSubcommands && command.subcommands && command.subcommands.length > 0) {
      sections.push(this.generateSubcommands(command.subcommands, mergedOptions));
    }

    return sections.filter(section => section.trim().length > 0).join('\n\n');
  }

  formatCommandSyntax(command: Command): string {
    const parts: string[] = [command.name];

    if (command.arguments && command.arguments.length > 0) {
      const args = command.arguments.map(arg => {
        const brackets = arg.required ? '<' : '[';
        const closingBrackets = arg.required ? '>' : ']';
        return `${brackets}${arg.name}${closingBrackets}`;
      });
      parts.push(args.join(' '));
    }

    if (command.options && command.options.length > 0) {
      parts.push('[options]');
    }

    if (command.subcommands && command.subcommands.length > 0) {
      parts.push('[command]');
    }

    let syntax = parts.join(' ');
    
    if (command.aliases && command.aliases.length > 0) {
      syntax += `\n\nAliases: ${command.aliases.join(', ')}`;
    }

    return this.colorizeText(syntax, 'cyan', true);
  }

  displayExamples(examples: Example[]): string {
    if (!examples || examples.length === 0) {
      return '';
    }

    const tableData = examples.map(example => ({
      Description: example.description,
      Command: example.command
    }));

    const tableOptions: TableOptions = {
      headers: ['Description', 'Command'],
      border: 'minimal',
      padding: 1,
      align: 'left',
      style: {
        header: 'brightBlue',
        row: 'white'
      }
    };

    const table = createTable(tableData, tableOptions);
    const formattedTable = formatTable(table);
    
    return this.colorizeText('Examples:', 'brightBlue', true) + '\n\n' + formattedTable;
  }

  createCommandTree(commands: Command[]): CommandTree[] {
    const buildTree = (cmd: Command, depth: number = 0): CommandTree => {
      const children: CommandTree[] = [];
      
      if (cmd.subcommands && depth < 10) {
        for (const subcmd of cmd.subcommands) {
          children.push(buildTree(subcmd, depth + 1));
        }
      }
      
      return {
        command: cmd,
        children,
        depth
      };
    };

    return commands.map(cmd => buildTree(cmd));
  }

  highlightArguments(args: Argument[]): string {
    if (!args || args.length === 0) {
      return '';
    }

    const argumentLines = args.map(arg => {
      const requiredIndicator = arg.required ? this.colorizeText('(required)', 'red', true) : this.colorizeText('(optional)', 'green', true);
      const typeInfo = arg.type ? this.colorizeText(`<${arg.type}>`, 'cyan', true) : '';
      const defaultValue = arg.default !== undefined ? this.colorizeText(`[default: ${arg.default}]`, 'gray', true) : '';
      const choices = arg.choices ? this.colorizeText(`[choices: ${arg.choices.join(', ')}]`, 'yellow', true) : '';
      
      const name = this.colorizeText(arg.name, 'brightBlue', true);
      const description = this.colorizeText(arg.description, 'white', true);
      
      return `  ${name} ${requiredIndicator} ${typeInfo} ${defaultValue} ${choices}\n    ${description}`;
    });

    return this.colorizeText('Arguments:', 'brightBlue', true) + '\n\n' + argumentLines.join('\n\n');
  }

  generateUsagePatterns(command: Command): string[] {
    const patterns: string[] = [];
    
    const baseCommand = command.name;
    
    if (command.arguments && command.arguments.length > 0) {
      const requiredArgs = command.arguments.filter(arg => arg.required).map(arg => `<${arg.name}>`);
      const optionalArgs = command.arguments.filter(arg => !arg.required).map(arg => `[${arg.name}]`);
      
      if (requiredArgs.length > 0) {
        patterns.push(`${baseCommand} ${requiredArgs.join(' ')}`);
      }
      
      if (optionalArgs.length > 0) {
        patterns.push(`${baseCommand} ${requiredArgs.join(' ')} ${optionalArgs.join(' ')}`.trim());
      }
    } else {
      patterns.push(baseCommand);
    }
    
    if (command.options && command.options.length > 0) {
      patterns.push(`${baseCommand} [options]`);
    }
    
    if (command.subcommands && command.subcommands.length > 0) {
      patterns.push(`${baseCommand} [command]`);
    }
    
    if (command.aliases && command.aliases.length > 0) {
      for (const alias of command.aliases) {
        patterns.push(`${alias} ...`);
      }
    }

    return patterns.map(pattern => this.colorizeText(pattern, 'green', true));
  }

  private generateHeader(command: Command, options: HelpOptions): string {
    const lines: string[] = [];
    
    const name = this.colorizeText(command.name, 'brightBlue', options.colorize);
    const version = command.version ? this.colorizeText(`v${command.version}`, 'gray', options.colorize) : '';
    const deprecated = command.deprecated ? this.colorizeText('(deprecated)', 'red', options.colorize) : '';
    
    lines.push(`${name} ${version} ${deprecated}`.trim());
    
    if (command.category) {
      const category = this.colorizeText(`Category: ${command.category}`, 'cyan', options.colorize);
      lines.push(category);
    }
    
    return lines.join('\n');
  }

  private generateDescription(command: Command, options: HelpOptions): string {
    if (!command.description) {
      return '';
    }
    
    const wrappedDescription = this.wrapText(command.description, options.width || 80);
    return this.colorizeText(wrappedDescription, 'white', options.colorize);
  }

  private generateUsage(command: Command, options: HelpOptions): string {
    const usagePatterns = this.generateUsagePatterns(command);
    
    if (usagePatterns.length === 0) {
      return '';
    }
    
    const usageHeader = this.colorizeText('Usage:', 'brightBlue', options.colorize);
    const usageLines = usagePatterns.map(pattern => `  ${pattern}`);
    
    return `${usageHeader}\n\n${usageLines.join('\n')}`;
  }

  private generateArguments(args: Argument[], options: HelpOptions): string {
    const tableData = args.map(arg => {
      const name = arg.required ? 
        this.colorizeText(`<${arg.name}>`, 'brightBlue', options.colorize) :
        this.colorizeText(`[${arg.name}]`, 'blue', options.colorize);
      
      const type = arg.type ? this.colorizeText(arg.type, 'cyan', options.colorize) : '';
      const required = arg.required ? 
        this.colorizeText('required', 'red', options.colorize) : 
        this.colorizeText('optional', 'green', options.colorize);
      
      const defaultValue = arg.default !== undefined ? 
        this.colorizeText(`default: ${arg.default}`, 'gray', options.colorize) : '';
      
      const choices = arg.choices ? 
        this.colorizeText(`choices: ${arg.choices.join(', ')}`, 'yellow', options.colorize) : '';
      
      const modifiers = [type, required, defaultValue, choices].filter(Boolean).join(', ');
      
      return {
        Argument: name,
        Description: this.colorizeText(arg.description, 'white', options.colorize),
        Modifiers: modifiers
      };
    });

    const tableOptions: TableOptions = {
      headers: ['Argument', 'Description', 'Modifiers'],
      border: 'minimal',
      padding: 1,
      align: 'left',
      compact: options.compact
    };

    const table = createTable(tableData, tableOptions);
    const formattedTable = formatTable(table);
    
    return this.colorizeText('Arguments:', 'brightBlue', options.colorize) + '\n\n' + formattedTable;
  }

  private generateOptions(options: Argument[], helpOptions: HelpOptions): string {
    const tableData = options.map(opt => {
      const name = this.colorizeText(`--${opt.name}`, 'brightBlue', helpOptions.colorize);
      const required = opt.required ? 
        this.colorizeText('required', 'red', helpOptions.colorize) : 
        this.colorizeText('optional', 'green', helpOptions.colorize);
      
      const type = opt.type ? this.colorizeText(opt.type, 'cyan', helpOptions.colorize) : '';
      const defaultValue = opt.default !== undefined ? 
        this.colorizeText(`default: ${opt.default}`, 'gray', helpOptions.colorize) : '';
      
      const choices = opt.choices ? 
        this.colorizeText(`choices: ${opt.choices.join(', ')}`, 'yellow', helpOptions.colorize) : '';
      
      const modifiers = [type, required, defaultValue, choices].filter(Boolean).join(', ');
      
      return {
        Option: name,
        Description: this.colorizeText(opt.description, 'white', helpOptions.colorize),
        Modifiers: modifiers
      };
    });

    const tableOptions: TableOptions = {
      headers: ['Option', 'Description', 'Modifiers'],
      border: 'minimal',
      padding: 1,
      align: 'left',
      compact: helpOptions.compact
    };

    const table = createTable(tableData, tableOptions);
    const formattedTable = formatTable(table);
    
    return this.colorizeText('Options:', 'brightBlue', helpOptions.colorize) + '\n\n' + formattedTable;
  }

  private generateAliases(aliases: string[], options: HelpOptions): string {
    const aliasesText = aliases.map(alias => this.colorizeText(alias, 'green', options.colorize)).join(', ');
    return this.colorizeText('Aliases:', 'brightBlue', options.colorize) + ' ' + aliasesText;
  }

  private generateExamples(examples: Example[], options: HelpOptions): string {
    const exampleLines = examples.map(example => {
      const description = this.colorizeText(example.description, 'white', options.colorize);
      const command = this.colorizeText(example.command, 'green', options.colorize);
      return `  ${description}\n  $ ${command}`;
    });

    return this.colorizeText('Examples:', 'brightBlue', options.colorize) + '\n\n' + exampleLines.join('\n\n');
  }

  private generateSubcommands(subcommands: Command[], options: HelpOptions): string {
    const tableData = subcommands.map(cmd => {
      const name = cmd.deprecated ? 
        this.colorizeText(cmd.name, 'red', options.colorize) :
        this.colorizeText(cmd.name, 'brightBlue', options.colorize);
      
      const description = cmd.deprecated ? 
        this.colorizeText(`(deprecated) ${cmd.description}`, 'gray', options.colorize) :
        this.colorizeText(cmd.description, 'white', options.colorize);
      
      return {
        Command: name,
        Description: description
      };
    });

    const tableOptions: TableOptions = {
      headers: ['Command', 'Description'],
      border: 'minimal',
      padding: 1,
      align: 'left',
      compact: options.compact
    };

    const table = createTable(tableData, tableOptions);
    const formattedTable = formatTable(table);
    
    return this.colorizeText('Commands:', 'brightBlue', options.colorize) + '\n\n' + formattedTable;
  }

  private colorizeText(text: string, color: string, enabled: boolean): string {
    if (!enabled) {
      return text;
    }
    return Colorizer.colorize(text, color as any);
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }
}

export class CommandTreeRenderer {
  static renderCommandTree(tree: CommandTree[], options: HelpOptions = {}): string {
    const lines: string[] = [];
    
    const renderNode = (node: CommandTree, prefix: string = '', isLast: boolean = true) => {
      const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
      const command = node.command;
      
      let commandText = command.name;
      if (options.colorize) {
        commandText = command.deprecated ? 
          Colorizer.colorize(commandText, 'red') :
          Colorizer.colorize(commandText, 'brightBlue');
      }
      
      if (command.deprecated && options.showDeprecated) {
        commandText += ' ' + (options.colorize ? Colorizer.colorize('(deprecated)', 'red') : '(deprecated)');
      }
      
      lines.push(currentPrefix + commandText);
      
      if (command.description && !options.compact) {
        const descriptionPrefix = prefix + (isLast ? '    ' : '│   ');
        const wrappedDescription = CommandTreeRenderer.wrapText(command.description, 60);
        const descriptionLines = wrappedDescription.split('\n');
        
        for (const line of descriptionLines) {
          lines.push(descriptionPrefix + (options.colorize ? Colorizer.colorize(line, 'gray') : line));
        }
      }
      
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childIsLast = i === node.children.length - 1;
        
        if (child.depth <= (options.maxDepth || 3)) {
          renderNode(child, newPrefix, childIsLast);
        }
      }
    };
    
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i];
      const isLast = i === tree.length - 1;
      renderNode(node, '', isLast);
    }
    
    return lines.join('\n');
  }

  private static wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }
}

export class CommandHelpFormatter {
  static formatGlobalHelp(commands: Command[], options: HelpOptions = {}): string {
    const helpGenerator = new CommandHelpGenerator();
    const sections: string[] = [];
    
    const header = options.colorize ? 
      Colorizer.colorize('Cynk JS/TS SDK - Command Line Interface', 'brightBlue') :
      'Cynk JS/TS SDK - Command Line Interface';
    
    sections.push(header);
    sections.push('');
    
    const categorizedCommands = CommandHelpFormatter.categorizeCommands(commands);
    
    for (const [category, categoryCommands] of categorizedCommands) {
      if (categoryCommands.length === 0) continue;
      
      const categoryHeader = options.colorize ? 
        Colorizer.colorize(category, 'brightBlue') :
        category;
      
      sections.push(categoryHeader);
      
      const tableData = categoryCommands.map(cmd => {
        const name = cmd.deprecated ? 
          (options.colorize ? Colorizer.colorize(cmd.name, 'red') : cmd.name) :
          (options.colorize ? Colorizer.colorize(cmd.name, 'brightBlue') : cmd.name);
        
        const description = cmd.deprecated ? 
          (options.colorize ? Colorizer.colorize(`(deprecated) ${cmd.description}`, 'gray') : `(deprecated) ${cmd.description}`) :
          (options.colorize ? Colorizer.colorize(cmd.description, 'white') : cmd.description);
        
        return {
          Command: name,
          Description: description
        };
      });
      
      const tableOptions: TableOptions = {
        headers: ['Command', 'Description'],
        border: 'minimal',
        padding: 1,
        align: 'left',
        compact: options.compact
      };
      
      const table = createTable(tableData, tableOptions);
      const formattedTable = formatTable(table);
      
      sections.push(formattedTable);
      sections.push('');
    }
    
    const usageNote = options.colorize ? 
      Colorizer.colorize('Use "cynk <command> --help" for more information about a specific command.', 'gray') :
      'Use "cynk <command> --help" for more information about a specific command.';
    
    sections.push(usageNote);
    
    return sections.join('\n');
  }

  private static categorizeCommands(commands: Command[]): Map<string, Command[]> {
    const categories = new Map<string, Command[]>();
    
    categories.set('Core Commands', []);
    categories.set('Development', []);
    categories.set('Build & Package', []);
    categories.set('Security', []);
    categories.set('Distribution', []);
    categories.set('Utilities', []);
    categories.set('Other', []);
    
    for (const command of commands) {
      const category = command.category || 'Other';
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      
      categories.get(category)!.push(command);
    }
    
    return categories;
  }
}

export const commandHelpGenerator = new CommandHelpGenerator();

export function generateHelp(command: Command, options?: HelpOptions): string {
  return commandHelpGenerator.generateHelp(command, options);
}

export function formatCommandSyntax(command: Command): string {
  return commandHelpGenerator.formatCommandSyntax(command);
}

export function displayExamples(examples: Example[]): string {
  return commandHelpGenerator.displayExamples(examples);
}

export function createCommandTree(commands: Command[]): CommandTree[] {
  return commandHelpGenerator.createCommandTree(commands);
}

export function highlightArguments(args: Argument[]): string {
  return commandHelpGenerator.highlightArguments(args);
}

export function generateUsagePatterns(command: Command): string[] {
  return commandHelpGenerator.generateUsagePatterns(command);
}

export function renderCommandTree(tree: CommandTree[], options?: HelpOptions): string {
  return CommandTreeRenderer.renderCommandTree(tree, options);
}

export function formatGlobalHelp(commands: Command[], options?: HelpOptions): string {
  return CommandHelpFormatter.formatGlobalHelp(commands, options);
}

export const DefaultHelpOptions: HelpOptions = {
  width: 80,
  showAliases: true,
  showExamples: true,
  showSubcommands: true,
  showDeprecated: false,
  colorize: true,
  compact: false,
  maxDepth: 3
};