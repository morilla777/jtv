import { Link } from '../core/link';
import { type Autolink } from '../core/autolink';
import { type MachineNode } from '../core/machine-node';
import { type AteContinuationSnapshot, type AteNode } from './ate-node';

export class AteTraceRecorder {
  private nextEntryId: number;
  private readonly showTapeIndexes: boolean;

  readonly root: AteNode;

  constructor(machineName: string, options: { root?: AteNode; showTapeIndexes?: boolean; nextEntryId?: number } = {}) {
    this.showTapeIndexes = options.showTapeIndexes ?? false;
    this.nextEntryId = options.nextEntryId ?? 1;
    this.root = options.root ?? {
      id: 'ate-root',
      label: machineName,
      iconSrc: this.getIconSrc('ATE_ATE.gif'),
      kind: 'root',
      children: [],
    };
  }

  recordMachineNode(node: MachineNode): void {
    this.root.children.push({
      id: this.createEntryId('node'),
      label: node.getAteLabel(),
      iconSrc: this.getIconSrc(node.getAteIconName()),
      kind: 'machine-node',
      machineNodeId: node.id,
      children: [],
    });
  }

  recordLink(link: Link | Autolink): void {
    this.root.children.push({
      id: this.createEntryId('link'),
      label: link.getAteLabel(this.showTapeIndexes),
      iconSrc: this.getIconSrc(link.getAteIconName()),
      kind: 'link',
      linkId: link.id,
      children: [],
    });
  }

  recordStop(): void {
    this.root.children.push({
      id: this.createEntryId('stop'),
      label: '',
      iconSrc: this.getIconSrc('stop_ATE.gif'),
      kind: 'stop',
      children: [],
    });
  }

  recordExpand(continuation: AteContinuationSnapshot): void {
    this.root.children.push({
      id: this.createEntryId('expand'),
      label: '',
      iconSrc: this.getIconSrc('expand_ATE.gif'),
      kind: 'expand',
      continuation,
      children: [],
    });
  }

  private createEntryId(prefix: string): string {
    const id = `${prefix}-${this.nextEntryId}`;
    this.nextEntryId++;

    return id;
  }

  private getIconSrc(fileName: string): string {
    return `assets/images/${encodeURIComponent(fileName)}`;
  }
}
