import { type AteNodeKind } from './ate-node-kind';
import { type TapeSnapshot } from '../core/tape';

export interface AteNode {
  readonly id: string;
  readonly label: string;
  readonly iconSrc: string;
  readonly kind: AteNodeKind;
  readonly machineNodeId?: string;
  readonly linkId?: string;
  readonly tapeSnapshots?: readonly TapeSnapshot[];
  readonly children: AteNode[];
}
