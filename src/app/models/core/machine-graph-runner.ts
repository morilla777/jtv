import { ExecutionContext } from './execution-context';
import { Link } from './link';
import { MachineGraph } from './machine-graph';
import { MachineGroup } from './machine-group';
import { MachineNode } from './machine-node';
import { type AteTraceRecorder } from '../ate';

export interface MachineGraphExecutionPoint {
  readonly currentGroupId: string;
  readonly currentNodeId: string | null;
  readonly phase: 'node' | 'after-node' | 'after-group';
}

export type MachineGraphRunStatus = 'completed' | 'failed' | 'suspended';

export interface MachineGraphRunResult {
  readonly status: MachineGraphRunStatus;
  readonly continuation?: MachineGraphExecutionPoint;
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
      if (recordedSteps >= maxSteps) {
        return {
          status: 'suspended',
          continuation: point,
        };
      }

      const currentGroup = this.findGroupById(graph, point.currentGroupId);

      if (!currentGroup) {
        return { status: 'failed' };
      }

      if (point.phase === 'node') {
        const currentNode: MachineNode | null = point.currentNodeId
          ? this.findNodeInGroup(currentGroup, point.currentNodeId)
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

      if (point.phase === 'after-node') {
        const currentNode: MachineNode | null = point.currentNodeId
          ? this.findNodeInGroup(currentGroup, point.currentNodeId)
          : null;

        if (!currentNode) {
          return { status: 'failed' };
        }

        const autolink = this.findTraversableAutolink(graph.autolinks ?? [], currentNode, context);

        if (autolink) {
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

      const nextLink = this.findTraversableOutgoingLink(graph.links, currentGroup, context);

      if (!nextLink) {
        return { status: 'completed' };
      }

      traceRecorder?.recordLink(nextLink);
      recordedSteps++;

      const targetGroup = nextLink.targetGroup;

      if (!targetGroup) {
        return { status: 'completed' };
      }

      const targetNode = nextLink.targetNode ?? this.findInitialNode(targetGroup);

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

  private findTraversableAutolink(
    autolinks: NonNullable<MachineGraph['autolinks']>,
    currentNode: MachineNode,
    context: ExecutionContext,
  ) {
    return autolinks.find(
      (autolink) =>
        autolink.node?.id === currentNode.id &&
        autolink.canTraverse(context),
    );
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
