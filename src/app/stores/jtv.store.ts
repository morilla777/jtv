import { Injectable, computed, inject, signal } from '@angular/core';

import { AteContinuationSnapshot, AteNode, AteSubtrace, AteTraceRecorder } from '../models/ate';
import { Autolink } from '../models/core/autolink';
import { LinearMachineGroup } from '../models/core/linear-machine-group';
import { Link } from '../models/core/link';
import { LinkCondition, type ReadConditionClause } from '../models/core/link-condition';
import { MachineGraph } from '../models/core/machine-graph';
import { MachineGraphRunner } from '../models/core/machine-graph-runner';
import { type MachineGraphExecutionPoint } from '../models/core/machine-graph-run-result';
import { MachineGroup } from '../models/core/machine-group';
import { MachineNode } from '../models/core/machine-node';
import { HubNode } from '../models/core/hub-node';
import { MetaValueDictionary } from '../models/core/meta-value-dictionary';
import { MoveLeftNode } from '../models/core/move-left-node';
import { MoveRightNode } from '../models/core/move-right-node';
import { ParameterValue } from '../models/core/parameter-value';
import { SubmachineNode } from '../models/core/submachine-node';
import { SymbolValue } from '../models/core/symbol-value';
import { Tape, TapeSnapshot } from '../models/core/tape';
import { WriterNode } from '../models/core/writer-node';
import { SubmachineDefinition } from '../models/core/execution-context';
import { AutolinkOrientation, MachineGraphView, MachineLinkKind, MachineLinkView, ViewPoint } from '../models/view';
import {
  createJtvCanvasFragment,
  createJtvFileFromState,
  removeJtvCanvasNodes,
  restoreJtvCanvasFragment,
  restoreMachineFromJtvFile,
  type JtvCanvasFragment,
  type JtvFile,
  type JtvMetaValues,
} from '../services/jtv-file-serializer';
import { JtvFileService } from '../services/jtv-file.service';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { PreinstalledSubmachineService } from '../services/preinstalled-submachine.service';

export type JtvToolId =
  | 'symbol-lowercase'
  | 'symbol-variable'
  | 'symbol-uppercase'
  | 'move-left'
  | 'move-right'
  | 'hub'
  | 'search-left'
  | 'search-right'
  | 'loop-transition'
  | 'search-left-inverse'
  | 'search-right-inverse'
  | 'transition'
  | 'shift-left'
  | 'shift-right'
  | 'conditional-transition'
  | 'submachine'
  | 'pointer';

export interface JtvTapeState {
  readonly id: string;
  readonly name: string;
  readonly tape: Tape;
}

export interface JtvMachineState {
  readonly id: string;
  readonly name: string;
  readonly shortName?: string;
  readonly description?: string;
}

export interface JtvLinkEditState {
  readonly mode: 'conditional-link' | 'autolink';
  readonly clause: ReadConditionClause;
  readonly nodeId?: string;
  readonly autolinkOrientation?: AutolinkOrientation;
}

export interface JtvSubmachineParameterEditState {
  readonly nodeId: string;
  readonly parameters: readonly string[];
  readonly assignments: Readonly<Record<string, string>>;
}

export interface JtvState {
  readonly activeToolId: JtvToolId | null;
  readonly ate: AteNode;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly metaValues: JtvMetaValues;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly selectedCanvasLinkId: string | null;
  readonly selectedCanvasNodeId: string | null;
  readonly selectedAteNodeId: string | null;
  readonly selectedMachine: JtvMachineState;
  readonly selectedParameter: string;
  readonly selectedSymbol: string;
  readonly selectedVariable: string;
  readonly selectedTapeIndex: number;
  readonly tapes: JtvTapeState[];
}

interface JtvHistoryTapeState {
  readonly id: string;
  readonly name: string;
  readonly initialSnapshot: TapeSnapshot;
}

interface JtvHistorySnapshot {
  readonly file: JtvFile;
  readonly selectedTapeIndex: number;
  readonly tapes: readonly JtvHistoryTapeState[];
}

interface JtvMachineHistory {
  readonly undoStack: JtvHistorySnapshot[];
  readonly redoStack: JtvHistorySnapshot[];
  lastSnapshot: JtvHistorySnapshot | null;
  transactionStart: JtvHistorySnapshot | null;
}

export interface JtvMachineTreeNode {
  readonly id: string;
  readonly name: string;
  readonly children: readonly JtvMachineTreeNode[];
}

export interface JtvMachineTab {
  readonly id: string;
  readonly name: string;
  readonly isRoot: boolean;
  readonly dirty: boolean;
}

interface JtvDesignMachine {
  readonly id: string;
  readonly selectedMachine: JtvMachineState;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly metaValues: JtvMetaValues;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly tapeCount: number;
  readonly submachineIds: readonly string[];
}

interface DesignMachineClipboard {
  readonly file: JtvFile;
  readonly operation: 'copy' | 'cut';
}

interface CanvasClipboard {
  readonly fragment: JtvCanvasFragment;
  readonly operation: 'copy' | 'cut';
}

interface AteNavigationFrame {
  readonly activeDesignMachineId: string;
  readonly ate: AteNode;
  readonly parentAteNodeId: string;
  readonly machineGraph: MachineGraph;
  readonly machineGraphView: MachineGraphView;
  readonly metaValues: JtvMetaValues;
  readonly parameterAssignments: Readonly<Record<string, string>>;
  readonly selectedAteNodeId: string | null;
  readonly selectedCanvasLinkId: string | null;
  readonly selectedCanvasNodeId: string | null;
  readonly selectedMachine: JtvMachineState;
  readonly selectedTapeIndex: number;
  readonly tapes: readonly JtvTapeState[];
}

function createTapeState(index: number): JtvTapeState {
  return {
    id: `tape-${index}`,
    name: `Cinta ${index}`,
    tape: new Tape(),
  };
}

function createTapeStates(count: number): JtvTapeState[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => createTapeState(index + 1));
}

function collectMachineMetaValues(
  graph: MachineGraph,
  parameterAssignments: Readonly<Record<string, string>>,
  declaredMetaValues: JtvMetaValues = { variables: [], parameters: [] },
): JtvMetaValues {
  const variables = new Set(declaredMetaValues.variables);
  const parameters = new Set<string>();

  for (const group of graph.groups) {
    for (const node of getMachineGroupNodes(group)) {
      if (node instanceof SubmachineNode) {
        continue;
      }

      if (!(node instanceof WriterNode)) {
        continue;
      }

      if (/^[A-Z]$/.test(node.name)) {
        parameters.add(node.name);
      } else if (isVariableMetaValueName(node.name)) {
        variables.add(node.name);
      }
    }
  }

  for (const transition of [...graph.links, ...(graph.autolinks ?? [])]) {
    for (const clause of transition.condition?.clauses ?? []) {
      if (clause.assignToVariableName) {
        variables.add(clause.assignToVariableName);
      }

      for (const acceptedValue of clause.acceptedValues) {
        if (/^[A-Z]$/.test(acceptedValue)) {
          parameters.add(acceptedValue);
        } else if (isVariableMetaValueName(acceptedValue)) {
          variables.add(acceptedValue);
        }
      }
    }
  }

  for (const parameterName of Object.keys(parameterAssignments)) {
    if (/^[A-Z]$/.test(parameterName)) {
      parameters.add(parameterName);
    }
  }

  return {
    variables: Array.from(variables).sort((left, right) => left.localeCompare(right)),
    parameters: Array.from(parameters).sort((left, right) => left.localeCompare(right)),
  };
}

function isVariableMetaValueName(value: string): boolean {
  return value.length > 0 && !/^[A-Z]$/.test(value) && !SymbolValue.of(value);
}

function getMachineGroupNodes(group: MachineGroup): MachineNode[] {
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

function deleteMutableContinuation(node: AteNode): void {
  delete (node as { continuation?: AteContinuationSnapshot }).continuation;
}

function keepMutableReplayContinuation(node: AteNode): void {
  const continuation = node.continuation;

  if (continuation) {
    (node as { replayContinuation?: AteContinuationSnapshot }).replayContinuation = continuation;
  }
}

function createInitialState(): JtvState {
  const initialTape = createTapeState(1);
  const emptyMachine = createEmptyMachine();
  const selectedMachine = {
    id: 'new',
    name: '',
  };

  return {
    activeToolId: null,
    ate: new AteTraceRecorder(selectedMachine.name).root,
    machineGraph: emptyMachine.graph,
    machineGraphView: emptyMachine.view,
    metaValues: collectMachineMetaValues(emptyMachine.graph, {}),
    parameterAssignments: {},
    selectedCanvasLinkId: null,
    selectedCanvasNodeId: null,
    selectedAteNodeId: null,
    selectedMachine,
    selectedParameter: 'A',
    selectedSymbol: '#',
    selectedVariable: 'α',
    selectedTapeIndex: 0,
    tapes: [initialTape],
  };
}

function createEmptyMachine(): { graph: MachineGraph; view: MachineGraphView } {
  return {
    graph: {
      groups: [],
      links: [],
      autolinks: [],
      initialGroupId: '',
    },
    view: {
      groups: [],
      nodes: [],
      links: [],
    },
  };
}

function createLinkView(
  link: Link | Autolink,
  layout: {
    kind: MachineLinkKind;
    autolinkOrientation?: AutolinkOrientation;
    label?: string;
    sourceGroupId?: string;
    targetGroupId?: string;
    targetNodeId?: string;
    points: readonly ViewPoint[];
  },
): MachineLinkView {
  return {
    linkId: link.id,
    label: layout.label ?? formatLinkCondition(link.condition),
    kind: layout.kind,
    autolinkOrientation: layout.autolinkOrientation,
    sourceGroupId: layout.sourceGroupId ?? (link instanceof Link ? link.sourceGroup?.id : '') ?? '',
    targetGroupId: layout.targetGroupId ?? (link instanceof Link ? link.targetGroup?.id : '') ?? '',
    targetNodeId: layout.targetNodeId ?? (link instanceof Link ? link.targetNode?.id : undefined),
    points: layout.points,
  };
}

function formatLinkCondition(condition: LinkCondition | null, showTapeIndex: boolean = false): string {
  return condition?.getAteLabel(showTapeIndex) ?? '';
}

function formatGroupLabel(group: MachineGroup): string {
  const labels: string[] = [];
  const visitedNodeIds = new Set<string>();
  let current = group.entry;

  while (current && !visitedNodeIds.has(current.id)) {
    visitedNodeIds.add(current.id);
    labels.push(current.name);

    if (current.id === group.exit?.id) {
      break;
    }

    current = current.next;
  }

  return labels.join('');
}

function createLinearNodeViews(
  groupId: string,
  nodes: readonly MachineNode[],
  startX: number,
  y: number,
) {
  return nodes.map((node, index) => ({
    nodeId: node.id,
    groupId,
    kind: getMachineNodeViewKind(node),
    label: node.name,
    subscriptLabel: node instanceof SubmachineNode ? node.getParameterDisplayValue() : undefined,
    subscriptOverline: node instanceof SubmachineNode ? node.hasNegatedParameterDisplay() : undefined,
    tapeIndex: node.tapeIndex,
    initial: node.isInitial,
    position: {
      x: startX + index * MACHINE_NODE_STEP,
      y,
    },
  }));
}

const MACHINE_NODE_STEP = 20;

function linkNodes<T extends MachineNode>(nodes: T[]): T[] {
  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }

  return nodes;
}

function getMachineNodeViewKind(node: MachineNode): 'text' | 'parameter' | 'hub' | 'submachine' {
  if (node instanceof HubNode) {
    return 'hub';
  }

  if (node instanceof SubmachineNode) {
    return 'submachine';
  }

  if (node instanceof WriterNode && /^[A-Z]$/.test(node.name)) {
    return 'parameter';
  }

  return 'text';
}

function getNextTapeIndex(tapes: readonly JtvTapeState[]): number {
  return tapes.reduce((nextIndex, tape) => {
    const match = /^tape-(\d+)$/.exec(tape.id);
    const index = match ? Number(match[1]) : 0;

    return Math.max(nextIndex, index + 1);
  }, 1);
}

@Injectable({ providedIn: 'root' })
export class JtvStore {
  private static readonly MAX_HISTORY_SIZE = 50;

  private readonly state = signal<JtvState>(createInitialState());
  private readonly fileService = inject(JtvFileService);
  private readonly preinstalledSubmachineService = inject(PreinstalledSubmachineService);
  private readonly settingsService = inject(JtvSettingsService);
  private readonly machineGraphRunner = new MachineGraphRunner();
  private readonly historyRevision = signal(0);
  private readonly machineWorkspaceRevision = signal(0);
  private readonly dirtyDesignMachineIds = signal<ReadonlySet<string>>(new Set<string>());
  private machineHistories = new Map<string, JtvMachineHistory>();
  private rootDesignMachineId = this.state().selectedMachine.id;
  private activeDesignMachineId = this.state().selectedMachine.id;
  private readonly openDesignMachineTabIds = signal<readonly string[]>([this.state().selectedMachine.id]);
  private selectedChildSubmachineIdsByParent = new Map<string, string>();
  private designMachines = new Map<string, JtvDesignMachine>();
  private designMachineClipboard: DesignMachineClipboard | null = null;
  private readonly designMachineClipboardRevision = signal(0);
  private canvasClipboard: CanvasClipboard | null = null;
  private readonly canvasClipboardRevision = signal(0);
  private readonly selectedCanvasNodeIds = signal<ReadonlySet<string>>(new Set<string>());
  private readonly selectedCanvasLinkIds = signal<ReadonlySet<string>>(new Set<string>());
  private canvasPastePoint: ViewPoint = { x: 30, y: 30 };
  private ateNavigationStack: AteNavigationFrame[] = [];

  readonly activeToolId = computed(() => this.state().activeToolId);
  readonly canUndo = computed(() => {
    this.historyRevision();

    return (this.machineHistories.get(this.activeDesignMachineId)?.undoStack.length ?? 0) > 0;
  });
  readonly canRedo = computed(() => {
    this.historyRevision();

    return (this.machineHistories.get(this.activeDesignMachineId)?.redoStack.length ?? 0) > 0;
  });
  readonly activeMachineTreeNodeId = computed(() => {
    this.machineWorkspaceRevision();

    return this.activeDesignMachineId;
  });
  readonly rootMachineTreeNodeId = computed(() => {
    this.machineWorkspaceRevision();

    return this.rootDesignMachineId;
  });
  readonly activeDesignMachineTabId = computed(() => {
    this.machineWorkspaceRevision();

    return this.activeDesignMachineId;
  });
  readonly designMachineTabs = computed<JtvMachineTab[]>(() => {
    this.machineWorkspaceRevision();
    const dirtyMachineIds = this.dirtyDesignMachineIds();

    return this.openDesignMachineTabIds()
      .map((machineId) => this.designMachines.get(machineId))
      .filter((machine): machine is JtvDesignMachine => !!machine)
      .map((machine) => ({
        id: machine.id,
        name: machine.selectedMachine.name,
        isRoot: machine.id === this.rootDesignMachineId,
        dirty: dirtyMachineIds.has(machine.id),
      }));
  });
  readonly canPasteDesignMachine = computed(() => {
    this.designMachineClipboardRevision();

    return this.designMachineClipboard !== null;
  });
  readonly machineTree = computed(() => {
    this.machineWorkspaceRevision();

    return this.createMachineTreeNode(this.rootDesignMachineId);
  });
  readonly activeChildMachineNames = computed(() => {
    this.machineWorkspaceRevision();

    const activeMachine = this.designMachines.get(this.activeDesignMachineId);

    return activeMachine?.submachineIds
      .map((submachineId) => this.designMachines.get(submachineId)?.selectedMachine.name ?? '')
      .filter((name) => name.length > 0) ?? [];
  });
  readonly selectedChildMachineName = computed(() => {
    this.machineWorkspaceRevision();
    const activeMachine = this.designMachines.get(this.activeDesignMachineId);
    const selectedChildSubmachineId = activeMachine ? this.getSelectedChildSubmachineId(activeMachine) : null;

    return selectedChildSubmachineId
      ? this.designMachines.get(selectedChildSubmachineId)?.selectedMachine.name ?? null
      : null;
  });
  readonly ate = computed(() => this.state().ate);
  readonly selectedAteNode = computed(() => this.findAteNode(this.state().ate, this.state().selectedAteNodeId));
  readonly activeAteMachineNodeId = computed(() => this.selectedAteNode()?.machineNodeId ?? null);
  readonly activeAteLinkId = computed(() => this.selectedAteNode()?.linkId ?? null);
  readonly machineGraph = computed(() => this.state().machineGraph);
  readonly selectedCanvasNodeId = computed(() => this.state().selectedCanvasNodeId);
  readonly selectedCanvasLinkId = computed(() => this.state().selectedCanvasLinkId);
  readonly hasCanvasSelection = computed(() =>
    this.state().selectedCanvasNodeId !== null ||
    this.state().selectedCanvasLinkId !== null ||
    this.selectedCanvasNodeIds().size > 0 ||
    this.selectedCanvasLinkIds().size > 0,
  );
  readonly canPasteCanvasElements = computed(() => {
    this.canvasClipboardRevision();

    return this.canvasClipboard !== null;
  });
  readonly insertedParameters = computed(() => this.state().metaValues.parameters);
  readonly lastTapeReferenceCount = computed(() => {
    const lastTapeIndex = this.state().tapes.length - 1;

    return lastTapeIndex > 0 ? this.countTapeReferences(this.state().machineGraph, lastTapeIndex) : 0;
  });
  readonly parameterAssignments = computed(() => this.state().parameterAssignments);
  readonly machineGraphView = computed(() => {
    this.machineWorkspaceRevision();
    const view = this.state().machineGraphView;
    const activeNodeId = this.activeAteMachineNodeId();
    const activeLinkId = this.activeAteLinkId();
    const { activeToolId, machineGraph, selectedCanvasLinkId, selectedCanvasNodeId, tapes } = this.state();
    const showCanvasSelection = activeToolId === 'pointer';
    const linkLabels = this.getMachineLinkLabels(machineGraph, tapes.length > 1);

    return {
      ...view,
      nodes: view.nodes.map((node) => ({
        ...node,
        selected: node.nodeId === activeNodeId,
        canvasSelected: showCanvasSelection && (
          node.nodeId === selectedCanvasNodeId || this.selectedCanvasNodeIds().has(node.nodeId)
        ),
        submachineShortName: this.getSubmachineShortNameForNodeView(node.nodeId),
        submachineTooltip: this.getSubmachineTooltipForNodeView(node.nodeId),
      })),
      links: view.links.map((link) => ({
        ...link,
        label: linkLabels.get(link.linkId) ?? link.label,
        selected: link.linkId === activeLinkId,
        canvasSelected: showCanvasSelection && (
          link.linkId === selectedCanvasLinkId || this.selectedCanvasLinkIds().has(link.linkId)
        ),
      })),
    };
  });
  readonly selectedMachine = computed(() => this.state().selectedMachine);
  readonly selectedParameter = computed(() => this.state().selectedParameter);
  readonly selectedSymbol = computed(() => this.state().selectedSymbol);
  readonly selectedVariable = computed(() => this.state().selectedVariable);
  readonly selectedTapeIndex = computed(() => this.state().selectedTapeIndex);
  readonly selectedTapeId = computed(() => this.selectedTape()?.id ?? null);
  readonly tapes = computed(() => this.state().tapes);
  readonly tapeSnapshots = computed<readonly TapeSnapshot[]>(() => {
    const selectedAteNode = this.selectedAteNode();

    if (selectedAteNode) {
      const replayedSnapshots = this.replayTapeSnapshotsToAteNode(selectedAteNode);

      if (replayedSnapshots) {
        return replayedSnapshots;
      }
    }

    return this.state().tapes.map((tapeState) => tapeState.tape.getSnapshot());
  });
  readonly selectedTapeSnapshot = computed(() => this.tapeSnapshots()[this.selectedTapeIndex()] ?? null);
  readonly selectedTape = computed(() => {
    const { selectedTapeIndex, tapes } = this.state();

    return tapes[selectedTapeIndex] ?? tapes[0] ?? null;
  });

  constructor() {
    this.resetMachineWorkspaceFromCurrentState();
    this.resetHistory();
  }

  selectTool(toolId: JtvToolId | null): void {
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.patchState({
      activeToolId: toolId,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  toggleTool(toolId: JtvToolId): void {
    const nextToolId = this.state().activeToolId === toolId ? null : toolId;

    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.patchState({
      activeToolId: nextToolId,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  selectMachine(machine: JtvMachineState): void {
    this.patchState({ selectedMachine: machine });
  }

  renameSelectedMachine(name: string): void {
    this.state.update((current) => ({
      ...current,
      ate: {
        ...current.ate,
        label: name,
      },
      selectedMachine: {
        ...current.selectedMachine,
        name,
      },
    }));
    this.saveActiveDesignMachine();
    this.syncCurrentHistorySnapshot();
  }

  renameRootMachine(name: string): void {
    this.saveActiveDesignMachine();
    const rootMachine = this.designMachines.get(this.rootDesignMachineId);

    if (!rootMachine) {
      return;
    }

    const selectedMachine = {
      ...rootMachine.selectedMachine,
      name,
    };

    this.designMachines.set(rootMachine.id, {
      ...rootMachine,
      selectedMachine,
    });

    if (rootMachine.id === this.activeDesignMachineId) {
      this.state.update((current) => ({
        ...current,
        ate: {
          ...current.ate,
          label: name,
        },
        selectedMachine,
      }));
      this.syncCurrentHistorySnapshot();
    }

    this.bumpMachineWorkspaceRevision();
  }

  getRootMachineName(): string {
    return this.designMachines.get(this.rootDesignMachineId)?.selectedMachine.name ?? this.state().selectedMachine.name;
  }

  selectParameter(parameter: string): void {
    this.patchState({ selectedParameter: parameter });
  }

  assignParameters(assignments: Readonly<Record<string, string>>): void {
    this.state.update((current) => ({
      ...current,
      parameterAssignments: { ...assignments },
      metaValues: collectMachineMetaValues(current.machineGraph, assignments, current.metaValues),
    }));
    this.markMachineDirty();
  }

  selectSymbol(symbol: string): void {
    this.patchState({ selectedSymbol: symbol });
  }

  selectVariable(variable: string): void {
    this.patchState({ selectedVariable: variable });
  }

  selectTape(tapeId: string): void {
    const selectedTapeIndex = this.state().tapes.findIndex((tape) => tape.id === tapeId);

    if (selectedTapeIndex < 0) {
      return;
    }

    this.patchState({ selectedTapeIndex });
  }

  selectTapeIndex(selectedTapeIndex: number): void {
    if (!Number.isInteger(selectedTapeIndex) || !this.state().tapes[selectedTapeIndex]) {
      return;
    }

    this.patchState({ selectedTapeIndex });
  }

  selectAteNode(nodeId: string | null): void {
    this.patchState({ selectedAteNodeId: nodeId });
  }

  selectCanvasNode(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: nodeId,
    });
  }

  selectCanvasLink(linkId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.patchState({
      selectedCanvasLinkId: linkId,
      selectedCanvasNodeId: null,
    });
  }

  clearCanvasSelection(): void {
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  selectCanvasNodeForTransition(nodeId: string): void {
    if (
      this.state().activeToolId !== 'transition' &&
      this.state().activeToolId !== 'conditional-transition' &&
      this.state().activeToolId !== 'loop-transition'
    ) {
      return;
    }

    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: nodeId,
    });
  }

  isCanvasGroupExitNode(nodeId: string): boolean {
    return this.getCanvasGroupExitNodeId(nodeId) === nodeId;
  }

  getCanvasGroupExitNodeId(nodeId: string): string | null {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;

    return group?.exit?.id ?? null;
  }

  createUnconditionalLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    vertices: readonly ViewPoint[] = [],
  ): void {
    if (this.state().activeToolId !== 'transition' || sourceNodeId === targetNodeId) {
      return;
    }

    this.state.update((current) => {
      const sourceNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === sourceNodeId);
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const sourceGroup = sourceNodeView
        ? current.machineGraph.groups.find((group) => group.id === sourceNodeView.groupId)
        : null;
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;
      const targetNode = targetGroup ? this.findMachineNodeInGroup(targetGroup, targetNodeId) : null;

      if (!sourceNodeView || !targetNodeView || !sourceGroup || !targetGroup || !targetNode || sourceGroup.exit?.id !== sourceNodeId) {
        return current;
      }

      const link = new Link(
        this.createMachineLinkId(current.machineGraph, 'link'),
        sourceGroup,
        targetGroup,
        null,
        targetNode,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links, link],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(link, {
              kind: 'direct',
              label: '',
              points: [
                this.getNodeRightAnchor(sourceNodeView),
                ...vertices,
                this.getNodeLeftAnchor(targetNodeView),
              ],
              targetNodeId,
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  createConditionalLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    clause: ReadConditionClause,
    vertices: readonly ViewPoint[] = [],
  ): void {
    if (this.state().activeToolId !== 'conditional-transition' || sourceNodeId === targetNodeId) {
      return;
    }

    this.createLinkBetweenNodes(sourceNodeId, targetNodeId, this.createLinkConditionFromClause(clause), vertices);
  }

  createConditionalAutolinkForNode(
    nodeId: string,
    clause: ReadConditionClause,
    orientation: AutolinkOrientation,
  ): void {
    if (this.state().activeToolId !== 'loop-transition') {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (
        !nodeView ||
        !group ||
        !node ||
        group.exit?.id !== nodeId ||
        (current.machineGraph.autolinks ?? []).some((autolink) => autolink.node?.id === nodeId)
      ) {
        return current;
      }

      const autolink = new Autolink(
        this.createMachineLinkId(current.machineGraph, 'autolink'),
        node,
        this.createLinkConditionFromClause(clause),
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          autolinks: [...(current.machineGraph.autolinks ?? []), autolink],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(autolink, {
              kind: 'autolink',
              autolinkOrientation: orientation,
              sourceGroupId: group.id,
              targetGroupId: group.id,
              points: [nodeView.position],
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  getCanvasLinkEditState(linkId: string): JtvLinkEditState | null {
    const graphLink = this.state().machineGraph.links.find((link) => link.id === linkId);

    if (graphLink) {
      return {
        mode: 'conditional-link',
        clause: this.getFirstConditionClauseOrDefault(graphLink.condition),
      };
    }

    const autolink = (this.state().machineGraph.autolinks ?? []).find((item) => item.id === linkId);
    const autolinkView = this.state().machineGraphView.links.find((link) => link.linkId === linkId);

    if (!autolink) {
      return null;
    }

    return {
      mode: 'autolink',
      clause: this.getFirstConditionClauseOrDefault(autolink.condition),
      nodeId: autolink.node?.id,
      autolinkOrientation: autolinkView?.autolinkOrientation ?? 'right',
    };
  }

  hasCanvasNodeLeftNeighbor(nodeId: string): boolean {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;
    const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

    return !!node?.previous;
  }

  hasCanvasNodeAutolink(nodeId: string): boolean {
    return (this.state().machineGraph.autolinks ?? []).some((autolink) => autolink.node?.id === nodeId);
  }

  getCanvasSubmachineParameterEditState(nodeId: string): JtvSubmachineParameterEditState | null {
    const node = this.getMachineNodesById(this.state().machineGraph).get(nodeId);

    if (!(node instanceof SubmachineNode)) {
      return null;
    }

    const parameters = Object.keys(node.parameterAssignments).length > 0
      ? Object.keys(node.parameterAssignments).sort((left, right) => left.localeCompare(right))
      : node.parameterName ? [node.parameterName] : [];

    if (parameters.length === 0) {
      return null;
    }

    return {
      nodeId,
      parameters,
      assignments: node.parameterAssignments,
    };
  }

  updateCanvasSubmachineParameterAssignments(
    nodeId: string,
    assignments: Readonly<Record<string, string>>,
  ): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    let changed = false;

    this.state.update((current) => {
      const node = this.getMachineNodesById(current.machineGraph).get(nodeId);

      if (!(node instanceof SubmachineNode)) {
        return current;
      }

      node.setParameterAssignments(assignments);
      changed = true;

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
        },
        machineGraphView: {
          ...current.machineGraphView,
          nodes: current.machineGraphView.nodes.map((viewNode) =>
            viewNode.nodeId === nodeId
              ? {
                ...viewNode,
                subscriptLabel: node.getParameterDisplayValue(),
                subscriptOverline: node.hasNegatedParameterDisplay(),
              }
              : viewNode,
          ),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: nodeId,
      };
    });

    if (changed) {
      this.markMachineDirty();
    }
  }

  updateCanvasLinkCondition(
    linkId: string,
    clause: ReadConditionClause,
    autolinkOrientation?: AutolinkOrientation,
  ): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const link = current.machineGraph.links.find((item) => item.id === linkId);
      const autolink = (current.machineGraph.autolinks ?? []).find((item) => item.id === linkId);

      if (!link && !autolink) {
        return current;
      }

      const condition = this.createLinkConditionFromClause(clause);

      if (link) {
        link.condition = condition;
      }

      if (autolink) {
        autolink.condition = condition;
      }

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links],
          autolinks: [...(current.machineGraph.autolinks ?? [])],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: current.machineGraphView.links.map((viewLink) => {
            if (viewLink.linkId !== linkId) {
              return viewLink;
            }

            return {
              ...viewLink,
              label: formatLinkCondition(condition, current.tapes.length > 1),
              autolinkOrientation: autolink ? autolinkOrientation ?? viewLink.autolinkOrientation : viewLink.autolinkOrientation,
            };
          }),
        },
        selectedCanvasLinkId: linkId,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  insertActiveToolNodeNear(targetNodeId: string, side: 'left' | 'right'): void {
    const activeToolId = this.state().activeToolId;

    if (!this.isInsertableNodeTool(activeToolId)) {
      return;
    }

    this.state.update((current) => {
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;
      const targetNode = targetGroup ? this.findMachineNodeInGroup(targetGroup, targetNodeId) : null;

      if (!targetNodeView || !targetGroup || !targetNode) {
        return current;
      }

      const insertedNode = this.createMachineNodeForTool(current, activeToolId, current.selectedTapeIndex);

      if (!insertedNode) {
        return current;
      }

      if (side === 'left') {
        this.insertMachineNodeBefore(targetGroup, targetNode, insertedNode);
      } else {
        this.insertMachineNodeAfter(targetGroup, targetNode, insertedNode);
      }

      const insertedNodePosition = {
        x: targetNodeView.position.x + (side === 'left' ? 0 : MACHINE_NODE_STEP),
        y: targetNodeView.position.y,
      };
      const shiftedNodes = current.machineGraphView.nodes.map((node) => {
        const shouldShift = node.groupId === targetNodeView.groupId &&
          (side === 'left'
            ? node.position.x >= targetNodeView.position.x
            : node.position.x > targetNodeView.position.x);

        if (!shouldShift) {
          return {
            ...node,
            initial: node.nodeId === targetNode.id ? targetNode.isInitial : node.initial,
          };
        }

        return {
          ...node,
          initial: node.nodeId === targetNode.id ? targetNode.isInitial : node.initial,
          position: {
            ...node.position,
            x: node.position.x + MACHINE_NODE_STEP,
          },
        };
      });

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: current.machineGraphView.groups.map((groupView) => groupView.groupId === targetGroup.id
            ? {
              ...groupView,
              label: formatGroupLabel(targetGroup),
              width: (groupView.width ?? 0) + MACHINE_NODE_STEP,
            }
            : groupView),
          nodes: [
            ...shiftedNodes,
            {
              nodeId: insertedNode.id,
              groupId: targetGroup.id,
              kind: this.getMachineNodeViewKind(insertedNode),
              label: insertedNode.name,
              subscriptLabel: insertedNode instanceof SubmachineNode ? insertedNode.getParameterDisplayValue() : undefined,
              subscriptOverline: insertedNode instanceof SubmachineNode ? insertedNode.hasNegatedParameterDisplay() : undefined,
              tapeIndex: insertedNode.tapeIndex,
              initial: insertedNode.isInitial,
              position: insertedNodePosition,
            },
          ].sort((first, second) => first.position.x - second.position.x),
          links: current.machineGraphView.links.map((link) => {
            if (link.sourceGroupId !== targetGroup.id || !link.points?.length) {
              return link;
            }

            const [sourcePoint, ...restPoints] = link.points;

            return {
              ...link,
              points: [
                {
                  ...sourcePoint,
                  x: sourcePoint.x + MACHINE_NODE_STEP,
                },
                ...restPoints,
              ],
            };
          }),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: insertedNode.id,
      };
    });
    this.markMachineDirty();
  }

  insertActiveToolNodeAt(position: ViewPoint): void {
    const activeToolId = this.state().activeToolId;

    if (!this.isInsertableNodeTool(activeToolId)) {
      return;
    }

    this.state.update((current) => {
      const insertedNode = this.createMachineNodeForTool(current, activeToolId, current.selectedTapeIndex);

      if (!insertedNode) {
        return current;
      }

      insertedNode.isInitial = current.machineGraph.groups.length === 0;

      const group = new LinearMachineGroup(
        this.createMachineGroupId(current.machineGraph, 'group'),
        insertedNode,
        insertedNode,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups, group],
          initialGroupId: current.machineGraph.groups.length === 0 ? group.id : current.machineGraph.initialGroupId,
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: [
            ...current.machineGraphView.groups,
            {
              groupId: group.id,
              label: formatGroupLabel(group),
              position,
              width: 28,
              height: 32,
            },
          ],
          nodes: [
            ...current.machineGraphView.nodes,
            {
              nodeId: insertedNode.id,
              groupId: group.id,
              kind: this.getMachineNodeViewKind(insertedNode),
              label: insertedNode.name,
              subscriptLabel: insertedNode instanceof SubmachineNode ? insertedNode.getParameterDisplayValue() : undefined,
              subscriptOverline: insertedNode instanceof SubmachineNode ? insertedNode.hasNegatedParameterDisplay() : undefined,
              tapeIndex: insertedNode.tapeIndex,
              initial: insertedNode.isInitial,
              position,
            },
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: insertedNode.id,
      };
    });
    this.markMachineDirty();
  }

  moveCanvasGroupContainingNode(nodeId: string, delta: ViewPoint): void {
    if (this.state().activeToolId !== 'pointer' || (delta.x === 0 && delta.y === 0)) {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);

      if (!nodeView) {
        return current;
      }

      const groupId = nodeView.groupId;

      return {
        ...current,
        machineGraphView: {
          ...current.machineGraphView,
          groups: current.machineGraphView.groups.map((group) => group.groupId === groupId
            ? {
              ...group,
              position: this.translatePoint(group.position, delta),
            }
            : group),
          nodes: current.machineGraphView.nodes.map((node) => node.groupId === groupId
            ? {
              ...node,
              position: this.translatePoint(node.position, delta),
            }
            : node),
          links: current.machineGraphView.links.map((link) => this.translateLinkForMovedGroup(link, groupId, delta)),
        },
      };
    });
    this.markMachineDirty();
  }

  makeCanvasNodeInitial(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer' || !this.canMakeCanvasNodeInitial(nodeId)) {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (!nodeView || !group || !node) {
        return current;
      }

      for (const graphGroup of current.machineGraph.groups) {
        this.setInitialNodeInGroup(graphGroup, null);
      }

      node.isInitial = true;

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
          initialGroupId: group.id,
        },
        machineGraphView: {
          ...current.machineGraphView,
          nodes: current.machineGraphView.nodes.map((viewNode) => ({
            ...viewNode,
            initial: viewNode.nodeId === nodeId,
          })),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: nodeId,
      };
    });
    this.markMachineDirty();
  }

  selectCanvasRegion(bounds: { x: number; y: number; width: number; height: number }): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    const selectedNodeIds = new Set(
      this.state().machineGraphView.nodes
        .filter((node) => this.canvasRegionIntersectsNode(bounds, node))
        .map((node) => node.nodeId),
    );
    const selectedLinkIds = new Set<string>();

    for (const autolink of this.state().machineGraph.autolinks ?? []) {
      if (autolink.node?.id && selectedNodeIds.has(autolink.node.id)) {
        selectedLinkIds.add(autolink.id);
      }
    }

    for (const link of this.state().machineGraph.links) {
      const sourceNodeId = link.sourceGroup?.exit?.id ?? null;
      const targetNodeId = link.targetNode?.id ?? link.targetGroup?.entry?.id ?? null;

      if (sourceNodeId && targetNodeId && selectedNodeIds.has(sourceNodeId) && selectedNodeIds.has(targetNodeId)) {
        selectedLinkIds.add(link.id);
      }
    }

    this.selectedCanvasNodeIds.set(selectedNodeIds);
    this.selectedCanvasLinkIds.set(selectedLinkIds);
    this.canvasPastePoint = { x: bounds.x, y: bounds.y };
    this.patchState({
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    });
  }

  setCanvasPastePoint(point: ViewPoint): void {
    this.canvasPastePoint = point;
  }

  copySelectedCanvasElements(): boolean {
    if (this.state().activeToolId !== 'pointer') {
      return false;
    }

    const selectedNodeIds = this.getCanvasClipboardNodeIds();
    const fragment = createJtvCanvasFragment(this.state(), selectedNodeIds);

    if (!fragment) {
      return false;
    }

    this.canvasClipboard = { fragment, operation: 'copy' };
    this.bumpCanvasClipboardRevision();

    return true;
  }

  cutSelectedCanvasElements(): boolean {
    if (!this.copySelectedCanvasElements()) {
      return false;
    }

    const selectedNodeIds = this.getCanvasClipboardNodeIds();

    this.canvasClipboard = {
      fragment: this.canvasClipboard!.fragment,
      operation: 'cut',
    };
    this.applyRemovedCanvasNodes(selectedNodeIds);

    return true;
  }

  pasteCanvasElements(): boolean {
    if (this.state().activeToolId !== 'pointer' || !this.canvasClipboard) {
      return false;
    }

    const pasted = restoreJtvCanvasFragment(this.canvasClipboard.fragment, this.canvasPastePoint);
    const pastedNodeIds = new Set(pasted.machineGraphView.nodes.map((node) => node.nodeId));
    const pastedLinkIds = new Set(pasted.machineGraphView.links.map((link) => link.linkId));
    const currentGraphIsEmpty = this.state().machineGraph.groups.length === 0;

    if (currentGraphIsEmpty) {
      const initialGroup = pasted.machineGraph.groups[0];

      if (initialGroup?.entry) {
        initialGroup.entry.isInitial = true;
      }
    }

    this.state.update((current) => ({
      ...current,
      machineGraph: {
        groups: [...current.machineGraph.groups, ...pasted.machineGraph.groups],
        links: [...current.machineGraph.links, ...pasted.machineGraph.links],
        autolinks: [...(current.machineGraph.autolinks ?? []), ...(pasted.machineGraph.autolinks ?? [])],
        initialGroupId: currentGraphIsEmpty
          ? pasted.machineGraph.groups[0]?.id ?? ''
          : current.machineGraph.initialGroupId,
      },
      machineGraphView: {
        groups: [...current.machineGraphView.groups, ...pasted.machineGraphView.groups],
        nodes: [
          ...current.machineGraphView.nodes,
          ...pasted.machineGraphView.nodes.map((node) => ({
            ...node,
            initial: currentGraphIsEmpty && node.nodeId === pasted.machineGraph.groups[0]?.entry?.id,
          })),
        ],
        links: [...current.machineGraphView.links, ...pasted.machineGraphView.links],
      },
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    }));
    this.selectedCanvasNodeIds.set(pastedNodeIds);
    this.selectedCanvasLinkIds.set(pastedLinkIds);
    this.canvasPastePoint = {
      x: this.canvasPastePoint.x + 20,
      y: this.canvasPastePoint.y + 20,
    };

    if (this.canvasClipboard.operation === 'cut') {
      this.canvasClipboard = null;
      this.bumpCanvasClipboardRevision();
    }

    this.markMachineDirty();

    return true;
  }

  changeCanvasNodeTape(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    let changed = false;
    const selectedTapeIndex = this.state().selectedTapeIndex;

    this.state.update((current) => {
      if (!current.tapes[selectedTapeIndex]) {
        return current;
      }

      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (!nodeView || !node || node.tapeIndex === selectedTapeIndex) {
        return current;
      }

      node.tapeIndex = selectedTapeIndex;
      changed = true;

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: [...current.machineGraph.groups],
        },
        machineGraphView: {
          ...current.machineGraphView,
          nodes: current.machineGraphView.nodes.map((viewNode) => viewNode.nodeId === nodeId
            ? {
              ...viewNode,
              tapeIndex: selectedTapeIndex,
            }
            : viewNode),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: nodeId,
      };
    });

    if (changed) {
      this.markMachineDirty();
    }
  }

  changeSelectedCanvasNodeTape(): void {
    const selectedCanvasNodeId = this.state().selectedCanvasNodeId;

    if (!selectedCanvasNodeId) {
      return;
    }

    this.changeCanvasNodeTape(selectedCanvasNodeId);
  }

  canMakeCanvasNodeInitial(nodeId: string): boolean {
    const nodeView = this.state().machineGraphView.nodes.find((node) => node.nodeId === nodeId);
    const group = nodeView
      ? this.state().machineGraph.groups.find((item) => item.id === nodeView.groupId)
      : null;

    return group?.entry?.id === nodeId;
  }

  canMakeSelectedCanvasNodeInitial(): boolean {
    const selectedCanvasNodeId = this.state().selectedCanvasNodeId;

    return selectedCanvasNodeId ? this.canMakeCanvasNodeInitial(selectedCanvasNodeId) : false;
  }

  makeSelectedCanvasNodeInitial(): void {
    const selectedCanvasNodeId = this.state().selectedCanvasNodeId;

    if (!selectedCanvasNodeId) {
      return;
    }

    this.makeCanvasNodeInitial(selectedCanvasNodeId);
  }

  deleteCanvasNode(nodeId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const nodeView = current.machineGraphView.nodes.find((node) => node.nodeId === nodeId);
      const group = nodeView
        ? current.machineGraph.groups.find((item) => item.id === nodeView.groupId)
        : null;
      const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

      if (!nodeView || !group || !node) {
        return current;
      }

      const replacementInitialNode = node.isInitial ? node.next ?? node.previous : null;

      this.removeMachineNodeFromGroup(group, node);

      if (replacementInitialNode) {
        for (const graphGroup of current.machineGraph.groups) {
          this.setInitialNodeInGroup(graphGroup, null);
        }

        replacementInitialNode.isInitial = true;
      }

      const groupIsEmpty = !group.entry && !group.exit;
      const removedGroupIds = new Set(groupIsEmpty ? [group.id] : []);
      const changedGroupIds = new Set([group.id]);
      const shiftedNodes = current.machineGraphView.nodes
        .filter((viewNode) => viewNode.nodeId !== nodeId)
        .map((viewNode) => {
          if (viewNode.groupId !== group.id || viewNode.position.x <= nodeView.position.x) {
            return viewNode;
          }

          return {
            ...viewNode,
            position: {
              ...viewNode.position,
              x: viewNode.position.x - MACHINE_NODE_STEP,
            },
          };
        });
      const remainingGroups = current.machineGraph.groups.filter((item) => !removedGroupIds.has(item.id));
      const initialGroupId = this.getInitialGroupIdAfterNodeDelete(
        current.machineGraph.initialGroupId,
        remainingGroups,
        replacementInitialNode,
        group,
      );

      if (!replacementInitialNode && initialGroupId) {
        const initialGroup = remainingGroups.find((item) => item.id === initialGroupId);
        const initialNode = initialGroup?.entry ?? null;

        if (initialNode) {
          for (const graphGroup of remainingGroups) {
            this.setInitialNodeInGroup(graphGroup, null);
          }

          initialNode.isInitial = true;
        }
      }

      const updatedGroups = current.machineGraphView.groups
        .filter((groupView) => !removedGroupIds.has(groupView.groupId))
        .map((groupView) => {
          if (groupView.groupId !== group.id) {
            return groupView;
          }

          return {
            ...groupView,
            label: formatGroupLabel(group),
            width: Math.max(MACHINE_NODE_STEP, (groupView.width ?? MACHINE_NODE_STEP) - MACHINE_NODE_STEP),
          };
        });
      const updatedNodes = shiftedNodes.map((viewNode) => ({
        ...viewNode,
        initial: this.isMachineNodeInitial(remainingGroups, viewNode.nodeId),
      }));
      const filteredLinks = current.machineGraph.links.filter(
        (link) => !removedGroupIds.has(link.sourceGroup?.id ?? '') && !removedGroupIds.has(link.targetGroup?.id ?? ''),
      );
      const filteredAutolinks = (current.machineGraph.autolinks ?? []).filter(
        (autolink) => autolink.node?.id !== nodeId && !removedGroupIds.has(this.getNodeGroupId(remainingGroups, autolink.node?.id ?? '')),
      );
      const updatedLinkViews = this.refreshLinkViewsForGroups(
        current.machineGraphView.links.filter(
          (link) =>
            link.linkId !== nodeId &&
            !removedGroupIds.has(link.sourceGroupId) &&
            !removedGroupIds.has(link.targetGroupId) &&
            !(link.kind === 'autolink' && !filteredAutolinks.some((autolink) => autolink.id === link.linkId)),
        ),
        [...changedGroupIds],
        updatedNodes,
        remainingGroups,
        filteredAutolinks,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          groups: remainingGroups,
          links: filteredLinks,
          autolinks: filteredAutolinks,
          initialGroupId,
        },
        machineGraphView: {
          ...current.machineGraphView,
          groups: updatedGroups,
          nodes: updatedNodes,
          links: updatedLinkViews,
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  deleteCanvasLink(linkId: string): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => {
      const hasGraphLink = current.machineGraph.links.some((link) => link.id === linkId);
      const hasAutolink = (current.machineGraph.autolinks ?? []).some((autolink) => autolink.id === linkId);
      const hasViewLink = current.machineGraphView.links.some((link) => link.linkId === linkId);

      if (!hasGraphLink && !hasAutolink && !hasViewLink) {
        return current;
      }

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: current.machineGraph.links.filter((link) => link.id !== linkId),
          autolinks: (current.machineGraph.autolinks ?? []).filter((autolink) => autolink.id !== linkId),
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: current.machineGraphView.links.filter((link) => link.linkId !== linkId),
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  deleteSelectedCanvasElement(): void {
    const { selectedCanvasLinkId, selectedCanvasNodeId } = this.state();

    if (this.selectedCanvasNodeIds().size > 0) {
      this.applyRemovedCanvasNodes(this.selectedCanvasNodeIds());
      return;
    }

    if (selectedCanvasNodeId) {
      this.deleteCanvasNode(selectedCanvasNodeId);
      return;
    }

    if (selectedCanvasLinkId) {
      this.deleteCanvasLink(selectedCanvasLinkId);
    }
  }

  moveCanvasLinkVertex(linkId: string, pointIndex: number, delta: ViewPoint): void {
    if (this.state().activeToolId !== 'pointer') {
      return;
    }

    this.state.update((current) => ({
      ...current,
      machineGraphView: {
        ...current.machineGraphView,
        links: current.machineGraphView.links.map((link) => {
          const points = link.points ?? [];

          if (
            link.linkId !== linkId ||
            link.kind === 'autolink' ||
            pointIndex <= 0 ||
            pointIndex >= points.length - 1
          ) {
            return link;
          }

          return {
            ...link,
            points: points.map((point, index) => (index === pointIndex ? this.translatePoint(point, delta) : point)),
          };
        }),
      },
      selectedCanvasLinkId: linkId,
      selectedCanvasNodeId: null,
    }));
    this.markMachineDirty();
  }

  setTapeValue(tapeId: string, value: string): void {
    this.mutateTape(tapeId, (tape) => {
      tape.load(value);
    });
    this.syncCurrentHistorySnapshot();
  }

  setSelectedTapeValue(value: string): void {
    const selectedTape = this.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.setTapeValue(selectedTape.id, value);
  }

  setTapeHeadPosition(tapeId: string, headPosition: number): void {
    this.mutateTape(tapeId, (tape) => {
      tape.setHeadPosition(Math.max(0, headPosition));
    });
    this.syncCurrentHistorySnapshot();
  }

  addTape(): void {
    this.state.update((current) => {
      const nextIndex = getNextTapeIndex(current.tapes);
      const tape = createTapeState(nextIndex);

      return {
        ...current,
        selectedAteNodeId: null,
        tapes: [...current.tapes, tape],
      };
    });
    this.markMachineDirty();
  }

  removeSelectedTape(): boolean {
    if (this.lastTapeReferenceCount() > 0) {
      return false;
    }

    let removed = false;

    this.state.update((current) => {
      if (current.tapes.length <= 1) {
        return current;
      }

      const tapes = current.tapes.slice(0, -1);
      const selectedTapeIndex = Math.min(current.selectedTapeIndex, tapes.length - 1);
      removed = true;

      return {
        ...current,
        selectedTapeIndex,
        selectedAteNodeId: null,
        tapes,
      };
    });

    if (removed) {
      this.markMachineDirty();
    }

    return removed;
  }

  clearSelectedTape(): void {
    const selectedTape = this.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.mutateTape(selectedTape.id, (tape) => {
      tape.clear();
    });
    this.syncCurrentHistorySnapshot();
  }

  clearAllTapes(): void {
    this.state.update((current) => ({
      ...current,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState) => {
        tapeState.tape.clear();

        return { ...tapeState };
      }),
    }));
    this.syncCurrentHistorySnapshot();
  }

  runMachineOnFirstTape(): boolean {
    this.saveActiveDesignMachine();
    this.ateNavigationStack = [];
    const tapes = this.state().tapes;

    if (tapes.length === 0) {
      return false;
    }

    const traceRecorder = new AteTraceRecorder(this.state().selectedMachine.name, { showTapeIndexes: tapes.length > 1 });
    const context = {
      tapes: tapes.map((tapeState) => tapeState.tape),
      metaValues: this.createExecutionMetaValues(),
      maxSteps: this.settingsService.getSettings().burstSize,
      submachines: this.createExecutionSubmachines(),
    };
    const result = this.machineGraphRunner.runBurst(this.state().machineGraph, context, traceRecorder, {
      maxSteps: this.settingsService.getSettings().burstSize,
    });

    if (result.traceTerminalRecorded) {
      // The executed node already recorded a specialized terminal ATE entry.
    } else if (result.status === 'completed') {
      traceRecorder.recordStop();
    } else if (result.status === 'suspended' && result.continuation) {
      traceRecorder.recordExpand(this.createAteContinuationSnapshot(result.continuation, context));
    } else if (result.status === 'nondeterministic' && result.continuations) {
      this.recordNondeterministicContinuations(traceRecorder, result.continuations, context);
    } else if (result.status === 'hanging') {
      traceRecorder.recordHanging();
    } else if (result.status === 'error' || result.status === 'failed') {
      traceRecorder.recordError();
    }

    this.state.update((current) => ({
      ...current,
      ate: traceRecorder.root,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState) => ({ ...tapeState })),
    }));

    return result.status !== 'failed' && result.status !== 'error';
  }

  continueAteExecution(expandNodeId: string): boolean {
    const state = this.state();
    const expandNode = this.findAteNode(state.ate, expandNodeId);

    if (expandNode?.subtrace) {
      this.enterAteSubtrace(expandNode, expandNode.subtrace);
      return true;
    }

    if (
      (expandNode?.kind === 'stop' || expandNode?.kind === 'hanging' || expandNode?.kind === 'error') &&
      this.ateNavigationStack.length > 0
    ) {
      this.exitAteSubtrace();
      return true;
    }

    if (!expandNode?.continuation) {
      return false;
    }

    const context = this.createContinuationExecutionContext(expandNode.continuation);
    const traceRecorder = new AteTraceRecorder(state.selectedMachine.name, {
      root: expandNode,
      showTapeIndexes: state.tapes.length > 1,
      nextEntryId: this.getAteTraceNodes(state.ate).length + 1,
    });
    const result = this.machineGraphRunner.runBurst(state.machineGraph, context, traceRecorder, {
      maxSteps: this.settingsService.getSettings().burstSize,
      startAt: {
        currentGroupId: expandNode.continuation.currentGroupId,
        currentNodeId: expandNode.continuation.currentNodeId,
        phase: expandNode.continuation.phase,
        forcedTransitionId: expandNode.continuation.forcedTransitionId,
      },
    });

    if (result.traceTerminalRecorded) {
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    } else if (result.status === 'completed') {
      traceRecorder.recordStop();
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    } else if (result.status === 'suspended' && result.continuation) {
      traceRecorder.recordExpand(this.createAteContinuationSnapshot(result.continuation, context));
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    } else if (result.status === 'nondeterministic' && result.continuations) {
      this.recordNondeterministicContinuations(traceRecorder, result.continuations, context);
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    } else if (result.status === 'hanging') {
      traceRecorder.recordHanging();
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    } else if (result.status === 'error' || result.status === 'failed') {
      traceRecorder.recordError();
      keepMutableReplayContinuation(expandNode);
      deleteMutableContinuation(expandNode);
    }

    this.state.update((current) => ({
      ...current,
      ate: { ...current.ate },
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState, index) => {
        const snapshot = context.tapes[index]?.getSnapshot();

        if (snapshot) {
          tapeState.tape.restoreSnapshot(snapshot);
        }

        return { ...tapeState };
      }),
    }));

    return result.status !== 'failed' && result.status !== 'error';
  }

  private enterAteSubtrace(parentNode: AteNode, subtrace: AteSubtrace): void {
    const current = this.state();

    this.ateNavigationStack.push({
      activeDesignMachineId: this.activeDesignMachineId,
      ate: current.ate,
      parentAteNodeId: parentNode.id,
      machineGraph: current.machineGraph,
      machineGraphView: current.machineGraphView,
      metaValues: current.metaValues,
      parameterAssignments: current.parameterAssignments,
      selectedAteNodeId: current.selectedAteNodeId,
      selectedCanvasLinkId: current.selectedCanvasLinkId,
      selectedCanvasNodeId: current.selectedCanvasNodeId,
      selectedMachine: current.selectedMachine,
      selectedTapeIndex: current.selectedTapeIndex,
      tapes: this.cloneTapeStates(current.tapes),
    });

    this.state.update((state) => ({
      ...state,
      activeToolId: null,
      ate: subtrace.root,
      machineGraph: subtrace.graph,
      machineGraphView: subtrace.view,
      metaValues: collectMachineMetaValues(subtrace.graph, subtrace.parameterAssignments),
      parameterAssignments: subtrace.parameterAssignments,
      selectedAteNodeId: null,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
      selectedMachine: {
        id: `ate-subtrace-${this.ateNavigationStack.length}`,
        name: subtrace.machineName,
      },
      selectedTapeIndex: 0,
      tapes: this.createTapeStatesFromSnapshots(subtrace.initialTapeSnapshots, subtrace.finalTapeSnapshots),
    }));
  }

  private exitAteSubtrace(): void {
    const current = this.state();
    const frame = this.ateNavigationStack.pop();

    if (!frame) {
      return;
    }

    const frameTapes = this.cloneTapeStates(frame.tapes);
    const parentNode = this.findAteNode(frame.ate, frame.parentAteNodeId);
    const callerTapeIndex = parentNode?.subtrace?.callerTapeIndex;
    const subtraceResultSnapshot = current.tapes[0]?.tape.getSnapshot();

    if (callerTapeIndex !== undefined && subtraceResultSnapshot && frameTapes[callerTapeIndex]) {
      frameTapes[callerTapeIndex].tape.restoreSnapshot(subtraceResultSnapshot);
    }

    this.activeDesignMachineId = frame.activeDesignMachineId;
    this.state.update((state) => ({
      ...state,
      activeToolId: null,
      ate: frame.ate,
      machineGraph: frame.machineGraph,
      machineGraphView: frame.machineGraphView,
      metaValues: frame.metaValues,
      parameterAssignments: frame.parameterAssignments,
      selectedAteNodeId: frame.parentAteNodeId,
      selectedCanvasLinkId: frame.selectedCanvasLinkId,
      selectedCanvasNodeId: frame.selectedCanvasNodeId,
      selectedMachine: frame.selectedMachine,
      selectedTapeIndex: Math.min(frame.selectedTapeIndex, frame.tapes.length - 1),
      tapes: frameTapes,
    }));
  }

  clearAte(): void {
    this.ateNavigationStack = [];
    this.state.update((current) => ({
      ...current,
      ate: new AteTraceRecorder(current.selectedMachine.name).root,
      selectedAteNodeId: null,
    }));
  }

  undo(): void {
    const history = this.getActiveMachineHistory();

    if (history.undoStack.length === 0) {
      return;
    }

    const currentSnapshot = this.captureHistorySnapshot();
    const previousSnapshot = history.undoStack.pop()!;

    history.redoStack.push(currentSnapshot);
    this.applyHistorySnapshot(previousSnapshot);
    history.lastSnapshot = previousSnapshot;
    this.bumpHistoryRevision();
    this.markMachineDirty();
  }

  redo(): void {
    const history = this.getActiveMachineHistory();

    if (history.redoStack.length === 0) {
      return;
    }

    const currentSnapshot = this.captureHistorySnapshot();
    const nextSnapshot = history.redoStack.pop()!;

    history.undoStack.push(currentSnapshot);
    this.applyHistorySnapshot(nextSnapshot);
    history.lastSnapshot = nextSnapshot;
    this.bumpHistoryRevision();
    this.markMachineDirty();
  }

  beginMachineHistoryTransaction(): void {
    const history = this.getActiveMachineHistory();

    if (history.transactionStart) {
      return;
    }

    history.transactionStart = history.lastSnapshot ?? this.captureHistorySnapshot();
  }

  commitMachineHistoryTransaction(): void {
    const history = this.getActiveMachineHistory();

    if (!history.transactionStart) {
      return;
    }

    const transactionStart = history.transactionStart;
    const currentSnapshot = this.captureHistorySnapshot();

    history.transactionStart = null;

    if (!this.areHistorySnapshotsEqual(transactionStart, currentSnapshot)) {
      this.pushUndoSnapshot(history, transactionStart);
      history.redoStack.length = 0;
      history.lastSnapshot = currentSnapshot;
      this.bumpHistoryRevision();
      this.fileService.markDirty();
    }
  }

  exportMachineFile(): JtvFile {
    this.saveActiveDesignMachine();

    return this.createFileFromDesignMachine(this.rootDesignMachineId);
  }

  exportDesignMachineFile(machineId: string): JtvFile | null {
    this.saveActiveDesignMachine();

    return this.designMachines.has(machineId) ? this.createFileFromDesignMachine(machineId) : null;
  }

  importMachineFile(file: JtvFile): void {
    this.importDesignMachineWorkspace(file);
    const rootMachine = this.designMachines.get(this.rootDesignMachineId);

    if (rootMachine) {
      this.loadDesignMachine(rootMachine.id, { saveCurrent: false });
    }

    this.resetHistory();
  }

  createNewMachine(): void {
    const selectedMachine = {
      id: this.createUuid(),
      name: '',
    };
    const emptyMachine = createEmptyMachine();

    this.state.update((current) => ({
      ...current,
      activeToolId: null,
      ate: new AteTraceRecorder(selectedMachine.name).root,
      machineGraph: emptyMachine.graph,
      machineGraphView: emptyMachine.view,
      metaValues: { variables: [], parameters: [] },
      parameterAssignments: {},
      selectedAteNodeId: null,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
      selectedMachine,
      selectedTapeIndex: 0,
      tapes: [createTapeState(1)],
    }));
    this.resetMachineWorkspaceFromCurrentState();
    this.resetHistory();
  }

  reset(): void {
    this.state.set(createInitialState());
    this.resetMachineWorkspaceFromCurrentState();
    this.resetHistory();
  }

  selectDesignMachine(machineId: string): void {
    if (!this.designMachines.has(machineId)) {
      return;
    }

    this.openDesignMachineTab(machineId);

    if (machineId === this.activeDesignMachineId) {
      return;
    }

    this.loadDesignMachine(machineId);
  }

  closeDesignMachineTab(machineId: string): boolean {
    const openTabIds = this.openDesignMachineTabIds();

    if (machineId === this.rootDesignMachineId || !openTabIds.includes(machineId)) {
      return false;
    }

    const closedTabIndex = openTabIds.indexOf(machineId);
    const remainingTabIds = openTabIds.filter((openMachineId) => openMachineId !== machineId);

    this.openDesignMachineTabIds.set(remainingTabIds);

    if (machineId === this.activeDesignMachineId) {
      const nextMachineId = remainingTabIds[Math.min(closedTabIndex, remainingTabIds.length - 1)]
        ?? this.rootDesignMachineId;

      this.loadDesignMachine(nextMachineId);
    } else {
      this.bumpMachineWorkspaceRevision();
    }

    return true;
  }

  isDesignMachineDirty(machineId: string): boolean {
    return this.dirtyDesignMachineIds().has(machineId);
  }

  clearDesignMachineDirtyFlags(): void {
    this.dirtyDesignMachineIds.set(new Set());
  }

  selectChildSubmachineByName(machineName: string | null): void {
    const activeMachine = this.designMachines.get(this.activeDesignMachineId);
    const machineId = activeMachine?.submachineIds.find((submachineId) =>
      this.designMachines.get(submachineId)?.selectedMachine.name === machineName,
    ) ?? null;

    this.setSelectedChildSubmachineId(this.activeDesignMachineId, machineId);
    this.bumpMachineWorkspaceRevision();
  }

  isDesignMachineReferencedByInvoker(machineId: string): boolean {
    this.saveActiveDesignMachine();
    const parent = this.findParentDesignMachine(machineId);

    return parent ? this.hasSubmachineReference(parent.machine, machineId) : false;
  }

  copyDesignMachine(machineId: string): boolean {
    this.saveActiveDesignMachine();

    if (!this.designMachines.has(machineId)) {
      return false;
    }

    this.designMachineClipboard = {
      file: this.createFileFromDesignMachine(machineId),
      operation: 'copy',
    };
    this.bumpDesignMachineClipboardRevision();

    return true;
  }

  cutDesignMachine(machineId: string): boolean {
    this.saveActiveDesignMachine();
    const parent = this.findParentDesignMachine(machineId);

    if (!parent || machineId === this.rootDesignMachineId || this.hasSubmachineReference(parent.machine, machineId)) {
      return false;
    }

    this.designMachineClipboard = {
      file: this.createFileFromDesignMachine(machineId),
      operation: 'cut',
    };
    this.bumpDesignMachineClipboardRevision();

    return this.removeDesignMachineSubtree(machineId, parent);
  }

  pasteDesignMachine(parentMachineId: string): string | null {
    this.saveActiveDesignMachine();
    const parentMachine = this.designMachines.get(parentMachineId);
    const clipboard = this.designMachineClipboard;

    if (!parentMachine || !clipboard) {
      return null;
    }

    const submachine = this.createDesignMachineFromFile(clipboard.file);

    this.ensureUniqueDesignMachineSubtreeNames(submachine.id);
    this.designMachines.set(parentMachine.id, {
      ...parentMachine,
      submachineIds: [...parentMachine.submachineIds, submachine.id],
    });
    this.designMachineClipboard = null;
    this.bumpDesignMachineClipboardRevision();
    this.markDesignMachineDirty(parentMachine.id);
    this.markDesignMachineDirty(submachine.id);
    this.setSelectedChildSubmachineId(parentMachine.id, submachine.id);
    this.activeDesignMachineId = submachine.id;
    this.openDesignMachineTab(submachine.id);
    this.loadDesignMachine(submachine.id, { saveCurrent: false });
    this.bumpMachineWorkspaceRevision();

    return submachine.id;
  }

  deleteDesignMachine(machineId: string): boolean {
    this.saveActiveDesignMachine();
    const parent = this.findParentDesignMachine(machineId);

    if (!parent || machineId === this.rootDesignMachineId || this.hasSubmachineReference(parent.machine, machineId)) {
      return false;
    }

    const deletedMachineIds = this.collectDesignMachineSubtreeIds(machineId);
    const deleted = this.removeDesignMachineSubtree(machineId, parent);

    if (deleted) {
      for (const deletedMachineId of deletedMachineIds) {
        this.machineHistories.delete(deletedMachineId);
      }
      this.removeDesignMachineDirtyFlags(deletedMachineIds);
      this.bumpHistoryRevision();
    }

    return deleted;
  }

  private removeDesignMachineSubtree(
    machineId: string,
    parent: { id: string; machine: JtvDesignMachine },
  ): boolean {
    const deletedMachineIds = this.collectDesignMachineSubtreeIds(machineId);

    this.designMachines.set(parent.id, {
      ...parent.machine,
      submachineIds: parent.machine.submachineIds.filter((submachineId) => submachineId !== machineId),
    });

    for (const deletedMachineId of deletedMachineIds) {
      this.designMachines.delete(deletedMachineId);
    }
    this.openDesignMachineTabIds.update((machineIds) =>
      machineIds.filter((openMachineId) => !deletedMachineIds.includes(openMachineId)),
    );

    const nextMachineId = deletedMachineIds.includes(this.activeDesignMachineId) ? parent.id : this.activeDesignMachineId;
    const updatedParentMachine = this.designMachines.get(parent.id);
    const selectedChildSubmachineId = this.getSelectedChildSubmachineId(parent.machine);

    if (selectedChildSubmachineId && deletedMachineIds.includes(selectedChildSubmachineId)) {
      this.setSelectedChildSubmachineId(parent.id, updatedParentMachine?.submachineIds[0] ?? null);
    }

    for (const deletedMachineId of deletedMachineIds) {
      this.selectedChildSubmachineIdsByParent.delete(deletedMachineId);
    }

    this.loadDesignMachine(nextMachineId, { saveCurrent: false });
    this.removeDesignMachineDirtyFlags(deletedMachineIds);
    this.markDesignMachineDirty(parent.id);
    this.bumpMachineWorkspaceRevision();

    return true;
  }

  addExistingSubmachine(file: JtvFile): void {
    this.saveActiveDesignMachine();

    const submachine = this.createDesignMachineFromFile(file);
    const parentMachine = this.designMachines.get(this.activeDesignMachineId);

    if (!parentMachine) {
      return;
    }

    this.designMachines.set(submachine.id, submachine);
    this.designMachines.set(parentMachine.id, {
      ...parentMachine,
      submachineIds: [...parentMachine.submachineIds, submachine.id],
    });
    this.setSelectedChildSubmachineId(parentMachine.id, submachine.id);
    this.markDesignMachineDirty(parentMachine.id);
    this.markDesignMachineDirty(submachine.id);
    this.activeDesignMachineId = submachine.id;
    this.openDesignMachineTab(submachine.id);
    this.loadDesignMachine(submachine.id, { saveCurrent: false });
    this.bumpMachineWorkspaceRevision();
  }

  addNewSubmachine(properties: Pick<JtvMachineState, 'name' | 'shortName' | 'description'>): void {
    this.saveActiveDesignMachine();

    const parentMachine = this.designMachines.get(this.activeDesignMachineId);

    if (!parentMachine) {
      return;
    }

    const id = this.createUuid();
    const emptyMachine = createEmptyMachine();
    const submachine: JtvDesignMachine = {
      id,
      selectedMachine: {
        id,
        name: properties.name,
        shortName: properties.shortName,
        description: properties.description,
      },
      machineGraph: emptyMachine.graph,
      machineGraphView: emptyMachine.view,
      metaValues: { variables: [], parameters: [] },
      parameterAssignments: {},
      tapeCount: 1,
      submachineIds: [],
    };

    this.designMachines.set(submachine.id, submachine);
    this.designMachines.set(parentMachine.id, {
      ...parentMachine,
      submachineIds: [...parentMachine.submachineIds, submachine.id],
    });
    this.setSelectedChildSubmachineId(parentMachine.id, submachine.id);
    this.markDesignMachineDirty(parentMachine.id);
    this.markDesignMachineDirty(submachine.id);
    this.activeDesignMachineId = submachine.id;
    this.loadDesignMachine(submachine.id, { saveCurrent: false });
    this.bumpMachineWorkspaceRevision();
  }

  getDesignMachineProperties(machineId: string): Pick<JtvMachineState, 'name' | 'shortName' | 'description'> | null {
    const machine = this.designMachines.get(machineId);

    return machine
      ? {
        name: machine.selectedMachine.name,
        shortName: machine.selectedMachine.shortName ?? '',
        description: machine.selectedMachine.description ?? '',
      }
      : null;
  }

  hasDesignMachineName(machineName: string, options: { exceptMachineId?: string } = {}): boolean {
    const normalizedMachineName = machineName.trim().toLocaleUpperCase();

    return Array.from(this.designMachines.values()).some((machine) =>
      machine.id !== options.exceptMachineId &&
      machine.selectedMachine.name.trim().toLocaleUpperCase() === normalizedMachineName,
    );
  }

  updateDesignMachineProperties(
    machineId: string,
    properties: Pick<JtvMachineState, 'name' | 'shortName' | 'description'>,
  ): void {
    this.saveActiveDesignMachine();

    const machine = this.designMachines.get(machineId);

    if (!machine) {
      return;
    }

    const selectedMachine = {
      ...machine.selectedMachine,
      name: properties.name,
      shortName: properties.shortName,
      description: properties.description,
    };

    this.designMachines.set(machineId, {
      ...machine,
      selectedMachine,
    });
    this.updateSubmachineNodeReferences(machineId, properties.name);
    this.markDesignMachineDirty(machineId);

    if (machineId === this.activeDesignMachineId) {
      this.state.update((current) => ({
        ...current,
        ate: {
          ...current.ate,
          label: properties.name,
        },
        selectedMachine,
      }));
    }

    this.bumpMachineWorkspaceRevision();
  }

  private resetMachineWorkspaceFromCurrentState(): void {
    const current = this.state();
    const designMachine = this.createDesignMachineFromState(current, []);

    this.rootDesignMachineId = designMachine.id;
    this.activeDesignMachineId = designMachine.id;
    this.designMachines = new Map([[designMachine.id, designMachine]]);
    this.selectedChildSubmachineIdsByParent.clear();
    this.openDesignMachineTabIds.set([designMachine.id]);
    this.dirtyDesignMachineIds.set(new Set());
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.bumpMachineWorkspaceRevision();
  }

  private importDesignMachineWorkspace(file: JtvFile): void {
    this.designMachines = new Map();
    this.selectedChildSubmachineIdsByParent.clear();
    const rootMachine = this.createDesignMachineFromFile(file);

    this.rootDesignMachineId = rootMachine.id;
    this.activeDesignMachineId = rootMachine.id;
    this.setSelectedChildSubmachineId(rootMachine.id, rootMachine.submachineIds[0] ?? null);
    this.openDesignMachineTabIds.set([rootMachine.id]);
    this.dirtyDesignMachineIds.set(new Set());
  }

  private createDesignMachineFromFile(file: JtvFile): JtvDesignMachine {
    const restored = restoreMachineFromJtvFile(file);
    const submachineIdByOriginalId = new Map<string, string>();
    const submachineIds = restored.submachines.map((submachineFile) => {
      const submachine = this.createDesignMachineFromFile(submachineFile);

      submachineIdByOriginalId.set(submachineFile.machine.id, submachine.id);

      return submachine.id;
    });

    this.remapSubmachineNodeReferences(restored.machineGraph, submachineIdByOriginalId);
    const designMachine = this.createDesignMachineFromRestored(restored, submachineIds);

    this.designMachines.set(designMachine.id, designMachine);

    return designMachine;
  }

  private remapSubmachineNodeReferences(
    machineGraph: MachineGraph,
    submachineIdByOriginalId: ReadonlyMap<string, string>,
  ): void {
    for (const group of machineGraph.groups) {
      for (const node of this.getGroupNodes(group)) {
        if (node instanceof SubmachineNode) {
          node.submachineId = submachineIdByOriginalId.get(node.submachineId) ?? node.submachineId;
        }
      }
    }
  }

  private getGroupNodes(group: MachineGroup): MachineNode[] {
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

  private createDesignMachineFromRestored(
    restored: ReturnType<typeof restoreMachineFromJtvFile>,
    submachineIds: readonly string[],
  ): JtvDesignMachine {
    const id = this.createUniqueDesignMachineId(restored.selectedMachine.id);

    return {
      id,
      selectedMachine: {
        ...restored.selectedMachine,
        id,
      },
      machineGraph: restored.machineGraph,
      machineGraphView: restored.machineGraphView,
      metaValues: restored.metaValues,
      parameterAssignments: restored.parameterAssignments,
      tapeCount: restored.tapeCount,
      submachineIds,
    };
  }

  private createDesignMachineFromState(state: JtvState, submachineIds: readonly string[]): JtvDesignMachine {
    return {
      id: state.selectedMachine.id,
      selectedMachine: state.selectedMachine,
      machineGraph: state.machineGraph,
      machineGraphView: state.machineGraphView,
      metaValues: state.metaValues,
      parameterAssignments: state.parameterAssignments,
      tapeCount: state.tapes.length,
      submachineIds,
    };
  }

  private saveActiveDesignMachine(): void {
    const current = this.state();
    const existing = this.designMachines.get(this.activeDesignMachineId);

    this.designMachines.set(this.activeDesignMachineId, this.createDesignMachineFromState(
      current,
      existing?.submachineIds ?? [],
    ));
    this.bumpMachineWorkspaceRevision();
  }

  private loadDesignMachine(machineId: string, options: { saveCurrent?: boolean } = {}): void {
    this.ateNavigationStack = [];

    if (options.saveCurrent ?? true) {
      this.saveActiveDesignMachine();
    }

    const machine = this.designMachines.get(machineId);

    if (!machine) {
      return;
    }

    const tapes = createTapeStates(machine.tapeCount);

    this.activeDesignMachineId = machine.id;
    this.openDesignMachineTab(machine.id);
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.state.update((current) => ({
      ...current,
      activeToolId: null,
      ate: new AteTraceRecorder(machine.selectedMachine.name).root,
      machineGraph: machine.machineGraph,
      machineGraphView: machine.machineGraphView,
      metaValues: machine.metaValues,
      parameterAssignments: machine.parameterAssignments,
      selectedAteNodeId: null,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
      selectedMachine: machine.selectedMachine,
      selectedTapeIndex: Math.min(current.selectedTapeIndex, tapes.length - 1),
      tapes,
    }));
    this.syncCurrentHistorySnapshot();
    this.bumpMachineWorkspaceRevision();
  }

  private createMachineTreeNode(machineId: string): JtvMachineTreeNode {
    const machine = this.designMachines.get(machineId);

    if (!machine) {
      return {
        id: machineId,
        name: '',
        children: [],
      };
    }

    return {
      id: machine.id,
      name: machine.selectedMachine.name,
      children: machine.submachineIds.map((submachineId) => this.createMachineTreeNode(submachineId)),
    };
  }

  private openDesignMachineTab(machineId: string): void {
    if (!this.designMachines.has(machineId) || this.openDesignMachineTabIds().includes(machineId)) {
      return;
    }

    this.openDesignMachineTabIds.update((machineIds) => [...machineIds, machineId]);
  }

  private getSubmachineShortNameForNodeView(nodeId: string): string | undefined {
    const shortName = this.getSubmachineTooltipForNodeView(nodeId)?.shortName.trim();

    return shortName ? shortName : undefined;
  }

  private getSubmachineTooltipForNodeView(
    nodeId: string,
  ): { name: string; shortName: string; description: string } | undefined {
    const machineNode = this.findMachineNode(nodeId);

    if (!(machineNode instanceof SubmachineNode) || machineNode.name !== 'M') {
      return undefined;
    }

    const machine = this.designMachines.get(machineNode.submachineId)?.selectedMachine;

    return machine
      ? {
        name: machine.name,
        shortName: machine.shortName ?? '',
        description: machine.description ?? '',
      }
      : undefined;
  }

  private getSelectedChildSubmachine(): JtvDesignMachine | null {
    const activeMachine = this.designMachines.get(this.activeDesignMachineId);
    const selectedId = activeMachine ? this.getSelectedChildSubmachineId(activeMachine) : null;

    return selectedId ? this.designMachines.get(selectedId) ?? null : null;
  }

  private getSelectedChildSubmachineId(machine: JtvDesignMachine): string | null {
    const selectedId = this.selectedChildSubmachineIdsByParent.get(machine.id) ?? null;

    return selectedId && machine.submachineIds.includes(selectedId)
      ? selectedId
      : machine.submachineIds[0] ?? null;
  }

  private setSelectedChildSubmachineId(parentMachineId: string, submachineId: string | null): void {
    if (submachineId) {
      this.selectedChildSubmachineIdsByParent.set(parentMachineId, submachineId);
      return;
    }

    this.selectedChildSubmachineIdsByParent.delete(parentMachineId);
  }

  private findParentDesignMachine(machineId: string): { id: string; machine: JtvDesignMachine } | null {
    for (const [id, machine] of this.designMachines.entries()) {
      if (machine.submachineIds.includes(machineId)) {
        return { id, machine };
      }
    }

    return null;
  }

  private hasSubmachineReference(machine: JtvDesignMachine, submachineId: string): boolean {
    return machine.machineGraph.groups.some((group) =>
      getMachineGroupNodes(group).some((node) => node instanceof SubmachineNode && node.submachineId === submachineId),
    );
  }

  private updateSubmachineNodeReferences(submachineId: string, submachineName: string): void {
    for (const machine of this.designMachines.values()) {
      let updated = false;

      for (const group of machine.machineGraph.groups) {
        for (const node of getMachineGroupNodes(group)) {
          if (node instanceof SubmachineNode && node.submachineId === submachineId) {
            node.submachineName = submachineName;
            updated = true;
          }
        }
      }

      if (updated) {
        this.markDesignMachineDirty(machine.id);
      }
    }
  }

  private collectDesignMachineSubtreeIds(machineId: string): string[] {
    const machine = this.designMachines.get(machineId);

    if (!machine) {
      return [machineId];
    }

    return [
      machineId,
      ...machine.submachineIds.flatMap((submachineId) => this.collectDesignMachineSubtreeIds(submachineId)),
    ];
  }

  private ensureUniqueDesignMachineSubtreeNames(machineId: string): void {
    for (const subtreeMachineId of this.collectDesignMachineSubtreeIds(machineId)) {
      const machine = this.designMachines.get(subtreeMachineId);

      if (!machine) {
        continue;
      }

      const baseName = machine.selectedMachine.name;
      let uniqueName = baseName;
      let suffix = 1;

      while (this.hasDesignMachineName(uniqueName, { exceptMachineId: subtreeMachineId })) {
        uniqueName = `${baseName}_${suffix}`;
        suffix++;
      }

      if (uniqueName === baseName) {
        continue;
      }

      this.designMachines.set(subtreeMachineId, {
        ...machine,
        selectedMachine: {
          ...machine.selectedMachine,
          name: uniqueName,
        },
      });
      this.updateSubmachineNodeReferences(subtreeMachineId, uniqueName);
    }
  }

  private createFileFromDesignMachine(machineId: string): JtvFile {
    const machine = this.designMachines.get(machineId);

    if (!machine) {
      return createJtvFileFromState(this.state());
    }

    return createJtvFileFromState({
      selectedMachine: machine.selectedMachine,
      machineGraph: machine.machineGraph,
      machineGraphView: machine.machineGraphView,
      parameterAssignments: machine.parameterAssignments,
      metaValues: machine.metaValues,
      tapes: createTapeStates(machine.tapeCount),
      submachines: machine.submachineIds.map((submachineId) => this.createFileFromDesignMachine(submachineId)),
    });
  }

  private bumpMachineWorkspaceRevision(): void {
    this.machineWorkspaceRevision.update((revision) => revision + 1);
  }

  private bumpDesignMachineClipboardRevision(): void {
    this.designMachineClipboardRevision.update((revision) => revision + 1);
  }

  private bumpCanvasClipboardRevision(): void {
    this.canvasClipboardRevision.update((revision) => revision + 1);
  }

  private createUniqueDesignMachineId(preferredId: string): string {
    let candidate = this.isUuid(preferredId) ? preferredId : this.createUuid();

    while (this.designMachines.has(candidate)) {
      candidate = this.createUuid();
    }

    return candidate;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private patchState(patch: Partial<JtvState>): void {
    this.state.update((current) => ({
      ...current,
      ...patch,
    }));
  }

  private getCanvasClipboardNodeIds(): ReadonlySet<string> {
    if (this.selectedCanvasNodeIds().size > 0) {
      return new Set(this.selectedCanvasNodeIds());
    }

    const selectedNodeId = this.state().selectedCanvasNodeId;

    if (selectedNodeId) {
      return new Set([selectedNodeId]);
    }

    const selectedLinkId = this.state().selectedCanvasLinkId;

    if (!selectedLinkId) {
      return new Set();
    }

    const autolink = (this.state().machineGraph.autolinks ?? []).find((item) => item.id === selectedLinkId);

    if (autolink?.node?.id) {
      return new Set([autolink.node.id]);
    }

    const link = this.state().machineGraph.links.find((item) => item.id === selectedLinkId);
    const nodeIds = [
      ...(link?.sourceGroup ? getMachineGroupNodes(link.sourceGroup).map((node) => node.id) : []),
      ...(link?.targetGroup ? getMachineGroupNodes(link.targetGroup).map((node) => node.id) : []),
    ];

    return new Set(nodeIds);
  }

  private applyRemovedCanvasNodes(removedNodeIds: ReadonlySet<string>): void {
    const restored = removeJtvCanvasNodes(this.state(), removedNodeIds);

    this.state.update((current) => ({
      ...current,
      machineGraph: restored.machineGraph,
      machineGraphView: restored.machineGraphView,
      metaValues: restored.metaValues,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
    }));
    this.selectedCanvasNodeIds.set(new Set());
    this.selectedCanvasLinkIds.set(new Set());
    this.markMachineDirty();
  }

  private canvasRegionIntersectsNode(
    bounds: { x: number; y: number; width: number; height: number },
    node: MachineGraphView['nodes'][number],
  ): boolean {
    const nodeWidth = node.kind === 'hub' ? 12 : node.width ?? Math.max(16, node.label.length * 14);
    const nodeHeight = node.kind === 'hub' ? 12 : node.height ?? 32;
    const nodeLeft = node.kind === 'hub' ? node.position.x - 6 : node.position.x - 5;
    const nodeTop = node.kind === 'hub' ? node.position.y - 6 : node.position.y - 26;

    return (
      nodeLeft < bounds.x + bounds.width &&
      nodeLeft + nodeWidth > bounds.x &&
      nodeTop < bounds.y + bounds.height &&
      nodeTop + nodeHeight > bounds.y
    );
  }

  private markMachineDirty(): void {
    this.refreshMachineMetaValues();
    this.markDesignMachineDirty(this.activeDesignMachineId);
    const history = this.getActiveMachineHistory();

    if (history.transactionStart) {
      return;
    }

    const currentSnapshot = this.captureHistorySnapshot();

    if (history.lastSnapshot && !this.areHistorySnapshotsEqual(history.lastSnapshot, currentSnapshot)) {
      this.pushUndoSnapshot(history, history.lastSnapshot);
      history.redoStack.length = 0;
      history.lastSnapshot = currentSnapshot;
      this.bumpHistoryRevision();
    }
  }

  private markDesignMachineDirty(machineId: string): void {
    this.dirtyDesignMachineIds.update((current) => new Set([...current, machineId]));
    this.fileService.markDirty();
    this.bumpMachineWorkspaceRevision();
  }

  private removeDesignMachineDirtyFlags(machineIds: readonly string[]): void {
    this.dirtyDesignMachineIds.update((current) => {
      const next = new Set(current);

      for (const machineId of machineIds) {
        next.delete(machineId);
      }

      return next;
    });
  }

  private refreshMachineMetaValues(): void {
    this.state.update((current) => {
      const metaValues = collectMachineMetaValues(current.machineGraph, current.parameterAssignments, current.metaValues);

      if (
        metaValues.variables.join('\u0000') === current.metaValues.variables.join('\u0000') &&
        metaValues.parameters.join('\u0000') === current.metaValues.parameters.join('\u0000')
      ) {
        return current;
      }

      return {
        ...current,
        metaValues,
      };
    });
  }

  private resetHistory(): void {
    this.machineHistories = new Map([
      [this.activeDesignMachineId, this.createMachineHistory(this.captureHistorySnapshot())],
    ]);
    this.bumpHistoryRevision();
  }

  private pushUndoSnapshot(history: JtvMachineHistory, snapshot: JtvHistorySnapshot): void {
    history.undoStack.push(snapshot);

    if (history.undoStack.length > JtvStore.MAX_HISTORY_SIZE) {
      history.undoStack.shift();
    }
  }

  private syncCurrentHistorySnapshot(): void {
    const history = this.getActiveMachineHistory();

    history.lastSnapshot = this.captureHistorySnapshot();
    history.transactionStart = null;
    this.bumpHistoryRevision();
  }

  private getActiveMachineHistory(): JtvMachineHistory {
    const existing = this.machineHistories.get(this.activeDesignMachineId);

    if (existing) {
      return existing;
    }

    const history = this.createMachineHistory(this.captureHistorySnapshot());

    this.machineHistories.set(this.activeDesignMachineId, history);

    return history;
  }

  private createMachineHistory(lastSnapshot: JtvHistorySnapshot | null): JtvMachineHistory {
    return {
      undoStack: [],
      redoStack: [],
      lastSnapshot,
      transactionStart: null,
    };
  }

  private captureHistorySnapshot(): JtvHistorySnapshot {
    const current = this.state();

    return {
      file: createJtvFileFromState(current, { preserveIds: true }),
      selectedTapeIndex: current.selectedTapeIndex,
      tapes: current.tapes.map((tapeState) => ({
        id: tapeState.id,
        name: tapeState.name,
        initialSnapshot: tapeState.tape.getInitialSnapshot(),
      })),
    };
  }

  private applyHistorySnapshot(snapshot: JtvHistorySnapshot): void {
    const restored = restoreMachineFromJtvFile(snapshot.file);
    const tapes = snapshot.tapes.length > 0
      ? snapshot.tapes.map((tapeState) => ({
        id: tapeState.id,
        name: tapeState.name,
        tape: Tape.fromInitialSnapshot(tapeState.initialSnapshot),
      }))
      : createTapeStates(restored.tapeCount);

    this.state.update((current) => ({
      ...current,
      activeToolId: null,
      ate: new AteTraceRecorder(restored.selectedMachine.name).root,
      machineGraph: restored.machineGraph,
      machineGraphView: restored.machineGraphView,
      metaValues: restored.metaValues,
      parameterAssignments: restored.parameterAssignments,
      selectedAteNodeId: null,
      selectedCanvasLinkId: null,
      selectedCanvasNodeId: null,
      selectedMachine: restored.selectedMachine,
      selectedTapeIndex: Math.min(snapshot.selectedTapeIndex, tapes.length - 1),
      tapes,
    }));
  }

  private areHistorySnapshotsEqual(left: JtvHistorySnapshot, right: JtvHistorySnapshot): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private bumpHistoryRevision(): void {
    this.historyRevision.update((revision) => revision + 1);
  }

  private mutateTape(tapeId: string, mutate: (tape: Tape) => void): void {
    this.state.update((current) => ({
      ...current,
      selectedAteNodeId: null,
      tapes: current.tapes.map((tapeState) => {
        if (tapeState.id !== tapeId) {
          return tapeState;
        }

        mutate(tapeState.tape);

        return { ...tapeState };
      }),
    }));
  }

  private getFirstConditionClauseOrDefault(condition: LinkCondition | null): ReadConditionClause {
    return condition?.clauses[0]
      ? {
        tapeIndex: condition.clauses[0].tapeIndex,
        acceptedValues: [...condition.clauses[0].acceptedValues],
        negated: condition.clauses[0].negated,
        assignToVariableName: condition.clauses[0].assignToVariableName,
      }
      : {
        tapeIndex: 0,
        acceptedValues: [],
        negated: false,
      };
  }

  private getMachineLinkLabels(graph: MachineGraph, showTapeIndex: boolean): Map<string, string> {
    return new Map([
      ...graph.links.map((link) => [link.id, link.getAteLabel(showTapeIndex)] as const),
      ...(graph.autolinks ?? []).map((autolink) => [autolink.id, autolink.getAteLabel(showTapeIndex)] as const),
    ]);
  }

  private countTapeReferences(graph: MachineGraph, tapeIndex: number): number {
    let count = 0;

    for (const node of this.getMachineNodesById(graph).values()) {
      if (!(node instanceof HubNode) && node.tapeIndex === tapeIndex) {
        count++;
      }
    }

    for (const transition of [...graph.links, ...(graph.autolinks ?? [])]) {
      for (const clause of transition.condition?.clauses ?? []) {
        if (clause.tapeIndex === tapeIndex) {
          count++;
        }
      }
    }

    return count;
  }

  private createLinkConditionFromClause(clause: ReadConditionClause): LinkCondition | null {
    return clause.acceptedValues.length > 0 ? new LinkCondition([clause]) : null;
  }

  private findMachineNodeInGroup(group: MachineGroup, nodeId: string): MachineNode | null {
    const visitedNodeIds = new Set<string>();
    let current = group.entry;

    while (current && !visitedNodeIds.has(current.id)) {
      if (current.id === nodeId) {
        return current;
      }

      visitedNodeIds.add(current.id);

      if (current.id === group.exit?.id) {
        break;
      }

      current = current.next;
    }

    return null;
  }

  private insertMachineNodeBefore(group: MachineGroup, targetNode: MachineNode, insertedNode: MachineNode): void {
    const previousNode = targetNode.previous;

    insertedNode.previous = previousNode;
    insertedNode.next = targetNode;
    targetNode.previous = insertedNode;

    if (previousNode) {
      previousNode.next = insertedNode;
    } else {
      group.entry = insertedNode;
    }

    if (targetNode.isInitial) {
      targetNode.isInitial = false;
      insertedNode.isInitial = true;
    }
  }

  private insertMachineNodeAfter(group: MachineGroup, targetNode: MachineNode, insertedNode: MachineNode): void {
    const nextNode = targetNode.next;

    insertedNode.previous = targetNode;
    insertedNode.next = nextNode;
    targetNode.next = insertedNode;

    if (nextNode) {
      nextNode.previous = insertedNode;
    } else {
      group.exit = insertedNode;
    }
  }

  private removeMachineNodeFromGroup(group: MachineGroup, node: MachineNode): void {
    const previousNode = node.previous;
    const nextNode = node.next;

    if (previousNode) {
      previousNode.next = nextNode;
    } else {
      group.entry = nextNode;
    }

    if (nextNode) {
      nextNode.previous = previousNode;
    } else {
      group.exit = previousNode;
    }

    node.previous = null;
    node.next = null;
    node.isInitial = false;
  }

  private setInitialNodeInGroup(group: MachineGroup, initialNode: MachineNode | null): void {
    const visitedNodeIds = new Set<string>();
    let current = group.entry;

    while (current && !visitedNodeIds.has(current.id)) {
      visitedNodeIds.add(current.id);
      current.isInitial = current.id === initialNode?.id;

      if (current.id === group.exit?.id) {
        break;
      }

      current = current.next;
    }
  }

  private isMachineNodeInitial(groups: readonly MachineGroup[], nodeId: string): boolean {
    const group = groups.find((item) => this.findMachineNodeInGroup(item, nodeId));
    const node = group ? this.findMachineNodeInGroup(group, nodeId) : null;

    return node?.isInitial ?? false;
  }

  private getNodeGroupId(groups: readonly MachineGroup[], nodeId: string): string {
    return groups.find((group) => this.findMachineNodeInGroup(group, nodeId))?.id ?? '';
  }

  private getInitialGroupIdAfterNodeDelete(
    currentInitialGroupId: string,
    remainingGroups: readonly MachineGroup[],
    replacementInitialNode: MachineNode | null,
    deletedNodeGroup: MachineGroup,
  ): string {
    if (replacementInitialNode) {
      return deletedNodeGroup.id;
    }

    if (remainingGroups.some((group) => group.id === currentInitialGroupId)) {
      return currentInitialGroupId;
    }

    return remainingGroups[0]?.id ?? '';
  }

  private refreshLinkViewsForGroups(
    links: readonly MachineLinkView[],
    changedGroupIds: readonly string[],
    nodes: readonly MachineGraphView['nodes'][number][],
    groups: readonly MachineGroup[],
    autolinks: readonly Autolink[],
  ): MachineLinkView[] {
    const changedGroupIdSet = new Set(changedGroupIds);

    return links.map((link) => {
      if (link.kind === 'autolink') {
        const autolink = autolinks.find((item) => item.id === link.linkId);
        const autolinkNode = autolink?.node
          ? nodes.find((node) => node.nodeId === autolink.node?.id)
          : null;

        if (!autolinkNode || !changedGroupIdSet.has(autolinkNode.groupId)) {
          return link;
        }

        return {
          ...link,
          points: [autolinkNode.position],
        };
      }

      const sourceChanged = changedGroupIdSet.has(link.sourceGroupId);
      const targetChanged = changedGroupIdSet.has(link.targetGroupId);

      if (!sourceChanged && !targetChanged) {
        return link;
      }

      const sourceGroup = groups.find((group) => group.id === link.sourceGroupId);
      const targetGroup = groups.find((group) => group.id === link.targetGroupId);
      const sourceNodeView = sourceGroup?.exit
        ? nodes.find((node) => node.nodeId === sourceGroup.exit?.id)
        : null;
      const targetNodeId = link.targetNodeId ?? targetGroup?.entry?.id;
      const targetNodeView = targetNodeId
        ? nodes.find((node) => node.nodeId === targetNodeId)
        : null;
      const points = link.points ?? [];

      if (!points.length) {
        return link;
      }

      return {
        ...link,
        points: points.map((point, index) => {
          if (sourceChanged && index === 0 && sourceNodeView) {
            return this.getNodeRightAnchor(sourceNodeView);
          }

          if (targetChanged && index === points.length - 1 && targetNodeView) {
            return this.getNodeLeftAnchor(targetNodeView);
          }

          return point;
        }),
      };
    });
  }

  private createMachineNodeId(graph: MachineGraph, prefix: string): string {
    return this.createUuid();
  }

  private createMachineGroupId(graph: MachineGraph, prefix: string): string {
    return this.createUuid();
  }

  private createMachineLinkId(graph: MachineGraph, prefix: string): string {
    return this.createUuid();
  }

  private createUuid(): string {
    return globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (placeholder) => {
      const value = Math.floor(Math.random() * 16);
      const digit = placeholder === 'x' ? value : (value & 0x3) | 0x8;

      return digit.toString(16);
    });
  }

  private isInsertableNodeTool(
    toolId: JtvToolId | null,
  ): toolId is 'move-left' | 'move-right' | 'symbol-lowercase' | 'symbol-variable' | 'symbol-uppercase' | 'hub' | 'search-left' | 'search-right' | 'search-left-inverse' | 'search-right-inverse' | 'shift-left' | 'shift-right' | 'submachine' {
    return (
      toolId === 'move-left' ||
      toolId === 'move-right' ||
      toolId === 'symbol-lowercase' ||
      toolId === 'symbol-variable' ||
      toolId === 'symbol-uppercase' ||
      toolId === 'hub' ||
      toolId === 'search-left' ||
      toolId === 'search-right' ||
      toolId === 'search-left-inverse' ||
      toolId === 'search-right-inverse' ||
      toolId === 'shift-left' ||
      toolId === 'shift-right' ||
      toolId === 'submachine'
    );
  }

  private createMachineNodeForTool(
    state: JtvState,
    toolId: 'move-left' | 'move-right' | 'symbol-lowercase' | 'symbol-variable' | 'symbol-uppercase' | 'hub' | 'search-left' | 'search-right' | 'search-left-inverse' | 'search-right-inverse' | 'shift-left' | 'shift-right' | 'submachine',
    tapeIndex: number,
  ): MachineNode | null {
    if (toolId === 'move-left') {
      return new MoveLeftNode(this.createMachineNodeId(state.machineGraph, 'move-left'), tapeIndex);
    }

    if (toolId === 'move-right') {
      return new MoveRightNode(this.createMachineNodeId(state.machineGraph, 'move-right'), tapeIndex);
    }

    if (toolId === 'hub') {
      return new HubNode(this.createMachineNodeId(state.machineGraph, 'hub'), tapeIndex);
    }

    if (toolId === 'search-left') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'search-left'),
        'buscadora_l',
        'BUSCADORA_L',
        'L',
        'A',
        { A: SymbolValue.BLANK },
        tapeIndex,
      );
    }

    if (toolId === 'search-right') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'search-right'),
        'buscadora_r',
        'BUSCADORA_R',
        'R',
        'A',
        { A: SymbolValue.BLANK },
        tapeIndex,
      );
    }

    if (toolId === 'search-left-inverse') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'search-left-inverse'),
        'buscadora_not_l',
        'BUSCADORA_NOT_L',
        'L',
        'A',
        { A: SymbolValue.BLANK },
        tapeIndex,
      );
    }

    if (toolId === 'search-right-inverse') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'search-right-inverse'),
        'buscadora_not_r',
        'BUSCADORA_NOT_R',
        'R',
        'A',
        { A: SymbolValue.BLANK },
        tapeIndex,
      );
    }

    if (toolId === 'shift-left') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'shift-left'),
        'shift_l',
        'SHIFT_L',
        'S',
        '',
        {},
        tapeIndex,
        false,
        'L',
      );
    }

    if (toolId === 'shift-right') {
      return new SubmachineNode(
        this.createMachineNodeId(state.machineGraph, 'shift-right'),
        'shift_r',
        'SHIFT_R',
        'S',
        '',
        {},
        tapeIndex,
        false,
        'R',
      );
    }

    if (toolId === 'submachine') {
      const submachine = this.getSelectedChildSubmachine();

      return submachine
        ? new SubmachineNode(
          this.createMachineNodeId(state.machineGraph, 'submachine'),
          submachine.id,
          submachine.selectedMachine.name,
          'M',
          '',
          {},
          tapeIndex,
        )
        : null;
    }

    if (toolId === 'symbol-variable') {
      return new WriterNode(
        this.createMachineNodeId(state.machineGraph, 'write-variable'),
        state.selectedVariable,
        tapeIndex,
      );
    }

    if (toolId === 'symbol-uppercase') {
      return new WriterNode(
        this.createMachineNodeId(state.machineGraph, 'write-parameter'),
        state.selectedParameter,
        tapeIndex,
      );
    }

    return new WriterNode(
      this.createMachineNodeId(state.machineGraph, 'write-symbol'),
      state.selectedSymbol,
      tapeIndex,
    );
  }

  private getMachineNodeViewKind(node: MachineNode): 'text' | 'parameter' | 'hub' | 'submachine' {
    return getMachineNodeViewKind(node);
  }

  private createLinkBetweenNodes(
    sourceNodeId: string,
    targetNodeId: string,
    condition: LinkCondition | null,
    vertices: readonly ViewPoint[] = [],
  ): void {
    this.state.update((current) => {
      const sourceNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === sourceNodeId);
      const targetNodeView = current.machineGraphView.nodes.find((node) => node.nodeId === targetNodeId);
      const sourceGroup = sourceNodeView
        ? current.machineGraph.groups.find((group) => group.id === sourceNodeView.groupId)
        : null;
      const targetGroup = targetNodeView
        ? current.machineGraph.groups.find((group) => group.id === targetNodeView.groupId)
        : null;
      const targetNode = targetGroup ? this.findMachineNodeInGroup(targetGroup, targetNodeId) : null;

      if (!sourceNodeView || !targetNodeView || !sourceGroup || !targetGroup || !targetNode || sourceGroup.exit?.id !== sourceNodeId) {
        return current;
      }

      const link = new Link(
        this.createMachineLinkId(current.machineGraph, 'link'),
        sourceGroup,
        targetGroup,
        condition,
        targetNode,
      );

      return {
        ...current,
        machineGraph: {
          ...current.machineGraph,
          links: [...current.machineGraph.links, link],
        },
        machineGraphView: {
          ...current.machineGraphView,
          links: [
            ...current.machineGraphView.links,
            createLinkView(link, {
              kind: 'direct',
              label: condition ? undefined : '',
              points: [
                this.getNodeRightAnchor(sourceNodeView),
                ...vertices,
                this.getNodeLeftAnchor(targetNodeView),
              ],
              targetNodeId,
            }),
          ],
        },
        selectedCanvasLinkId: null,
        selectedCanvasNodeId: null,
      };
    });
    this.markMachineDirty();
  }

  private translateLinkForMovedGroup(link: MachineLinkView, groupId: string, delta: ViewPoint): MachineLinkView {
    if (!link.points?.length) {
      return link;
    }

    const sourceMoved = link.sourceGroupId === groupId;
    const targetMoved = link.targetGroupId === groupId;

    if (!sourceMoved && !targetMoved) {
      return link;
    }

    if (sourceMoved && targetMoved) {
      return {
        ...link,
        points: link.points.map((point) => this.translatePoint(point, delta)),
      };
    }

    return {
      ...link,
      points: link.points.map((point, index) => {
        const isSourcePoint = sourceMoved && index === 0;
        const isTargetPoint = targetMoved && index === link.points!.length - 1;

        return isSourcePoint || isTargetPoint ? this.translatePoint(point, delta) : point;
      }),
    };
  }

  private translatePoint(point: ViewPoint, delta: ViewPoint): ViewPoint {
    return {
      x: point.x + delta.x,
      y: point.y + delta.y,
    };
  }

  private getNodeRightAnchor(node: { kind?: string; label: string; position: ViewPoint; width?: number }): ViewPoint {
    if (node.kind === 'hub') {
      return {
        x: node.position.x + 6,
        y: node.position.y,
      };
    }

    const width = node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: node.position.x + width,
      y: node.position.y - 10,
    };
  }

  private getNodeLeftAnchor(node: { kind?: string; position: ViewPoint }): ViewPoint {
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

  private findAteNode(node: AteNode, nodeId: string | null): AteNode | null {
    if (!nodeId) {
      return null;
    }

    if (node.id === nodeId) {
      return node;
    }

    for (const child of node.children) {
      const match = this.findAteNode(child, nodeId);

      if (match) {
        return match;
      }
    }

    return null;
  }

  private replayTapeSnapshotsToAteNode(targetNode: AteNode): readonly TapeSnapshot[] | null {
    const state = this.state();

    if (targetNode.kind === 'root') {
      return state.tapes.map((tapeState) => tapeState.tape.getInitialSnapshot());
    }

    const targetPath = this.findAteNodePath(state.ate, targetNode.id);

    if (!targetPath) {
      return null;
    }

    const continuationAncestor = [...targetPath]
      .reverse()
      .find((node) => node.replayContinuation ?? node.continuation);
    const containerNode = continuationAncestor ?? state.ate;
    const replayContinuation = continuationAncestor?.replayContinuation ?? continuationAncestor?.continuation;
    const baseSnapshots = replayContinuation?.tapeSnapshots ??
      state.tapes.map((tapeState) => tapeState.tape.getInitialSnapshot());

    if (continuationAncestor?.id === targetNode.id) {
      return baseSnapshots;
    }

    const traceNodes = this.getAteTraceNodes(containerNode);
    const targetIndex = traceNodes.findIndex((node) => node.id === targetNode.id);

    if (targetIndex < 0) {
      return null;
    }

    const tapes = state.tapes.map((tapeState, index) =>
      Tape.fromInitialSnapshot(baseSnapshots[index] ?? tapeState.tape.getInitialSnapshot()),
    );
    const context = {
      tapes,
      metaValues: replayContinuation
        ? this.createMetaValuesFromContinuation(replayContinuation)
        : this.createExecutionMetaValues(),
      maxSteps: this.settingsService.getSettings().burstSize,
      submachines: this.createExecutionSubmachines(),
    };
    const machineNodes = this.getMachineNodesById(state.machineGraph);
    const transitions = this.getTransitionsById(state.machineGraph);

    for (let index = 0; index <= targetIndex; index++) {
      const traceNode = traceNodes[index];

      if (traceNode.machineNodeId) {
        const machineNode = machineNodes.get(traceNode.machineNodeId);

        if (!machineNode?.execute(context)) {
          break;
        }
      }

      if (traceNode.linkId) {
        const transition = transitions.get(traceNode.linkId);

        if (!transition?.canTraverse(context)) {
          break;
        }
      }
    }

    return tapes.map((tape) => tape.getSnapshot());
  }

  private findAteNodePath(root: AteNode, nodeId: string): AteNode[] | null {
    if (root.id === nodeId) {
      return [root];
    }

    for (const child of root.children) {
      const childPath = this.findAteNodePath(child, nodeId);

      if (childPath) {
        return [root, ...childPath];
      }
    }

    return null;
  }

  private createAteContinuationSnapshot(
    point: MachineGraphExecutionPoint,
    context: { tapes: readonly Tape[]; metaValues: MetaValueDictionary },
  ): AteContinuationSnapshot {
    return {
      currentGroupId: point.currentGroupId,
      currentNodeId: point.currentNodeId,
      phase: point.phase,
      forcedTransitionId: point.forcedTransitionId,
      tapeSnapshots: context.tapes.map((tape) => tape.getSnapshot()),
      variableAssignments: this.createMetaValueAssignmentsSnapshot(context.metaValues.getVariables()),
      parameterAssignments: this.createMetaValueAssignmentsSnapshot(context.metaValues.getParameters()),
    };
  }

  private recordNondeterministicContinuations(
    traceRecorder: AteTraceRecorder,
    continuations: readonly MachineGraphExecutionPoint[],
    context: { tapes: readonly Tape[]; metaValues: MetaValueDictionary },
  ): void {
    traceRecorder.recordNondeterminism();

    for (const continuation of continuations) {
      traceRecorder.recordExpand(
        this.createAteContinuationSnapshot(continuation, context),
        this.getContinuationTransitionLabel(continuation),
      );
    }
  }

  private getContinuationTransitionLabel(continuation: MachineGraphExecutionPoint): string {
    if (!continuation.forcedTransitionId) {
      return '';
    }

    const showTapeIndexes = this.state().tapes.length > 1;
    const autolink = this.state().machineGraph.autolinks?.find((item) => item.id === continuation.forcedTransitionId);

    if (autolink) {
      return autolink.getAteLabel(showTapeIndexes);
    }

    return this.state().machineGraph.links
      .find((item) => item.id === continuation.forcedTransitionId)
      ?.getAteLabel(showTapeIndexes) ?? '';
  }

  private createContinuationExecutionContext(continuation: AteContinuationSnapshot): {
    tapes: Tape[];
    metaValues: MetaValueDictionary;
    maxSteps: number;
    submachines: ReadonlyMap<string, SubmachineDefinition>;
  } {
    return {
      tapes: this.state().tapes.map((tapeState, index) => {
        const tape = Tape.fromInitialSnapshot(tapeState.tape.getInitialSnapshot());
        const snapshot = continuation.tapeSnapshots[index];

        if (snapshot) {
          tape.restoreSnapshot(snapshot);
        } else {
          tape.clear();
        }

        return tape;
      }),
      metaValues: this.createMetaValuesFromContinuation(continuation),
      maxSteps: this.settingsService.getSettings().burstSize,
      submachines: this.createExecutionSubmachines(),
    };
  }

  private findMachineNode(nodeId: string): MachineNode | null {
    for (const group of this.state().machineGraph.groups) {
      const node = this.findMachineNodeInGroup(group, nodeId);

      if (node) {
        return node;
      }
    }

    return null;
  }

  private cloneTapeStates(tapes: readonly JtvTapeState[]): JtvTapeState[] {
    return tapes.map((tapeState) => {
      const tape = Tape.fromInitialSnapshot(tapeState.tape.getInitialSnapshot());
      tape.restoreSnapshot(tapeState.tape.getSnapshot());

      return {
        ...tapeState,
        tape,
      };
    });
  }

  private createTapeStatesFromSnapshots(
    initialSnapshots: readonly TapeSnapshot[],
    finalSnapshots: readonly TapeSnapshot[],
  ): JtvTapeState[] {
    const count = Math.max(1, initialSnapshots.length, finalSnapshots.length);

    return Array.from({ length: count }, (_, index) => {
      const initialSnapshot = initialSnapshots[index] ?? { headPosition: 0, cells: {} };
      const finalSnapshot = finalSnapshots[index] ?? initialSnapshot;
      const tape = Tape.fromInitialSnapshot(initialSnapshot);
      tape.restoreSnapshot(finalSnapshot);

      return {
        id: `tape-${index + 1}`,
        name: `Cinta ${index + 1}`,
        tape,
      };
    });
  }

  private createExecutionSubmachines(): ReadonlyMap<string, SubmachineDefinition> {
    const submachines = new Map<string, SubmachineDefinition>(this.preinstalledSubmachineService.getSubmachines());

    for (const machine of this.designMachines.values()) {
      submachines.set(machine.id, {
        name: machine.selectedMachine.name,
        graph: machine.machineGraph,
        view: machine.machineGraphView,
        tapeCount: machine.tapeCount,
        parameterAssignments: machine.parameterAssignments,
      });
    }

    return submachines;
  }

  private createMetaValueAssignmentsSnapshot<T extends { isSet(): boolean; resolve(): SymbolValue; getName(): string }>(
    values: ReadonlyMap<string, T>,
  ): Record<string, string> {
    const snapshot: Record<string, string> = {};

    for (const [name, value] of values.entries()) {
      if (value.isSet()) {
        snapshot[name] = value.resolve().getName();
      }
    }

    return snapshot;
  }

  private createMetaValuesFromContinuation(continuation: AteContinuationSnapshot): MetaValueDictionary {
    const metaValues = new MetaValueDictionary();

    for (const [variableName, symbolName] of Object.entries(continuation.variableAssignments)) {
      const symbol = SymbolValue.of(symbolName);

      if (symbol) {
        metaValues.getOrCreateVariable(variableName).setValue(symbol);
      }
    }

    for (const [parameterName, symbolName] of Object.entries(continuation.parameterAssignments)) {
      const symbol = SymbolValue.of(symbolName);

      if (!symbol) {
        continue;
      }

      const parameter = new ParameterValue(parameterName);
      parameter.setValue(symbol);
      metaValues.addParameter(parameter);
    }

    return metaValues;
  }

  private getAteTraceNodes(root: AteNode): AteNode[] {
    return root.children.flatMap((child) => [child, ...this.getAteTraceNodes(child)]);
  }

  private getMachineNodesById(graph: MachineGraph): Map<string, MachineNode> {
    const nodes = new Map<string, MachineNode>();

    for (const group of graph.groups) {
      const visitedNodeIds = new Set<string>();
      let current = group.entry;

      while (current && !visitedNodeIds.has(current.id)) {
        visitedNodeIds.add(current.id);
        nodes.set(current.id, current);

        if (current.id === group.exit?.id) {
          break;
        }

        current = current.next;
      }
    }

    return nodes;
  }

  private getInsertedParameterNames(graph: MachineGraph): string[] {
    const parameters = new Set<string>();

    for (const node of this.getMachineNodesById(graph).values()) {
      if (node instanceof WriterNode && /^[A-Z]$/.test(node.name)) {
        parameters.add(node.name);
      }
    }

    for (const transition of [...graph.links, ...(graph.autolinks ?? [])]) {
      for (const clause of transition.condition?.clauses ?? []) {
        for (const acceptedValue of clause.acceptedValues) {
          if (/^[A-Z]$/.test(acceptedValue)) {
            parameters.add(acceptedValue);
          }
        }
      }
    }

    return Array.from(parameters).sort((left, right) => left.localeCompare(right));
  }

  private createExecutionMetaValues(): MetaValueDictionary {
    const metaValues = new MetaValueDictionary();

    for (const [parameterName, symbolName] of Object.entries(this.state().parameterAssignments)) {
      const symbol = SymbolValue.of(symbolName);

      if (!symbol) {
        continue;
      }

      const parameter = new ParameterValue(parameterName);
      parameter.setValue(symbol);
      metaValues.addParameter(parameter);
    }

    return metaValues;
  }

  private getTransitionsById(graph: MachineGraph): Map<string, Link | Autolink> {
    return new Map<string, Link | Autolink>([
      ...graph.links.map((link) => [link.id, link] as const),
      ...(graph.autolinks ?? []).map((autolink) => [autolink.id, autolink] as const),
    ]);
  }
}
