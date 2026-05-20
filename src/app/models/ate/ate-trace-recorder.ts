import { Link } from '../core/link';
import { LinkCondition } from '../core/link-condition';
import { type ExecutionContext } from '../core/execution-context';
import { type MachineNode } from '../core/machine-node';
import { type AteNode } from './ate-node';

export class AteTraceRecorder {
  private nextEntryId = 1;

  readonly root: AteNode;

  constructor(machineName: string) {
    this.root = {
      id: 'ate-root',
      label: `ATE ${machineName}`,
      iconSrc: this.getIconSrc('ATE_ATE.gif'),
      kind: 'root',
      children: [],
    };
  }

  recordMachineNode(node: MachineNode, context: ExecutionContext): void {
    this.root.children.push({
      id: this.createEntryId('node'),
      label: this.getMachineNodeLabel(node),
      iconSrc: this.getMachineNodeIconSrc(node),
      kind: 'machine-node',
      machineNodeId: node.id,
      tapeSnapshots: this.createTapeSnapshots(context),
      children: [],
    });
  }

  recordLink(link: Link, context: ExecutionContext): void {
    this.root.children.push({
      id: this.createEntryId('link'),
      label: this.formatLinkCondition(link.condition),
      iconSrc: this.getIconSrc('link_ATE.gif'),
      kind: 'link',
      linkId: link.id,
      tapeSnapshots: this.createTapeSnapshots(context),
      children: [],
    });
  }

  recordStop(context?: ExecutionContext): void {
    this.root.children.push({
      id: this.createEntryId('stop'),
      label: '',
      iconSrc: this.getIconSrc('stop_ATE.gif'),
      kind: 'stop',
      tapeSnapshots: context ? this.createTapeSnapshots(context) : undefined,
      children: [],
    });
  }

  private createEntryId(prefix: string): string {
    const id = `${prefix}-${this.nextEntryId}`;
    this.nextEntryId++;

    return id;
  }

  private getMachineNodeIconSrc(node: MachineNode): string {
    if (node.name === 'L') {
      return this.getIconSrc('L_ATE.gif');
    }

    if (node.name === 'R') {
      return this.getIconSrc('R_ATE.gif');
    }

    if (node.name === '#') {
      return this.getIconSrc('#_ATE.gif');
    }

    return this.getIconSrc('a_ATE.gif');
  }

  private getMachineNodeLabel(node: MachineNode): string {
    return node.name === 'L' || node.name === 'R' ? '' : node.name;
  }

  private formatLinkCondition(condition: LinkCondition | null): string {
    if (!condition || condition.clauses.length === 0) {
      return '[1]';
    }

    const [clause] = condition.clauses;

    if (condition.clauses.length === 1 && clause.acceptedValues.length === 1) {
      return clause.negated ? `[not ${clause.acceptedValues[0]}]` : `[${clause.acceptedValues[0]}]`;
    }

    return condition.clauses
      .map((item) => {
        const values = item.acceptedValues.join(',');

        return item.negated ? `not ${values}` : values;
      })
      .join(' & ');
  }

  private getIconSrc(fileName: string): string {
    return `assets/images/${encodeURIComponent(fileName)}`;
  }

  private createTapeSnapshots(context: ExecutionContext) {
    return context.tapes.map((tape) => {
      const snapshot = tape.getSnapshot();

      return {
        headPosition: snapshot.headPosition,
        cells: { ...snapshot.cells },
      };
    });
  }
}
