import { MetaValueDictionary } from './meta-value-dictionary';
import { MachineGraph } from './machine-graph';
import { Tape } from './tape';
import { MachineGraphView } from '../view';

export interface SubmachineDefinition {
  readonly name: string;
  readonly graph: MachineGraph;
  readonly view: MachineGraphView;
  readonly tapeCount: number;
  readonly parameterAssignments: Readonly<Record<string, string>>;
}

export interface ExecutionContext {
  tapes: Tape[];
  metaValues: MetaValueDictionary;
  submachines?: ReadonlyMap<string, SubmachineDefinition>;
}
