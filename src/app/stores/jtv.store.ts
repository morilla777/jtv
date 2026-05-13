import { Injectable, computed, signal } from '@angular/core';

import { Tape } from '../models/core/tape';

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

  return {
    activeToolId: null,
    selectedMachine: {
      id: 'new',
      name: 'NUEVA',
    },
    selectedTapeIndex: 0,
    tapes: [initialTape],
  };
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
