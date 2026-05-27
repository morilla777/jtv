import { type AteNodeKind } from './ate-node-kind';

export interface AteNode {
  readonly id: string;
  readonly label: string;
  readonly iconSrc: string;
  readonly kind: AteNodeKind;
  readonly machineNodeId?: string;
  readonly linkId?: string;
  readonly children: AteNode[];
}
