import { MetaValue } from './meta-value';

export class SymbolValue implements MetaValue {
  static readonly BLANK = '#';

  private static readonly registry = new Map<string, SymbolValue>();

  readonly value: string;
  readonly name: string;

  private constructor(value: string, name: string = value) {
    this.value = value;
    this.name = name;
  }

  static {
    for (let code = 97; code <= 122; code++) {
      const char = String.fromCodePoint(code);
      this.registry.set(char, new SymbolValue(char));
    }

    for (let code = 48; code <= 57; code++) {
      const char = String.fromCodePoint(code);
      this.registry.set(char, new SymbolValue(char));
    }

    this.registry.set(SymbolValue.BLANK, new SymbolValue(SymbolValue.BLANK));
  }

  static of(value: string): SymbolValue | undefined {
    return this.registry.get(value);
  }

  static require(value: string): SymbolValue {
    const symbol = this.of(value);

    if (!symbol) {
      throw new Error(`Invalid symbol: "${value}"`);
    }

    return symbol;
  }

  static all(): SymbolValue[] {
    return Array.from(this.registry.values());
  }

  setValue(value: MetaValue): void {
    // Intentionally ignored. Symbols behave as immutable values.
  }

  resolve(): this {
    return this;
  }

  equals(other: MetaValue): boolean {
    return this.value === other.resolve().value;
  }

  setName(name: string): void {
    // Intentionally ignored. Symbol names are immutable.
    // Note: this.name = name; would violate immutability constraint
  }

  getName(): string {
    return this.name;
  }

  getAssignment(): string {
    return this.name;
  }

  isSet(): boolean {
    return true;
  }

  toString(): string {
    return this.name;
  }
}
