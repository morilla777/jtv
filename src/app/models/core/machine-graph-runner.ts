import { ExecutionContext } from './execution-context';
import { Link } from './link';
import { MachineGraph } from './machine-graph';
import { MachineGroup } from './machine-group';
import { MachineNode } from './machine-node';
import { MachineSequenceRunner } from './machine-sequence-runner';
import { type AteTraceRecorder } from '../ate';

export class MachineGraphRunner {
  private readonly sequenceRunner = new MachineSequenceRunner();

  run(graph: MachineGraph, context: ExecutionContext, traceRecorder?: AteTraceRecorder): boolean {
    let currentGroup = this.findInitialGroup(graph);

    if (!currentGroup) {
      return false;
    }

    while (currentGroup) {
      const ok = this.sequenceRunner.run(
        this.findInitialNode(currentGroup),
        context,
        traceRecorder,
        graph.autolinks ?? [],
      );

      if (!ok) {
        return false;
      }

      const nextLink = this.findTraversableOutgoingLink(graph.links, currentGroup, context);
      if (nextLink) {
        traceRecorder?.recordLink(nextLink);
      }

      currentGroup = nextLink?.targetGroup ?? undefined;
    }

    return true;
  }

  private findInitialGroup(graph: MachineGraph): MachineGroup | undefined {
    return graph.groups.find((group) => group.id === graph.initialGroupId);
  }

  private findInitialNode(group: MachineGroup): MachineNode | null {
    const visitedNodeIds = new Set<string>();
    let current = group.entry;

    while (current && !visitedNodeIds.has(current.id)) {
      if (current.isInitial) {
        return current;
      }

      visitedNodeIds.add(current.id);

      if (current.id === group.exit?.id) {
        break;
      }

      current = current.next;
    }

    return group.entry;
  }

  private findTraversableOutgoingLink(
    links: Link[],
    currentGroup: MachineGroup,
    context: ExecutionContext,
  ): Link | undefined {
    return links.find(
      (link) =>
        link.sourceGroup?.id === currentGroup.id &&
        link.canTraverse(context),
    );
  }
}
