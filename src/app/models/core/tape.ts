import { SymbolValue } from './symbol-value';

export interface TapeSnapshot {
  headPosition: number;
  cells: Record<number, string>;
}

export class Tape {
  private headPosition = 0;
  private readonly blankSymbol: SymbolValue;
  private cells = new Map<number, SymbolValue>();

  private initialHeadPosition = 0;
  private readonly initialCells = new Map<number, SymbolValue>();

  constructor(blankSymbol: SymbolValue = SymbolValue.require(SymbolValue.BLANK)) {
    this.blankSymbol = blankSymbol;
  }

  read(): SymbolValue {
    return this.cells.get(this.headPosition) ?? this.blankSymbol;
  }

  write(symbol: SymbolValue): void {
    if (symbol.equals(this.blankSymbol)) {
      this.cells.delete(this.headPosition);
      return;
    }

    this.cells.set(this.headPosition, symbol);
  }

  moveLeft(): boolean {
    if (this.headPosition === 0) {
      return false;
    }

    this.headPosition--;
    return true;
  }

  moveRight(): boolean {
    this.headPosition++;
    return true;
  }

  clear(): void {
    this.headPosition = 0;
    this.cells.clear();

    this.initialHeadPosition = 0;
    this.initialCells.clear();
  }

  load(input: string): void {
    this.clear();

    if (!input) {
      return;
    }

    for (let index = 0; index < input.length; index++) {
      const position = index + 1;
      const symbol = SymbolValue.require(input[index]);

      if (!symbol.equals(this.blankSymbol)) {
        this.cells.set(position, symbol);
        this.initialCells.set(position, symbol);
      }
    }

    this.headPosition = input.length + 1;
    this.initialHeadPosition = this.headPosition;
  }

  restoreInitialValues(): void {
    this.headPosition = this.initialHeadPosition;
    this.cells = new Map(this.initialCells);
  }

  setHeadPosition(position: number): void {
    if (position < 0) {
      throw new Error('Head position cannot be negative.');
    }

    this.headPosition = position;
  }

  getHeadPosition(): number {
    return this.headPosition;
  }

  getInitialHeadPosition(): number {
    return this.initialHeadPosition;
  }

  getSnapshot(): TapeSnapshot {
    return {
      headPosition: this.headPosition,
      cells: this.toRecord(this.cells),
    };
  }

  getInitialSnapshot(): TapeSnapshot {
    return {
      headPosition: this.initialHeadPosition,
      cells: this.toRecord(this.initialCells),
    };
  }

  private toRecord(source: Map<number, SymbolValue>): Record<number, string> {
    const cells: Record<number, string> = {};

    for (const [position, symbol] of source.entries()) {
      cells[position] = symbol.getName();
    }

    return cells;
  }
}
