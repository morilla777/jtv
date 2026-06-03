import { AbstractMachineNode } from './abstract-machine-node';
import { ExecutionContext } from './execution-context';

export class HubNode extends AbstractMachineNode {
  constructor(
    id: string,
    tapeIndex: number,
    isInitial: boolean = false,
  ) {
    super(id, '', tapeIndex, isInitial);
  }

  execute(_context: ExecutionContext): boolean {
    return true;
  }

  override getAteIconName(): string {
    return 'hub_ATE.gif';
  }

  override getAteLabel(): string {
    return '';
  }
}
