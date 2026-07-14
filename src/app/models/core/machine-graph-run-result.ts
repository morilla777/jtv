export interface MachineGraphExecutionPoint {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
  readonly forcedTransitionId?: string;
}

export type MachineGraphRunStatus = 'completed' | 'failed' | 'suspended' | 'nondeterministic' | 'hanging' | 'error';

export interface MachineGraphRunResult {
  readonly status: MachineGraphRunStatus;
  readonly continuation?: MachineGraphExecutionPoint;
  readonly continuations?: readonly MachineGraphExecutionPoint[];
  readonly traceTerminalRecorded?: boolean;
}
