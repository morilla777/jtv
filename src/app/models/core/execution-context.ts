import { MetaValueDictionary } from './meta-value-dictionary';
import { Tape } from './tape';

export interface ExecutionContext {
  tapes: Tape[];
  metaValues: MetaValueDictionary;
}
