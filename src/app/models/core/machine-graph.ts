import { Link } from './link';
import { MachineGroup } from './machine-group';

export interface MachineGraph {
  groups: MachineGroup[];
  links: Link[];
  initialGroupId: string;
}
