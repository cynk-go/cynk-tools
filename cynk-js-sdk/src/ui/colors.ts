import { env } from 'process';
import { stdout, stderr } from 'process';

export type Color = 
  | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white'
  | 'gray' | 'grey' | 'brightRed' | 'brightGreen' | 'brightYellow' | 'brightBlue'
  | 'brightMagenta' | 'brightCyan' | 'brightWhite'
  | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite'
  | 'bgGray' | 'bgGrey' | 'bgBrightRed' | 'bgBrightGreen' | 'bgBrightYellow' | 'bgBrightBlue'
  | 'bgBrightMagenta' | 'bgBrightCyan' | 'bgBrightWhite';

export type TextStyle = 
  | 'bold' | 'dim' | 'italic' | 'underline' | 'inverse' | 'hidden' | 'strikethrough'
  | 'reset' | 'resetBold' | 'resetDim' | 'resetItalic' | 'resetUnderline' | 'resetInverse'
  | 'resetHidden' | 'resetStrikethrough';

export type ColorSupport = 'none' | 'basic' | '256' | 'truecolor';

export interface ThemeConfig {
  colors: {
    primary: Color;
    secondary: Color;
    success: Color;
    warning: Color;
    error: Color;
    info: Color;
    muted: Color;
  };
  styles: {
    heading: TextStyle[];
    subheading: TextStyle[];
    emphasis: TextStyle[];
    strong: TextStyle[];
    code: TextStyle[];
  };
}

export interface TableOptions {
  headers?: string[];
  columns?: number;
  padding?: number;
  border?: boolean;
  borderStyle?: 'single' | 'double' | 'rounded' | 'bold';
  headerStyle?: TextStyle[];
  rowStyle?: TextStyle[];
  align?: 'left' | 'center' | 'right';
}

export interface Theme {
  primary: (text: string) => string;
  secondary: (text: string) => string;
  success: (text: string) => string;
  warning: (text: string) => string;
  error: (text: string) => string;
  info: (text: string) => string;
  muted: (text: string) => string;
  heading: (text: string) => string;
  subheading: (text: string) => string;
  emphasis: (text: string) => string;
  strong: (text: string) => string;
  code: (text: string) => string;
}

class ColorManager {
  private static readonly ANSI_CODES = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    inverse: '\x1b[7m',
    hidden: '\x1b[8m',
    strikethrough: '\x1b[9m',
    
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    grey: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',
    
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
    bgGray: '\x1b[100m',
    bgGrey: '\x1b[100m',
    bgBrightRed: '\x1b[101m',
    bgBrightGreen: '\x1b[102m',
    bgBrightYellow: '\x1b[103m',
    bgBrightBlue: '\x1b[104m',
    bgBrightMagenta: '\x1b[105m',
    bgBrightCyan: '\x1b[106m',
    bgBrightWhite: '\x1b[107m'
  };

  private colorSupport: ColorSupport;
  private isTTY: boolean;
  private forceColor: boolean;

  constructor() {
    this.isTTY = stdout.isTTY && stderr.isTTY;
    this.forceColor = env.FORCE_COLOR === '1' || env.FORCE_COLOR === 'true';
    this.colorSupport = this.detectColorSupport();
  }

  private detectColorSupport(): ColorSupport {
    if (!this.isTTY && !this.forceColor) {
      return 'none';
    }

    if (env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit') {
      return 'truecolor';
    }

    if (env.TERM_PROGRAM === 'vscode' || env.TERM === 'xterm-256color' || env.TERM === 'screen-256color') {
      return '256';
    }

    if (env.TERM && (env.TERM.includes('color') || env.TERM.includes('ansi'))) {
      return 'basic';
    }

    return this.forceColor ? 'basic' : 'none';
  }

  colorize(text: string, color: Color, style?: TextStyle): string {
    if (this.colorSupport === 'none') {
      return text;
    }

    let result = text;
    
    if (color && ColorManager.ANSI_CODES[color]) {
      result = `${ColorManager.ANSI_CODES[color]}${result}${ColorManager.ANSI_CODES.reset}`;
    }
    
    if (style && ColorManager.ANSI_CODES[style]) {
      result = `${ColorManager.ANSI_CODES[style]}${result}${ColorManager.ANSI_CODES.reset}`;
    }
    
    return result;
  }

  applyStyle(text: string, style: TextStyle): string {
    if (this.colorSupport === 'none') {
      return text;
    }
    
    return `${ColorManager.ANSI_CODES[style]}${text}${ColorManager.ANSI_CODES.reset}`;
  }

  createGradient(text: string, colors: Color[]): string {
    if (this.colorSupport === 'none' || colors.length === 0) {
      return text;
    }

    if (colors.length === 1) {
      return this.colorize(text, colors[0]);
    }

    const segments: string[] = [];
    const segmentLength = Math.ceil(text.length / colors.length);
    
    for (let i = 0; i < colors.length; i++) {
      const start = i * segmentLength;
      const end = Math.min(start + segmentLength, text.length);
      const segment = text.substring(start, end);
      
      if (segment) {
        segments.push(this.colorize(segment, colors[i]));
      }
    }
    
    return segments.join('');
  }

  detectColorSupport(): ColorSupport {
    return this.colorSupport;
  }

  enableColors(): void {
    this.colorSupport = 'truecolor';
  }

  disableColors(): void {
    this.colorSupport = 'none';
  }

  setColorSupport(level: ColorSupport): void {
    this.colorSupport = level;
  }
}

export class Colorizer {
  private static manager = new ColorManager();

  static colorize(text: string, color: Color, style?: TextStyle): string {
    return this.manager.colorize(text, color, style);
  }

  static applyStyle(text: string, style: TextStyle): string {
    return this.manager.applyStyle(text, style);
  }

  static createGradient(text: string, colors: Color[]): string {
    return this.manager.createGradient(text, colors);
  }

  static detectColorSupport(): ColorSupport {
    return this.manager.detectColorSupport();
  }

  static enableColors(): void {
    this.manager.enableColors();
  }

  static disableColors(): void {
    this.manager.disableColors();
  }

  static setColorSupport(level: ColorSupport): void {
    this.manager.setColorSupport(level);
  }
}

export class ThemeFactory {
  static createTheme(themeConfig: ThemeConfig): Theme {
    const manager = new ColorManager();

    return {
      primary: (text: string) => manager.colorize(text, themeConfig.colors.primary),
      secondary: (text: string) => manager.colorize(text, themeConfig.colors.secondary),
      success: (text: string) => manager.colorize(text, themeConfig.colors.success),
      warning: (text: string) => manager.colorize(text, themeConfig.colors.warning),
      error: (text: string) => manager.colorize(text, themeConfig.colors.error),
      info: (text: string) => manager.colorize(text, themeConfig.colors.info),
      muted: (text: string) => manager.colorize(text, themeConfig.colors.muted),
      
      heading: (text: string) => {
        let result = text;
        for (const style of themeConfig.styles.heading) {
          result = manager.applyStyle(result, style);
        }
        return manager.colorize(result, themeConfig.colors.primary);
      },
      
      subheading: (text: string) => {
        let result = text;
        for (const style of themeConfig.styles.subheading) {
          result = manager.applyStyle(result, style);
        }
        return manager.colorize(result, themeConfig.colors.secondary);
      },
      
      emphasis: (text: string) => {
        let result = text;
        for (const style of themeConfig.styles.emphasis) {
          result = manager.applyStyle(result, style);
        }
        return result;
      },
      
      strong: (text: string) => {
        let result = text;
        for (const style of themeConfig.styles.strong) {
          result = manager.applyStyle(result, style);
        }
        return result;
      },
      
      code: (text: string) => {
        let result = text;
        for (const style of themeConfig.styles.code) {
          result = manager.applyStyle(result, style);
        }
        return manager.colorize(result, 'cyan');
      }
    };
  }

  static createDefaultTheme(): Theme {
    const defaultConfig: ThemeConfig = {
      colors: {
        primary: 'blue',
        secondary: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'magenta',
        muted: 'gray'
      },
      styles: {
        heading: ['bold'],
        subheading: ['underline'],
        emphasis: ['italic'],
        strong: ['bold'],
        code: ['italic']
      }
    };

    return this.createTheme(defaultConfig);
  }

  static createDarkTheme(): Theme {
    const darkConfig: ThemeConfig = {
      colors: {
        primary: 'brightBlue',
        secondary: 'brightCyan',
        success: 'brightGreen',
        warning: 'brightYellow',
        error: 'brightRed',
        info: 'brightMagenta',
        muted: 'gray'
      },
      styles: {
        heading: ['bold'],
        subheading: ['underline'],
        emphasis: ['italic'],
        strong: ['bold'],
        code: ['italic']
      }
    };

    return this.createTheme(darkConfig);
  }

  static createLightTheme(): Theme {
    const lightConfig: ThemeConfig = {
      colors: {
        primary: 'blue',
        secondary: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'magenta',
        muted: 'gray'
      },
      styles: {
        heading: ['bold'],
        subheading: ['underline'],
        emphasis: ['italic'],
        strong: ['bold'],
        code: ['italic']
      }
    };

    return this.createTheme(lightConfig);
  }

  static createHighContrastTheme(): Theme {
    const highContrastConfig: ThemeConfig = {
      colors: {
        primary: 'brightWhite',
        secondary: 'brightCyan',
        success: 'brightGreen',
        warning: 'brightYellow',
        error: 'brightRed',
        info: 'brightMagenta',
        muted: 'white'
      },
      styles: {
        heading: ['bold', 'underline'],
        subheading: ['bold'],
        emphasis: ['italic', 'bold'],
        strong: ['bold', 'underline'],
        code: ['bold']
      }
    };

    return this.createTheme(highContrastConfig);
  }
}

export class TableFormatter {
  private static manager = new ColorManager();

  static formatTable(data: any[], options: TableOptions = {}): string {
    if (!data || data.length === 0) {
      return '';
    }

    const {
      headers = [],
      columns = Object.keys(data[0] || {}).length,
      padding = 2,
      border = true,
      borderStyle = 'single',
      headerStyle = ['bold'],
      rowStyle = [],
      align = 'left'
    } = options;

    const borderChars = this.getBorderChars(borderStyle);
    const columnWidths = this.calculateColumnWidths(data, headers, padding);
    const rows: string[] = [];

    if (border) {
      rows.push(this.createBorder(columnWidths, borderChars.top));
    }

    if (headers.length > 0) {
      const headerRow = this.createRow(headers, columnWidths, padding, align, headerStyle);
      rows.push(headerRow);
      
      if (border) {
        rows.push(this.createBorder(columnWidths, borderChars.middle));
      }
    }

    for (let i = 0; i < data.length; i++) {
      const rowData = this.extractRowData(data[i], columns);
      const row = this.createRow(rowData, columnWidths, padding, align, rowStyle);
      rows.push(row);
    }

    if (border) {
      rows.push(this.createBorder(columnWidths, borderChars.bottom));
    }

    return rows.join('\n');
  }

  private static calculateColumnWidths(data: any[], headers: string[], padding: number): number[] {
    const columnCount = Math.max(
      headers.length,
      data.reduce((max, row) => Math.max(max, Object.keys(row || {}).length), 0)
    );

    const widths: number[] = new Array(columnCount).fill(0);

    headers.forEach((header, index) => {
      const cleanHeader = this.stripAnsi(header);
      widths[index] = Math.max(widths[index], cleanHeader.length + padding * 2);
    });

    data.forEach(row => {
      if (!row) return;
      
      Object.values(row).forEach((value, index) => {
        if (index >= columnCount) return;
        
        const cleanValue = this.stripAnsi(String(value || ''));
        widths[index] = Math.max(widths[index], cleanValue.length + padding * 2);
      });
    });

    return widths;
  }

  private static createRow(
    cells: string[], 
    widths: number[], 
    padding: number, 
    align: 'left' | 'center' | 'right',
    styles: TextStyle[]
  ): string {
    const formattedCells = cells.map((cell, index) => {
      const cleanCell = this.stripAnsi(cell);
      const availableWidth = widths[index] - padding * 2;
      
      let alignedCell = cleanCell;
      if (cleanCell.length > availableWidth) {
        alignedCell = cleanCell.substring(0, availableWidth - 3) + '...';
      }

      switch (align) {
        case 'center':
          const centerPadding = Math.floor((availableWidth - alignedCell.length) / 2);
          alignedCell = ' '.repeat(centerPadding) + alignedCell + ' '.repeat(availableWidth - alignedCell.length - centerPadding);
          break;
        case 'right':
          alignedCell = ' '.repeat(availableWidth - alignedCell.length) + alignedCell;
          break;
        default:
          alignedCell = alignedCell + ' '.repeat(availableWidth - alignedCell.length);
      }

      let styledCell = ' '.repeat(padding) + cell + ' '.repeat(padding);
      
      for (const style of styles) {
        styledCell = this.manager.applyStyle(styledCell, style);
      }
      
      return styledCell;
    });

    return '│ ' + formattedCells.join(' │ ') + ' │';
  }

  private static createBorder(widths: number[], borderChar: string): string {
    const borderParts = widths.map(width => borderChar.repeat(width + 2));
    return borderParts.join('');
  }

  private static getBorderChars(style: string): { top: string; middle: string; bottom: string } {
    switch (style) {
      case 'double':
        return { top: '═', middle: '╪', bottom: '═' };
      case 'rounded':
        return { top: '╭', middle: '├', bottom: '╰' };
      case 'bold':
        return { top: '┏', middle: '┣', bottom: '┗' };
      default:
        return { top: '┌', middle: '├', bottom: '└' };
    }
  }

  private static extractRowData(row: any, columns: number): string[] {
    if (!row) {
      return new Array(columns).fill('');
    }

    if (Array.isArray(row)) {
      return row.slice(0, columns).map(cell => String(cell || ''));
    }

    const values = Object.values(row);
    return values.slice(0, columns).map(cell => String(cell || ''));
  }

  private static stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  static autoSizeColumns(data: any[], maxWidth: number = 80): TableOptions {
    if (!data || data.length === 0) {
      return { columns: 0 };
    }

    const columnCount = Object.keys(data[0] || {}).length;
    const totalPadding = columnCount * 4 + 2;
    const availableWidth = maxWidth - totalPadding;
    const minColumnWidth = 8;

    let columns = columnCount;
    while (columns > 1 && (availableWidth / columns) < minColumnWidth) {
      columns--;
    }

    return { columns };
  }

  static sortTable(data: any[], column: string, direction: 'asc' | 'desc' = 'asc'): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    return [...data].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      
      if (aValue === bValue) return 0;
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = (aValue || 0) < (bValue || 0) ? -1 : 1;
      }
      
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  static paginateTable(data: any[], page: number, pageSize: number): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    
    return data.slice(startIndex, endIndex);
  }

  static applyBorderStyle(data: any[], style: 'single' | 'double' | 'rounded' | 'bold'): TableOptions {
    return { border: true, borderStyle: style };
  }
}

export const Colors = {
  black: (text: string) => Colorizer.colorize(text, 'black'),
  red: (text: string) => Colorizer.colorize(text, 'red'),
  green: (text: string) => Colorizer.colorize(text, 'green'),
  yellow: (text: string) => Colorizer.colorize(text, 'yellow'),
  blue: (text: string) => Colorizer.colorize(text, 'blue'),
  magenta: (text: string) => Colorizer.colorize(text, 'magenta'),
  cyan: (text: string) => Colorizer.colorize(text, 'cyan'),
  white: (text: string) => Colorizer.colorize(text, 'white'),
  gray: (text: string) => Colorizer.colorize(text, 'gray'),
  brightRed: (text: string) => Colorizer.colorize(text, 'brightRed'),
  brightGreen: (text: string) => Colorizer.colorize(text, 'brightGreen'),
  brightYellow: (text: string) => Colorizer.colorize(text, 'brightYellow'),
  brightBlue: (text: string) => Colorizer.colorize(text, 'brightBlue'),
  brightMagenta: (text: string) => Colorizer.colorize(text, 'brightMagenta'),
  brightCyan: (text: string) => Colorizer.colorize(text, 'brightCyan'),
  brightWhite: (text: string) => Colorizer.colorize(text, 'brightWhite'),
  
  bgBlack: (text: string) => Colorizer.colorize(text, 'bgBlack'),
  bgRed: (text: string) => Colorizer.colorize(text, 'bgRed'),
  bgGreen: (text: string) => Colorizer.colorize(text, 'bgGreen'),
  bgYellow: (text: string) => Colorizer.colorize(text, 'bgYellow'),
  bgBlue: (text: string) => Colorizer.colorize(text, 'bgBlue'),
  bgMagenta: (text: string) => Colorizer.colorize(text, 'bgMagenta'),
  bgCyan: (text: string) => Colorizer.colorize(text, 'bgCyan'),
  bgWhite: (text: string) => Colorizer.colorize(text, 'bgWhite'),
  bgGray: (text: string) => Colorizer.colorize(text, 'bgGray'),
  bgBrightRed: (text: string) => Colorizer.colorize(text, 'bgBrightRed'),
  bgBrightGreen: (text: string) => Colorizer.colorize(text, 'bgBrightGreen'),
  bgBrightYellow: (text: string) => Colorizer.colorize(text, 'bgBrightYellow'),
  bgBrightBlue: (text: string) => Colorizer.colorize(text, 'bgBrightBlue'),
  bgBrightMagenta: (text: string) => Colorizer.colorize(text, 'bgBrightMagenta'),
  bgBrightCyan: (text: string) => Colorizer.colorize(text, 'bgBrightCyan'),
  bgBrightWhite: (text: string) => Colorizer.colorize(text, 'bgBrightWhite')
};

export const Styles = {
  bold: (text: string) => Colorizer.applyStyle(text, 'bold'),
  dim: (text: string) => Colorizer.applyStyle(text, 'dim'),
  italic: (text: string) => Colorizer.applyStyle(text, 'italic'),
  underline: (text: string) => Colorizer.applyStyle(text, 'underline'),
  inverse: (text: string) => Colorizer.applyStyle(text, 'inverse'),
  hidden: (text: string) => Colorizer.applyStyle(text, 'hidden'),
  strikethrough: (text: string) => Colorizer.applyStyle(text, 'strikethrough'),
  reset: (text: string) => Colorizer.applyStyle(text, 'reset')
};

export const defaultTheme = ThemeFactory.createDefaultTheme();
export const darkTheme = ThemeFactory.createDarkTheme();
export const lightTheme = ThemeFactory.createLightTheme();
export const highContrastTheme = ThemeFactory.createHighContrastTheme();