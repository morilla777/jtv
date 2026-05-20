import { Injectable, computed, signal } from '@angular/core';

import { AteNode, AteTraceRecorder } from '../models/ate';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { Link } from '../models/core/link';
import { LinkCondition } from '../models/core/link-condition';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineGraphRunner } from '../models/core/machine-graph-runner';
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
    new MoveLeftNode('move-left-2', 0),
    new MoveLeftNode('move-left-3', 0),
    new MoveLeftNode('move-left-4', 0),
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
  // TODO: Re-enable when autolink execution semantics are represented in the graph.
  // const rewindAutolink = new Link(
  //   'rewind-autolink',
  //   rewindGroup,
  //   rewindGroup,
  //   new LinkCondition([{ tapeIndex: 0, acceptedValues: ['q'], negated: true }]),
  // );

  return {
    graph: {
      groups: [writeGroup, rewindGroup],
      links: [writeToRewindLink],
      initialGroupId: writeGroup.id,
    },
    view: {
      groups: [
        {
          groupId: writeGroup.id,
          label: 'RaRbRcRd',
          position: { x: 32, y: 72 },
          width: 176,
          height: 32,
        },
        {
          groupId: rewindGroup.id,
          label: 'LLLL',
          position: { x: 300, y: 72 },
          width: 78,
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
        // TODO: Re-enable when autolink execution semantics are represented in the graph.
        // createLinkView(rewindAutolink, {
        //   kind: 'autolink',
        //   autolinkOrientation: 'right',
        //   points: [{ x: 370, y: 62 }],
        // }),
      ],
    },
  };
}

function createLinkView(
  link: Link,
  layout: {
    kind: MachineLinkKind;
    autolinkOrientation?: AutolinkOrientation;
    points: readonly ViewPoint[];
  },
): MachineLinkView {
  return {
    linkId: link.id,
    label: formatLinkCondition(link.condition),
    kind: layout.kind,
    autolinkOrientation: layout.autolinkOrientation,
    sourceGroupId: link.sourceGroup?.id ?? '',
    targetGroupId: link.targetGroup?.id ?? '',
    points: layout.points,
  };
}

function formatLinkCondition(condition: LinkCondition | null): string {
  if (!condition || condition.clauses.length === 0) {
    return '[1]';
  }

  const [clause] = condition.clauses;

  if (condition.clauses.length === 1 && clause.acceptedValues.length === 1) {
    return clause.negated ? `[not ${clause.acceptedValues[0]}]` : `[${clause.acceptedValues[0]}]`;
  }

  return condition.clauses
    .map((item) => {
      const values = item.acceptedValues.join(',');

      return item.negated ? `not ${values}` : values;
    })
    .join(' & ');
}

function createLinearNodeViews(
  groupId: string,
  nodes: readonly MachineNode[],
  startX: number,
  y: number,
) {
  const nodeStep = 20;

  return nodes.map((node, index) => ({
    nodeId: node.id,
    groupId,
    label: node.name,
    initial: node.isInitial,
    position: {
      x: startX + index * nodeStep,
      y,
    },
  }));
}

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

    return {
      ...view,
      nodes: view.nodes.map((node) => ({
        ...node,
        selected: node.nodeId === activeNodeId,
      })),
      links: view.links.map((link) => ({
        ...link,
        selected: link.linkId === activeLinkId,
      })),
    };
  });
  readonly selectedMachine = computed(() => this.state().selectedMachine);
  readonly selectedTapeIndex = computed(() => this.state().selectedTapeIndex);
  readonly selectedTapeId = computed(() => this.selectedTape()?.id ?? null);
  readonly tapes = computed(() => this.state().tapes);
  readonly tapeSnapshots = computed<readonly TapeSnapshot[]>(() => {
    const traceSnapshots = this.selectedAteNode()?.tapeSnapshots;

    if (traceSnapshots) {
      return traceSnapshots;
    }

    return this.state().tapes.map((tapeState) => tapeState.tape.getSnapshot());
  });
  readonly selectedTapeSnapshot = computed(() => this.tapeSnapshots()[this.selectedTapeIndex()] ?? null);
  readonly selectedTape = computed(() => {
    const { selectedTapeIndex, tapes } = this.state();

    return tapes[selectedTapeIndex] ?? tapes[0] ?? null;
  });

  selectTool(toolId: JtvToolId | null): void {
    this.patchState({ activeToolId: toolId });
  }

  toggleTool(toolId: JtvToolId): void {
    this.patchState({
      activeToolId: this.state().activeToolId === toolId ? null : toolId,
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

    traceRecorder.recordStop(context);

    this.state.update((current) => ({
      ...current,
      ate: traceRecorder.root,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState, index) => (index === 0 ? { ...tapeState } : tapeState)),
    }));

    return ok;
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
}
