export interface MetaValue {
  setValue(value: MetaValue): void;
  resolve(): SymbolValue;
  equals(other: MetaValue): boolean;
  setName(name: string): void;
  getName(): string;
  getAssignment(): string;
  isSet(): boolean;
}

import { SymbolValue } from './symbol-value';
