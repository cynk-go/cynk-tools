import { stdout } from 'process';
import { Colorizer } from './colors';

export type SpinnerStyle = 
  | 'dots' 
  | 'dots2' 
  | 'dots3' 
  | 'dots4' 
  | 'dots5' 
  | 'dots6' 
  | 'dots7' 
  | 'dots8' 
  | 'dots9' 
  | 'dots10' 
  | 'dots11' 
  | 'dots12' 
  | 'line' 
  | 'line2' 
  | 'pipe' 
  | 'simpleDots' 
  | 'simpleDotsScrolling' 
  | 'star' 
  | 'star2' 
  | 'flip' 
  | 'hamburger' 
  | 'growVertical' 
  | 'growHorizontal' 
  | 'balloon' 
  | 'balloon2' 
  | 'noise' 
  | 'bounce' 
  | 'boxBounce' 
  | 'boxBounce2' 
  | 'triangle' 
  | 'arc' 
  | 'circle' 
  | 'squareCorners' 
  | 'circleQuarters' 
  | 'circleHalves' 
  | 'squish' 
  | 'toggle' 
  | 'toggle2' 
  | 'toggle3' 
  | 'toggle4' 
  | 'toggle5' 
  | 'toggle6' 
  | 'toggle7' 
  | 'toggle8' 
  | 'toggle9' 
  | 'toggle10' 
  | 'toggle11' 
  | 'toggle12' 
  | 'toggle13' 
  | 'arrow' 
  | 'arrow2' 
  | 'arrow3' 
  | 'bouncingBar' 
  | 'bouncingBall' 
  | 'smiley' 
  | 'monkey' 
  | 'hearts' 
  | 'clock' 
  | 'earth' 
  | 'material' 
  | 'moon' 
  | 'runner' 
  | 'pong' 
  | 'shark' 
  | 'dqpb' 
  | 'weather' 
  | 'christmas' 
  | 'grenade' 
  | 'point' 
  | 'layer' 
  | 'betaWave';

export interface Spinner {
  id: string;
  message: string;
  style: SpinnerStyle;
  color: string;
  interval: number;
  frames: string[];
  frameIndex: number;
  isActive: boolean;
  startTime: number;
  stream: NodeJS.WriteStream;
  hideCursor: boolean;
}

export interface SpinnerOptions {
  style?: SpinnerStyle;
  color?: string;
  interval?: number;
  stream?: NodeJS.WriteStream;
  hideCursor?: boolean;
}

class SpinnerManager {
  private static readonly SPINNER_FRAMES: Record<SpinnerStyle, string[]> = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    dots2: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
    dots3: ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'],
    dots4: ['⠄', '⠆', '⠇', '⠋', '⠙', '⠸', '⠰', '⠠', '⠰', '⠸', '⠙', '⠋', '⠇', '⠆'],
    dots5: ['⠋', '⠙', '⠚', '⠒', '⠂', '⠂', '⠒', '⠲', '⠴', '⠦', '⠖', '⠒', '⠐', '⠐', '⠒', '⠓', '⠋'],
    dots6: ['⠁', '⠉', '⠙', '⠚', '⠒', '⠂', '⠂', '⠒', '⠲', '⠴', '⠤', '⠄', '⠄', '⠤', '⠴', '⠲', '⠒', '⠂', '⠂', '⠒', '⠚', '⠙', '⠉', '⠁'],
    dots7: ['⠈', '⠉', '⠋', '⠓', '⠒', '⠐', '⠐', '⠒', '⠖', '⠦', '⠤', '⠠', '⠠', '⠤', '⠦', '⠖', '⠒', '⠐', '⠐', '⠒', '⠓', '⠋', '⠉', '⠈'],
    dots8: ['⠁', '⠁', '⠉', '⠙', '⠚', '⠒', '⠂', '⠂', '⠒', '⠲', '⠴', '⠤', '⠄', '⠄', '⠤', '⠠', '⠠', '⠤', '⠦', '⠖', '⠒', '⠐', '⠐', '⠒', '⠓', '⠋', '⠉', '⠈', '⠈'],
    dots9: ['⢹', '⢺', '⢼', '⣸', '⣇', '⡧', '⡗', '⡏'],
    dots10: ['⢄', '⢂', '⢁', '⡁', '⡈', '⡐', '⡠'],
    dots11: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
    dots12: ['⢀⠀', '⡀⠀', '⠄⠀', '⢂⠀', '⡂⠀', '⠅⠀', '⢃⠀', '⡃⠀', '⠍⠀', '⢋⠀', '⡋⠀', '⠍⠁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙', '⢈⠩', '⡀⢙', '⠄⡙', '⢂⠩', '⡂⢘', '⠅⡘', '⢃⠨', '⡃⢐', '⠍⡐', '⢋⠠', '⡋⢀', '⠍⡁', '⢋⠁', '⡋⠁', '⠍⠉', '⠋⠉', '⠋⠉', '⠉⠙', '⠉⠙', '⠉⠩', '⠈⢙', '⠈⡙', '⠈⠩', '⠀⢙', '⠀⡙', '⠀⠩', '⠀⢘', '⠀⡘', '⠀⠨', '⠀⢐', '⠀⡐', '⠀⠠', '⠀⢀', '⠀⡀'],
    line: ['-', '\\', '|', '/'],
    line2: ['⠂', '-', '–', '—', '–', '-'],
    pipe: ['┤', '┘', '┴', '└', '├', '┌', '┬', '┐'],
    simpleDots: ['.  ', '.. ', '...', '   '],
    simpleDotsScrolling: ['.  ', '.. ', '...', ' ..', '  .', '   '],
    star: ['✶', '✸', '✹', '✺', '✹', '✷'],
    star2: ['+', 'x', '*'],
    flip: ['_', '_', '_', '-', '`', '`', "'", '´', '-', '_', '_', '_'],
    hamburger: ['☱', '☲', '☴'],
    growVertical: ['▁', '▃', '▄', '▅', '▆', '▇', '▆', '▅', '▄', '▃'],
    growHorizontal: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '▊', '▋', '▌', '▍', '▎'],
    balloon: [' ', '.', 'o', 'O', '@', '*', ' '],
    balloon2: ['.', 'o', 'O', '°', 'O', 'o', '.'],
    noise: ['▓', '▒', '░'],
    bounce: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[ ===]', '[  ==]', '[   =]', '[    ]', '[   =]', '[  ==]', '[ ===]', '[====]', '[=== ]', '[==  ]', '[=   ]'],
    boxBounce: ['▖', '▘', '▝', '▗'],
    boxBounce2: ['▌', '▀', '▐', '▄'],
    triangle: ['◢', '◣', '◤', '◥'],
    arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
    circle: ['◡', '⊙', '◠'],
    squareCorners: ['◰', '◳', '◲', '◱'],
    circleQuarters: ['◴', '◷', '◶', '◵'],
    circleHalves: ['◐', '◓', '◑', '◒'],
    squish: ['╫', '╪'],
    toggle: ['⊶', '⊷'],
    toggle2: ['▫', '▪'],
    toggle3: ['□', '■'],
    toggle4: ['■', '□', '▪', '▫'],
    toggle5: ['▮', '▯'],
    toggle6: ['■', '●', '∙'],
    toggle7: ['⦾', '⦿'],
    toggle8: ['◍', '◌'],
    toggle9: ['◉', '◎'],
    toggle10: ['㊂', '㊀', '㊁'],
    toggle11: ['⧇', '⧆'],
    toggle12: ['☗', '☖'],
    toggle13: ['=', '*', '-'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
    arrow2: ['⬆️ ', '↗️ ', '➡️ ', '↘️ ', '⬇️ ', '↙️ ', '⬅️ ', '↖️ '],
    arrow3: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
    bouncingBar: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[ ===]', '[  ==]', '[   =]', '[    ]', '[   =]', '[  ==]', '[ ===]', '[====]', '[=== ]', '[==  ]', '[=   ]'],
    bouncingBall: ['( ●    )', '(  ●   )', '(   ●  )', '(    ● )', '(     ●)', '(    ● )', '(   ●  )', '(  ●   )', '( ●    )', '(●     )'],
    smiley: ['😄 ', '😝 '],
    monkey: ['🙈 ', '🙈 ', '🙉 ', '🙊 '],
    hearts: ['💛 ', '💙 ', '💜 ', '💚 ', '❤️ '],
    clock: ['🕐 ', '🕑 ', '🕒 ', '🕓 ', '🕔 ', '🕕 ', '🕖 ', '🕗 ', '🕘 ', '🕙 ', '🕚 '],
    earth: ['🌍 ', '🌎 ', '🌏 '],
    material: ['█▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '██▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '███▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '█████▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '██████▁▁▁▁▁▁▁▁▁▁▁▁▁▁', '███████▁▁▁▁▁▁▁▁▁▁▁▁▁', '████████▁▁▁▁▁▁▁▁▁▁▁▁', '█████████▁▁▁▁▁▁▁▁▁▁▁▁', '██████████▁▁▁▁▁▁▁▁▁▁▁', '███████████▁▁▁▁▁▁▁▁▁▁', '████████████▁▁▁▁▁▁▁▁▁', '█████████████▁▁▁▁▁▁▁▁', '██████████████▁▁▁▁▁▁▁', '███████████████▁▁▁▁▁▁', '████████████████▁▁▁▁▁', '█████████████████▁▁▁▁', '██████████████████▁▁▁', '███████████████████▁▁', '████████████████████▁', '█████████████████████'],
    moon: ['🌑 ', '🌒 ', '🌓 ', '🌔 ', '🌕 ', '🌖 ', '🌗 ', '🌘 '],
    runner: ['🚶 ', '🏃 '],
    pong: ['▐⠂       ▌', '▐⠈       ▌', '▐ ⠂      ▌', '▐ ⠠      ▌', '▐  ⡀     ▌', '▐  ⠠     ▌', '▐   ⠂    ▌', '▐   ⠈    ▌', '▐    ⠂   ▌', '▐    ⠠   ▌', '▐     ⡀  ▌', '▐     ⠠  ▌', '▐      ⠂ ▌', '▐      ⠈ ▌', '▐       ⠂▌', '▐       ⠠▌', '▐       ⡀▌', '▐      ⠠ ▌', '▐      ⠂ ▌', '▐     ⠈  ▌', '▐     ⠂  ▌', '▐    ⠠   ▌', '▐    ⡀   ▌', '▐   ⠠    ▌', '▐   ⠂    ▌', '▐  ⠈     ▌', '▐  ⠂     ▌', '▐ ⠠      ▌', '▐ ⡀      ▌', '▐⠠       ▌'],
    shark: ['▐|\\____________▌', '▐_|\\___________▌', '▐__|\\__________▌', '▐___|\\_________▌', '▐____|\\________▌', '▐_____|\\_______▌', '▐______|\\______▌', '▐_______|\\_____▌', '▐________|\\____▌', '▐_________|\\___▌', '▐__________|\\__▌', '▐___________|\\_▌', '▐____________|\\▌', '▐____________/|▌', '▐___________/|_▌', '▐__________/|__▌', '▐_________/|___▌', '▐________/|____▌', '▐_______/|_____▌', '▐______/|______▌', '▐_____/|_______▌', '▐____/|________▌', '▐___/|_________▌', '▐__/|__________▌', '▐_/|___________▌', '▐/|____________▌'],
    dqpb: ['d', 'q', 'p', 'b'],
    weather: ['☀️ ', '☀️ ', '☀️ ', '🌤 ', '⛅️ ', '🌥 ', '☁️ ', '🌧 ', '🌨 ', '🌧 ', '🌨 ', '🌧 ', '🌨 ', '⛈ ', '🌨 ', '🌧 ', '🌨 ', '☁️ ', '🌥 ', '⛅️ ', '🌤 ', '☀️ ', '☀️ '],
    christmas: ['🌲', '🎄'],
    grenade: ['، ', '′ ', ' ´', '` ', '´ ', '` ', '´ ', '` ', '‵ ', '′ '],
    point: ['∙∙∙', '●∙∙', '∙●∙', '∙∙●', '∙∙∙'],
    layer: ['-', '=', '≡'],
    betaWave: ['ρββββββ', 'βρβββββ', 'ββρββββ', 'βββρβββ', 'ββββρββ', 'βββββρβ', 'ββββββρ']
  };

  private static readonly DEFAULT_INTERVALS: Partial<Record<SpinnerStyle, number>> = {
    dots: 80,
    dots2: 80,
    dots3: 80,
    dots4: 80,
    dots5: 80,
    dots6: 80,
    dots7: 80,
    dots8: 80,
    dots9: 80,
    dots10: 80,
    dots11: 100,
    dots12: 80,
    line: 130,
    line2: 100,
    pipe: 100,
    simpleDots: 400,
    simpleDotsScrolling: 200,
    star: 70,
    star2: 80,
    flip: 50,
    hamburger: 300,
    growVertical: 120,
    growHorizontal: 120,
    balloon: 140,
    balloon2: 120,
    noise: 100,
    bounce: 120,
    boxBounce: 120,
    boxBounce2: 100,
    triangle: 50,
    arc: 100,
    circle: 120,
    squareCorners: 180,
    circleQuarters: 120,
    circleHalves: 50,
    squish: 100,
    toggle: 250,
    toggle2: 80,
    toggle3: 120,
    toggle4: 100,
    toggle5: 100,
    toggle6: 80,
    toggle7: 80,
    toggle8: 80,
    toggle9: 80,
    toggle10: 80,
    toggle11: 100,
    toggle12: 120,
    toggle13: 80,
    arrow: 100,
    arrow2: 80,
    arrow3: 80,
    bouncingBar: 80,
    bouncingBall: 80,
    smiley: 200,
    monkey: 300,
    hearts: 100,
    clock: 100,
    earth: 180,
    material: 17,
    moon: 80,
    runner: 140,
    pong: 80,
    shark: 120,
    dqpb: 100,
    weather: 100,
    christmas: 400,
    grenade: 80,
    point: 125,
    layer: 150,
    betaWave: 80
  };

  private activeSpinners: Map<string, Spinner> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  createSpinner(message: string, style: SpinnerStyle = 'dots', options: SpinnerOptions = {}): Spinner {
    const {
      color = 'blue',
      interval = SpinnerManager.DEFAULT_INTERVALS[style] || 80,
      stream = stdout,
      hideCursor = true
    } = options;

    const frames = SpinnerManager.SPINNER_FRAMES[style] || SpinnerManager.SPINNER_FRAMES.dots;
    
    const spinner: Spinner = {
      id: this.generateId(),
      message,
      style,
      color,
      interval,
      frames,
      frameIndex: 0,
      isActive: false,
      startTime: Date.now(),
      stream,
      hideCursor
    };

    return spinner;
  }

  startSpinner(spinner: Spinner): void {
    if (spinner.isActive) {
      return;
    }

    spinner.isActive = true;
    spinner.startTime = Date.now();
    this.activeSpinners.set(spinner.id, spinner);

    if (spinner.hideCursor) {
      spinner.stream.write('\x1b[?25l');
    }

    const renderFrame = () => {
      if (!spinner.isActive) {
        return;
      }

      const frame = spinner.frames[spinner.frameIndex];
      const coloredFrame = Colorizer.colorize(frame, spinner.color as any);
      const text = `${coloredFrame} ${spinner.message}`;

      this.clearLine(spinner.stream);
      spinner.stream.write(text);

      spinner.frameIndex = (spinner.frameIndex + 1) % spinner.frames.length;
    };

    renderFrame();
    
    const intervalId = setInterval(renderFrame, spinner.interval);
    this.intervals.set(spinner.id, intervalId);
  }

  updateSpinner(spinner: Spinner, message: string): void {
    if (!spinner.isActive) {
      return;
    }

    spinner.message = message;
    
    const frame = spinner.frames[spinner.frameIndex];
    const coloredFrame = Colorizer.colorize(frame, spinner.color as any);
    const text = `${coloredFrame} ${spinner.message}`;

    this.clearLine(spinner.stream);
    spinner.stream.write(text);
  }

  succeedSpinner(spinner: Spinner, message?: string): void {
    this.stopSpinner(spinner, 'success', message);
  }

  failSpinner(spinner: Spinner, message?: string): void {
    this.stopSpinner(spinner, 'error', message);
  }

  warnSpinner(spinner: Spinner, message?: string): void {
    this.stopSpinner(spinner, 'warning', message);
  }

  infoSpinner(spinner: Spinner, message?: string): void {
    this.stopSpinner(spinner, 'info', message);
  }

  stopSpinner(spinner: Spinner, status?: 'success' | 'error' | 'warning' | 'info', message?: string): void {
    if (!spinner.isActive) {
      return;
    }

    spinner.isActive = false;
    
    const intervalId = this.intervals.get(spinner.id);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(spinner.id);
    }

    this.activeSpinners.delete(spinner.id);

    this.clearLine(spinner.stream);

    const finalMessage = message !== undefined ? message : spinner.message;
    let statusSymbol = '';

    switch (status) {
      case 'success':
        statusSymbol = Colorizer.colorize('✓', 'green');
        break;
      case 'error':
        statusSymbol = Colorizer.colorize('✗', 'red');
        break;
      case 'warning':
        statusSymbol = Colorizer.colorize('⚠', 'yellow');
        break;
      case 'info':
        statusSymbol = Colorizer.colorize('ℹ', 'blue');
        break;
      default:
        statusSymbol = '';
    }

    const outputText = statusSymbol ? `${statusSymbol} ${finalMessage}` : finalMessage;
    spinner.stream.write(outputText + '\n');

    if (spinner.hideCursor) {
      spinner.stream.write('\x1b[?25h');
    }
  }

  private clearLine(stream: NodeJS.WriteStream): void {
    stream.write('\r\x1b[K');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getAllActiveSpinners(): Spinner[] {
    return Array.from(this.activeSpinners.values());
  }

  stopAllSpinners(): void {
    for (const spinner of this.activeSpinners.values()) {
      this.stopSpinner(spinner);
    }
  }

  getSpinnerDuration(spinner: Spinner): number {
    return Date.now() - spinner.startTime;
  }

  changeSpinnerStyle(spinner: Spinner, newStyle: SpinnerStyle): void {
    const wasActive = spinner.isActive;
    
    if (wasActive) {
      this.stopSpinner(spinner);
    }

    spinner.style = newStyle;
    spinner.frames = SpinnerManager.SPINNER_FRAMES[newStyle] || SpinnerManager.SPINNER_FRAMES.dots;
    spinner.interval = SpinnerManager.DEFAULT_INTERVALS[newStyle] || 80;
    spinner.frameIndex = 0;

    if (wasActive) {
      this.startSpinner(spinner);
    }
  }

  changeSpinnerColor(spinner: Spinner, newColor: string): void {
    const wasActive = spinner.isActive;
    
    if (wasActive) {
      this.stopSpinner(spinner);
    }

    spinner.color = newColor;

    if (wasActive) {
      this.startSpinner(spinner);
    }
  }
}

export class MultiSpinnerManager {
  private manager = new SpinnerManager();
  private spinnerGroups: Map<string, Spinner[]> = new Map();

  createSpinnerGroup(groupId: string): void {
    if (!this.spinnerGroups.has(groupId)) {
      this.spinnerGroups.set(groupId, []);
    }
  }

  addSpinnerToGroup(groupId: string, spinner: Spinner): void {
    const group = this.spinnerGroups.get(groupId);
    if (group) {
      group.push(spinner);
    }
  }

  startGroup(groupId: string): void {
    const group = this.spinnerGroups.get(groupId);
    if (group) {
      group.forEach(spinner => this.manager.startSpinner(spinner));
    }
  }

  stopGroup(groupId: string, status?: 'success' | 'error' | 'warning' | 'info'): void {
    const group = this.spinnerGroups.get(groupId);
    if (group) {
      group.forEach(spinner => this.manager.stopSpinner(spinner, status));
    }
  }

  updateGroupMessage(groupId: string, message: string): void {
    const group = this.spinnerGroups.get(groupId);
    if (group) {
      group.forEach(spinner => this.manager.updateSpinner(spinner, message));
    }
  }

  removeGroup(groupId: string): void {
    this.spinnerGroups.delete(groupId);
  }

  getGroupSpinners(groupId: string): Spinner[] {
    return this.spinnerGroups.get(groupId) || [];
  }
}

export const spinnerManager = new SpinnerManager();
export const multiSpinnerManager = new MultiSpinnerManager();

export function createSpinner(message: string, style?: SpinnerStyle, options?: SpinnerOptions): Spinner {
  return spinnerManager.createSpinner(message, style, options);
}

export function startSpinner(spinner: Spinner): void {
  spinnerManager.startSpinner(spinner);
}

export function updateSpinner(spinner: Spinner, message: string): void {
  spinnerManager.updateSpinner(spinner, message);
}

export function succeedSpinner(spinner: Spinner, message?: string): void {
  spinnerManager.succeedSpinner(spinner, message);
}

export function failSpinner(spinner: Spinner, message?: string): void {
  spinnerManager.failSpinner(spinner, message);
}

export function warnSpinner(spinner: Spinner, message?: string): void {
  spinnerManager.warnSpinner(spinner, message);
}

export function infoSpinner(spinner: Spinner, message?: string): void {
  spinnerManager.infoSpinner(spinner, message);
}

export function stopSpinner(spinner: Spinner, status?: 'success' | 'error' | 'warning' | 'info', message?: string): void {
  spinnerManager.stopSpinner(spinner, status, message);
}

export function getAllActiveSpinners(): Spinner[] {
  return spinnerManager.getAllActiveSpinners();
}

export function stopAllSpinners(): void {
  spinnerManager.stopAllSpinners();
}

export function getSpinnerDuration(spinner: Spinner): number {
  return spinnerManager.getSpinnerDuration(spinner);
}

export function changeSpinnerStyle(spinner: Spinner, newStyle: SpinnerStyle): void {
  spinnerManager.changeSpinnerStyle(spinner, newStyle);
}

export function changeSpinnerColor(spinner: Spinner, newColor: string): void {
  spinnerManager.changeSpinnerColor(spinner, newColor);
}

export const SpinnerStyles = {
  dots: 'dots' as SpinnerStyle,
  dots2: 'dots2' as SpinnerStyle,
  dots3: 'dots3' as SpinnerStyle,
  line: 'line' as SpinnerStyle,
  pipe: 'pipe' as SpinnerStyle,
  star: 'star' as SpinnerStyle,
  moon: 'moon' as SpinnerStyle,
  runner: 'runner' as SpinnerStyle,
  pong: 'pong' as SpinnerStyle,
  material: 'material' as SpinnerStyle,
  dots12: 'dots12' as SpinnerStyle
};