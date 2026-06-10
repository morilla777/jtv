import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';
import { SymbolValue } from './symbol-value';

export class WriterNode extends AbstractMachineNode {
  private lastMetaValueWrite: { kind: 'variable' | 'parameter'; name: string; valueName: string } | null = null;

  constructor(
    id: string,
    name: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, name, tapeIndex, isInitial);
  }

  execute(context: ExecutionContext): boolean {
    this.lastMetaValueWrite = null;
    const tape = context.tapes[this.tapeIndex];

    if (!tape) {
      return false;
    }

    const metaValue = context.metaValues.getMetaValue(this.name);

    if (!metaValue) {
      const symbol = SymbolValue.of(this.name);

      if (!symbol) {
        return false;
      }

      tape.write(symbol);
      return true;
    }

    try {
      const resolvedValue = metaValue.resolve();
      tape.write(resolvedValue);

      if (context.metaValues.getVariable(this.name)) {
        this.lastMetaValueWrite = {
          kind: 'variable',
          name: this.name,
          valueName: resolvedValue.getName(),
        };
      } else if (context.metaValues.getParameter(this.name)) {
        this.lastMetaValueWrite = {
          kind: 'parameter',
          name: this.name,
          valueName: resolvedValue.getName(),
        };
      }

      return true;
    } catch {
      return false;
    }
  }

  override getAteIconName(): string {
    if (this.lastMetaValueWrite?.kind === 'variable') {
      return 'sigma_ATE.gif';
    }

    return this.name === '#' ? '#_ATE.gif' : 'a_ATE.gif';
  }

  override getAteLabel(): string {
    if (this.lastMetaValueWrite?.kind === 'variable') {
      return `[${this.lastMetaValueWrite.name} = ${this.lastMetaValueWrite.valueName}]`;
    }

    if (this.lastMetaValueWrite?.kind === 'parameter') {
      return `${this.lastMetaValueWrite.name} = ${this.lastMetaValueWrite.valueName}`;
    }

    return super.getAteLabel();
  }
}
