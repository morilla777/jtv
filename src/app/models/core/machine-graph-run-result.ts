export interface MachineGraphExecutionPoint {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
  readonly forcedTransitionId?: string;
}

export type MachineGraphRunStatus = 'completed' | 'failed' | 'suspended' | 'nondeterministic' | 'hanging' | 'error';
export type MachineGraphHangingReason = 'node-failed' | 'no-traversable-transition';

export interface MachineGraphRunResult {
  readonly status: MachineGraphRunStatus;
  readonly continuation?: MachineGraphExecutionPoint;
  readonly continuations?: readonly MachineGraphExecutionPoint[];
  readonly traceTerminalRecorded?: boolean;
  readonly hangingReason?: MachineGraphHangingReason;
  readonly hangingGroupId?: string;
  readonly recordedSteps?: number;
  readonly traversedTransitionCount?: number;
}

export function isLegacyTerminalHangingResult(
  result: MachineGraphRunResult,
  initialGroupId?: string,
): boolean {
  if (result.status !== 'hanging') {
    return false;
  }

  if (result.hangingReason === 'node-failed') {
    return !!initialGroupId &&
      result.hangingGroupId === initialGroupId &&
      (result.traversedTransitionCount ?? 0) > 0;
  }

  if (result.hangingReason === 'no-traversable-transition') {
    return (result.traversedTransitionCount ?? 0) > 0;
  }

  return false;
}
