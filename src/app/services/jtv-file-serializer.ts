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
import { SymbolValue } from '../models/core/symbol-value';
import { SubmachineNode } from '../models/core/submachine-node';
import { WriterNode } from '../models/core/writer-node';
import { Tape } from '../models/core/tape';
import { MachineGraphView, ViewPoint } from '../models/view';
import type { JtvMachineState, JtvTapeState } from '../stores/jtv.store';

export const JTV_FILE_FORMAT = 'jtv-web-machine';
export const JTV_FILE_VERSION = 2;

type PersistedNodeType = 'writer' | 'move-left' | 'move-right' | 'hub' | 'submachine';

interface PersistedNode {
  readonly id: string;
  readonly type: PersistedNodeType;
  readonly name: string;
  readonly tapeIndex: number;
  readonly isInitial: boolean;
  readonly submachineId?: string;
  readonly submachineName?: string;
  readonly displaySymbol?: string;
  readonly parameterName?: string;
  readonly submachineParameterAssignments?: Readonly<Record<string, string>>;
  readonly displaySubscriptLabel?: string;
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
  readonly targetNodeId?: string | null;
  readonly condition: PersistedCondition | null;
}

interface PersistedAutolink {
  readonly id: string;
  readonly nodeId: string | null;
  readonly condition: PersistedCondition | null;
}

export interface JtvMetaValues {
  readonly variables: readonly string[];
  readonly parameters: readonly string[];
}

export interface JtvFile {
  readonly format: typeof JTV_FILE_FORMAT;
  readonly version: typeof JTV_FILE_VERSION;
  readonly machine: JtvMachineState;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly metaValues: JtvMetaValues;
  readonly tapeCount: number;
  readonly submachines?: readonly JtvFile[];
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
  readonly metaValues?: JtvMetaValues;
  readonly tapes?: readonly JtvTapeState[];
  readonly submachines?: readonly JtvFile[];
}

export interface JtvFileSerializerOptions {
  readonly preserveIds?: boolean;
  readonly regenerateIds?: boolean;
}

export interface JtvCanvasFragment {
  readonly file: JtvFile;
}

export interface RestoredJtvMachine {
  readonly selectedMachine: JtvMachineState;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly metaValues: JtvMetaValues;
  readonly tapeCount: number;
  readonly submachines: readonly JtvFile[];
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

  const metaValues = collectMetaValues(state.machineGraph, state.parameterAssignments, state.metaValues);

  return {
    format: JTV_FILE_FORMAT,
    version: JTV_FILE_VERSION,
    machine: {
      ...state.selectedMachine,
      id: options.preserveIds || (!options.regenerateIds && isUuid(state.selectedMachine.id))
        ? state.selectedMachine.id
        : createUuid(),
    },
    parameterAssignments: { ...state.parameterAssignments },
    metaValues,
    tapeCount: Math.max(state.tapes?.length ?? 1, inferRequiredTapeCount(state.machineGraph)),
    submachines: state.submachines ?? [],
    graph: {
      initialGroupId: ids.groups.get(state.machineGraph.initialGroupId) ?? state.machineGraph.initialGroupId,
      groups,
      nodes: Array.from(nodeById.values()),
      links: state.machineGraph.links.map((link) => ({
        id: ids.links.get(link.id) ?? link.id,
        sourceGroupId: link.sourceGroup?.id ? ids.groups.get(link.sourceGroup.id) ?? link.sourceGroup.id : null,
        targetGroupId: link.targetGroup?.id ? ids.groups.get(link.targetGroup.id) ?? link.targetGroup.id : null,
        targetNodeId: link.targetNode?.id ? ids.nodes.get(link.targetNode.id) ?? link.targetNode.id : null,
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
  const machineGraphView = cloneView(file.view);
  const links = file.graph.links.map((persistedLink) => new Link(
    persistedLink.id,
    persistedLink.sourceGroupId ? groupsById.get(persistedLink.sourceGroupId) ?? null : null,
    persistedLink.targetGroupId ? groupsById.get(persistedLink.targetGroupId) ?? null : null,
    restoreCondition(persistedLink.condition),
    restoreLinkTargetNode(persistedLink, machineGraphView, nodes, groupsById),
  ));
  const autolinks = file.graph.autolinks.map((persistedAutolink) => new Autolink(
    persistedAutolink.id,
    persistedAutolink.nodeId ? nodes.get(persistedAutolink.nodeId) ?? null : null,
    restoreCondition(persistedAutolink.condition),
  ));

  const linkLabels = new Map([
    ...links.map((link) => [link.id, link.getAteLabel()] as const),
    ...autolinks.map((autolink) => [autolink.id, autolink.getAteLabel()] as const),
  ]);
  const machineGraph = {
    initialGroupId: file.graph.initialGroupId,
    groups,
    links,
    autolinks,
  };
  const parameterAssignments = { ...file.parameterAssignments };
  const metaValues = collectMetaValues(machineGraph, parameterAssignments, file.metaValues);

  return {
    selectedMachine: { ...file.machine },
    machineGraph,
    machineGraphView: {
      ...machineGraphView,
      nodes: machineGraphView.nodes.map((nodeView) => {
        const node = nodes.get(nodeView.nodeId);

        return {
          ...nodeView,
          subscriptLabel: nodeView.subscriptLabel ?? (node instanceof SubmachineNode
            ? node.getParameterDisplayValue()
            : undefined),
          subscriptOverline: node instanceof SubmachineNode ? node.hasNegatedParameterDisplay() : nodeView.subscriptOverline,
          tapeIndex: nodeView.tapeIndex ?? node?.tapeIndex ?? 0,
        };
      }),
      links: machineGraphView.links.map((linkView) => ({
        ...linkView,
        label: linkLabels.get(linkView.linkId) ?? linkView.label,
      })),
    },
    parameterAssignments,
    metaValues,
    tapeCount: file.tapeCount,
    submachines: file.submachines ?? [],
  };
}

export function createJtvCanvasFragment(
  state: JtvFileSource,
  selectedNodeIds: ReadonlySet<string>,
): JtvCanvasFragment | null {
  if (selectedNodeIds.size === 0) {
    return null;
  }

  const file = filterJtvFileNodes(
    createJtvFileFromState(state, { preserveIds: true }),
    selectedNodeIds,
    false,
  );

  return file.graph.nodes.length > 0 ? { file } : null;
}

export function removeJtvCanvasNodes(
  state: JtvFileSource,
  removedNodeIds: ReadonlySet<string>,
): RestoredJtvMachine {
  const file = createJtvFileFromState(state, { preserveIds: true });
  const remainingNodeIds = new Set(
    file.graph.nodes
      .map((node) => node.id)
      .filter((nodeId) => !removedNodeIds.has(nodeId)),
  );

  return restoreMachineFromJtvFile(filterJtvFileNodes(file, remainingNodeIds, true));
}

export function restoreJtvCanvasFragment(
  fragment: JtvCanvasFragment,
  target: ViewPoint,
): RestoredJtvMachine {
  const restored = restoreMachineFromJtvFile(fragment.file);
  const rekeyed = createJtvFileFromState({
    selectedMachine: restored.selectedMachine,
    machineGraph: restored.machineGraph,
    machineGraphView: restored.machineGraphView,
    parameterAssignments: restored.parameterAssignments,
    metaValues: restored.metaValues,
    tapes: Array.from({ length: restored.tapeCount }, (_, index) => ({
      id: `tape-${index + 1}`,
      name: `Cinta ${index + 1}`,
      tape: new Tape(),
    })),
    submachines: restored.submachines,
  }, { regenerateIds: true });
  const anchor = getViewAnchor(rekeyed.view.nodes);
  const delta = {
    x: target.x - anchor.x,
    y: target.y - anchor.y,
  };

  return restoreMachineFromJtvFile({
    ...rekeyed,
    view: {
      groups: rekeyed.view.groups.map((group) => ({
        ...group,
        position: translatePoint(group.position, delta),
      })),
      nodes: rekeyed.view.nodes.map((node) => ({
        ...node,
        position: translatePoint(node.position, delta),
      })),
      links: rekeyed.view.links.map((link) => ({
        ...link,
        points: link.points?.map((point) => translatePoint(point, delta)),
      })),
    },
  });
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

  if (
    !file.metaValues ||
    !Array.isArray(file.metaValues.variables) ||
    !Array.isArray(file.metaValues.parameters) ||
    !Number.isInteger(file.tapeCount) ||
    file.tapeCount < 1
  ) {
    throw new Error('Invalid JTV machine metadata.');
  }
}

function persistNode(node: MachineNode, nodeIds: ReadonlyMap<string, string>): PersistedNode {
  const persistedNode: PersistedNode = {
    id: nodeIds.get(node.id) ?? node.id,
    type: getNodeType(node),
    name: node.name,
    tapeIndex: node.tapeIndex,
    isInitial: node.isInitial,
  };

  return node instanceof SubmachineNode
    ? {
      ...persistedNode,
      submachineId: node.submachineId,
      submachineName: node.submachineName,
      displaySymbol: node.displaySymbol,
      parameterName: node.parameterName,
      submachineParameterAssignments: { ...node.parameterAssignments },
      displaySubscriptLabel: node.displaySubscriptLabel,
    }
    : persistedNode;
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

  if (node.type === 'submachine') {
    return new SubmachineNode(
      node.id,
      node.submachineId ?? 'buscadora_l',
      node.submachineName ?? getDefaultSubmachineName(node.submachineId),
      node.displaySymbol ?? 'L',
      node.parameterName ?? 'A',
      node.submachineParameterAssignments ?? { A: SymbolValue.BLANK },
      node.tapeIndex,
      node.isInitial,
      node.displaySubscriptLabel,
    );
  }

  return new WriterNode(node.id, node.name, node.tapeIndex, node.isInitial);
}

function getDefaultSubmachineName(submachineId: string | undefined): string {
  if (submachineId === 'buscadora_r') {
    return 'BUSCADORA_R';
  }

  if (submachineId === 'buscadora_not_l') {
    return 'BUSCADORA_NOT_L';
  }

  if (submachineId === 'buscadora_not_r') {
    return 'BUSCADORA_NOT_R';
  }

  if (submachineId === 'shift_l') {
    return 'SHIFT_L';
  }

  if (submachineId === 'shift_r') {
    return 'SHIFT_R';
  }

  return 'BUSCADORA_L';
}

function restoreLinkTargetNode(
  link: PersistedLink,
  view: MachineGraphView,
  nodes: ReadonlyMap<string, MachineNode>,
  groupsById: ReadonlyMap<string, MachineGroup>,
): MachineNode | null {
  if (link.targetNodeId) {
    return nodes.get(link.targetNodeId) ?? null;
  }

  if (!link.targetGroupId) {
    return null;
  }

  const linkView = view.links.find((item) => item.linkId === link.id);
  const endPoint = linkView?.points?.at(-1);
  const targetGroup = groupsById.get(link.targetGroupId);

  if (!endPoint || !targetGroup) {
    return targetGroup?.entry ?? null;
  }

  const targetNodeIds = new Set(getGroupNodes(targetGroup).map((node) => node.id));
  const candidateViews = view.nodes.filter((nodeView) =>
    nodeView.groupId === link.targetGroupId && targetNodeIds.has(nodeView.nodeId),
  );

  let bestMatch: { nodeId: string; distance: number } | null = null;

  for (const nodeView of candidateViews) {
    const anchor = getNodeLeftAnchor(nodeView);
    const distance = Math.hypot(anchor.x - endPoint.x, anchor.y - endPoint.y);

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = {
        nodeId: nodeView.nodeId,
        distance,
      };
    }
  }

  return bestMatch ? nodes.get(bestMatch.nodeId) ?? targetGroup.entry : targetGroup.entry;
}

function filterJtvFileNodes(
  file: JtvFile,
  includedNodeIds: ReadonlySet<string>,
  preserveInitialNode: boolean,
): JtvFile {
  const nodeGroupIds = new Map<string, string>();
  const filteredGroups: PersistedGroup[] = [];
  const filteredGroupViews: MachineGraphView['groups'][number][] = [];

  for (const group of file.graph.groups) {
    const runs: string[][] = [];
    let currentRun: string[] = [];

    for (const nodeId of group.nodeIds) {
      if (includedNodeIds.has(nodeId)) {
        currentRun.push(nodeId);
      } else if (currentRun.length > 0) {
        runs.push(currentRun);
        currentRun = [];
      }
    }

    if (currentRun.length > 0) {
      runs.push(currentRun);
    }

    for (let runIndex = 0; runIndex < runs.length; runIndex++) {
      const nodeIds = runs[runIndex];
      const groupId = runIndex === 0 ? group.id : createUuid();
      const nodeViews = file.view.nodes.filter((node) => nodeIds.includes(node.nodeId));
      const originalView = file.view.groups.find((view) => view.groupId === group.id);
      const minX = Math.min(...nodeViews.map((node) => node.position.x));
      const maxX = Math.max(...nodeViews.map((node) => node.position.x + (node.width ?? 20)));

      filteredGroups.push({ id: groupId, nodeIds });
      filteredGroupViews.push({
        ...originalView,
        groupId,
        position: {
          x: Number.isFinite(minX) ? minX : originalView?.position.x ?? 0,
          y: nodeViews[0]?.position.y ?? originalView?.position.y ?? 0,
        },
        width: Number.isFinite(maxX - minX) ? Math.max(30, maxX - minX) : originalView?.width,
      });

      for (const nodeId of nodeIds) {
        nodeGroupIds.set(nodeId, groupId);
      }
    }
  }

  const originalGroupById = new Map(file.graph.groups.map((group) => [group.id, group]));
  const directLinks = file.graph.links
    .filter((link) => {
      const sourceNodeId = link.sourceGroupId
        ? originalGroupById.get(link.sourceGroupId)?.nodeIds.at(-1)
        : null;
      const targetNodeId = link.targetNodeId ?? (
        link.targetGroupId ? originalGroupById.get(link.targetGroupId)?.nodeIds[0] : null
      );

      return !!sourceNodeId && !!targetNodeId &&
        includedNodeIds.has(sourceNodeId) && includedNodeIds.has(targetNodeId);
    })
    .map((link) => ({
      ...link,
      sourceGroupId: link.sourceGroupId
        ? nodeGroupIds.get(originalGroupById.get(link.sourceGroupId)?.nodeIds.at(-1) ?? '') ?? null
        : null,
      targetGroupId: link.targetNodeId
        ? nodeGroupIds.get(link.targetNodeId) ?? null
        : link.targetGroupId
          ? nodeGroupIds.get(originalGroupById.get(link.targetGroupId)?.nodeIds[0] ?? '') ?? null
          : null,
    }));
  const autolinks = file.graph.autolinks
    .filter((autolink) => !!autolink.nodeId && includedNodeIds.has(autolink.nodeId));
  const includedLinkIds = new Set([
    ...directLinks.map((link) => link.id),
    ...autolinks.map((link) => link.id),
  ]);
  const originalInitialNode = file.graph.nodes.find((node) => node.isInitial);
  const initialNodeId = preserveInitialNode && originalInitialNode && includedNodeIds.has(originalInitialNode.id)
    ? originalInitialNode.id
    : preserveInitialNode
      ? filteredGroups[0]?.nodeIds[0] ?? null
      : null;
  const initialGroupId = initialNodeId ? nodeGroupIds.get(initialNodeId) ?? '' : filteredGroups[0]?.id ?? '';

  return {
    ...file,
    graph: {
      initialGroupId,
      groups: filteredGroups,
      nodes: file.graph.nodes
        .filter((node) => includedNodeIds.has(node.id))
        .map((node) => ({
          ...node,
          isInitial: node.id === initialNodeId,
        })),
      links: directLinks,
      autolinks,
    },
    view: {
      groups: filteredGroupViews,
      nodes: file.view.nodes
        .filter((node) => includedNodeIds.has(node.nodeId))
        .map((node) => ({
          ...node,
          groupId: nodeGroupIds.get(node.nodeId) ?? node.groupId,
          initial: node.nodeId === initialNodeId,
          selected: undefined,
          canvasSelected: undefined,
        })),
      links: file.view.links
        .filter((link) => includedLinkIds.has(link.linkId))
        .map((link) => ({
          ...link,
          sourceGroupId: link.kind === 'autolink'
            ? nodeGroupIds.get(file.graph.autolinks.find((item) => item.id === link.linkId)?.nodeId ?? '') ?? ''
            : directLinks.find((item) => item.id === link.linkId)?.sourceGroupId ?? '',
          targetGroupId: link.kind === 'autolink'
            ? nodeGroupIds.get(file.graph.autolinks.find((item) => item.id === link.linkId)?.nodeId ?? '') ?? ''
            : directLinks.find((item) => item.id === link.linkId)?.targetGroupId ?? '',
          targetNodeId: link.targetNodeId && includedNodeIds.has(link.targetNodeId)
            ? link.targetNodeId
            : undefined,
          selected: undefined,
          canvasSelected: undefined,
        })),
    },
  };
}

function getViewAnchor(nodes: readonly MachineGraphView['nodes'][number][]): ViewPoint {
  return {
    x: Math.min(...nodes.map((node) => node.position.x)),
    y: Math.min(...nodes.map((node) => node.position.y)),
  };
}

function translatePoint(point: ViewPoint, delta: ViewPoint): ViewPoint {
  return {
    x: point.x + delta.x,
    y: point.y + delta.y,
  };
}

function getNodeLeftAnchor(node: MachineGraphView['nodes'][number]): { x: number; y: number } {
  if (node.kind === 'hub') {
    return {
      x: node.position.x - 6,
      y: node.position.y,
    };
  }

  return {
    x: node.position.x - 5,
    y: node.position.y - 10,
  };
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

  if (node instanceof SubmachineNode) {
    return 'submachine';
  }

  return 'writer';
}

function inferRequiredTapeCount(graph: MachineGraph): number {
  let maxTapeIndex = 0;

  for (const node of getMachineNodes(graph)) {
    if (!(node instanceof HubNode)) {
      maxTapeIndex = Math.max(maxTapeIndex, node.tapeIndex);
    }
  }

  for (const transition of [...graph.links, ...(graph.autolinks ?? [])]) {
    for (const clause of transition.condition?.clauses ?? []) {
      maxTapeIndex = Math.max(maxTapeIndex, clause.tapeIndex);
    }
  }

  return maxTapeIndex + 1;
}

function getMachineNodes(graph: MachineGraph): MachineNode[] {
  return graph.groups.flatMap((group) => getGroupNodes(group));
}

function collectMetaValues(
  graph: MachineGraph,
  parameterAssignments: Readonly<Record<string, string>>,
  declaredMetaValues?: JtvMetaValues,
): JtvMetaValues {
  const variables = new Set(declaredMetaValues?.variables ?? []);
  const parameters = new Set(declaredMetaValues?.parameters ?? []);

  for (const node of getMachineNodes(graph)) {
    if (node instanceof SubmachineNode) {
      continue;
    }

    if (node instanceof WriterNode && isParameterName(node.name)) {
      parameters.add(node.name);
    } else if (node instanceof WriterNode && isVariableName(node.name)) {
      variables.add(node.name);
    }
  }

  for (const transition of [...graph.links, ...(graph.autolinks ?? [])]) {
    for (const clause of transition.condition?.clauses ?? []) {
      if (clause.assignToVariableName) {
        variables.add(clause.assignToVariableName);
      }

      for (const acceptedValue of clause.acceptedValues) {
        if (isParameterName(acceptedValue)) {
          parameters.add(acceptedValue);
        } else if (isVariableName(acceptedValue)) {
          variables.add(acceptedValue);
        }
      }
    }
  }

  for (const parameterName of Object.keys(parameterAssignments)) {
    if (isParameterName(parameterName)) {
      parameters.add(parameterName);
    }
  }

  return {
    variables: Array.from(variables).sort((left, right) => left.localeCompare(right)),
    parameters: Array.from(parameters).sort((left, right) => left.localeCompare(right)),
  };
}

function isParameterName(value: string): boolean {
  return /^[A-Z]$/.test(value);
}

function isVariableName(value: string): boolean {
  return value.length > 0 && !isParameterName(value) && !SymbolValue.of(value);
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
      targetNodeId: link.targetNodeId ? ids?.nodes.get(link.targetNodeId) ?? link.targetNodeId : undefined,
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
    groups.set(
      group.id,
      options.preserveIds
        ? group.id
        : getUuidForPersistence(group.id, usedIds, options.regenerateIds ?? false),
    );

    for (const node of getGroupNodes(group)) {
      nodes.set(
        node.id,
        options.preserveIds
          ? node.id
          : getUuidForPersistence(node.id, usedIds, options.regenerateIds ?? false),
      );
    }
  }

  for (const link of state.machineGraph.links) {
    links.set(
      link.id,
      options.preserveIds
        ? link.id
        : getUuidForPersistence(link.id, usedIds, options.regenerateIds ?? false),
    );
  }

  for (const autolink of state.machineGraph.autolinks ?? []) {
    links.set(
      autolink.id,
      options.preserveIds
        ? autolink.id
        : getUuidForPersistence(autolink.id, usedIds, options.regenerateIds ?? false),
    );
  }

  return { groups, nodes, links };
}

function getUuidForPersistence(id: string, usedIds: Set<string>, regenerateId: boolean): string {
  if (!regenerateId && isUuid(id) && !usedIds.has(id)) {
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
