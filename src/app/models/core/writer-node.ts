import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';
import { SymbolValue } from './symbol-value';

export class WriterNode extends AbstractMachineNode {
  private lastVariableWrite: { variableName: string; valueName: string } | null = null;

  constructor(
    id: string,
    name: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, name, tapeIndex, isInitial);
  }

  execute(context: ExecutionContext): boolean {
    this.lastVariableWrite = null;
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
        this.lastVariableWrite = {
          variableName: this.name,
          valueName: resolvedValue.getName(),
        };
      }

      return true;
    } catch {
      return false;
    }
  }

  override getAteIconName(): string {
    if (this.lastVariableWrite) {
      return 'sigma_ATE.gif';
    }

    return this.name === '#' ? '#_ATE.gif' : 'a_ATE.gif';
  }

  override getAteLabel(): string {
    if (this.lastVariableWrite) {
      return `[${this.lastVariableWrite.variableName} = ${this.lastVariableWrite.valueName}]`;
    }

    return super.getAteLabel();
  }
}
