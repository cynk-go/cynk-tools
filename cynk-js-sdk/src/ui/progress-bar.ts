import { stdout, stderr } from 'process';
import { Colorizer } from './colors';

export type ProgressStyle = 
  | 'bar' 
  | 'block' 
  | 'line' 
  | 'percentage' 
  | 'spinner' 
  | 'dots' 
  | 'pulse' 
  | 'bounce' 
  | 'box' 
  | 'circle' 
  | 'square' 
  | 'arrow' 
  | 'triangle' 
  | 'star' 
  | 'heart' 
  | 'diamond' 
  | 'custom';

export type ProgressBarTheme = {
  completeChar: string;
  incompleteChar: string;
  completeColor: string;
  incompleteColor: string;
  borderColor: string;
  percentageColor: string;
  textColor: string;
};

export interface ProgressOptions {
  width?: number;
  style?: ProgressStyle;
  theme?: Partial<ProgressBarTheme>;
  showPercentage?: boolean;
  showValue?: boolean;
  showElapsedTime?: boolean;
  showRemainingTime?: boolean;
  showSpeed?: boolean;
  stream?: NodeJS.WriteStream;
  hideCursor?: boolean;
  format?: string;
  customChars?: string[];
}

export interface ProgressBar {
  id: string;
  total: number;
  current: number;
  width: number;
  style: ProgressStyle;
  theme: ProgressBarTheme;
  options: ProgressOptions;
  startTime: number;
  lastUpdateTime: number;
  isActive: boolean;
  stream: NodeJS.WriteStream;
  hideCursor: boolean;
  lastBytesPerSecond: number;
  speedSamples: number[];
}

export interface MultiProgress {
  id: string;
  bars: Map<string, ProgressBar>;
  stream: NodeJS.WriteStream;
  isActive: boolean;
  renderInterval: NodeJS.Timeout | null;
}

class ProgressBarManager {
  private static readonly DEFAULT_THEME: ProgressBarTheme = {
    completeChar: '█',
    incompleteChar: '░',
    completeColor: 'green',
    incompleteColor: 'gray',
    borderColor: 'white',
    percentageColor: 'blue',
    textColor: 'white'
  };

  private static readonly STYLE_CHARS: Record<ProgressStyle, string[]> = {
    bar: ['█', '░'],
    block: ['▓', '▒', '░'],
    line: ['─', '━'],
    percentage: ['█', '░'],
    spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    dots: ['⣀', '⣄', '⣤', '⣦', '⣶', '⣷', '⣿'],
    pulse: ['□', '■'],
    bounce: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
    box: ['▫', '▪'],
    circle: ['◔', '◑', '◕', '●'],
    square: ['◰', '◳', '◲', '◱'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    triangle: ['◢', '◣', '◤', '◥'],
    star: ['✶', '✸', '✹', '✺', '✹', '✷'],
    heart: ['💛', '💙', '💜', '💚', '❤️'],
    diamond: ['♦', '♢'],
    custom: ['█', '░']
  };

  private activeBars: Map<string, ProgressBar> = new Map();
  private renderIntervals: Map<string, NodeJS.Timeout> = new Map();

  createProgressBar(total: number, options: ProgressOptions = {}): ProgressBar {
    const {
      width = 30,
      style = 'bar',
      theme = {},
      showPercentage = true,
      showValue = false,
      showElapsedTime = true,
      showRemainingTime = true,
      showSpeed = false,
      stream = stdout,
      hideCursor = true,
      format = '',
      customChars = []
    } = options;

    const mergedTheme: ProgressBarTheme = { ...ProgressBarManager.DEFAULT_THEME, ...theme };

    const progressBar: ProgressBar = {
      id: this.generateId(),
      total,
      current: 0,
      width,
      style,
      theme: mergedTheme,
      options: {
        width,
        style,
        theme: mergedTheme,
        showPercentage,
        showValue,
        showElapsedTime,
        showRemainingTime,
        showSpeed,
        stream,
        hideCursor,
        format,
        customChars
      },
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      isActive: false,
      stream,
      hideCursor,
      lastBytesPerSecond: 0,
      speedSamples: []
    };

    return progressBar;
  }

  startProgressBar(progressBar: ProgressBar): void {
    if (progressBar.isActive) {
      return;
    }

    progressBar.isActive = true;
    progressBar.startTime = Date.now();
    progressBar.lastUpdateTime = Date.now();
    this.activeBars.set(progressBar.id, progressBar);

    if (progressBar.hideCursor) {
      progressBar.stream.write('\x1b[?25l');
    }

    const render = () => {
      if (!progressBar.isActive) {
        return;
      }

      this.renderProgressBar(progressBar);
    };

    render();

    const intervalId = setInterval(render, 100);
    this.renderIntervals.set(progressBar.id, intervalId);
  }

  updateProgress(progressBar: ProgressBar, current: number, data?: any): void {
    if (!progressBar.isActive) {
      return;
    }

    const now = Date.now();
    const timeDiff = (now - progressBar.lastUpdateTime) / 1000;

    if (timeDiff > 0 && progressBar.options.showSpeed) {
      const bytesDiff = current - progressBar.current;
      const currentSpeed = bytesDiff / timeDiff;
      
      progressBar.speedSamples.push(currentSpeed);
      if (progressBar.speedSamples.length > 10) {
        progressBar.speedSamples.shift();
      }
      
      progressBar.lastBytesPerSecond = progressBar.speedSamples.reduce((a, b) => a + b, 0) / progressBar.speedSamples.length;
    }

    progressBar.current = Math.min(Math.max(0, current), progressBar.total);
    progressBar.lastUpdateTime = now;
  }

  incrementProgress(progressBar: ProgressBar, increment: number = 1): void {
    this.updateProgress(progressBar, progressBar.current + increment);
  }

  setProgressStyle(progressBar: ProgressBar, style: ProgressStyle): void {
    const wasActive = progressBar.isActive;
    
    if (wasActive) {
      this.stopProgressBar(progressBar);
    }

    progressBar.style = style;

    if (wasActive) {
      this.startProgressBar(progressBar);
    }
  }

  setProgressWidth(progressBar: ProgressBar, width: number): void {
    progressBar.width = Math.max(10, Math.min(200, width));
  }

  stopProgressBar(progressBar: ProgressBar): void {
    if (!progressBar.isActive) {
      return;
    }

    progressBar.isActive = false;
    
    const intervalId = this.renderIntervals.get(progressBar.id);
    if (intervalId) {
      clearInterval(intervalId);
      this.renderIntervals.delete(progressBar.id);
    }

    this.activeBars.delete(progressBar.id);

    this.clearLine(progressBar.stream);

    if (progressBar.hideCursor) {
      progressBar.stream.write('\x1b[?25h');
    }
  }

  completeProgressBar(progressBar: ProgressBar): void {
    progressBar.current = progressBar.total;
    this.renderProgressBar(progressBar);
    this.stopProgressBar(progressBar);
  }

  private renderProgressBar(progressBar: ProgressBar): void {
    const percentage = progressBar.total > 0 ? (progressBar.current / progressBar.total) : 0;
    const filledWidth = Math.floor(percentage * progressBar.width);
    const emptyWidth = progressBar.width - filledWidth;

    let barContent = '';

    switch (progressBar.style) {
      case 'bar':
        const completeChar = progressBar.theme.completeChar;
        const incompleteChar = progressBar.theme.incompleteChar;
        
        const filled = Colorizer.colorize(completeChar.repeat(filledWidth), progressBar.theme.completeColor as any);
        const empty = Colorizer.colorize(incompleteChar.repeat(emptyWidth), progressBar.theme.incompleteColor as any);
        barContent = `${filled}${empty}`;
        break;

      case 'block':
        const blockChars = ProgressBarManager.STYLE_CHARS.block;
        const blockFilled = Math.floor(percentage * blockChars.length);
        const blockChar = blockFilled < blockChars.length ? blockChars[blockFilled] : blockChars[blockChars.length - 1];
        barContent = Colorizer.colorize(blockChar.repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'line':
        const lineChars = ProgressBarManager.STYLE_CHARS.line;
        const lineFilled = Colorizer.colorize(lineChars[1].repeat(filledWidth), progressBar.theme.completeColor as any);
        const lineEmpty = Colorizer.colorize(lineChars[0].repeat(emptyWidth), progressBar.theme.incompleteColor as any);
        barContent = `${lineFilled}${lineEmpty}`;
        break;

      case 'percentage':
        const percentChars = ProgressBarManager.STYLE_CHARS.percentage;
        const percentFilled = Colorizer.colorize(percentChars[0].repeat(filledWidth), progressBar.theme.completeColor as any);
        const percentEmpty = Colorizer.colorize(percentChars[1].repeat(emptyWidth), progressBar.theme.incompleteColor as any);
        barContent = `${percentFilled}${percentEmpty}`;
        break;

      case 'spinner':
        const spinnerChars = ProgressBarManager.STYLE_CHARS.spinner;
        const spinnerIndex = Math.floor((Date.now() / 100) % spinnerChars.length);
        barContent = Colorizer.colorize(spinnerChars[spinnerIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'dots':
        const dotsChars = ProgressBarManager.STYLE_CHARS.dots;
        const dotsIndex = Math.floor(percentage * dotsChars.length);
        const dotsChar = dotsIndex < dotsChars.length ? dotsChars[dotsIndex] : dotsChars[dotsChars.length - 1];
        barContent = Colorizer.colorize(dotsChar.repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'pulse':
        const pulseChars = ProgressBarManager.STYLE_CHARS.pulse;
        const pulseIndex = Math.floor((Date.now() / 200) % pulseChars.length);
        barContent = Colorizer.colorize(pulseChars[pulseIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'bounce':
        const bounceChars = ProgressBarManager.STYLE_CHARS.bounce;
        const bounceIndex = Math.floor((Date.now() / 100) % bounceChars.length);
        barContent = Colorizer.colorize(bounceChars[bounceIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'box':
        const boxChars = ProgressBarManager.STYLE_CHARS.box;
        const boxIndex = Math.floor(percentage * boxChars.length);
        const boxChar = boxIndex < boxChars.length ? boxChars[boxIndex] : boxChars[boxChars.length - 1];
        barContent = Colorizer.colorize(boxChar.repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'circle':
        const circleChars = ProgressBarManager.STYLE_CHARS.circle;
        const circleIndex = Math.floor(percentage * circleChars.length);
        const circleChar = circleIndex < circleChars.length ? circleChars[circleIndex] : circleChars[circleChars.length - 1];
        barContent = Colorizer.colorize(circleChar.repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'square':
        const squareChars = ProgressBarManager.STYLE_CHARS.square;
        const squareIndex = Math.floor((Date.now() / 200) % squareChars.length);
        barContent = Colorizer.colorize(squareChars[squareIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'arrow':
        const arrowChars = ProgressBarManager.STYLE_CHARS.arrow;
        const arrowIndex = Math.floor((Date.now() / 150) % arrowChars.length);
        barContent = Colorizer.colorize(arrowChars[arrowIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'triangle':
        const triangleChars = ProgressBarManager.STYLE_CHARS.triangle;
        const triangleIndex = Math.floor((Date.now() / 150) % triangleChars.length);
        barContent = Colorizer.colorize(triangleChars[triangleIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'star':
        const starChars = ProgressBarManager.STYLE_CHARS.star;
        const starIndex = Math.floor((Date.now() / 150) % starChars.length);
        barContent = Colorizer.colorize(starChars[starIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'heart':
        const heartChars = ProgressBarManager.STYLE_CHARS.heart;
        const heartIndex = Math.floor((Date.now() / 200) % heartChars.length);
        barContent = Colorizer.colorize(heartChars[heartIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'diamond':
        const diamondChars = ProgressBarManager.STYLE_CHARS.diamond;
        const diamondIndex = Math.floor((Date.now() / 150) % diamondChars.length);
        barContent = Colorizer.colorize(diamondChars[diamondIndex].repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      case 'custom':
        const customChars = progressBar.options.customChars.length > 0 ? progressBar.options.customChars : ProgressBarManager.STYLE_CHARS.custom;
        const customIndex = Math.floor(percentage * customChars.length);
        const customChar = customIndex < customChars.length ? customChars[customIndex] : customChars[customChars.length - 1];
        barContent = Colorizer.colorize(customChar.repeat(progressBar.width), progressBar.theme.completeColor as any);
        break;

      default:
        const defaultChars = ProgressBarManager.STYLE_CHARS.bar;
        const defaultFilled = Colorizer.colorize(defaultChars[0].repeat(filledWidth), progressBar.theme.completeColor as any);
        const defaultEmpty = Colorizer.colorize(defaultChars[1].repeat(emptyWidth), progressBar.theme.incompleteColor as any);
        barContent = `${defaultFilled}${defaultEmpty}`;
    }

    let output = '';

    if (progressBar.options.format) {
      output = this.formatProgressBar(progressBar, barContent, percentage);
    } else {
      const borderLeft = Colorizer.colorize('[', progressBar.theme.borderColor as any);
      const borderRight = Colorizer.colorize(']', progressBar.theme.borderColor as any);
      
      let infoParts: string[] = [];
      
      if (progressBar.options.showPercentage) {
        const percentText = `${Math.round(percentage * 100)}%`;
        const coloredPercent = Colorizer.colorize(percentText, progressBar.theme.percentageColor as any);
        infoParts.push(coloredPercent);
      }
      
      if (progressBar.options.showValue) {
        const valueText = `${progressBar.current}/${progressBar.total}`;
        const coloredValue = Colorizer.colorize(valueText, progressBar.theme.textColor as any);
        infoParts.push(coloredValue);
      }
      
      if (progressBar.options.showElapsedTime) {
        const elapsed = this.formatTime(Date.now() - progressBar.startTime);
        infoParts.push(Colorizer.colorize(elapsed, progressBar.theme.textColor as any));
      }
      
      if (progressBar.options.showRemainingTime && percentage > 0 && percentage < 1) {
        const remaining = this.calculateETA(progressBar.startTime, progressBar.current, progressBar.total);
        infoParts.push(Colorizer.colorize(remaining, progressBar.theme.textColor as any));
      }
      
      if (progressBar.options.showSpeed && progressBar.lastBytesPerSecond > 0) {
        const speed = this.formatSpeed(progressBar.lastBytesPerSecond);
        infoParts.push(Colorizer.colorize(speed, progressBar.theme.textColor as any));
      }
      
      const info = infoParts.join(' ');
      
      output = `${borderLeft}${barContent}${borderRight} ${info}`;
    }

    this.clearLine(progressBar.stream);
    progressBar.stream.write(output);
  }

  private formatProgressBar(progressBar: ProgressBar, barContent: string, percentage: number): string {
    const tokens: Record<string, string> = {
      '{bar}': barContent,
      '{percentage}': Colorizer.colorize(`${Math.round(percentage * 100)}%`, progressBar.theme.percentageColor as any),
      '{value}': Colorizer.colorize(`${progressBar.current}/${progressBar.total}`, progressBar.theme.textColor as any),
      '{current}': Colorizer.colorize(progressBar.current.toString(), progressBar.theme.textColor as any),
      '{total}': Colorizer.colorize(progressBar.total.toString(), progressBar.theme.textColor as any),
      '{elapsed}': Colorizer.colorize(this.formatTime(Date.now() - progressBar.startTime), progressBar.theme.textColor as any),
      '{eta}': Colorizer.colorize(this.calculateETA(progressBar.startTime, progressBar.current, progressBar.total), progressBar.theme.textColor as any),
      '{speed}': Colorizer.colorize(this.formatSpeed(progressBar.lastBytesPerSecond), progressBar.theme.textColor as any)
    };

    let formatted = progressBar.options.format;
    for (const [token, value] of Object.entries(tokens)) {
      formatted = formatted!.replace(new RegExp(token, 'g'), value);
    }

    return formatted;
  }

  calculateETA(startTime: Date | number, current: number, total: number): string {
    if (current === 0) return '--:--';
    
    const start = typeof startTime === 'number' ? startTime : startTime.getTime();
    const elapsed = Date.now() - start;
    const rate = current / elapsed;
    const remaining = total - current;
    const eta = rate > 0 ? remaining / rate : 0;
    
    return this.formatTime(eta);
  }

  formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond <= 0) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  }

  private clearLine(stream: NodeJS.WriteStream): void {
    stream.write('\r\x1b[K');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getAllActiveBars(): ProgressBar[] {
    return Array.from(this.activeBars.values());
  }

  stopAllBars(): void {
    for (const bar of this.activeBars.values()) {
      this.stopProgressBar(bar);
    }
  }

  getProgressBarDuration(progressBar: ProgressBar): number {
    return Date.now() - progressBar.startTime;
  }
}

export class MultiProgressManager {
  private barManager = new ProgressBarManager();
  private multiProgressInstances: Map<string, MultiProgress> = new Map();

  createMultiProgress(stream: NodeJS.WriteStream = stdout): MultiProgress {
    const multiProgress: MultiProgress = {
      id: this.generateId(),
      bars: new Map(),
      stream,
      isActive: false,
      renderInterval: null
    };

    this.multiProgressInstances.set(multiProgress.id, multiProgress);
    return multiProgress;
  }

  addBarToMultiProgress(multiProgress: MultiProgress, name: string, total: number, options: ProgressOptions = {}): ProgressBar {
    const bar = this.barManager.createProgressBar(total, { ...options, stream: multiProgress.stream });
    multiProgress.bars.set(name, bar);
    
    if (multiProgress.isActive) {
      this.barManager.startProgressBar(bar);
    }
    
    return bar;
  }

  startMultiProgress(multiProgress: MultiProgress): void {
    if (multiProgress.isActive) {
      return;
    }

    multiProgress.isActive = true;

    if (multiProgress.stream.isTTY) {
      multiProgress.stream.write('\x1b[?25l');
    }

    const renderAll = () => {
      if (!multiProgress.isActive) {
        return;
      }

      this.clearScreen(multiProgress.stream);
      
      let output = '';
      let lineCount = 0;
      
      for (const [name, bar] of multiProgress.bars) {
        if (bar.isActive) {
          const percentage = bar.total > 0 ? (bar.current / bar.total) : 0;
          const filledWidth = Math.floor(percentage * bar.width);
          const emptyWidth = bar.width - filledWidth;
          
          const completeChar = bar.theme.completeChar;
          const incompleteChar = bar.theme.incompleteChar;
          
          const filled = Colorizer.colorize(completeChar.repeat(filledWidth), bar.theme.completeColor as any);
          const empty = Colorizer.colorize(incompleteChar.repeat(emptyWidth), bar.theme.incompleteColor as any);
          
          const borderLeft = Colorizer.colorize('[', bar.theme.borderColor as any);
          const borderRight = Colorizer.colorize(']', bar.theme.borderColor as any);
          
          const percentText = Colorizer.colorize(`${Math.round(percentage * 100)}%`, bar.theme.percentageColor as any);
          const nameText = Colorizer.colorize(name, bar.theme.textColor as any);
          
          output += `${nameText} ${borderLeft}${filled}${empty}${borderRight} ${percentText}\n`;
          lineCount++;
        }
      }
      
      multiProgress.stream.write(output);
      
      if (lineCount > 0) {
        multiProgress.stream.write(`\x1b[${lineCount}A`);
      }
    };

    multiProgress.renderInterval = setInterval(renderAll, 100);
    
    for (const bar of multiProgress.bars.values()) {
      this.barManager.startProgressBar(bar);
    }
  }

  stopMultiProgress(multiProgress: MultiProgress): void {
    if (!multiProgress.isActive) {
      return;
    }

    multiProgress.isActive = false;

    if (multiProgress.renderInterval) {
      clearInterval(multiProgress.renderInterval);
      multiProgress.renderInterval = null;
    }

    for (const bar of multiProgress.bars.values()) {
      this.barManager.stopProgressBar(bar);
    }

    this.clearScreen(multiProgress.stream);
    
    if (multiProgress.stream.isTTY) {
      multiProgress.stream.write('\x1b[?25h');
    }
  }

  updateBarInMultiProgress(multiProgress: MultiProgress, name: string, current: number): void {
    const bar = multiProgress.bars.get(name);
    if (bar) {
      this.barManager.updateProgress(bar, current);
    }
  }

  removeBarFromMultiProgress(multiProgress: MultiProgress, name: string): void {
    const bar = multiProgress.bars.get(name);
    if (bar) {
      this.barManager.stopProgressBar(bar);
      multiProgress.bars.delete(name);
    }
  }

  private clearScreen(stream: NodeJS.WriteStream): void {
    stream.write('\x1b[2J\x1b[0f');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const progressBarManager = new ProgressBarManager();
export const multiProgressManager = new MultiProgressManager();

export function createProgressBar(total: number, options?: ProgressOptions): ProgressBar {
  return progressBarManager.createProgressBar(total, options);
}

export function startProgressBar(progressBar: ProgressBar): void {
  progressBarManager.startProgressBar(progressBar);
}

export function updateProgress(progressBar: ProgressBar, current: number, data?: any): void {
  progressBarManager.updateProgress(progressBar, current, data);
}

export function incrementProgress(progressBar: ProgressBar, increment?: number): void {
  progressBarManager.incrementProgress(progressBar, increment);
}

export function setProgressStyle(progressBar: ProgressBar, style: ProgressStyle): void {
  progressBarManager.setProgressStyle(progressBar, style);
}

export function setProgressWidth(progressBar: ProgressBar, width: number): void {
  progressBarManager.setProgressWidth(progressBar, width);
}

export function stopProgressBar(progressBar: ProgressBar): void {
  progressBarManager.stopProgressBar(progressBar);
}

export function completeProgressBar(progressBar: ProgressBar): void {
  progressBarManager.completeProgressBar(progressBar);
}

export function calculateETA(startTime: Date | number, current: number, total: number): string {
  return progressBarManager.calculateETA(startTime, current, total);
}

export function formatSpeed(bytesPerSecond: number): string {
  return progressBarManager.formatSpeed(bytesPerSecond);
}

export function createMultiProgress(stream?: NodeJS.WriteStream): MultiProgress {
  return multiProgressManager.createMultiProgress(stream);
}

export function addBarToMultiProgress(multiProgress: MultiProgress, name: string, total: number, options?: ProgressOptions): ProgressBar {
  return multiProgressManager.addBarToMultiProgress(multiProgress, name, total, options);
}

export function startMultiProgress(multiProgress: MultiProgress): void {
  multiProgressManager.startMultiProgress(multiProgress);
}

export function stopMultiProgress(multiProgress: MultiProgress): void {
  multiProgressManager.stopMultiProgress(multiProgress);
}

export function updateBarInMultiProgress(multiProgress: MultiProgress, name: string, current: number): void {
  multiProgressManager.updateBarInMultiProgress(multiProgress, name, current);
}

export function removeBarFromMultiProgress(multiProgress: MultiProgress, name: string): void {
  multiProgressManager.removeBarFromMultiProgress(multiProgress, name);
}

export const ProgressThemes = {
  default: ProgressBarManager.DEFAULT_THEME,
  colorful: {
    completeChar: '█',
    incompleteChar: '░',
    completeColor: 'brightGreen',
    incompleteColor: 'gray',
    borderColor: 'white',
    percentageColor: 'brightBlue',
    textColor: 'white'
  },
  minimal: {
    completeChar: '=',
    incompleteChar: '-',
    completeColor: 'green',
    incompleteColor: 'gray',
    borderColor: 'white',
    percentageColor: 'blue',
    textColor: 'white'
  },
  retro: {
    completeChar: '▓',
    incompleteChar: '▒',
    completeColor: 'yellow',
    incompleteColor: 'gray',
    borderColor: 'white',
    percentageColor: 'brightYellow',
    textColor: 'white'
  }
};