import { AteTraceRenderable } from './ate-trace-renderable';
import { ExecutionContext } from './execution-context';
import { LinkCondition } from './link-condition';
import { MachineGroup } from './machine-group';
import { MachineNode } from './machine-node';

export class Link implements AteTraceRenderable {
  constructor(
    public readonly id: string,
    public sourceGroup: MachineGroup | null,
    public targetGroup: MachineGroup | null,
    public condition: LinkCondition | null = null,
    public targetNode: MachineNode | null = null,
  ) {}

  canTraverse(context: ExecutionContext): boolean {
    if (!this.condition) {
      return true;
    }

    return this.condition.evaluate(context).success;
  }

  getAteIconName(): string {
    return 'link_ATE.gif';
  }

  getAteLabel(showTapeIndex: boolean = false): string {
    return this.condition?.getAteLabel(showTapeIndex) ?? '';
  }
}
