import { Autolink } from '../models/core/autolink';
import { HubNode } from '../models/core/hub-node';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { LinkCondition, type ReadConditionClause } from '../models/core/link-condition';
import { Link } from '../models/core/link';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineGroup } from '../models/core/machine-group';
import { MachineNode } from '../models/core/machine-node';
import { MoveLeftNode } from '../models/core/move-left-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { WriterNode } from '../models/core/writer-node';
import { MachineGraphView } from '../models/view';
import type { JtvMachineState } from '../stores/jtv.store';

export const JTV_FILE_FORMAT = 'jtv-web-machine';
export const JTV_FILE_VERSION = 1;

type PersistedNodeType = 'writer' | 'move-left' | 'move-right' | 'hub';

interface PersistedNode {
  readonly id: string;
  readonly type: PersistedNodeType;
  readonly name: string;
  readonly tapeIndex: number;
  readonly isInitial: boolean;
}

interface PersistedGroup {
  readonly id: string;
  readonly nodeIds: readonly string[];
}

interface PersistedCondition {
  readonly clauses: readonly ReadConditionClause[];
}

interface PersistedLink {
  readonly id: string;
  readonly sourceGroupId: string | null;
  readonly targetGroupId: string | null;
  readonly condition: PersistedCondition | null;
}

interface PersistedAutolink {
  readonly id: string;
  readonly nodeId: string | null;
  readonly condition: PersistedCondition | null;
}

export interface JtvFile {
  readonly format: typeof JTV_FILE_FORMAT;
  readonly version: typeof JTV_FILE_VERSION;
  readonly machine: JtvMachineState;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly graph: {
    readonly initialGroupId: string;
    readonly groups: readonly PersistedGroup[];
    readonly nodes: readonly PersistedNode[];
    readonly links: readonly PersistedLink[];
    readonly autolinks: readonly PersistedAutolink[];
  };
  readonly view: MachineGraphView;
}

export interface JtvFileSource {
  readonly selectedMachine: JtvMachineState;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly parameterAssignments: Readonly<Record<string, string>>;
}

export interface JtvFileSerializerOptions {
  readonly preserveIds?: boolean;
}

export interface RestoredJtvMachine {
  readonly selectedMachine: JtvMachineState;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly parameterAssignments: Readonly<Record<string, string>>;
}

export function createJtvFileFromState(state: JtvFileSource, options: JtvFileSerializerOptions = {}): JtvFile {
  const ids = createPersistenceIdMap(state, options);
  const nodeById = new Map<string, PersistedNode>();
  const groups = state.machineGraph.groups.map((group) => {
    const nodeIds = getGroupNodes(group).map((node) => {
      nodeById.set(ids.nodes.get(node.id) ?? node.id, persistNode(node, ids.nodes));

      return ids.nodes.get(node.id) ?? node.id;
    });

    return {
      id: ids.groups.get(group.id) ?? group.id,
      nodeIds,
    };
  });

  return {
    format: JTV_FILE_FORMAT,
    version: JTV_FILE_VERSION,
    machine: {
      ...state.selectedMachine,
      id: options.preserveIds || isUuid(state.selectedMachine.id) ? state.selectedMachine.id : createUuid(),
    },
    parameterAssignments: { ...state.parameterAssignments },
    graph: {
      initialGroupId: ids.groups.get(state.machineGraph.initialGroupId) ?? state.machineGraph.initialGroupId,
      groups,
      nodes: Array.from(nodeById.values()),
      links: state.machineGraph.links.map((link) => ({
        id: ids.links.get(link.id) ?? link.id,
        sourceGroupId: link.sourceGroup?.id ? ids.groups.get(link.sourceGroup.id) ?? link.sourceGroup.id : null,
        targetGroupId: link.targetGroup?.id ? ids.groups.get(link.targetGroup.id) ?? link.targetGroup.id : null,
        condition: persistCondition(link.condition),
      })),
      autolinks: (state.machineGraph.autolinks ?? []).map((autolink) => ({
        id: ids.links.get(autolink.id) ?? autolink.id,
        nodeId: autolink.node?.id ? ids.nodes.get(autolink.node.id) ?? autolink.node.id : null,
        condition: persistCondition(autolink.condition),
      })),
    },
    view: cloneView(state.machineGraphView, ids),
  };
}

export function restoreMachineFromJtvFile(file: JtvFile): RestoredJtvMachine {
  assertJtvFile(file);

  const nodes = new Map<string, MachineNode>();

  for (const persistedNode of file.graph.nodes) {
    nodes.set(persistedNode.id, restoreNode(persistedNode));
  }

  const groups = file.graph.groups.map((persistedGroup) => {
    const groupNodes = persistedGroup.nodeIds
      .map((nodeId) => nodes.get(nodeId) ?? null)
      .filter((node): node is MachineNode => !!node);

    linkNodes(groupNodes);

    return new LinearMachineGroup(
      persistedGroup.id,
      groupNodes[0] ?? null,
      groupNodes.at(-1) ?? null,
    );
  });
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const links = file.graph.links.map((persistedLink) => new Link(
    persistedLink.id,
    persistedLink.sourceGroupId ? groupsById.get(persistedLink.sourceGroupId) ?? null : null,
    persistedLink.targetGroupId ? groupsById.get(persistedLink.targetGroupId) ?? null : null,
    restoreCondition(persistedLink.condition),
  ));
  const autolinks = file.graph.autolinks.map((persistedAutolink) => new Autolink(
    persistedAutolink.id,
    persistedAutolink.nodeId ? nodes.get(persistedAutolink.nodeId) ?? null : null,
    restoreCondition(persistedAutolink.condition),
  ));

  return {
    selectedMachine: { ...file.machine },
    machineGraph: {
      initialGroupId: file.graph.initialGroupId,
      groups,
      links,
      autolinks,
    },
    machineGraphView: cloneView(file.view),
    parameterAssignments: { ...file.parameterAssignments },
  };
}

function assertJtvFile(file: JtvFile): void {
  if (!file || file.format !== JTV_FILE_FORMAT || file.version !== JTV_FILE_VERSION) {
    throw new Error('Invalid JTV file format.');
  }

  if (!file.graph || !Array.isArray(file.graph.groups) || !Array.isArray(file.graph.nodes)) {
    throw new Error('Invalid JTV graph data.');
  }

  if (!file.view || !Array.isArray(file.view.groups) || !Array.isArray(file.view.nodes) || !Array.isArray(file.view.links)) {
    throw new Error('Invalid JTV view data.');
  }
}

function persistNode(node: MachineNode, nodeIds: ReadonlyMap<string, string>): PersistedNode {
  return {
    id: nodeIds.get(node.id) ?? node.id,
    type: getNodeType(node),
    name: node.name,
    tapeIndex: node.tapeIndex,
    isInitial: node.isInitial,
  };
}

function restoreNode(node: PersistedNode): MachineNode {
  if (node.type === 'move-left') {
    return new MoveLeftNode(node.id, node.tapeIndex, node.isInitial);
  }

  if (node.type === 'move-right') {
    return new MoveRightNode(node.id, node.tapeIndex, node.isInitial);
  }

  if (node.type === 'hub') {
    return new HubNode(node.id, node.tapeIndex, node.isInitial);
  }

  return new WriterNode(node.id, node.name, node.tapeIndex, node.isInitial);
}

function getNodeType(node: MachineNode): PersistedNodeType {
  if (node instanceof MoveLeftNode) {
    return 'move-left';
  }

  if (node instanceof MoveRightNode) {
    return 'move-right';
  }

  if (node instanceof HubNode) {
    return 'hub';
  }

  return 'writer';
}

function persistCondition(condition: LinkCondition | null): PersistedCondition | null {
  return condition
    ? {
      clauses: condition.clauses.map((clause) => ({
        tapeIndex: clause.tapeIndex,
        acceptedValues: [...clause.acceptedValues],
        negated: clause.negated,
        assignToVariableName: clause.assignToVariableName,
      })),
    }
    : null;
}

function restoreCondition(condition: PersistedCondition | null): LinkCondition | null {
  if (!condition?.clauses.length) {
    return null;
  }

  return new LinkCondition(condition.clauses.map((clause) => ({
    tapeIndex: clause.tapeIndex,
    acceptedValues: [...clause.acceptedValues],
    negated: clause.negated,
    assignToVariableName: clause.assignToVariableName,
  })));
}

function getGroupNodes(group: MachineGroup): MachineNode[] {
  const nodes: MachineNode[] = [];
  const visitedNodeIds = new Set<string>();
  let current = group.entry;

  while (current && !visitedNodeIds.has(current.id)) {
    visitedNodeIds.add(current.id);
    nodes.push(current);

    if (current.id === group.exit?.id) {
      break;
    }

    current = current.next;
  }

  return nodes;
}

function linkNodes(nodes: readonly MachineNode[]): void {
  for (const node of nodes) {
    node.previous = null;
    node.next = null;
  }

  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }
}

function cloneView(view: MachineGraphView, ids?: PersistenceIdMap): MachineGraphView {
  return {
    groups: view.groups.map((group) => ({
      ...group,
      groupId: ids?.groups.get(group.groupId) ?? group.groupId,
      position: { ...group.position },
    })),
    nodes: view.nodes.map((node) => ({
      ...node,
      nodeId: ids?.nodes.get(node.nodeId) ?? node.nodeId,
      groupId: ids?.groups.get(node.groupId) ?? node.groupId,
      position: { ...node.position },
      selected: undefined,
      canvasSelected: undefined,
    })),
    links: view.links.map((link) => ({
      ...link,
      linkId: ids?.links.get(link.linkId) ?? link.linkId,
      sourceGroupId: ids?.groups.get(link.sourceGroupId) ?? link.sourceGroupId,
      targetGroupId: ids?.groups.get(link.targetGroupId) ?? link.targetGroupId,
      points: link.points?.map((point) => ({ ...point })),
      selected: undefined,
      canvasSelected: undefined,
    })),
  };
}

interface PersistenceIdMap {
  readonly groups: ReadonlyMap<string, string>;
  readonly nodes: ReadonlyMap<string, string>;
  readonly links: ReadonlyMap<string, string>;
}

function createPersistenceIdMap(state: JtvFileSource, options: JtvFileSerializerOptions): PersistenceIdMap {
  const usedIds = new Set<string>();
  const groups = new Map<string, string>();
  const nodes = new Map<string, string>();
  const links = new Map<string, string>();

  for (const group of state.machineGraph.groups) {
    groups.set(group.id, options.preserveIds ? group.id : getUuidForPersistence(group.id, usedIds));

    for (const node of getGroupNodes(group)) {
      nodes.set(node.id, options.preserveIds ? node.id : getUuidForPersistence(node.id, usedIds));
    }
  }

  for (const link of state.machineGraph.links) {
    links.set(link.id, options.preserveIds ? link.id : getUuidForPersistence(link.id, usedIds));
  }

  for (const autolink of state.machineGraph.autolinks ?? []) {
    links.set(autolink.id, options.preserveIds ? autolink.id : getUuidForPersistence(autolink.id, usedIds));
  }

  return { groups, nodes, links };
}

function getUuidForPersistence(id: string, usedIds: Set<string>): string {
  if (isUuid(id) && !usedIds.has(id)) {
    usedIds.add(id);
    return id;
  }

  let uuid = createUuid();

  while (usedIds.has(uuid)) {
    uuid = createUuid();
  }

  usedIds.add(uuid);
  return uuid;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (placeholder) => {
    const value = Math.floor(Math.random() * 16);
    const digit = placeholder === 'x' ? value : (value & 0x3) | 0x8;

    return digit.toString(16);
  });
}
