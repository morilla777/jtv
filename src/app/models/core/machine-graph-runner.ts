import { ExecutionContext } from './execution-context';
import { Link } from './link';
import { MachineGraph } from './machine-graph';
import { MachineGroup } from './machine-group';
import { MachineSequenceRunner } from './machine-sequence-runner';

export class MachineGraphRunner {
  private readonly sequenceRunner = new MachineSequenceRunner();

  run(graph: MachineGraph, context: ExecutionContext): boolean {
    let currentGroup = this.findInitialGroup(graph);

    if (!currentGroup) {
      return false;
    }

    const visited = new Set<string>();

    while (currentGroup) {
      const ok = this.sequenceRunner.run(currentGroup.entry, context);

      if (!ok) {
        return false;
      }

      if (visited.has(currentGroup.id)) {
        return false;
      }

      visited.add(currentGroup.id);

      const nextLink = this.findTraversableOutgoingLink(graph.links, currentGroup, context);
      currentGroup = nextLink?.targetGroup ?? null;
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
