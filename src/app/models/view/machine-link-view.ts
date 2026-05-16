import { ViewPoint } from './view-point';

export interface MachineLinkView {
  readonly linkId: string;
  readonly label?: string;
  readonly sourceGroupId: string;
  readonly targetGroupId: string;
  readonly points?: readonly ViewPoint[];
  readonly selected?: boolean;
}
