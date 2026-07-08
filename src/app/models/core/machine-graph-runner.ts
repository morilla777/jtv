import { ExecutionContext } from './execution-context';
import { Autolink } from './autolink';
import { Link } from './link';
import { MachineGraph } from './machine-graph';
import { MachineGroup } from './machine-group';
import { MachineNode } from './machine-node';
import { type AteTraceRecorder } from '../ate';

export interface MachineGraphExecutionPoint {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
  readonly forcedTransitionId?: string;
}

export type MachineGraphRunStatus = 'completed' | 'failed' | 'suspended' | 'nondeterministic';

export interface MachineGraphRunResult {
  readonly status: MachineGraphRunStatus;
  readonly continuation?: MachineGraphExecutionPoint;
  readonly continuations?: readonly MachineGraphExecutionPoint[];
}

export interface MachineGraphRunOptions {
  readonly maxSteps?: number;
  readonly startAt?: MachineGraphExecutionPoint;
}

export class MachineGraphRunner {
  run(graph: MachineGraph, context: ExecutionContext, traceRecorder?: AteTraceRecorder): boolean {
    return this.runBurst(graph, context, traceRecorder).status === 'completed';
  }

  runBurst(
    graph: MachineGraph,
    context: ExecutionContext,
    traceRecorder?: AteTraceRecorder,
    options: MachineGraphRunOptions = {},
  ): MachineGraphRunResult {
    let point = options.startAt ?? this.createInitialExecutionPoint(graph);
    const maxSteps = Math.max(0, options.maxSteps ?? Number.POSITIVE_INFINITY);
    let recordedSteps = 0;

    if (!point) {
      return { status: 'failed' };
    }

    while (point) {
      const currentPoint: MachineGraphExecutionPoint = point;

      if (recordedSteps >= maxSteps) {
        return {
          status: 'suspended',
          continuation: currentPoint,
        };
      }

      const currentGroup = this.findGroupById(graph, currentPoint.currentGroupId);

      if (!currentGroup) {
        return { status: 'failed' };
      }

      if (currentPoint.phase === 'node') {
        const currentNode: MachineNode | null = currentPoint.currentNodeId
          ? this.findNodeInGroup(currentGroup, currentPoint.currentNodeId)
          : null;

        if (!currentNode) {
          point = {
            currentGroupId: currentGroup.id,
            currentNodeId: null,
            phase: 'after-group',
          };
          continue;
        }

        const ok = currentNode.execute(context);

        if (!ok) {
          return { status: 'failed' };
        }

        traceRecorder?.recordMachineNode(currentNode);
        recordedSteps++;
        point = {
          currentGroupId: currentGroup.id,
          currentNodeId: currentNode.id,
          phase: 'after-node',
        };
        continue;
      }

      if (currentPoint.phase === 'after-node') {
        const currentNode: MachineNode | null = currentPoint.currentNodeId
          ? this.findNodeInGroup(currentGroup, currentPoint.currentNodeId)
          : null;

        if (!currentNode) {
          return { status: 'failed' };
        }

        const autolinks = this.findTraversableAutolinks(graph.autolinks ?? [], currentNode, context);
        const autolink: Autolink | undefined = currentPoint.forcedTransitionId
          ? autolinks.find((item) => item.id === currentPoint.forcedTransitionId)
          : autolinks[0];

        if (currentPoint.forcedTransitionId && !autolink) {
          return { status: 'failed' };
        }

        if (!currentPoint.forcedTransitionId && autolinks.length > 1) {
          return {
            status: 'nondeterministic',
            continuations: autolinks.map((item) => ({
              currentGroupId: currentGroup.id,
              currentNodeId: currentNode.id,
              phase: 'after-node',
              forcedTransitionId: item.id,
            })),
          };
        }

        if (autolink) {
          if (!autolink.canTraverse(context)) {
            return { status: 'failed' };
          }

          traceRecorder?.recordLink(autolink);
          recordedSteps++;
          point = {
            currentGroupId: currentGroup.id,
            currentNodeId: currentNode.id,
            phase: 'node',
          };
          continue;
        }

        const nextNode: MachineNode | null = currentNode.next;
        point = nextNode
          ? {
            currentGroupId: currentGroup.id,
            currentNodeId: nextNode.id,
            phase: 'node',
          }
          : {
            currentGroupId: currentGroup.id,
            currentNodeId: null,
            phase: 'after-group',
          };
        continue;
      }

      const nextLinks = this.findTraversableOutgoingLinks(graph.links, currentGroup, context);
      const nextLink: Link | undefined = currentPoint.forcedTransitionId
        ? nextLinks.find((item) => item.id === currentPoint.forcedTransitionId)
        : nextLinks[0];

      if (currentPoint.forcedTransitionId && !nextLink) {
        return { status: 'failed' };
      }

      if (!currentPoint.forcedTransitionId && nextLinks.length > 1) {
        return {
          status: 'nondeterministic',
          continuations: nextLinks.map((item) => ({
            currentGroupId: currentGroup.id,
            currentNodeId: null,
            phase: 'after-group',
            forcedTransitionId: item.id,
          })),
        };
      }

      if (!nextLink) {
        return { status: 'completed' };
      }

      if (!nextLink.canTraverse(context)) {
        return { status: 'failed' };
      }

      traceRecorder?.recordLink(nextLink);
      recordedSteps++;

      const targetGroup: MachineGroup | null = nextLink.targetGroup;

      if (!targetGroup) {
        return { status: 'completed' };
      }

      const targetNode: MachineNode | null = nextLink.targetNode ?? this.findInitialNode(targetGroup);

      point = {
        currentGroupId: targetGroup.id,
        currentNodeId: targetNode?.id ?? null,
        phase: 'node',
      };
    }

    return { status: 'completed' };
  }

  private createInitialExecutionPoint(graph: MachineGraph): MachineGraphExecutionPoint | null {
    const currentGroup = this.findInitialGroup(graph);

    if (!currentGroup) {
      return null;
    }

    return {
      currentGroupId: currentGroup.id,
      currentNodeId: this.findInitialNode(currentGroup)?.id ?? null,
      phase: 'node',
    };
  }

  private findGroupById(graph: MachineGraph, groupId: string): MachineGroup | undefined {
    return graph.groups.find((group) => group.id === groupId);
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

  private findNodeInGroup(group: MachineGroup, nodeId: string): MachineNode | null {
    const visitedNodeIds = new Set<string>();
    let current = group.entry;

    while (current && !visitedNodeIds.has(current.id)) {
      if (current.id === nodeId) {
        return current;
      }

      visitedNodeIds.add(current.id);

      if (current.id === group.exit?.id) {
        break;
      }

      current = current.next;
    }

    return null;
  }

  private findTraversableAutolinks(
    autolinks: NonNullable<MachineGraph['autolinks']>,
    currentNode: MachineNode,
    context: ExecutionContext,
  ): Autolink[] {
    const candidates = autolinks.filter(
      (autolink) =>
        autolink.node?.id === currentNode.id &&
        this.canTraverseWithoutMutating(autolink, context),
    );

    return this.prioritizeConditionalTransitions(candidates);
  }

  private findTraversableOutgoingLinks(
    links: Link[],
    currentGroup: MachineGroup,
    context: ExecutionContext,
  ): Link[] {
    const candidates = links.filter(
      (link) =>
        link.sourceGroup?.id === currentGroup.id &&
        this.canTraverseWithoutMutating(link, context),
    );

    return this.prioritizeConditionalTransitions(candidates);
  }

  private canTraverseWithoutMutating(link: Link | Autolink, context: ExecutionContext): boolean {
    return link.canTraverse({
      ...context,
      metaValues: context.metaValues.cloneResolved(),
    });
  }

  private prioritizeConditionalTransitions<T extends Link | Autolink>(transitions: T[]): T[] {
    const conditionalTransitions = transitions.filter((transition) => transition.condition);

    return conditionalTransitions.length > 0 ? conditionalTransitions : transitions;
  }
}
