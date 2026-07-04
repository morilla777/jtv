import { AteTraceRenderable } from './ate-trace-renderable';
import { ExecutionContext } from './execution-context';
import { type AteSubtrace } from '../ate';

export interface MachineNode extends AteTraceRenderable {
  readonly id: string;
  readonly name: string;
  tapeIndex: number;

  isInitial: boolean;
  previous: MachineNode | null;
  next: MachineNode | null;

  execute(context: ExecutionContext): boolean;
  getAteSubtrace?(): AteSubtrace | null;
}
