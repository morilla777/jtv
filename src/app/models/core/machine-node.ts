import { ExecutionContext } from './execution-context';

export interface MachineNode {
  readonly id: string;
  readonly name: string;
  readonly tapeIndex: number;

  isInitial: boolean;
  previous: MachineNode | null;
  next: MachineNode | null;

  execute(context: ExecutionContext): boolean;
}
