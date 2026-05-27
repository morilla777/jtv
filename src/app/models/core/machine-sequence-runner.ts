import { Autolink } from './autolink';
import { ExecutionContext } from './execution-context';
import { MachineNode } from './machine-node';
import { type AteTraceRecorder } from '../ate';

export class MachineSequenceRunner {
  run(
    startNode: MachineNode | null,
    context: ExecutionContext,
    traceRecorder?: AteTraceRecorder,
    autolinks: readonly Autolink[] = [],
  ): boolean {
    let current = startNode;

    while (current) {
      const ok = current.execute(context);

      if (!ok) {
        return false;
      }

      traceRecorder?.recordMachineNode(current);
      const autolink = this.findTraversableAutolink(autolinks, current, context);

      if (autolink) {
        traceRecorder?.recordLink(autolink);
        current = autolink.node;
        continue;
      }

      current = current.next;
    }

    return true;
  }

  private findTraversableAutolink(
    autolinks: readonly Autolink[],
    currentNode: MachineNode,
    context: ExecutionContext,
  ): Autolink | undefined {
    return autolinks.find(
      (autolink) =>
        autolink.node?.id === currentNode.id &&
        autolink.canTraverse(context),
    );
  }
}
