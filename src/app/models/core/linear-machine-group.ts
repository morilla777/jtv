import { MachineGroup } from './machine-group';
import { MachineNode } from './machine-node';

export class LinearMachineGroup implements MachineGroup {
  constructor(
    public readonly id: string,
    public entry: MachineNode | null,
    public exit: MachineNode | null,
  ) {}
}
