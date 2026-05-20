import { ExecutionContext } from './execution-context';
import { Link } from './link';
import { MachineGraph } from './machine-graph';
import { MachineGroup } from './machine-group';
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
      const ok = this.sequenceRunner.run(currentGroup.entry, context, traceRecorder);

      if (!ok) {
        return false;
      }

      const nextLink = this.findTraversableOutgoingLink(graph.links, currentGroup, context);
      if (nextLink) {
        traceRecorder?.recordLink(nextLink, context);
      }

      currentGroup = nextLink?.targetGroup ?? undefined;
    }

    return true;
  }

  private findInitialGroup(graph: MachineGraph): MachineGroup | undefined {
    return graph.groups.find((group) => group.id === graph.initialGroupId);
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
