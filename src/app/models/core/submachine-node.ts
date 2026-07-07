import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext, SubmachineDefinition } from './execution-context';
import { MachineGraphRunner } from './machine-graph-runner';
import { MetaValueDictionary } from './meta-value-dictionary';
import { ParameterValue } from './parameter-value';
import { SymbolValue } from './symbol-value';
import { Tape } from './tape';
import { AteSubtrace, AteTraceRecorder } from '../ate';

export type PreinstalledSubmachineId =
  | 'buscadora_l'
  | 'buscadora_r'
  | 'buscadora_not_l'
  | 'buscadora_not_r'
  | 'shift_l'
  | 'shift_r';

export class SubmachineNode extends AbstractMachineNode {
  private readonly runner = new MachineGraphRunner();
  private lastAteSubtrace: AteSubtrace | null = null;

  constructor(
    id: string,
    public submachineId: string,
    public submachineName: string,
    readonly displaySymbol: string,
    readonly parameterName: string,
    private localParameterAssignments: Readonly<Record<string, string>>,
    tapeIndex: number,
    isInitial: boolean = false,
    readonly displaySubscriptLabel?: string,
  ) {
    super(id, displaySymbol, tapeIndex, isInitial);
  }

  get parameterAssignments(): Readonly<Record<string, string>> {
    return this.localParameterAssignments;
  }

  execute(context: ExecutionContext): boolean {
    this.lastAteSubtrace = null;
    const definition = context.submachines?.get(this.submachineId);
    const callerTape = context.tapes[this.tapeIndex];

    if (!definition || !callerTape) {
      return false;
    }

    const submachineTapes = this.createSubmachineTapes(definition, callerTape);
    const initialTapeSnapshots = submachineTapes.map((tape) => tape.getInitialSnapshot());
    const submachineContext = {
      tapes: submachineTapes,
      metaValues: this.createMetaValues(definition),
      submachines: context.submachines,
    };
    const traceRecorder = new AteTraceRecorder(definition.name, { showTapeIndexes: submachineTapes.length > 1 });
    const ok = this.runner.run(definition.graph, submachineContext, traceRecorder);

    if (!ok) {
      return false;
    }

    traceRecorder.recordStop();
    this.lastAteSubtrace = {
      machineName: definition.name,
      graph: definition.graph,
      view: definition.view,
      root: traceRecorder.root,
      initialTapeSnapshots,
      finalTapeSnapshots: submachineTapes.map((tape) => tape.getSnapshot()),
      parameterAssignments: {
        ...definition.parameterAssignments,
        ...this.parameterAssignments,
      },
    };

    callerTape.restoreSnapshot(submachineTapes[0].getSnapshot());
    return true;
  }

  getAteSubtrace(): AteSubtrace | null {
    return this.lastAteSubtrace;
  }

  override getAteIconName(): string {
    return 'M_ATE.gif';
  }

  override getAteLabel(): string {
    return `${this.submachineName}()`;
  }

  getParameterDisplayValue(): string {
    if (this.displaySubscriptLabel) {
      return this.displaySubscriptLabel;
    }

    return this.parameterAssignments[this.parameterName] ?? this.parameterName;
  }

  hasNegatedParameterDisplay(): boolean {
    return this.submachineId === 'buscadora_not_l' || this.submachineId === 'buscadora_not_r';
  }

  setParameterAssignments(assignments: Readonly<Record<string, string>>): void {
    this.localParameterAssignments = { ...assignments };
  }

  private createSubmachineTapes(definition: SubmachineDefinition, callerTape: Tape): Tape[] {
    return Array.from({ length: Math.max(1, definition.tapeCount) }, (_, index) =>
      index === 0 ? Tape.fromInitialSnapshot(callerTape.getSnapshot()) : new Tape(),
    );
  }

  private createMetaValues(definition: SubmachineDefinition): MetaValueDictionary {
    const metaValues = new MetaValueDictionary();
    const assignments = {
      ...definition.parameterAssignments,
      ...this.parameterAssignments,
    };

    for (const [parameterName, symbolName] of Object.entries(assignments)) {
      const symbol = SymbolValue.of(symbolName);

      if (!symbol) {
        continue;
      }

      const parameter = new ParameterValue(parameterName);
      parameter.setValue(symbol);
      metaValues.addParameter(parameter);
    }

    return metaValues;
  }
}
