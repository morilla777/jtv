import { ViewPoint } from './view-point';

export interface MachineNodeView {
  readonly nodeId: string;
  readonly groupId: string;
  readonly kind?: 'text' | 'parameter' | 'hub' | 'submachine';
  readonly label: string;
  readonly subscriptLabel?: string;
  readonly tapeIndex?: number;
  readonly initial?: boolean;
  readonly position: ViewPoint;
  readonly width?: number;
  readonly height?: number;
  readonly selected?: boolean;
  readonly canvasSelected?: boolean;
}
