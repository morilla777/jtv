import { MachineNode } from './machine-node';

export interface MachineGroup {
  id: string;
  entry: MachineNode | null;
  exit: MachineNode | null;
}
