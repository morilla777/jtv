import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext, SubmachineDefinition } from './execution-context';
import { Link } from './link';
import { MachineGraphRunner } from './machine-graph-runner';
import { type MachineGraphExecutionPoint, type MachineGraphRunResult } from './machine-graph-run-result';
import { type MetaValue } from './meta-value';
import { MetaValueDictionary } from './meta-value-dictionary';
import { ParameterValue } from './parameter-value';
import { SymbolValue } from './symbol-value';
import { Tape } from './tape';
import { Autolink } from './autolink';
import { AteContinuationSnapshot, AteSubtrace, AteTraceRecorder } from '../ate';

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
  private lastRunResult: MachineGraphRunResult | null = null;

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
    this.lastRunResult = null;
    const definition = context.submachines?.get(this.submachineId);
    const callerTape = context.tapes[this.tapeIndex];

    if (!definition || !callerTape) {
      this.lastRunResult = { status: 'error' };
      return false;
    }

    const submachineTapes = this.createSubmachineTapes(definition, callerTape);
    const initialTapeSnapshots = submachineTapes.map((tape) => tape.getInitialSnapshot());
    const submachineContext = {
      tapes: submachineTapes,
      metaValues: this.createMetaValues(definition),
      maxSteps: context.maxSteps,
      submachines: context.submachines,
    };
    const traceRecorder = new AteTraceRecorder(definition.name, { showTapeIndexes: submachineTapes.length > 1 });
    const result = this.runner.runBurst(definition.graph, submachineContext, traceRecorder, {
      maxSteps: context.maxSteps,
    });

    const isControlledPreinstalledHanging = this.isControlledPreinstalledHanging(result);
    const traceResult = isControlledPreinstalledHanging
      ? { ...result, status: 'completed' as const }
      : result;

    this.recordTerminalResult(definition, submachineContext, traceRecorder, traceResult);
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
      callerTapeIndex: this.tapeIndex,
    };

    this.lastRunResult = traceResult;

    if (traceResult.status === 'completed') {
      callerTape.restoreSnapshot(submachineTapes[0].getSnapshot());
      return true;
    }

    if (traceResult.status === 'hanging') {
      callerTape.restoreSnapshot(submachineTapes[0].getSnapshot());
    }

    return false;
  }

  getAteSubtrace(): AteSubtrace | null {
    return this.lastAteSubtrace;
  }

  getExecutionResult(): MachineGraphRunResult | null {
    return this.lastRunResult;
  }

  override getAteIconName(): string {
    if (this.lastRunResult?.status === 'error' || this.lastRunResult?.status === 'failed') {
      return 'M_Error_ATE.gif';
    }

    if (this.lastRunResult?.status === 'hanging') {
      return 'M_Hanging_ATE.gif';
    }

    if (this.lastRunResult?.status === 'suspended') {
      return 'M_Expand_ATE.gif';
    }

    if (this.lastRunResult?.status === 'nondeterministic') {
      return 'M_ND_ATE.gif';
    }

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

  private isControlledPreinstalledHanging(result: MachineGraphRunResult): boolean {
    return result.status === 'hanging' && (
      this.submachineName === 'COPIADORA2' ||
      this.submachineId === 'buscadora_l' ||
      this.submachineId === 'buscadora_r' ||
      this.submachineId === 'buscadora_not_l' ||
      this.submachineId === 'buscadora_not_r' ||
      this.submachineId === 'shift_l' ||
      this.submachineId === 'shift_r'
    );
  }

  private recordTerminalResult(
    definition: SubmachineDefinition,
    context: { tapes: readonly Tape[]; metaValues: MetaValueDictionary },
    traceRecorder: AteTraceRecorder,
    result: MachineGraphRunResult,
  ): void {
    if (result.status === 'completed') {
      traceRecorder.recordStop();
      return;
    }

    if (result.status === 'suspended' && result.continuation) {
      traceRecorder.recordExpand(this.createAteContinuationSnapshot(result.continuation, context));
      return;
    }

    if (result.status === 'nondeterministic' && result.continuations) {
      traceRecorder.recordNondeterminism();

      for (const continuation of result.continuations) {
        traceRecorder.recordExpand(
          this.createAteContinuationSnapshot(continuation, context),
          this.getContinuationTransitionLabel(definition, continuation),
        );
      }
      return;
    }

    if (result.status === 'hanging') {
      traceRecorder.recordHanging();
      return;
    }

    traceRecorder.recordError();
  }

  private createAteContinuationSnapshot(
    point: MachineGraphExecutionPoint,
    context: { tapes: readonly Tape[]; metaValues: MetaValueDictionary },
  ): AteContinuationSnapshot {
    return {
      currentGroupId: point.currentGroupId,
      currentNodeId: point.currentNodeId,
      phase: point.phase,
      forcedTransitionId: point.forcedTransitionId,
      tapeSnapshots: context.tapes.map((tape) => tape.getSnapshot()),
      variableAssignments: this.createMetaValueAssignmentsSnapshot(context.metaValues.getVariables()),
      parameterAssignments: this.createMetaValueAssignmentsSnapshot(context.metaValues.getParameters()),
    };
  }

  private createMetaValueAssignmentsSnapshot(values: ReadonlyMap<string, MetaValue>): Readonly<Record<string, string>> {
    const assignments: Record<string, string> = {};

    for (const [name, value] of values.entries()) {
      if (value.isSet()) {
        assignments[name] = value.resolve().name;
      }
    }

    return assignments;
  }

  private getContinuationTransitionLabel(
    definition: SubmachineDefinition,
    continuation: MachineGraphExecutionPoint,
  ): string {
    if (!continuation.forcedTransitionId) {
      return '';
    }

    const showTapeIndexes = definition.tapeCount > 1;
    const autolink = definition.graph.autolinks?.find((item: Autolink) => item.id === continuation.forcedTransitionId);

    if (autolink) {
      return autolink.getAteLabel(showTapeIndexes);
    }

    return definition.graph.links
      .find((item: Link) => item.id === continuation.forcedTransitionId)
      ?.getAteLabel(showTapeIndexes) ?? '';
  }
}
