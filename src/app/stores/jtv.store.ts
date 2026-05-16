import { Injectable, computed, signal } from '@angular/core';

import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { Link } from '../models/core/link';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineNode } from '../models/core/machine-node';
import { MoveLeftNode } from '../models/core/move-left-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { Tape } from '../models/core/tape';
import { WriterNode } from '../models/core/writer-node';
import { MachineGraphView } from '../models/view';

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
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
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

  return {
    activeToolId: null,
    machineGraph: demoMachine.graph,
    machineGraphView: demoMachine.view,
    selectedMachine: {
      id: 'new',
      name: 'NUEVA',
    },
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

  return {
    graph: {
      groups: [writeGroup, rewindGroup],
      links: [new Link('write-to-rewind', writeGroup, rewindGroup)],
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
        {
          linkId: 'write-to-rewind',
          label: '[1]',
          sourceGroupId: writeGroup.id,
          targetGroupId: rewindGroup.id,
          points: [
            { x: 190, y: 62 },
            { x: 296, y: 62 },
          ],
        },
      ],
    },
  };
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

  readonly activeToolId = computed(() => this.state().activeToolId);
  readonly machineGraph = computed(() => this.state().machineGraph);
  readonly machineGraphView = computed(() => this.state().machineGraphView);
  readonly selectedMachine = computed(() => this.state().selectedMachine);
  readonly selectedTapeIndex = computed(() => this.state().selectedTapeIndex);
  readonly selectedTapeId = computed(() => this.selectedTape()?.id ?? null);
  readonly tapes = computed(() => this.state().tapes);
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
      tapes: current.tapes.map((tapeState) => {
        tapeState.tape.clear();

        return { ...tapeState };
      }),
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
      tapes: current.tapes.map((tapeState) => {
        if (tapeState.id !== tapeId) {
          return tapeState;
        }

        mutate(tapeState.tape);

        return { ...tapeState };
      }),
    }));
  }
}
