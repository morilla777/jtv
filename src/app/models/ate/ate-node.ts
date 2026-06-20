import { type AteNodeKind } from './ate-node-kind';

export interface AteContinuationSnapshot {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
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
  readonly iconSrc: string;
  readonly kind: AteNodeKind;
  readonly machineNodeId?: string;
  readonly linkId?: string;
  readonly continuation?: AteContinuationSnapshot;
  readonly children: AteNode[];
}
