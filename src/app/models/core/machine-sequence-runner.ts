import { ExecutionContext } from './execution-context';
import { MachineNode } from './machine-node';

export class MachineSequenceRunner {
  run(startNode: MachineNode | null, context: ExecutionContext): boolean {
    let current = startNode;

    while (current) {
      const ok = current.execute(context);

      if (!ok) {
        return false;
      }

      current = current.next;
    }

    return true;
  }
}
