import { Injectable, computed, signal } from '@angular/core';

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
  readonly value: string;
  readonly headPosition: number;
}

export interface JtvMachineState {
  readonly id: string;
  readonly name: string;
}

export interface JtvState {
  readonly activeToolId: JtvToolId | null;
  readonly selectedMachine: JtvMachineState;
  readonly selectedTapeId: string;
  readonly tapes: JtvTapeState[];
}

const INITIAL_TAPES: JtvTapeState[] = [
  {
    id: 'tape-1',
    name: 'Cinta 1',
    value: '',
    headPosition: 0,
  },
  {
    id: 'tape-2',
    name: 'Cinta 2',
    value: '',
    headPosition: 0,
  },
];

const INITIAL_STATE: JtvState = {
  activeToolId: null,
  selectedMachine: {
    id: 'new',
    name: 'NUEVA',
  },
  selectedTapeId: INITIAL_TAPES[0].id,
  tapes: INITIAL_TAPES,
};

@Injectable({ providedIn: 'root' })
export class JtvStore {
  private readonly state = signal<JtvState>(INITIAL_STATE);

  readonly activeToolId = computed(() => this.state().activeToolId);
  readonly selectedMachine = computed(() => this.state().selectedMachine);
  readonly selectedTapeId = computed(() => this.state().selectedTapeId);
  readonly tapes = computed(() => this.state().tapes);
  readonly selectedTape = computed(() => {
    const { selectedTapeId, tapes } = this.state();

    return tapes.find((tape) => tape.id === selectedTapeId) ?? tapes[0] ?? null;
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
    if (!this.state().tapes.some((tape) => tape.id === tapeId)) {
      return;
    }

    this.patchState({ selectedTapeId: tapeId });
  }

  setTapeValue(tapeId: string, value: string): void {
    this.updateTape(tapeId, { value });
  }

  setTapeHeadPosition(tapeId: string, headPosition: number): void {
    this.updateTape(tapeId, { headPosition: Math.max(0, headPosition) });
  }

  addTape(): void {
    this.state.update((current) => {
      const nextIndex = current.tapes.length + 1;
      const tape: JtvTapeState = {
        id: `tape-${nextIndex}`,
        name: `Cinta ${nextIndex}`,
        value: '',
        headPosition: 0,
      };

      return {
        ...current,
        selectedTapeId: tape.id,
        tapes: [...current.tapes, tape],
      };
    });
  }

  removeSelectedTape(): void {
    this.state.update((current) => {
      if (current.tapes.length <= 1) {
        return current;
      }

      const tapes = current.tapes.filter((tape) => tape.id !== current.selectedTapeId);

      return {
        ...current,
        selectedTapeId: tapes[0].id,
        tapes,
      };
    });
  }

  clearSelectedTape(): void {
    const selectedTape = this.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.updateTape(selectedTape.id, { value: '', headPosition: 0 });
  }

  clearAllTapes(): void {
    this.state.update((current) => ({
      ...current,
      tapes: current.tapes.map((tape) => ({
        ...tape,
        value: '',
        headPosition: 0,
      })),
    }));
  }

  reset(): void {
    this.state.set(INITIAL_STATE);
  }

  private patchState(patch: Partial<JtvState>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private updateTape(tapeId: string, patch: Partial<JtvTapeState>): void {
    this.state.update((current) => ({
      ...current,
      tapes: current.tapes.map((tape) => (tape.id === tapeId ? { ...tape, ...patch } : tape)),
    }));
  }
}
