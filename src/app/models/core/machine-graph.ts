import { Autolink } from './autolink';
import { Link } from './link';
import { MachineGroup } from './machine-group';

export interface MachineGraph {
  groups: MachineGroup[];
  links: Link[];
  autolinks?: Autolink[];
  initialGroupId: string;
}
