import { Injectable, computed, signal } from '@angular/core';

import { AteNode, AteTraceRecorder } from '../models/ate';
import { Autolink } from '../models/core/autolink';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { Link } from '../models/core/link';
import { LinkCondition, type ReadConditionClause } from '../models/core/link-condition';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineGraphRunner } from '../models/core/machine-graph-runner';
import { MachineGroup } from '../models/core/machine-group';
import { MachineNode } from '../models/core/machine-node';
import { HubNode } from '../models/core/hub-node';
import { MetaValueDictionary } from '../models/core/meta-value-dictionary';
import { MoveLeftNode } from '../models/core/move-left-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { Tape, TapeSnapshot } from '../models/core/tape';
import { WriterNode } from '../models/core/writer-node';
import { AutolinkOrientation, MachineGraphView, MachineLinkKind, MachineLinkView, ViewPoint } from '../models/view';

export type JtvToolId =
  | 'symbol-lowercase'
  | 'symbol-variable'
  | 'symbol-uppercase'
  | 'move-left'
  | 'move-right'
  | 'hub'
  | 'search-left'
  | 'search-right'
  | 'loop-transition'
  | 'search-left-inverse'
  | 'search-right-inverse'
  | 'transition'
  | 'shift-left'
  | 'shift-right'
  | 'conditional-transition'
  | 'submachine'
  | 'pointer';

export interface JtvTapeState {
  readonly id: string;
  readonly name: string;
  readonly tape: Tape;
}

export interface JtvMachineState {
  readonly id: string;
  readonly name: string;
}

export interface JtvLinkEditState {
  readonly mode: 'conditional-link' | 'autolink';
  readonly clause: ReadConditionClause;
  readonly nodeId?: string;
  readonly autolinkOrientation?: AutolinkOrientation;
}

export interface JtvState {
  readonly activeToolId: JtvToolId | null;
  readonly ate: AteNode;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly selectedCanvasLinkId: string | null;
  readonly selectedCanvasNodeId: string | null;
  readonly selectedAteNodeId: string | null;
  readonly selectedMachine: JtvMachineState;
  readonly selectedSymbol: string;
  readonly selectedVariable: string;
  readonly selectedTapeIndex: number;
  readonly tapes: JtvTapeState[];
}

function createTapeState(index: number): JtvTapeState {
  return {
    id: `tape-${index}`,
    name: `Cinta ${index}`,
    tape: new Tape(),
  };
}

function createInitialState(): JtvState {
  const initialTape = createTapeState(1);
  const demoMachine = createDemoMachine();
  const selectedMachine = {
    id: 'new',
    name: 'NUEVA',
  };

  return {
    activeToolId: null,
    ate: new AteTraceRecorder(selectedMachine.name).root,
    machineGraph: demoMachine.graph,
    machineGraphView: demoMachine.view,
    selectedCanvasLinkId: null,
    selectedCanvasNodeId: null,
    selectedAteNodeId: null,
    selectedMachine,
    selectedSymbol: '#',
    selectedVariable: 'α',
    selectedTapeIndex: 0,
    tapes: [initialTape],
  };
}

function createDemoMachine(): { graph: MachineGraph; view: MachineGraphView } {
  const writeGroupNodes = linkNodes([
    new MoveRightNode('move-right-a', 0, true),
    new WriterNode('write-a', 'a', 0),
    new MoveRightNode('move-right-b', 0),
    new WriterNode('write-b', 'b', 0),
    new MoveRightNode('move-right-c', 0),
    new WriterNode('write-c', 'c', 0),
    new MoveRightNode('move-right-d', 0),
    new WriterNode('write-d', 'd', 0),
  ]);
  const rewindGroupNodes = linkNodes([
    new MoveLeftNode('move-left-1', 0),
  ]);
  const writeGroup = new LinearMachineGroup(
    'write-abcd',
    writeGroupNodes[0],
    writeGroupNodes.at(-1) ?? null,
  );
  const rewindGroup = new LinearMachineGroup(
    'rewind',
    rewindGroupNodes[0],
    rewindGroupNodes.at(-1) ?? null,
  );
  const writeToRewindLink = new Link(
    'write-to-rewind',
    writeGroup,
    rewindGroup,
    new LinkCondition([{ tapeIndex: 0, acceptedValues: ['d'] }]),
  );
  const rewindAutolink = new Autolink(
    'rewind-autolink',
    rewindGroupNodes[0],
    new LinkCondition([{ tapeIndex: 0, acceptedValues: ['#'], negated: true }]),
  );

  return {
    graph: {
      groups: [writeGroup, rewindGroup],
      links: [writeToRewindLink],
      autolinks: [rewindAutolink],
      initialGroupId: writeGroup.id,
    },
    view: {
      groups: [
        {
          groupId: writeGroup.id,
          label: formatGroupLabel(writeGroup),
          position: { x: 32, y: 72 },
          width: 176,
          height: 32,
        },
        {
          groupId: rewindGroup.id,
          label: formatGroupLabel(rewindGroup),
          position: { x: 300, y: 72 },
          width: 28,
          height: 32,
        },
      ],
      nodes: [
        ...createLinearNodeViews(writeGroup.id, writeGroupNodes, 32, 72),
        ...createLinearNodeViews(rewindGroup.id, rewindGroupNodes, 300, 72),
      ],
      links: [
        createLinkView(writeToRewindLink, {
          kind: 'direct',
          points: [
            { x: 190, y: 62 },
            { x: 296, y: 62 },
          ],
        }),
        createLinkView(rewindAutolink, {
          kind: 'autolink',
          autolinkOrientation: 'right',
          sourceGroupId: rewindGroup.id,
          targetGroupId: rewindGroup.id,
          points: [{ x: 300, y: 72 }],
        }),
      ],
    },
  };
}

function createLinkView(
  link: Link | Autolink,
  layout: {
    kind: MachineLinkKind;
    autolinkOrientation?: AutolinkOrientation;
    label?: string;
    sourceGroupId?: string;
    targetGroupId?: string;
    points: readonly ViewPoint[];
  },
): MachineLinkView {
  return {
    linkId: link.id,
    label: layout.label ?? formatLinkCondition(link.condition),
    kind: layout.kind,
    autolinkOrientation: layout.autolinkOrientation,
    sourceGroupId: layout.sourceGroupId ?? (link instanceof Link ? link.sourceGroup?.id : '') ?? '',
    targetGroupId: layout.targetGroupId ?? (link instanceof Link ? link.targetGroup?.id : '') ?? '',
    points: layout.points,
  };
}

function formatLinkCondition(condition: LinkCondition | null): string {
  return condition?.getAteLabel() ?? '';
}

function formatGroupLabel(group: MachineGroup): string {
  const labels: string[] = [];
  const visitedNodeIds = new Set<string>();
  let current = group.entry;

  while (current && !visitedNodeIds.has(current.id)) {
    visitedNodeIds.add(current.id);
    labels.push(current.name);

    if (current.id === group.exit?.id) {
      break;
    }

    current = current.next;
  }

  return labels.join('');
}

function createLinearNodeViews(
  groupId: string,
  nodes: readonly MachineNode[],
  startX: number,
  y: number,
) {
  return nodes.map((node, index) => ({
    nodeId: node.id,
    groupId,
    kind: node instanceof HubNode ? 'hub' as const : 'text' as const,
    label: node.name,
    initial: node.isInitial,
    position: {
      x: startX + index * MACHINE_NODE_STEP,
      y,
    },
  }));
}

const MACHINE_NODE_STEP = 20;

function linkNodes<T extends MachineNode>(nodes: T[]): T[] {
  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }

  return nodes;
}

function getNextTapeIndex(tapes: readonly JtvTapeState[]): number {
  return tapes.reduce((nextIndex, tape) => {
    const match = /^tape-(\d+)$/.exec(tape.id);
    const index = match ? Number(match[1]) : 0;

    return Math.max(nextIndex, index + 1);
  }, 1);
}

@Injectable({ providedIn: 'root' })
export class JtvStore {
  private readonly state = signal<JtvState>(createInitialState());
  private readonly machineGraphRunner = new MachineGraphRunner();

  readonly activeToolId = computed(() => this.state().activeToolId);
  readonly ate = computed(() => this.state().ate);
  readonly selectedAteNode = computed(() => this.findAteNode(this.state().ate, this.state().selectedAteNodeId));
  readonly activeAteMachineNodeId = computed(() => this.selectedAteNode()?.machineNodeId ?? null);
  readonly activeAteLinkId = computed(() => this.selectedAteNode()?.linkId ?? null);
  readonly machineGraph = computed(() => this.state().machineGraph);
  readonly machineGraphView = computed(() => {
    const view = this.state().machineGraphView;
    const activeNodeId = this.activeAteMachineNodeId();
    const activeLinkId = this.activeAteLinkId();
    const { selectedCanvasLinkId, selectedCanvasNodeId } = this.state();

    return {
      ...view,
      nodes: view.nodes.map((node) => ({
        ...node,
        selected: node.nodeId === activeNodeId,
        canvasSelected: node.nodeId === selectedCanvasNodeId,
      })),
      links: view.links.map((link) => ({
        ...link,
        selected: link.linkId === activeLinkId,
        canvasSelected: link.linkId === selectedCanvasLinkId,
      })),
    };
  });
  readonly selectedMachine = computed(() => this.state().selectedMachine);
  readonly selectedSymbol = computed(() => this.state().selectedSymbol);
  readonly selectedVariable = computed(() => this.state().selectedVariable);
  readonly selectedTapeIndex = computed(() => this.state().selectedTapeIndex);
  readonly selectedTapeId = computed(() => this.selectedTape()?.id ?? null);
  readonly tapes = computed(() => this.state().tapes);
  readonly tapeSnapshots = computed<readonly TapeSnapshot[]>(() => {
    const selectedAteNode = this.selectedAteNode();

    if (selectedAteNode) {
      const replayedSnapshots = this.replayTapeSnapshotsToAteNode(selectedAteNode);

      if (replayedSnapshots) {
        return replayedSnapshots;
      }
    }

    return this.state().tapes.map((tapeState) => tapeState.tape.getSnapshot());
  });
  readonly selectedTapeSnapshot = computed(() => this.tapeSnapshots()[this.selectedTapeIndex()] ?? null);
  readonly selectedTape = computed(() => {
    const { selectedTapeIndex, tapes } = this.state();

    return tapes[selectedTapeIndex] ?? tapes[0] ?? null;
  });

  selectTool(toolId: JtvToolId | null): void {
    this.patchState({
      activeToolId: toolId,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  toggleTool(toolId: JtvToolId): void {
    const nextToolId = this.state().activeToolId === toolId ? null : toolId;

    this.patchState({
      activeToolId: nextToolId,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  selectMachine(machine: JtvMachineState): void {
    this.patchState({ selectedMachine: machine });
  }

  selectSymbol(symbol: string): void {
    this.patchState({ selectedSymbol: symbol });
  }

  selectVariable(variable: string): void {
    this.patchState({ selectedVariable: variable });
  }

  selectTape(tapeId: string): void {
    const selectedTapeIndex = this.state().tapes.findIndex((tape) => tape.id === tapeId);

    if (selectedTapeIndex < 0) {
      return;
    }

    this.patchState({ selectedTapeIndex });
  }

  selectTapeIndex(selectedTapeIndex: number): void {
    if (!Number.isInteger(selectedTapeIndex) || !this.state().tapes[selectedTapeIndex]) {
      return;
    }

    this.patchState({ selectedTapeIndex });
  }

  selectAteNode(nodeId: string | null): void {
    this.patchState({ selectedAteNodeId: nodeId });
  }

  selectCanvasNode(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: nodeId,
    });
  }

  selectCanvasLink(linkId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.patchState({
      selectedCanvasLinkId: linkId,
      selectedCanvasNodeId: null,
    });
  }

  clearCanvasSelection(): void {
    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  selectCanvasNodeForTransition(nodeId: string): void {
    if (
      this.state().activeToolId !== 'transition' &&
      this.state().activeToolId !== 'conditional-transition' &&
      this.state().activeToolId !== 'loop-transition'
    ) {
      return;
    }

    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: nodeId,
    });
  }

  isCanvasGroupExitNode(nodeId: string): boolean {
    return this.getCanvasGroupExitNodeId(nodeId) === nodeId;
  }

  getCanvasGroupExitNodeId(nodeId: string): string | null {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;

    return group?.exit?.id ?? null;
  }

  createUnconditionalLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    vertices: readonly ViewPoint[] = [],
  ): void {
    if (this.state().activeToolId !== 'transition' || sourceNodeId === targetNodeId) {
      return;
    }

    this.state.update((current) => {
      const sourceNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === sourceNodeId);
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const sourceGroup = sourceNodeView
        ? current.machineGraph.groups.find((group) => group.id === sourceNodeView.groupId)
        : null;
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;

      if (!sourceNodeView || !targetNodeView || !sourceGroup || !targetGroup || sourceGroup.exit?.id !== sourceNodeId) {
        return current;
      }

      const link = new Link(
        this.createMachineLinkId(current.machineGraph, 'link'),
        sourceGroup,
        targetGroup,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links, link],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(link, {
              kind: 'direct',
              label: '',
              points: [
                this.getNodeRightAnchor(sourceNodeView),
                ...vertices,
                this.getNodeLeftAnchor(targetNodeView),
              ],
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
  }

  createConditionalLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    clause: ReadConditionClause,
    vertices: readonly ViewPoint[] = [],
  ): void {
    if (this.state().activeToolId !== 'conditional-transition' || sourceNodeId === targetNodeId) {
      return;
    }

    this.createLinkBetweenNodes(sourceNodeId, targetNodeId, this.createLinkConditionFromClause(clause), vertices);
  }

  createConditionalAutolinkForNode(
    nodeId: string,
    clause: ReadConditionClause,
    orientation: AutolinkOrientation,
  ): void {
    if (this.state().activeToolId !== 'loop-transition') {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (
        !nodeView ||
        !group ||
        !node ||
        group.exit?.id !== nodeId ||
        (current.machineGraph.autolinks ?? []).some((autolink) => autolink.node?.id === nodeId)
      ) {
        return current;
      }

      const autolink = new Autolink(
        this.createMachineLinkId(current.machineGraph, 'autolink'),
        node,
        this.createLinkConditionFromClause(clause),
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          autolinks: [...(current.machineGraph.autolinks ?? []), autolink],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(autolink, {
              kind: 'autolink',
              autolinkOrientation: orientation,
              sourceGroupId: group.id,
              targetGroupId: group.id,
              points: [nodeView.position],
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
  }

  getCanvasLinkEditState(linkId: string): JtvLinkEditState | null {
    const graphLink = this.state().machineGraph.links.find((link) => link.id === linkId);

    if (graphLink) {
      return {
        mode: 'conditional-link',
        clause: this.getFirstConditionClauseOrDefault(graphLink.condition),
      };
    }

    const autolink = (this.state().machineGraph.autolinks ?? []).find((item) => item.id === linkId);
    const autolinkView = this.state().machineGraphView.links.find((link) => link.linkId === linkId);

    if (!autolink) {
      return null;
    }

    return {
      mode: 'autolink',
      clause: this.getFirstConditionClauseOrDefault(autolink.condition),
      nodeId: autolink.node?.id,
      autolinkOrientation: autolinkView?.autolinkOrientation ?? 'right',
    };
  }

  hasCanvasNodeLeftNeighbor(nodeId: string): boolean {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;
    const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

    return !!node?.previous;
  }

  hasCanvasNodeAutolink(nodeId: string): boolean {
    return (this.state().machineGraph.autolinks ?? []).some((autolink) => autolink.node?.id === nodeId);
  }

  updateCanvasLinkCondition(
    linkId: string,
    clause: ReadConditionClause,
    autolinkOrientation?: AutolinkOrientation,
  ): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const link = current.machineGraph.links.find((item) => item.id === linkId);
      const autolink = (current.machineGraph.autolinks ?? []).find((item) => item.id === linkId);

      if (!link && !autolink) {
        return current;
      }

      const condition = this.createLinkConditionFromClause(clause);

      if (link) {
        link.condition = condition;
      }

      if (autolink) {
        autolink.condition = condition;
      }

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links],
          autolinks: [...(current.machineGraph.autolinks ?? [])],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: current.machineGraphView.links.map((viewLink) => {
            if (viewLink.linkId !== linkId) {
              return viewLink;
            }

            return {
              ...viewLink,
              label: formatLinkCondition(condition),
              autolinkOrientation: autolink ? autolinkOrientation ?? viewLink.autolinkOrientation : viewLink.autolinkOrientation,
            };
          }),
        },
        selectedCanvasLinkId: linkId,
        selectedCanvasNodeId: null,
      };
    });
  }

  insertActiveToolNodeNear(targetNodeId: string, side: 'left' | 'right'): void {
    const activeToolId = this.state().activeToolId;

    if (!this.isInsertableNodeTool(activeToolId)) {
      return;
    }

    this.state.update((current) => {
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;
      const targetNode = targetGroup ? this.findMachineNodeInGroup(targetGroup, targetNodeId) : null;

      if (!targetNodeView || !targetGroup || !targetNode) {
        return current;
      }

      const insertedNode = this.createMachineNodeForTool(current, activeToolId, targetNode.tapeIndex);

      if (!insertedNode) {
        return current;
      }

      if (side === 'left') {
        this.insertMachineNodeBefore(targetGroup, targetNode, insertedNode);
      } else {
        this.insertMachineNodeAfter(targetGroup, targetNode, insertedNode);
      }

      const insertedNodePosition = {
        x: targetNodeView.position.x + (side === 'left' ? 0 : MACHINE_NODE_STEP),
        y: targetNodeView.position.y,
      };
      const shiftedNodes = current.machineGraphView.nodes.map((node) => {
        const shouldShift = node.groupId === targetNodeView.groupId &&
          (side === 'left'
            ? node.position.x >= targetNodeView.position.x
            : node.position.x > targetNodeView.position.x);

        if (!shouldShift) {
          return {
            ...node,
            initial: node.nodeId === targetNode.id ? targetNode.isInitial : node.initial,
          };
        }

        return {
          ...node,
          initial: node.nodeId === targetNode.id ? targetNode.isInitial : node.initial,
          position: {
            ...node.position,
            x: node.position.x + MACHINE_NODE_STEP,
          },
        };
      });

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: current.machineGraphView.groups.map((groupView) => groupView.groupId === targetGroup.id
            ? {
              ...groupView,
              label: formatGroupLabel(targetGroup),
              width: (groupView.width ?? 0) + MACHINE_NODE_STEP,
            }
            : groupView),
          nodes: [
            ...shiftedNodes,
            {
              nodeId: insertedNode.id,
              groupId: targetGroup.id,
              kind: this.getMachineNodeViewKind(insertedNode),
              label: insertedNode.name,
              initial: insertedNode.isInitial,
              position: insertedNodePosition,
            },
          ].sort((first, second) => first.position.x - second.position.x),
          links: current.machineGraphView.links.map((link) => {
            if (link.sourceGroupId !== targetGroup.id || !link.points?.length) {
              return link;
            }

            const [sourcePoint, ...restPoints] = link.points;

            return {
              ...link,
              points: [
                {
                  ...sourcePoint,
                  x: sourcePoint.x + MACHINE_NODE_STEP,
                },
                ...restPoints,
              ],
            };
          }),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: insertedNode.id,
      };
    });
  }

  insertActiveToolNodeAt(position: ViewPoint): void {
    const activeToolId = this.state().activeToolId;

    if (!this.isInsertableNodeTool(activeToolId)) {
      return;
    }

    this.state.update((current) => {
      const insertedNode = this.createMachineNodeForTool(current, activeToolId, 0);

      if (!insertedNode) {
        return current;
      }

      insertedNode.isInitial = current.machineGraph.groups.length === 0;

      const group = new LinearMachineGroup(
        this.createMachineGroupId(current.machineGraph, 'group'),
        insertedNode,
        insertedNode,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups, group],
          initialGroupId: current.machineGraph.groups.length === 0 ? group.id : current.machineGraph.initialGroupId,
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: [
            ...current.machineGraphView.groups,
            {
              groupId: group.id,
              label: formatGroupLabel(group),
              position,
              width: 28,
              height: 32,
            },
          ],
          nodes: [
            ...current.machineGraphView.nodes,
            {
              nodeId: insertedNode.id,
              groupId: group.id,
              kind: this.getMachineNodeViewKind(insertedNode),
              label: insertedNode.name,
              initial: insertedNode.isInitial,
              position,
            },
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: insertedNode.id,
      };
    });
  }

  moveCanvasGroupContainingNode(nodeId: string, delta: ViewPoint): void {
    if (this.state().activeToolId !== 'pointer' || (delta.x === 0 && delta.y === 0)) {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);

      if (!nodeView) {
        return current;
      }

      const groupId = nodeView.groupId;

      return {
        ...current,
        machineGraphView: {
          ...current.machineGraphView,
          groups: current.machineGraphView.groups.map((group) => group.groupId === groupId
            ? {
              ...group,
              position: this.translatePoint(group.position, delta),
            }
            : group),
          nodes: current.machineGraphView.nodes.map((node) => node.groupId === groupId
            ? {
              ...node,
              position: this.translatePoint(node.position, delta),
            }
            : node),
          links: current.machineGraphView.links.map((link) => this.translateLinkForMovedGroup(link, groupId, delta)),
        },
      };
    });
  }

  makeCanvasNodeInitial(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer' || !this.canMakeCanvasNodeInitial(nodeId)) {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (!nodeView || !group || !node) {
        return current;
      }

      for (const graphGroup of current.machineGraph.groups) {
        this.setInitialNodeInGroup(graphGroup, null);
      }

      node.isInitial = true;

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
          initialGroupId: group.id,
        },
        machineGraphView: {
          ...current.machineGraphView,
          nodes: current.machineGraphView.nodes.map((viewNode) => ({
            ...viewNode,
            initial: viewNode.nodeId === nodeId,
          })),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: nodeId,
      };
    });
  }

  canMakeCanvasNodeInitial(nodeId: string): boolean {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;

    return group?.entry?.id === nodeId;
  }

  deleteCanvasNode(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (!nodeView || !group || !node) {
        return current;
      }

      const replacementInitialNode = node.isInitial ? node.next ?? node.previous : null;

      this.removeMachineNodeFromGroup(group, node);

      if (replacementInitialNode) {
        for (const graphGroup of current.machineGraph.groups) {
          this.setInitialNodeInGroup(graphGroup, null);
        }

        replacementInitialNode.isInitial = true;
      }

      const groupIsEmpty = !group.entry && !group.exit;
      const removedGroupIds = new Set(groupIsEmpty ? [group.id] : []);
      const changedGroupIds = new Set([group.id]);
      const shiftedNodes = current.machineGraphView.nodes
        .filter((viewNode) => viewNode.nodeId !== nodeId)
        .map((viewNode) => {
          if (viewNode.groupId !== group.id || viewNode.position.x <= nodeView.position.x) {
            return viewNode;
          }

          return {
            ...viewNode,
            position: {
              ...viewNode.position,
              x: viewNode.position.x - MACHINE_NODE_STEP,
            },
          };
        });
      const remainingGroups = current.machineGraph.groups.filter((item) => !removedGroupIds.has(item.id));
      const initialGroupId = this.getInitialGroupIdAfterNodeDelete(
        current.machineGraph.initialGroupId,
        remainingGroups,
        replacementInitialNode,
        group,
      );

      if (!replacementInitialNode && initialGroupId) {
        const initialGroup = remainingGroups.find((item) => item.id === initialGroupId);
        const initialNode = initialGroup?.entry ?? null;

        if (initialNode) {
          for (const graphGroup of remainingGroups) {
            this.setInitialNodeInGroup(graphGroup, null);
          }

          initialNode.isInitial = true;
        }
      }

      const updatedGroups = current.machineGraphView.groups
        .filter((groupView) => !removedGroupIds.has(groupView.groupId))
        .map((groupView) => {
          if (groupView.groupId !== group.id) {
            return groupView;
          }

          return {
            ...groupView,
            label: formatGroupLabel(group),
            width: Math.max(MACHINE_NODE_STEP, (groupView.width ?? MACHINE_NODE_STEP) - MACHINE_NODE_STEP),
          };
        });
      const updatedNodes = shiftedNodes.map((viewNode) => ({
        ...viewNode,
        initial: this.isMachineNodeInitial(remainingGroups, viewNode.nodeId),
      }));
      const filteredLinks = current.machineGraph.links.filter(
        (link) => !removedGroupIds.has(link.sourceGroup?.id ?? '') && !removedGroupIds.has(link.targetGroup?.id ?? ''),
      );
      const filteredAutolinks = (current.machineGraph.autolinks ?? []).filter(
        (autolink) => autolink.node?.id !== nodeId && !removedGroupIds.has(this.getNodeGroupId(remainingGroups, autolink.node?.id ?? '')),
      );
      const updatedLinkViews = this.refreshLinkViewsForGroups(
        current.machineGraphView.links.filter(
          (link) =>
            link.linkId !== nodeId &&
            !removedGroupIds.has(link.sourceGroupId) &&
            !removedGroupIds.has(link.targetGroupId) &&
            !(link.kind === 'autolink' && !filteredAutolinks.some((autolink) => autolink.id === link.linkId)),
        ),
        [...changedGroupIds],
        updatedNodes,
        remainingGroups,
        filteredAutolinks,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: remainingGroups,
          links: filteredLinks,
          autolinks: filteredAutolinks,
          initialGroupId,
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: updatedGroups,
          nodes: updatedNodes,
          links: updatedLinkViews,
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
  }

  deleteCanvasLink(linkId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const hasGraphLink = current.machineGraph.links.some((link) => link.id === linkId);
      const hasAutolink = (current.machineGraph.autolinks ?? []).some((autolink) => autolink.id === linkId);
      const hasViewLink = current.machineGraphView.links.some((link) => link.linkId === linkId);

      if (!hasGraphLink && !hasAutolink && !hasViewLink) {
        return current;
      }

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: current.machineGraph.links.filter((link) => link.id !== linkId),
          autolinks: (current.machineGraph.autolinks ?? []).filter((autolink) => autolink.id !== linkId),
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: current.machineGraphView.links.filter((link) => link.linkId !== linkId),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
  }

  moveCanvasLinkVertex(linkId: string, pointIndex: number, delta: ViewPoint): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => ({
      ...current,
      machineGraphView: {
        ...current.machineGraphView,
        links: current.machineGraphView.links.map((link) => {
          const points = link.points ?? [];

          if (
            link.linkId !== linkId ||
            link.kind === 'autolink' ||
            pointIndex <= 0 ||
            pointIndex >= points.length - 1
          ) {
            return link;
          }

          return {
            ...link,
            points: points.map((point, index) => (index === pointIndex ? this.translatePoint(point, delta) : point)),
          };
        }),
      },
      selectedCanvasLinkId: linkId,
      selectedCanvasNodeId: null,
    }));
  }

  setTapeValue(tapeId: string, value: string): void {
    this.mutateTape(tapeId, (tape) => {
      tape.load(value);
    });
  }

  setSelectedTapeValue(value: string): void {
    const selectedTape = this.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.setTapeValue(selectedTape.id, value);
  }

  setTapeHeadPosition(tapeId: string, headPosition: number): void {
    this.mutateTape(tapeId, (tape) => {
      tape.setHeadPosition(Math.max(0, headPosition));
    });
  }

  addTape(): void {
    this.state.update((current) => {
      const nextIndex = getNextTapeIndex(current.tapes);
      const tape = createTapeState(nextIndex);

      return {
        ...current,
        selectedAteNodeId: null,
        tapes: [...current.tapes, tape],
      };
    });
  }

  removeSelectedTape(): void {
    this.state.update((current) => {
      if (current.tapes.length <= 1) {
        return current;
      }

      const tapes = current.tapes.filter((_, index) => index !== current.selectedTapeIndex);
      const selectedTapeIndex = Math.min(current.selectedTapeIndex, tapes.length - 1);

      return {
        ...current,
        selectedTapeIndex,
        selectedAteNodeId: null,
        tapes,
      };
    });
  }

  clearSelectedTape(): void {
    const selectedTape = this.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.mutateTape(selectedTape.id, (tape) => {
      tape.clear();
    });
  }

  clearAllTapes(): void {
    this.state.update((current) => ({
      ...current,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState) => {
        tapeState.tape.clear();

        return { ...tapeState };
      }),
    }));
  }

  runMachineOnFirstTape(): boolean {
    const firstTape = this.state().tapes[0];

    if (!firstTape) {
      return false;
    }

    const traceRecorder = new AteTraceRecorder(this.state().selectedMachine.name);
    const context = {
      tapes: [firstTape.tape],
      metaValues: new MetaValueDictionary(),
    };
    const ok = this.machineGraphRunner.run(this.state().machineGraph, context, traceRecorder);

    traceRecorder.recordStop();

    this.state.update((current) => ({
      ...current,
      ate: traceRecorder.root,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState, index) => (index === 0 ? { ...tapeState } : tapeState)),
    }));

    return ok;
  }

  clearAte(): void {
    this.state.update((current) => ({
      ...current,
      ate: new AteTraceRecorder(current.selectedMachine.name).root,
      selectedAteNodeId: null,
    }));
  }

  reset(): void {
    this.state.set(createInitialState());
  }

  private patchState(patch: Partial<JtvState>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private mutateTape(tapeId: string, mutate: (tape: Tape) => void): void {
    this.state.update((current) => ({
      ...current,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState) => {
        if (tapeState.id !== tapeId) {
          return tapeState;
        }

        mutate(tapeState.tape);

        return { ...tapeState };
      }),
    }));
  }

  private getFirstConditionClauseOrDefault(condition: LinkCondition | null): ReadConditionClause {
    return condition?.clauses[0]
      ? {
        tapeIndex: condition.clauses[0].tapeIndex,
        acceptedValues: [...condition.clauses[0].acceptedValues],
        negated: condition.clauses[0].negated,
        assignToVariableName: condition.clauses[0].assignToVariableName,
      }
      : {
        tapeIndex: 0,
        acceptedValues: [],
        negated: false,
      };
  }

  private createLinkConditionFromClause(clause: ReadConditionClause): LinkCondition | null {
    return clause.acceptedValues.length > 0 ? new LinkCondition([clause]) : null;
  }

  private findMachineNodeInGroup(group: MachineGroup, nodeId: string): MachineNode | null {
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

  private insertMachineNodeBefore(group: MachineGroup, targetNode: MachineNode, insertedNode: MachineNode): void {
    const previousNode = targetNode.previous;

    insertedNode.previous = previousNode;
    insertedNode.next = targetNode;
    targetNode.previous = insertedNode;

    if (previousNode) {
      previousNode.next = insertedNode;
    } else {
      group.entry = insertedNode;
    }

    if (targetNode.isInitial) {
      targetNode.isInitial = false;
      insertedNode.isInitial = true;
    }
  }

  private insertMachineNodeAfter(group: MachineGroup, targetNode: MachineNode, insertedNode: MachineNode): void {
    const nextNode = targetNode.next;

    insertedNode.previous = targetNode;
    insertedNode.next = nextNode;
    targetNode.next = insertedNode;

    if (nextNode) {
      nextNode.previous = insertedNode;
    } else {
      group.exit = insertedNode;
    }
  }

  private removeMachineNodeFromGroup(group: MachineGroup, node: MachineNode): void {
    const previousNode = node.previous;
    const nextNode = node.next;

    if (previousNode) {
      previousNode.next = nextNode;
    } else {
      group.entry = nextNode;
    }

    if (nextNode) {
      nextNode.previous = previousNode;
    } else {
      group.exit = previousNode;
    }

    node.previous = null;
    node.next = null;
    node.isInitial = false;
  }

  private setInitialNodeInGroup(group: MachineGroup, initialNode: MachineNode | null): void {
    const visitedNodeIds = new Set<string>();
    let current = group.entry;

    while (current && !visitedNodeIds.has(current.id)) {
      visitedNodeIds.add(current.id);
      current.isInitial = current.id === initialNode?.id;

      if (current.id === group.exit?.id) {
        break;
      }

      current = current.next;
    }
  }

  private isMachineNodeInitial(groups: readonly MachineGroup[], nodeId: string): boolean {
    const group = groups.find((item) => this.findMachineNodeInGroup(item, nodeId));
    const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

    return node?.isInitial ?? false;
  }

  private getNodeGroupId(groups: readonly MachineGroup[], nodeId: string): string {
    return groups.find((group) => this.findMachineNodeInGroup(group, nodeId))?.id ?? '';
  }

  private getInitialGroupIdAfterNodeDelete(
    currentInitialGroupId: string,
    remainingGroups: readonly MachineGroup[],
    replacementInitialNode: MachineNode | null,
    deletedNodeGroup: MachineGroup,
  ): string {
    if (replacementInitialNode) {
      return deletedNodeGroup.id;
    }

    if (remainingGroups.some((group) => group.id === currentInitialGroupId)) {
      return currentInitialGroupId;
    }

    return remainingGroups[0]?.id ?? '';
  }

  private refreshLinkViewsForGroups(
    links: readonly MachineLinkView[],
    changedGroupIds: readonly string[],
    nodes: readonly MachineGraphView['nodes'][number][],
    groups: readonly MachineGroup[],
    autolinks: readonly Autolink[],
  ): MachineLinkView[] {
    const changedGroupIdSet = new Set(changedGroupIds);

    return links.map((link) => {
      if (link.kind === 'autolink') {
        const autolink = autolinks.find((item) => item.id === link.linkId);
        const autolinkNode = autolink?.node
          ? nodes.find((node) => node.nodeId === autolink.node?.id)
          : null;

        if (!autolinkNode || !changedGroupIdSet.has(autolinkNode.groupId)) {
          return link;
        }

        return {
          ...link,
          points: [autolinkNode.position],
        };
      }

      const sourceChanged = changedGroupIdSet.has(link.sourceGroupId);
      const targetChanged = changedGroupIdSet.has(link.targetGroupId);

      if (!sourceChanged && !targetChanged) {
        return link;
      }

      const sourceGroup = groups.find((group) => group.id === link.sourceGroupId);
      const targetGroup = groups.find((group) => group.id === link.targetGroupId);
      const sourceNodeView = sourceGroup?.exit
        ? nodes.find((node) => node.nodeId === sourceGroup.exit?.id)
        : null;
      const targetNodeView = targetGroup?.entry
        ? nodes.find((node) => node.nodeId === targetGroup.entry?.id)
        : null;
      const points = link.points ?? [];

      if (!points.length) {
        return link;
      }

      return {
        ...link,
        points: points.map((point, index) => {
          if (sourceChanged && index === 0 && sourceNodeView) {
            return this.getNodeRightAnchor(sourceNodeView);
          }

          if (targetChanged && index === points.length - 1 && targetNodeView) {
            return this.getNodeLeftAnchor(targetNodeView);
          }

          return point;
        }),
      };
    });
  }

  private createMachineNodeId(graph: MachineGraph, prefix: string): string {
    const usedNodeIds = new Set<string>();

    for (const group of graph.groups) {
      const visitedNodeIds = new Set<string>();
      let current = group.entry;

      while (current && !visitedNodeIds.has(current.id)) {
        visitedNodeIds.add(current.id);
        usedNodeIds.add(current.id);

        if (current.id === group.exit?.id) {
          break;
        }

        current = current.next;
      }
    }

    let nextIndex = usedNodeIds.size + 1;
    let id = `${prefix}-${nextIndex}`;

    while (usedNodeIds.has(id)) {
      nextIndex++;
      id = `${prefix}-${nextIndex}`;
    }

    return id;
  }

  private createMachineGroupId(graph: MachineGraph, prefix: string): string {
    const usedGroupIds = new Set(graph.groups.map((group) => group.id));
    let nextIndex = usedGroupIds.size + 1;
    let id = `${prefix}-${nextIndex}`;

    while (usedGroupIds.has(id)) {
      nextIndex++;
      id = `${prefix}-${nextIndex}`;
    }

    return id;
  }

  private createMachineLinkId(graph: MachineGraph, prefix: string): string {
    const usedLinkIds = new Set([
      ...graph.links.map((link) => link.id),
      ...(graph.autolinks ?? []).map((autolink) => autolink.id),
    ]);
    let nextIndex = usedLinkIds.size + 1;
    let id = `${prefix}-${nextIndex}`;

    while (usedLinkIds.has(id)) {
      nextIndex++;
      id = `${prefix}-${nextIndex}`;
    }

    return id;
  }

  private isInsertableNodeTool(
    toolId: JtvToolId | null,
  ): toolId is 'move-left' | 'move-right' | 'symbol-lowercase' | 'symbol-variable' | 'hub' {
    return (
      toolId === 'move-left' ||
      toolId === 'move-right' ||
      toolId === 'symbol-lowercase' ||
      toolId === 'symbol-variable' ||
      toolId === 'hub'
    );
  }

  private createMachineNodeForTool(
    state: JtvState,
    toolId: 'move-left' | 'move-right' | 'symbol-lowercase' | 'symbol-variable' | 'hub',
    tapeIndex: number,
  ): MachineNode | null {
    if (toolId === 'move-left') {
      return new MoveLeftNode(this.createMachineNodeId(state.machineGraph, 'move-left'), tapeIndex);
    }

    if (toolId === 'move-right') {
      return new MoveRightNode(this.createMachineNodeId(state.machineGraph, 'move-right'), tapeIndex);
    }

    if (toolId === 'hub') {
      return new HubNode(this.createMachineNodeId(state.machineGraph, 'hub'), tapeIndex);
    }

    if (toolId === 'symbol-variable') {
      return new WriterNode(
        this.createMachineNodeId(state.machineGraph, 'write-variable'),
        state.selectedVariable,
        tapeIndex,
      );
    }

    return new WriterNode(
      this.createMachineNodeId(state.machineGraph, 'write-symbol'),
      state.selectedSymbol,
      tapeIndex,
    );
  }

  private getMachineNodeViewKind(node: MachineNode): 'text' | 'hub' {
    return node instanceof HubNode ? 'hub' : 'text';
  }

  private createLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    condition: LinkCondition | null,
    vertices: readonly ViewPoint[] = [],
  ): void {
    this.state.update((current) => {
      const sourceNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === sourceNodeId);
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const sourceGroup = sourceNodeView
        ? current.machineGraph.groups.find((group) => group.id === sourceNodeView.groupId)
        : null;
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;

      if (!sourceNodeView || !targetNodeView || !sourceGroup || !targetGroup || sourceGroup.exit?.id !== sourceNodeId) {
        return current;
      }

      const link = new Link(
        this.createMachineLinkId(current.machineGraph, 'link'),
        sourceGroup,
        targetGroup,
        condition,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links, link],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(link, {
              kind: 'direct',
              label: condition ? undefined : '',
              points: [
                this.getNodeRightAnchor(sourceNodeView),
                ...vertices,
                this.getNodeLeftAnchor(targetNodeView),
              ],
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
  }

  private translateLinkForMovedGroup(link: MachineLinkView, groupId: string, delta: ViewPoint): MachineLinkView {
    if (!link.points?.length) {
      return link;
    }

    const sourceMoved = link.sourceGroupId === groupId;
    const targetMoved = link.targetGroupId === groupId;

    if (!sourceMoved && !targetMoved) {
      return link;
    }

    if (sourceMoved && targetMoved) {
      return {
        ...link,
        points: link.points.map((point) => this.translatePoint(point, delta)),
      };
    }

    return {
      ...link,
      points: link.points.map((point, index) => {
        const isSourcePoint = sourceMoved && index === 0;
        const isTargetPoint = targetMoved && index === link.points!.length - 1;

        return isSourcePoint || isTargetPoint ? this.translatePoint(point, delta) : point;
      }),
    };
  }

  private translatePoint(point: ViewPoint, delta: ViewPoint): ViewPoint {
    return {
      x: point.x + delta.x,
      y: point.y + delta.y,
    };
  }

  private getNodeRightAnchor(node: { kind?: string; label: string; position: ViewPoint; width?: number }): ViewPoint {
    if (node.kind === 'hub') {
      return {
        x: node.position.x + 6,
        y: node.position.y,
      };
    }

    const width = node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: node.position.x + width,
      y: node.position.y - 10,
    };
  }

  private getNodeLeftAnchor(node: { kind?: string; position: ViewPoint }): ViewPoint {
    if (node.kind === 'hub') {
      return {
        x: node.position.x - 6,
        y: node.position.y,
      };
    }

    return {
      x: node.position.x - 5,
      y: node.position.y - 10,
    };
  }

  private findAteNode(node: AteNode, nodeId: string | null): AteNode | null {
    if (!nodeId) {
      return null;
    }

    if (node.id === nodeId) {
      return node;
    }

    for (const child of node.children) {
      const match = this.findAteNode(child, nodeId);

      if (match) {
        return match;
      }
    }

    return null;
  }

  private replayTapeSnapshotsToAteNode(targetNode: AteNode): readonly TapeSnapshot[] | null {
    const state = this.state();
    const traceNodes = this.getAteTraceNodes(state.ate);
    const targetIndex = traceNodes.findIndex((node) => node.id === targetNode.id);

    if (targetIndex < 0) {
      return null;
    }

    const tapes = state.tapes.map((tapeState) => Tape.fromInitialSnapshot(tapeState.tape.getInitialSnapshot()));
    const context = {
      tapes,
      metaValues: new MetaValueDictionary(),
    };
    const machineNodes = this.getMachineNodesById(state.machineGraph);
    const transitions = this.getTransitionsById(state.machineGraph);

    for (let index = 0; index <= targetIndex; index++) {
      const traceNode = traceNodes[index];

      if (traceNode.machineNodeId) {
        const machineNode = machineNodes.get(traceNode.machineNodeId);

        if (!machineNode?.execute(context)) {
          break;
        }
      }

      if (traceNode.linkId) {
        const transition = transitions.get(traceNode.linkId);

        if (!transition?.canTraverse(context)) {
          break;
        }
      }
    }

    return tapes.map((tape) => tape.getSnapshot());
  }

  private getAteTraceNodes(root: AteNode): AteNode[] {
    return root.children.flatMap((child) => [child, ...this.getAteTraceNodes(child)]);
  }

  private getMachineNodesById(graph: MachineGraph): Map<string, MachineNode> {
    const nodes = new Map<string, MachineNode>();

    for (const group of graph.groups) {
      const visitedNodeIds = new Set<string>();
      let current = group.entry;

      while (current && !visitedNodeIds.has(current.id)) {
        visitedNodeIds.add(current.id);
        nodes.set(current.id, current);

        if (current.id === group.exit?.id) {
          break;
        }

        current = current.next;
      }
    }

    return nodes;
  }

  private getTransitionsById(graph: MachineGraph): Map<string, Link | Autolink> {
    return new Map<string, Link | Autolink>([
      ...graph.links.map((link) => [link.id, link] as const),
      ...(graph.autolinks ?? []).map((autolink) => [autolink.id, autolink] as const),
    ]);
  }
}
