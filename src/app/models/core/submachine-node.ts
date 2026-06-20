import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext, SubmachineDefinition } from './execution-context';
import { MachineGraphRunner } from './machine-graph-runner';
import { MetaValueDictionary } from './meta-value-dictionary';
import { ParameterValue } from './parameter-value';
import { SymbolValue } from './symbol-value';
import { Tape } from './tape';

export type PreinstalledSubmachineId =
  | 'buscadora_l'
  | 'buscadora_r'
  | 'buscadora_not_l'
  | 'buscadora_not_r'
  | 'shift_l'
  | 'shift_r';

export class SubmachineNode extends AbstractMachineNode {
  private readonly runner = new MachineGraphRunner();

  constructor(
    id: string,
    readonly submachineId: string,
    readonly submachineName: string,
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
    const definition = context.submachines?.get(this.submachineId);
    const callerTape = context.tapes[this.tapeIndex];

    if (!definition || !callerTape) {
      return false;
    }

    const submachineTapes = this.createSubmachineTapes(definition, callerTape);
    const submachineContext = {
      tapes: submachineTapes,
      metaValues: this.createMetaValues(definition),
      submachines: context.submachines,
    };
    const ok = this.runner.run(definition.graph, submachineContext);

    if (!ok) {
      return false;
    }

    callerTape.restoreSnapshot(submachineTapes[0].getSnapshot());
    return true;
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
