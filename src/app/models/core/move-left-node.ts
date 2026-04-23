import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';

export class MoveLeftNode extends AbstractMachineNode {
  constructor(
    id: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, 'L', tapeIndex, isInitial);
  }

  execute(context: ExecutionContext): boolean {
    const tape = context.tapes[this.tapeIndex];

    if (!tape) {
      return false;
    }

    return tape.moveLeft();
  }
}
