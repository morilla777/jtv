import { Link } from '../core/link';
import { type Autolink } from '../core/autolink';
import { type MachineNode } from '../core/machine-node';
import { type AteNode } from './ate-node';

export class AteTraceRecorder {
  private nextEntryId = 1;
  private readonly showTapeIndexes: boolean;

  readonly root: AteNode;

  constructor(machineName: string, options: { showTapeIndexes?: boolean } = {}) {
    this.showTapeIndexes = options.showTapeIndexes ?? false;
    this.root = {
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

  private createEntryId(prefix: string): string {
    const id = `${prefix}-${this.nextEntryId}`;
    this.nextEntryId++;

    return id;
  }

  private getIconSrc(fileName: string): string {
    return `assets/images/${encodeURIComponent(fileName)}`;
  }
}
