import { ExecutionContext } from './execution-context';
import { MachineNode } from './machine-node';
import { type AteTraceRecorder } from '../ate';

export class MachineSequenceRunner {
  run(startNode: MachineNode | null, context: ExecutionContext, traceRecorder?: AteTraceRecorder): boolean {
    let current = startNode;

    while (current) {
      const ok = current.execute(context);

      if (!ok) {
        return false;
      }

      traceRecorder?.recordMachineNode(current, context);
      current = current.next;
    }

    return true;
  }
}
