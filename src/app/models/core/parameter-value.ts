import { MetaValue } from './meta-value';
import { SymbolValue } from './symbol-value';

export class ParameterValue implements MetaValue {
  private value: MetaValue | null = null;

  constructor(private name: string) {}

  setValue(value: MetaValue): void {
    this.value = value;
  }

  resolve(): SymbolValue {
    if (!this.value) {
      throw new Error(`Parameter "${this.name}" is not initialized.`);
    }

    return this.value.resolve();
  }

  equals(other: MetaValue): boolean {
    return this.resolve().equals(other);
  }

  setName(name: string): void {
    this.name = name;
  }

  getName(): string {
    return this.isSet() ? this.value!.getName() : this.name;
  }

  getAssignment(): string {
    return `${this.name}=${this.value ? this.value.getName() : 'undefined'}`;
  }

  isSet(): boolean {
    return this.value !== null;
  }
}
