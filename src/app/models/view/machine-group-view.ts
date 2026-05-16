import { ViewPoint } from './view-point';

export interface MachineGroupView {
  readonly groupId: string;
  readonly label?: string;
  readonly position: ViewPoint;
  readonly width?: number;
  readonly height?: number;
  readonly selected?: boolean;
}
