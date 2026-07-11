import { type AteNodeKind } from './ate-node-kind';
import { type MachineGraph } from '../core/machine-graph';
import { type TapeSnapshot } from '../core/tape';
import { type MachineGraphView } from '../view';

export interface AteContinuationSnapshot {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
  readonly forcedTransitionId?: string;
  readonly tapeSnapshots: readonly {
    readonly headPosition: number;
    readonly cells: Record<number, string>;
  }[];
  readonly variableAssignments: Readonly<Record<string, string>>;
  readonly parameterAssignments: Readonly<Record<string, string>>;
}

export interface AteNode {
  readonly id: string;
  readonly label: string;
  readonly labelKey?: string;
  readonly iconSrc: string;
  readonly kind: AteNodeKind;
  readonly machineNodeId?: string;
  readonly linkId?: string;
  readonly continuation?: AteContinuationSnapshot;
  readonly replayContinuation?: AteContinuationSnapshot;
  readonly subtrace?: AteSubtrace;
  readonly children: AteNode[];
}

export interface AteSubtrace {
  readonly machineName: string;
  readonly graph: MachineGraph;
  readonly view: MachineGraphView;
  readonly root: AteNode;
  readonly initialTapeSnapshots: readonly TapeSnapshot[];
  readonly finalTapeSnapshots: readonly TapeSnapshot[];
  readonly parameterAssignments: Readonly<Record<string, string>>;
}
