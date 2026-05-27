import { ViewPoint } from './view-point';

export type MachineLinkKind = 'direct' | 'autolink';
export type AutolinkOrientation = 'top' | 'bottom' | 'left' | 'right';

export interface MachineLinkView {
  readonly linkId: string;
  readonly label?: string;
  readonly kind?: MachineLinkKind;
  readonly autolinkOrientation?: AutolinkOrientation;
  readonly sourceGroupId: string;
  readonly targetGroupId: string;
  readonly points?: readonly ViewPoint[];
  readonly selected?: boolean;
  readonly canvasSelected?: boolean;
}
