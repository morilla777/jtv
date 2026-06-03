import { AteTraceRenderable } from './ate-trace-renderable';
import { ExecutionContext } from './execution-context';
import { LinkCondition } from './link-condition';
import { MachineNode } from './machine-node';

export class Autolink implements AteTraceRenderable {
  constructor(
    public readonly id: string,
    public node: MachineNode | null,
    public condition: LinkCondition | null = null,
  ) {}

  canTraverse(context: ExecutionContext): boolean {
    if (!this.condition) {
      return true;
    }

    return this.condition.evaluate(context).success;
  }

  getAteIconName(): string {
    return 'autolink_ATE.gif';
  }

  getAteLabel(): string {
    return this.condition?.getAteLabel() ?? '';
  }
}
