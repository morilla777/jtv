import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';
import { SymbolValue } from './symbol-value';

export class WriterNode extends AbstractMachineNode {
  constructor(
    id: string,
    name: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, name, tapeIndex, isInitial);
  }

  execute(context: ExecutionContext): boolean {
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
      tape.write(metaValue.resolve());
      return true;
    } catch {
      return false;
    }
  }
}
