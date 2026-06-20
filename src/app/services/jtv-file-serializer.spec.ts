import { describe, expect, it } from 'vitest';

import { Autolink } from '../models/core/autolink';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { LinkCondition } from '../models/core/link-condition';
import { Link } from '../models/core/link';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineNode } from '../models/core/machine-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { SubmachineNode } from '../models/core/submachine-node';
import { WriterNode } from '../models/core/writer-node';
import { MachineGraphView } from '../models/view';
import {
  createJtvFileFromState,
  JTV_FILE_FORMAT,
  JTV_FILE_VERSION,
  restoreMachineFromJtvFile,
  type JtvFile,
} from './jtv-file-serializer';

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
    expect(file.tapeCount).toBe(1);
    expect(file.metaValues).toEqual({
      variables: ['sigma'],
      parameters: ['A', 'B'],
    });
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
    expect(restored.metaValues).toEqual({
      variables: ['sigma'],
      parameters: ['A', 'B'],
    });
    expect(restored.tapeCount).toBe(1);
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
    expect(restored.machineGraphView.nodes.map((node) => node.tapeIndex)).toEqual([0, 0, 0]);
    expect(restored.machineGraphView.links.map((link) => link.label)).toEqual(['[sigma = a,B]', '[not #]']);
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

  it('persists and restores the exact target node of a direct link', () => {
    const sourceNode = new WriterNode('source-write', 'a', 0, true);
    const sourceGroup = new LinearMachineGroup('source-group', sourceNode, sourceNode);
    const targetNodes = linkNodes([
      new WriterNode('target-initial', 'x', 0, true),
      new WriterNode('target-destination', 'y', 0),
    ]);
    const targetGroup = new LinearMachineGroup('target-group', targetNodes[0], targetNodes[1]);
    const graph: MachineGraph = {
      groups: [sourceGroup, targetGroup],
      links: [new Link('link-to-node', sourceGroup, targetGroup, null, targetNodes[1])],
      autolinks: [],
      initialGroupId: sourceGroup.id,
    };
    const view: MachineGraphView = {
      groups: [
        { groupId: sourceGroup.id, label: 'a', position: { x: 10, y: 20 }, width: 28, height: 32 },
        { groupId: targetGroup.id, label: 'xy', position: { x: 100, y: 20 }, width: 48, height: 32 },
      ],
      nodes: [
        { nodeId: sourceNode.id, groupId: sourceGroup.id, label: sourceNode.name, position: { x: 10, y: 20 } },
        { nodeId: targetNodes[0].id, groupId: targetGroup.id, label: targetNodes[0].name, position: { x: 100, y: 20 } },
        { nodeId: targetNodes[1].id, groupId: targetGroup.id, label: targetNodes[1].name, position: { x: 120, y: 20 } },
      ],
      links: [{
        linkId: 'link-to-node',
        kind: 'direct',
        sourceGroupId: sourceGroup.id,
        targetGroupId: targetGroup.id,
        targetNodeId: targetNodes[1].id,
      }],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'machine-a', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    }, { preserveIds: true });
    const restored = restoreMachineFromJtvFile(file);

    expect(file.graph.links[0].targetNodeId).toBe('target-destination');
    expect(restored.machineGraph.links[0].targetNode?.id).toBe('target-destination');
    expect(restored.machineGraphView.links[0].targetNodeId).toBe('target-destination');
  });

  it('infers a direct link target node from old files without targetNodeId', () => {
    const file: JtvFile = {
      format: JTV_FILE_FORMAT,
      version: JTV_FILE_VERSION,
      machine: { id: 'machine-a', name: 'NUEVA' },
      parameterAssignments: {},
      metaValues: { variables: [], parameters: [] },
      tapeCount: 1,
      graph: {
        initialGroupId: 'source-group',
        groups: [
          { id: 'source-group', nodeIds: ['source-write'] },
          { id: 'target-group', nodeIds: ['target-initial', 'target-destination'] },
        ],
        nodes: [
          { id: 'source-write', type: 'writer', name: 'a', tapeIndex: 0, isInitial: true },
          { id: 'target-initial', type: 'writer', name: 'x', tapeIndex: 0, isInitial: true },
          { id: 'target-destination', type: 'writer', name: 'y', tapeIndex: 0, isInitial: false },
        ],
        links: [{
          id: 'old-link',
          sourceGroupId: 'source-group',
          targetGroupId: 'target-group',
          condition: null,
        }],
        autolinks: [],
      },
      view: {
        groups: [
          { groupId: 'source-group', label: 'a', position: { x: 10, y: 20 }, width: 28, height: 32 },
          { groupId: 'target-group', label: 'xy', position: { x: 100, y: 20 }, width: 48, height: 32 },
        ],
        nodes: [
          { nodeId: 'source-write', groupId: 'source-group', label: 'a', position: { x: 10, y: 20 } },
          { nodeId: 'target-initial', groupId: 'target-group', label: 'x', position: { x: 100, y: 20 } },
          { nodeId: 'target-destination', groupId: 'target-group', label: 'y', position: { x: 140, y: 20 } },
        ],
        links: [{
          linkId: 'old-link',
          kind: 'direct',
          sourceGroupId: 'source-group',
          targetGroupId: 'target-group',
          points: [{ x: 38, y: 10 }, { x: 135, y: 10 }],
        }],
      },
    };

    const restored = restoreMachineFromJtvFile(file);

    expect(restored.machineGraph.links[0].targetNode?.id).toBe('target-destination');
  });

  it('persists and restores the required tape count', () => {
    const node = new WriterNode('write-z', 'z', 1, true);
    const group = new LinearMachineGroup('group-z', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [new Link('link-z', group, group, new LinkCondition([{ tapeIndex: 1, acceptedValues: ['z'] }]))],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'z', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{ nodeId: node.id, groupId: group.id, label: node.name, position: { x: 10, y: 20 }, tapeIndex: 1 }],
      links: [{ linkId: 'link-z', kind: 'direct', sourceGroupId: group.id, targetGroupId: group.id }],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    });
    const restored = restoreMachineFromJtvFile(file);

    expect(file.tapeCount).toBe(2);
    expect(restored.tapeCount).toBe(2);
  });

  it('drops explicitly declared parameters when they are not referenced by the graph', () => {
    const node = new WriterNode('write-a', 'a', 0, true);
    const group = new LinearMachineGroup('group-a', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'a', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{ nodeId: node.id, groupId: group.id, label: node.name, position: { x: 10, y: 20 } }],
      links: [],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
      metaValues: {
        variables: ['σ'],
        parameters: ['C'],
      },
    });
    const restored = restoreMachineFromJtvFile(file);

    expect(file.metaValues).toEqual({
      variables: ['σ'],
      parameters: [],
    });
    expect(restored.metaValues).toEqual(file.metaValues);
  });

  it('persists and restores preinstalled submachine nodes', () => {
    const node = new SubmachineNode('search-left', 'buscadora_l', 'BUSCADORA_L', 'L', 'A', { A: '#' }, 0, true);
    const group = new LinearMachineGroup('group-search-left', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'L', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{
        nodeId: node.id,
        groupId: group.id,
        kind: 'submachine',
        label: node.name,
        subscriptLabel: '#',
        position: { x: 10, y: 20 },
      }],
      links: [],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    });
    const restored = restoreMachineFromJtvFile(file);
    const restoredNode = restored.machineGraph.groups[0].entry;

    expect(file.graph.nodes[0]).toEqual(expect.objectContaining({
      type: 'submachine',
      submachineId: 'buscadora_l',
      submachineName: 'BUSCADORA_L',
      displaySymbol: 'L',
      parameterName: 'A',
      submachineParameterAssignments: { A: '#' },
    }));
    expect(file.metaValues.parameters).toEqual([]);
    expect(restoredNode).toBeInstanceOf(SubmachineNode);
    expect(restored.machineGraphView.nodes[0].subscriptLabel).toBe('#');
  });

  it('persists and restores inverse preinstalled submachine nodes', () => {
    const node = new SubmachineNode('search-right-inverse', 'buscadora_not_r', 'BUSCADORA_NOT_R', 'R', 'A', { A: '#' }, 0, true);
    const group = new LinearMachineGroup('group-search-right-inverse', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'R', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{
        nodeId: node.id,
        groupId: group.id,
        kind: 'submachine',
        label: node.name,
        subscriptLabel: '#',
        position: { x: 10, y: 20 },
      }],
      links: [],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    });
    const restored = restoreMachineFromJtvFile(file);
    const restoredNode = restored.machineGraph.groups[0].entry;

    expect(file.graph.nodes[0]).toEqual(expect.objectContaining({
      type: 'submachine',
      submachineId: 'buscadora_not_r',
      submachineName: 'BUSCADORA_NOT_R',
      displaySymbol: 'R',
      parameterName: 'A',
      submachineParameterAssignments: { A: '#' },
    }));
    expect(restoredNode).toBeInstanceOf(SubmachineNode);
    expect(restored.machineGraphView.nodes[0].subscriptLabel).toBe('#');
    expect(restored.machineGraphView.nodes[0].subscriptOverline).toBe(true);
  });

  it('persists and restores shift preinstalled submachine nodes', () => {
    const node = new SubmachineNode('shift-left', 'shift_l', 'SHIFT_L', 'S', '', {}, 0, true, 'L');
    const group = new LinearMachineGroup('group-shift-left', node, node);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const view: MachineGraphView = {
      groups: [{ groupId: group.id, label: 'S', position: { x: 10, y: 20 }, width: 28, height: 32 }],
      nodes: [{
        nodeId: node.id,
        groupId: group.id,
        kind: 'submachine',
        label: node.name,
        subscriptLabel: 'L',
        position: { x: 10, y: 20 },
      }],
      links: [],
    };

    const file = createJtvFileFromState({
      selectedMachine: { id: 'new', name: 'NUEVA' },
      machineGraph: graph,
      machineGraphView: view,
      parameterAssignments: {},
    });
    const restored = restoreMachineFromJtvFile(file);
    const restoredNode = restored.machineGraph.groups[0].entry;

    expect(file.graph.nodes[0]).toEqual(expect.objectContaining({
      type: 'submachine',
      submachineId: 'shift_l',
      submachineName: 'SHIFT_L',
      displaySymbol: 'S',
      parameterName: '',
      submachineParameterAssignments: {},
      displaySubscriptLabel: 'L',
    }));
    expect(restoredNode).toBeInstanceOf(SubmachineNode);
    expect(restoredNode?.getAteLabel()).toBe('SHIFT_L()');
    expect(restored.machineGraphView.nodes[0].subscriptLabel).toBe('L');
  });

  it('persists custom submachines recursively', () => {
    const childFile = createJtvFileFromState(createEmptyFileSource('child-machine', 'CHILD'));
    const parentFile = createJtvFileFromState({
      ...createEmptyFileSource('parent-machine', 'PARENT'),
      submachines: [childFile],
    });
    const restored = restoreMachineFromJtvFile(parentFile);

    expect(parentFile.submachines?.[0].machine.name).toBe('CHILD');
    expect(restored.submachines).toHaveLength(1);
    expect(restored.submachines[0].machine.name).toBe('CHILD');
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

function createEmptyFileSource(id: string, name: string): Parameters<typeof createJtvFileFromState>[0] {
  return {
    selectedMachine: { id, name },
    machineGraph: {
      groups: [],
      links: [],
      autolinks: [],
      initialGroupId: '',
    },
    machineGraphView: {
      groups: [],
      nodes: [],
      links: [],
    },
    parameterAssignments: {},
  };
}
