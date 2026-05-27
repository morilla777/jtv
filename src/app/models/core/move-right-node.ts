import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';

export class MoveRightNode extends AbstractMachineNode {
  constructor(
    id: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, 'R', tapeIndex, isInitial);
  }

  execute(context: ExecutionContext): boolean {
    const tape = context.tapes[this.tapeIndex];

    if (!tape) {
      return false;
    }

    return tape.moveRight();
  }

  override getAteIconName(): string {
    return 'R_ATE.gif';
  }

  override getAteLabel(): string {
    return '';
  }
}
