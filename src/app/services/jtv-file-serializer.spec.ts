import { describe, expect, it } from 'vitest';

import { Autolink } from '../models/core/autolink';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { LinkCondition } from '../models/core/link-condition';
import { Link } from '../models/core/link';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineNode } from '../models/core/machine-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { WriterNode } from '../models/core/writer-node';
import { MachineGraphView } from '../models/view';
import { createJtvFileFromState, restoreMachineFromJtvFile } from './jtv-file-serializer';

describe('JTV file serializer', () => {
  it('restores domain objects and graph layout from a saved machine file', () => {
    const nodes = linkNodes([
      new WriterNode('write-a', 'A', 0, true),
      new MoveRightNode('move-right', 0),
      new WriterNode('write-b', 'b', 0),
    ]);
    const group = new LinearMachineGroup('group-1', nodes[0], nodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [group],
      links: [
        new Link(
          'link-1',
          group,
          group,
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['a', 'B'], assignToVariableName: 'sigma' }]),
        ),
      ],
      autolinks: [
        new Autolink(
          'autolink-1',
          nodes[2],
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['#'], negated: true }]),
        ),
      ],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'ARb', position: { x: 10, y: 20 }, width: 60, height: 32 }],
      nodes: nodes.map((node, index) => ({
        nodeId: node.id,
        groupId: group.id,
        label: node.name,
        kind: node.name === 'A' ? 'parameter' : 'text',
        initial: node.isInitial,
        position: { x: 10 + index * 20, y: 20 },
      })),
      links: [
        {
          linkId: 'link-1',
          label: '[sigma = a,B]',
          kind: 'direct',
          sourceGroupId: group.id,
          targetGroupId: group.id,
          points: [{ x: 70, y: 10 }, { x: 90, y: 30 }, { x: 10, y: 10 }],
        },
        {
          linkId: 'autolink-1',
          label: '[not #]',
          kind: 'autolink',
          autolinkOrientation: 'right',
          sourceGroupId: group.id,
          targetGroupId: group.id,
          points: [{ x: 50, y: 20 }],
        },
      ],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: { A: '3', B: 'b' },
    });
    const restored = restoreMachineFromJtvFile(file);

    expect(file.machine.id).toMatch(UUID_PATTERN);
    expect(file.graph.groups[0].id).toMatch(UUID_PATTERN);
    expect(file.graph.nodes.map((node) => node.id)).toEqual([
      expect.stringMatching(UUID_PATTERN),
      expect.stringMatching(UUID_PATTERN),
      expect.stringMatching(UUID_PATTERN),
    ]);
    expect(file.graph.links[0].id).toMatch(UUID_PATTERN);
    expect(file.graph.autolinks[0].id).toMatch(UUID_PATTERN);
    expect(file.view.groups[0].groupId).toBe(file.graph.groups[0].id);
    expect(file.view.nodes[0].nodeId).toBe(file.graph.nodes[0].id);
    expect(file.view.links[0].linkId).toBe(file.graph.links[0].id);
    expect(restored.selectedMachine.name).toBe('NUEVA');
    expect(restored.parameterAssignments).toEqual({ A: '3', B: 'b' });
    expect(restored.machineGraph.groups[0].entry).toBeInstanceOf(WriterNode);
    expect(restored.machineGraph.groups[0].entry?.next).toBeInstanceOf(MoveRightNode);
    expect(restored.machineGraph.groups[0].exit?.previous).toBeInstanceOf(MoveRightNode);
    expect(restored.machineGraph.links[0].sourceGroup).toBe(restored.machineGraph.groups[0]);
    expect(restored.machineGraph.links[0].condition?.clauses[0]).toEqual({
      tapeIndex: 0,
      acceptedValues: ['a', 'B'],
      assignToVariableName: 'sigma',
    });
    expect(restored.machineGraph.autolinks?.[0].node).toBe(restored.machineGraph.groups[0].exit);
    expect(restored.machineGraphView.links[0].points).toEqual(view.links[0].points);
  });

  it('can preserve IDs for in-memory history snapshots', () => {
    const node = new WriterNode('write-a', 'a', 0, true);
    const group = new LinearMachineGroup('group-a', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [new Link('link-a', group, group)],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'a', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{ nodeId: node.id, groupId: group.id, label: node.name, position: { x: 10, y: 20 } }],
      links: [{ linkId: 'link-a', kind: 'direct', sourceGroupId: group.id, targetGroupId: group.id }],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'machine-a', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    }, { preserveIds: true });

    expect(file.machine.id).toBe('machine-a');
    expect(file.graph.groups[0].id).toBe('group-a');
    expect(file.graph.nodes[0].id).toBe('write-a');
    expect(file.graph.links[0].id).toBe('link-a');
    expect(file.view.nodes[0].nodeId).toBe('write-a');
  });
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function linkNodes<T extends MachineNode>(nodes: T[]): T[] {
  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }

  return nodes;
}
