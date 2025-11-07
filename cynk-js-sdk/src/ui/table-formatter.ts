import { Colorizer } from './colors';

export type BorderStyle = 'single' | 'double' | 'rounded' | 'bold' | 'minimal' | 'none';
export type Align = 'left' | 'center' | 'right';
export type SortDirection = 'asc' | 'desc';

export interface TableOptions {
  headers?: string[];
  border?: BorderStyle;
  padding?: number;
  margin?: number;
  align?: Align;
  headerAlign?: Align;
  maxWidth?: number;
  truncate?: boolean;
  wrap?: boolean;
  compact?: boolean;
  colorize?: boolean;
  sort?: {
    column: string | number;
    direction: SortDirection;
  };
  filter?: {
    column: string | number;
    value: any;
  };
  style?: {
    header?: string;
    row?: string;
    border?: string;
    alternate?: string;
  };
}

export interface Table {
  id: string;
  data: any[];
  headers: string[];
  columns: number;
  columnWidths: number[];
  options: TableOptions;
  borderChars: BorderCharacters;
}

export interface BorderCharacters {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  topJunction: string;
  bottomJunction: string;
  leftJunction: string;
  rightJunction: string;
  cross: string;
}

class TableFormatter {
  private static readonly BORDER_STYLES: Record<BorderStyle, BorderCharacters> = {
    single: {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      topJunction: '┬',
      bottomJunction: '┴',
      leftJunction: '├',
      rightJunction: '┤',
      cross: '┼'
    },
    double: {
      topLeft: '╔',
      topRight: '╗',
      bottomLeft: '╚',
      bottomRight: '╝',
      horizontal: '═',
      vertical: '║',
      topJunction: '╦',
      bottomJunction: '╩',
      leftJunction: '╠',
      rightJunction: '╣',
      cross: '╬'
    },
    rounded: {
      topLeft: '╭',
      topRight: '╮',
      bottomLeft: '╰',
      bottomRight: '╯',
      horizontal: '─',
      vertical: '│',
      topJunction: '┬',
      bottomJunction: '┴',
      leftJunction: '├',
      rightJunction: '┤',
      cross: '┼'
    },
    bold: {
      topLeft: '┏',
      topRight: '┓',
      bottomLeft: '┗',
      bottomRight: '┛',
      horizontal: '━',
      vertical: '┃',
      topJunction: '┳',
      bottomJunction: '┻',
      leftJunction: '┣',
      rightJunction: '┫',
      cross: '╋'
    },
    minimal: {
      topLeft: ' ',
      topRight: ' ',
      bottomLeft: ' ',
      bottomRight: ' ',
      horizontal: ' ',
      vertical: ' ',
      topJunction: ' ',
      bottomJunction: ' ',
      leftJunction: ' ',
      rightJunction: ' ',
      cross: ' '
    },
    none: {
      topLeft: '',
      topRight: '',
      bottomLeft: '',
      bottomRight: '',
      horizontal: '',
      vertical: '',
      topJunction: '',
      bottomJunction: '',
      leftJunction: '',
      rightJunction: '',
      cross: ''
    }
  };

  createTable(data: any[], options: TableOptions = {}): Table {
    const {
      headers = [],
      border = 'single',
      padding = 1,
      margin = 0,
      align = 'left',
      headerAlign = 'center',
      maxWidth = 80,
      truncate = true,
      wrap = false,
      compact = false,
      colorize = true,
      sort,
      filter,
      style = {}
    } = options;

    let processedData = [...data];

    if (filter) {
      processedData = this.filterData(processedData, filter.column, filter.value);
    }

    if (sort) {
      processedData = this.sortData(processedData, sort.column, sort.direction);
    }

    const columnCount = this.determineColumnCount(processedData, headers);
    const columnWidths = this.calculateColumnWidths(processedData, headers, padding, maxWidth, truncate);
    const borderChars = TableFormatter.BORDER_STYLES[border];

    const table: Table = {
      id: this.generateId(),
      data: processedData,
      headers: headers.length > 0 ? headers : this.generateHeaders(columnCount),
      columns: columnCount,
      columnWidths,
      options: {
        headers: headers.length > 0 ? headers : this.generateHeaders(columnCount),
        border,
        padding,
        margin,
        align,
        headerAlign,
        maxWidth,
        truncate,
        wrap,
        compact,
        colorize,
        sort,
        filter,
        style
      },
      borderChars
    };

    return table;
  }

  formatTable(table: Table): string {
    const lines: string[] = [];
    const margin = ' '.repeat(table.options.margin || 0);

    if (table.options.border !== 'none') {
      lines.push(margin + this.createTopBorder(table));
    }

    if (table.headers.length > 0) {
      lines.push(margin + this.createHeaderRow(table));
      
      if (table.options.border !== 'none') {
        lines.push(margin + this.createSeparator(table, 'header'));
      }
    }

    for (let i = 0; i < table.data.length; i++) {
      const row = table.data[i];
      const rowStyle = this.getRowStyle(table, i);
      lines.push(margin + this.createDataRow(table, row, i, rowStyle));
      
      if (i < table.data.length - 1 && table.options.border !== 'none' && !table.options.compact) {
        lines.push(margin + this.createSeparator(table, 'row'));
      }
    }

    if (table.options.border !== 'none') {
      lines.push(margin + this.createBottomBorder(table));
    }

    return lines.join('\n');
  }

  autoSizeColumns(table: Table): void {
    const maxWidth = table.options.maxWidth || 80;
    const totalPadding = table.columns * table.options.padding * 2;
    const availableWidth = maxWidth - totalPadding - (table.columns - 1) * 3;
    
    if (availableWidth <= 0) {
      return;
    }

    const currentTotal = table.columnWidths.reduce((sum, width) => sum + width, 0);
    
    if (currentTotal <= availableWidth) {
      return;
    }

    const scaleFactor = availableWidth / currentTotal;
    table.columnWidths = table.columnWidths.map(width => Math.max(3, Math.floor(width * scaleFactor)));
  }

  sortTable(table: Table, column: string | number, direction: SortDirection): void {
    table.data = this.sortData(table.data, column, direction);
  }

  paginateTable(table: Table, page: number, pageSize: number): Table {
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, table.data.length);
    const paginatedData = table.data.slice(startIndex, endIndex);

    return {
      ...table,
      data: paginatedData
    };
  }

  applyBorderStyle(table: Table, style: BorderStyle): void {
    table.options.border = style;
    table.borderChars = TableFormatter.BORDER_STYLES[style];
  }

  private determineColumnCount(data: any[], headers: string[]): number {
    if (headers.length > 0) {
      return headers.length;
    }

    if (data.length === 0) {
      return 0;
    }

    const firstRow = data[0];
    if (Array.isArray(firstRow)) {
      return firstRow.length;
    }

    if (typeof firstRow === 'object' && firstRow !== null) {
      return Object.keys(firstRow).length;
    }

    return 1;
  }

  private calculateColumnWidths(data: any[], headers: string[], padding: number, maxWidth: number, truncate: boolean): number[] {
    const columnCount = this.determineColumnCount(data, headers);
    const widths: number[] = new Array(columnCount).fill(0);

    headers.forEach((header, index) => {
      const cleanHeader = this.stripAnsi(header);
      widths[index] = Math.max(widths[index], cleanHeader.length);
    });

    data.forEach(row => {
      const rowData = this.extractRowData(row, columnCount);
      rowData.forEach((cell, index) => {
        if (index < columnCount) {
          const cleanCell = this.stripAnsi(String(cell || ''));
          widths[index] = Math.max(widths[index], cleanCell.length);
        }
      });
    });

    const totalWidth = widths.reduce((sum, width) => sum + width + padding * 2, 0) + (columnCount - 1) * 3;
    
    if (totalWidth > maxWidth && truncate) {
      const excess = totalWidth - maxWidth;
      const scaleFactor = (maxWidth - (columnCount - 1) * 3 - columnCount * padding * 2) / (totalWidth - (columnCount - 1) * 3 - columnCount * padding * 2);
      
      widths.forEach((width, index) => {
        widths[index] = Math.max(3, Math.floor(width * scaleFactor));
      });
    }

    return widths;
  }

  private generateHeaders(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
  }

  private createTopBorder(table: Table): string {
    const { borderChars, columnWidths, options } = table;
    const parts = columnWidths.map(width => borderChars.horizontal.repeat(width + options.padding * 2));
    
    if (options.border === 'minimal') {
      return '';
    }
    
    return borderChars.topLeft + parts.join(borderChars.topJunction) + borderChars.topRight;
  }

  private createBottomBorder(table: Table): string {
    const { borderChars, columnWidths, options } = table;
    const parts = columnWidths.map(width => borderChars.horizontal.repeat(width + options.padding * 2));
    
    if (options.border === 'minimal') {
      return '';
    }
    
    return borderChars.bottomLeft + parts.join(borderChars.bottomJunction) + borderChars.bottomRight;
  }

  private createSeparator(table: Table, type: 'header' | 'row'): string {
    const { borderChars, columnWidths, options } = table;
    
    if (options.border === 'minimal' || options.border === 'none') {
      return '';
    }

    const parts = columnWidths.map(width => borderChars.horizontal.repeat(width + options.padding * 2));
    
    if (type === 'header') {
      return borderChars.leftJunction + parts.join(borderChars.cross) + borderChars.rightJunction;
    } else {
      return borderChars.leftJunction + parts.join(borderChars.cross) + borderChars.rightJunction;
    }
  }

  private createHeaderRow(table: Table): string {
    const { borderChars, headers, columnWidths, options } = table;
    const cells: string[] = [];

    headers.forEach((header, index) => {
      if (index >= columnWidths.length) return;
      
      const width = columnWidths[index];
      const align = options.headerAlign || options.align;
      const paddedHeader = this.padCell(header, width, align, options.padding);
      const styledHeader = options.colorize && options.style?.header ? 
        Colorizer.colorize(paddedHeader, options.style.header as any) : paddedHeader;
      
      if (options.border === 'none' || options.border === 'minimal') {
        cells.push(styledHeader);
      } else {
        cells.push(borderChars.vertical + ' ' + styledHeader + ' ');
      }
    });

    if (options.border === 'none' || options.border === 'minimal') {
      return cells.join(' '.repeat(options.padding || 1));
    } else {
      return cells.join('') + borderChars.vertical;
    }
  }

  private createDataRow(table: Table, row: any, rowIndex: number, rowStyle?: string): string {
    const { borderChars, columnWidths, options } = table;
    const rowData = this.extractRowData(row, table.columns);
    const cells: string[] = [];

    rowData.forEach((cell, index) => {
      if (index >= columnWidths.length) return;
      
      const width = columnWidths[index];
      const align = options.align;
      const cellText = String(cell || '');
      const paddedCell = this.padCell(cellText, width, align, options.padding);
      
      let styledCell = paddedCell;
      if (options.colorize) {
        if (rowStyle) {
          styledCell = Colorizer.colorize(styledCell, rowStyle as any);
        } else if (options.style?.row) {
          styledCell = Colorizer.colorize(styledCell, options.style.row as any);
        } else if (options.style?.alternate && rowIndex % 2 === 1) {
          styledCell = Colorizer.colorize(styledCell, options.style.alternate as any);
        }
      }

      if (options.border === 'none' || options.border === 'minimal') {
        cells.push(styledCell);
      } else {
        cells.push(borderChars.vertical + ' ' + styledCell + ' ');
      }
    });

    if (options.border === 'none' || options.border === 'minimal') {
      return cells.join(' '.repeat(options.padding || 1));
    } else {
      return cells.join('') + borderChars.vertical;
    }
  }

  private padCell(text: string, width: number, align: Align, padding: number): string {
    const cleanText = this.stripAnsi(text);
    const availableWidth = width;
    
    let processedText = cleanText;
    if (cleanText.length > availableWidth) {
      processedText = cleanText.substring(0, availableWidth - 3) + '...';
    }

    const leftPadding = ' '.repeat(padding);
    const rightPadding = ' '.repeat(padding);

    switch (align) {
      case 'center':
        const totalSpaces = availableWidth - processedText.length;
        const leftSpaces = Math.floor(totalSpaces / 2);
        const rightSpaces = totalSpaces - leftSpaces;
        return leftPadding + ' '.repeat(leftSpaces) + text + ' '.repeat(rightSpaces) + rightPadding;
      
      case 'right':
        const rightSpaces = availableWidth - processedText.length;
        return leftPadding + ' '.repeat(rightSpaces) + text + rightPadding;
      
      default:
        const leftSpaces = availableWidth - processedText.length;
        return leftPadding + text + ' '.repeat(leftSpaces) + rightPadding;
    }
  }

  private extractRowData(row: any, columnCount: number): string[] {
    if (Array.isArray(row)) {
      return row.slice(0, columnCount).map(cell => String(cell || ''));
    }

    if (typeof row === 'object' && row !== null) {
      const values = Object.values(row);
      return values.slice(0, columnCount).map(cell => String(cell || ''));
    }

    return [String(row || '')];
  }

  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  private getRowStyle(table: Table, rowIndex: number): string | undefined {
    if (table.options.style?.alternate && rowIndex % 2 === 1) {
      return table.options.style.alternate;
    }
    return table.options.style?.row;
  }

  private filterData(data: any[], column: string | number, value: any): any[] {
    return data.filter(row => {
      const rowData = this.extractRowData(row, Number.MAX_SAFE_INTEGER);
      const cellValue = typeof column === 'number' ? rowData[column] : row[column];
      return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
    });
  }

  private sortData(data: any[], column: string | number, direction: SortDirection): any[] {
    return [...data].sort((a, b) => {
      const aData = this.extractRowData(a, Number.MAX_SAFE_INTEGER);
      const bData = this.extractRowData(b, Number.MAX_SAFE_INTEGER);
      
      const aValue = typeof column === 'number' ? aData[column] : a[column];
      const bValue = typeof column === 'number' ? bData[column] : b[column];
      
      let comparison = 0;
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue || '').localeCompare(String(bValue || ''));
      }
      
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export class TableUtils {
  static mergeTables(tables: Table[]): Table {
    if (tables.length === 0) {
      throw new Error('No tables to merge');
    }

    const baseTable = tables[0];
    const mergedData = tables.flatMap(table => table.data);
    const mergedHeaders = baseTable.headers;

    const maxColumns = Math.max(...tables.map(table => table.columns));
    const columnWidths = new Array(maxColumns).fill(0);

    tables.forEach(table => {
      table.columnWidths.forEach((width, index) => {
        if (index < maxColumns) {
          columnWidths[index] = Math.max(columnWidths[index], width);
        }
      });
    });

    return {
      ...baseTable,
      data: mergedData,
      columns: maxColumns,
      columnWidths
    };
  }

  static transposeTable(table: Table): Table {
    const transposedData: any[] = [];
    const transposedHeaders: string[] = [];
    const transposedColumnWidths: number[] = [];

    for (let col = 0; col < table.columns; col++) {
      const columnData: any[] = [];
      let maxWidth = 0;

      if (col < table.headers.length) {
        transposedHeaders.push(`Row ${col + 1}`);
        maxWidth = Math.max(maxWidth, this.stripAnsi(table.headers[col]).length);
      }

      for (let row = 0; row < table.data.length; row++) {
        const rowData = this.extractRowData(table.data[row], table.columns);
        if (col < rowData.length) {
          columnData.push(rowData[col]);
          maxWidth = Math.max(maxWidth, this.stripAnsi(String(rowData[col])).length);
        }
      }

      transposedData.push(columnData);
      transposedColumnWidths.push(maxWidth);
    }

    return {
      ...table,
      data: transposedData,
      headers: transposedHeaders,
      columns: table.data.length,
      columnWidths: transposedColumnWidths
    };
  }

  static calculateTableStats(table: Table): {
    rowCount: number;
    columnCount: number;
    totalWidth: number;
    cellCount: number;
  } {
    const totalWidth = table.columnWidths.reduce((sum, width) => 
      sum + width + table.options.padding * 2, 0) + (table.columns - 1) * 3;

    return {
      rowCount: table.data.length,
      columnCount: table.columns,
      totalWidth,
      cellCount: table.data.length * table.columns
    };
  }

  private static extractRowData(row: any, columnCount: number): string[] {
    if (Array.isArray(row)) {
      return row.slice(0, columnCount).map(cell => String(cell || ''));
    }

    if (typeof row === 'object' && row !== null) {
      const values = Object.values(row);
      return values.slice(0, columnCount).map(cell => String(cell || ''));
    }

    return [String(row || '')];
  }

  private static stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

export const tableFormatter = new TableFormatter();

export function createTable(data: any[], options?: TableOptions): Table {
  return tableFormatter.createTable(data, options);
}

export function formatTable(table: Table): string {
  return tableFormatter.formatTable(table);
}

export function autoSizeColumns(table: Table): void {
  tableFormatter.autoSizeColumns(table);
}

export function sortTable(table: Table, column: string | number, direction: SortDirection): void {
  tableFormatter.sortTable(table, column, direction);
}

export function paginateTable(table: Table, page: number, pageSize: number): Table {
  return tableFormatter.paginateTable(table, page, pageSize);
}

export function applyBorderStyle(table: Table, style: BorderStyle): void {
  tableFormatter.applyBorderStyle(table, style);
}

export function mergeTables(tables: Table[]): Table {
  return TableUtils.mergeTables(tables);
}

export function transposeTable(table: Table): Table {
  return TableUtils.transposeTable(table);
}

export function calculateTableStats(table: Table): {
  rowCount: number;
  columnCount: number;
  totalWidth: number;
  cellCount: number;
} {
  return TableUtils.calculateTableStats(table);
}

export const TableStyles = {
  basic: {
    border: 'single' as BorderStyle,
    padding: 1,
    margin: 0,
    align: 'left' as Align,
    headerAlign: 'center' as Align
  },
  minimal: {
    border: 'minimal' as BorderStyle,
    padding: 1,
    margin: 0,
    align: 'left' as Align,
    headerAlign: 'left' as Align,
    compact: true
  },
  fancy: {
    border: 'double' as BorderStyle,
    padding: 2,
    margin: 1,
    align: 'center' as Align,
    headerAlign: 'center' as Align,
    style: {
      header: 'brightBlue',
      border: 'white',
      alternate: 'gray'
    }
  },
  compact: {
    border: 'single' as BorderStyle,
    padding: 0,
    margin: 0,
    align: 'left' as Align,
    headerAlign: 'left' as Align,
    compact: true
  },
  borderless: {
    border: 'none' as BorderStyle,
    padding: 1,
    margin: 0,
    align: 'left' as Align,
    headerAlign: 'left' as Align
  }
};