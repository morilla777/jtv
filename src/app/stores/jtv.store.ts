import { Injectable, computed, signal } from '@angular/core';

import { AteNode, AteTraceRecorder } from '../models/ate';
import { Autolink } from '../models/core/autolink';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { Link } from '../models/core/link';
import { LinkCondition } from '../models/core/link-condition';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineGraphRunner } from '../models/core/machine-graph-runner';
import { MachineGroup } from '../models/core/machine-group';
import { MachineNode } from '../models/core/machine-node';
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

export interface JtvState {
  readonly activeToolId: JtvToolId | null;
  readonly ate: AteNode;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly selectedCanvasLinkId: string | null;
  readonly selectedCanvasNodeId: string | null;
  readonly selectedAteNodeId: string | null;
  readonly selectedMachine: JtvMachineState;
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
    sourceGroupId?: string;
    targetGroupId?: string;
    points: readonly ViewPoint[];
  },
): MachineLinkView {
  return {
    linkId: link.id,
    label: formatLinkCondition(link.condition),
    kind: layout.kind,
    autolinkOrientation: layout.autolinkOrientation,
    sourceGroupId: layout.sourceGroupId ?? (link instanceof Link ? link.sourceGroup?.id : '') ?? '',
    targetGroupId: layout.targetGroupId ?? (link instanceof Link ? link.targetGroup?.id : '') ?? '',
    points: layout.points,
  };
}

function formatLinkCondition(condition: LinkCondition | null): string {
  return condition?.getAteLabel() ?? '[1]';
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

  insertActiveToolNodeNear(targetNodeId: string, side: 'left' | 'right'): void {
    const activeToolId = this.state().activeToolId;

    if (activeToolId !== 'move-left' && activeToolId !== 'move-right') {
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

      const insertedNode = activeToolId === 'move-left'
        ? new MoveLeftNode(this.createMachineNodeId(current.machineGraph, 'move-left'), targetNode.tapeIndex)
        : new MoveRightNode(this.createMachineNodeId(current.machineGraph, 'move-right'), targetNode.tapeIndex);

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
