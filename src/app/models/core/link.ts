import { ExecutionContext } from './execution-context';
import { LinkCondition } from './link-condition';
import { MachineGroup } from './machine-group';

export class Link {
  constructor(
    public readonly id: string,
    public sourceGroup: MachineGroup | null,
    public targetGroup: MachineGroup | null,
    public condition: LinkCondition | null = null,
  ) {}

  canTraverse(context: ExecutionContext): boolean {
    if (!this.condition) {
      return true;
    }

    return this.condition.evaluate(context).success;
  }
}
