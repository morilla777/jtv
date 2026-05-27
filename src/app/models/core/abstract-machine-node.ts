import { ExecutionContext } from './execution-context';
import { MachineNode } from './machine-node';

export abstract class AbstractMachineNode implements MachineNode {
  previous: MachineNode | null = null;
  next: MachineNode | null = null;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tapeIndex: number,
    public isInitial: boolean = false,
  ) {}

  abstract execute(context: ExecutionContext): boolean;

  getAteIconName(): string {
    return 'a_ATE.gif';
  }

  getAteLabel(): string {
    return this.name;
  }

  setNext(node: MachineNode | null): void {
    this.next = node;

    if (node) {
      node.previous = this;
    }
  }

  setPrevious(node: MachineNode | null): void {
    this.previous = node;
  }
}
