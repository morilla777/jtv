import { MetaValueDictionary } from './meta-value-dictionary';
import { MachineGraph } from './machine-graph';
import { Tape } from './tape';

export interface SubmachineDefinition {
  readonly graph: MachineGraph;
  readonly tapeCount: number;
  readonly parameterAssignments: Readonly<Record<string, string>>;
}

export interface ExecutionContext {
  tapes: Tape[];
  metaValues: MetaValueDictionary;
  submachines?: ReadonlyMap<string, SubmachineDefinition>;
}
