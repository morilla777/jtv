import { MachineGroupView } from './machine-group-view';
import { MachineLinkView } from './machine-link-view';
import { MachineNodeView } from './machine-node-view';

export interface MachineGraphView {
  readonly groups: readonly MachineGroupView[];
  readonly nodes: readonly MachineNodeView[];
  readonly links: readonly MachineLinkView[];
}
