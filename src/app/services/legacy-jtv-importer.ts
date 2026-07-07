import { Injectable } from '@angular/core';

import { ReadConditionClause } from '../models/core/link-condition';
import { AutolinkOrientation, MachineGraphView, MachineLinkView, MachineNodeView } from '../models/view';
import { JTV_FILE_FORMAT, JTV_FILE_VERSION, JtvFile, JtvMetaValues } from './jtv-file-serializer';

type LegacyNodeKind =
  | 'R'
  | 'L'
  | 'escritora'
  | 'submaquina'
  | 'buscadora-L'
  | 'buscadora-L-NOT'
  | 'buscadora-R'
  | 'buscadora-R-NOT'
  | 'SR'
  | 'SL'
  | 'concentrador';

interface LegacyMachine {
  readonly element: Element;
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
  readonly tapeCount: number;
  readonly principal: boolean;
  readonly dependency: string;
}

interface LegacyNode {
  readonly element: Element;
  readonly kind: LegacyNodeKind;
  readonly id: string;
  readonly previousId: string | null;
  readonly nextId: string | null;
  readonly x: number;
  readonly y: number;
  readonly tapeIndex: number;
  readonly initial: boolean;
}

interface LegacyGroup {
  readonly id: string;
  readonly nodeIds: readonly string[];
}

const NODE_TAGS: readonly LegacyNodeKind[] = [
  'R',
  'L',
  'escritora',
  'submaquina',
  'buscadora-L',
  'buscadora-L-NOT',
  'buscadora-R',
  'buscadora-R-NOT',
  'SR',
  'SL',
  'concentrador',
];

const HELLADA_CHARS = [
  'α',
  'β',
  'γ',
  'δ',
  'ε',
  'ζ',
  'η',
  'θ',
  'ι',
  'κ',
  'λ',
  'μ',
  'ν',
  'ξ',
  'ο',
  'π',
  'ρ',
  'ς',
  'σ',
  'τ',
  'υ',
  'φ',
  'χ',
  'ψ',
  'ω',
] as const;

@Injectable({ providedIn: 'root' })
export class LegacyJtvImporter {
  importXml(xmlText: string): JtvFile {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = document.getElementsByTagName('parsererror')[0];

    if (parserError) {
      throw new Error(parserError.textContent ?? 'Invalid legacy JTV XML.');
    }

    const root = document.documentElement;

    if (!root || root.tagName !== 'jtv') {
      throw new Error('Invalid legacy JTV XML root.');
    }

    const machines = this.getChildElements(root, 'maquina').map((element) => this.parseLegacyMachine(element));
    const mainMachine = machines.find((machine) => machine.principal) ?? machines[0];

    if (!mainMachine) {
      throw new Error('Legacy JTV file does not contain machines.');
    }

    const machineByName = new Map(machines.map((machine) => [machine.name, machine]));

    return this.convertMachine(mainMachine, machineByName, new Set());
  }

  private convertMachine(
    machine: LegacyMachine,
    machineByName: ReadonlyMap<string, LegacyMachine>,
    stack: Set<string>,
  ): JtvFile {
    if (stack.has(machine.name)) {
      return this.createEmptyMachineFile(machine);
    }

    stack.add(machine.name);

    const nodes = this.parseLegacyNodes(machine.element);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const compoundIds = new Set(this.getChildElements(machine.element, 'enlace-compuesto').map((element) => this.attr(element, 'id')));
    const groups = this.inferGroups(machine, nodes, nodeById);
    const groupByNodeId = new Map<string, string>();

    for (const group of groups) {
      for (const nodeId of group.nodeIds) {
        groupByNodeId.set(nodeId, group.id);
      }
    }

    const referencedSubmachineNames = this.collectReferencedCustomSubmachineNames(nodes, machineByName);
    const submachines = Array.from(referencedSubmachineNames)
      .map((name) => machineByName.get(name))
      .filter((submachine): submachine is LegacyMachine => !!submachine)
      .map((submachine) => this.convertMachine(submachine, machineByName, new Set(stack)));
    const submachineIdByName = new Map(submachines.map((submachine) => [submachine.machine.name, submachine.machine.id]));
    const { links, autolinks, viewLinks } = this.convertLinks(machine.element, groupByNodeId, nodeById);
    const viewNodes = nodes.map((node) => this.createNodeView(
      node,
      groupByNodeId.get(node.id) ?? this.groupId(machine, node.id),
      machineByName,
    ));
    const initialNode = nodes.find((node) => node.initial);
    const initialGroupId = initialNode ? groupByNodeId.get(initialNode.id) ?? '' : groups[0]?.id ?? '';
    const metaValues = this.collectMetaValues(machine, nodes, [...links, ...autolinks]);

    stack.delete(machine.name);

    return {
      format: JTV_FILE_FORMAT,
      version: JTV_FILE_VERSION,
      machine: {
        id: this.machineId(machine.name),
        name: machine.name,
        shortName: machine.shortName,
        description: machine.description,
      },
      parameterAssignments: this.parseParameters(machine.element),
      metaValues,
      tapeCount: Math.max(1, machine.tapeCount),
      submachines,
      graph: {
        initialGroupId,
        groups: groups.map((group) => ({
          ...group,
          nodeIds: group.nodeIds.map((nodeId) => this.nodeId(nodeId)),
        })),
        nodes: nodes.map((node) => this.convertNode(node, submachineIdByName)),
        links,
        autolinks,
      },
      view: {
        groups: groups.map((group) => {
          const firstNode = nodeById.get(group.nodeIds[0] ?? '');

          return {
            groupId: group.id,
            position: {
              x: firstNode?.x ?? 0,
              y: firstNode?.y ?? 0,
            },
          };
        }),
        nodes: viewNodes,
        links: viewLinks,
      },
    };
  }

  private createEmptyMachineFile(machine: LegacyMachine): JtvFile {
    return {
      format: JTV_FILE_FORMAT,
      version: JTV_FILE_VERSION,
      machine: {
        id: this.machineId(machine.name),
        name: machine.name,
        shortName: machine.shortName,
        description: machine.description,
      },
      parameterAssignments: this.parseParameters(machine.element),
      metaValues: { variables: [], parameters: [] },
      tapeCount: Math.max(1, machine.tapeCount),
      submachines: [],
      graph: {
        initialGroupId: '',
        groups: [],
        nodes: [],
        links: [],
        autolinks: [],
      },
      view: {
        groups: [],
        nodes: [],
        links: [],
      },
    };
  }

  private parseLegacyMachine(element: Element): LegacyMachine {
    const name = this.attr(element, 'nombre-largo');

    return {
      element,
      id: this.machineId(name),
      name,
      shortName: this.attr(element, 'nombre-corto').slice(0, 4),
      description: this.attr(element, 'descripcion'),
      tapeCount: this.numberAttr(element, 'numero-cintas', 1),
      principal: this.booleanAttr(element, 'principal'),
      dependency: this.attr(element, 'dependencia'),
    };
  }

  private parseLegacyNodes(machineElement: Element): LegacyNode[] {
    return NODE_TAGS.flatMap((tagName) =>
      this.getChildElements(machineElement, tagName).map((element) => ({
        element,
        kind: tagName,
        id: this.attr(element, 'id'),
        previousId: this.nullableAttr(element, 'id-previa'),
        nextId: this.nullableAttr(element, 'id-proxima'),
        x: this.numberAttr(element, 'x', 0),
        y: this.numberAttr(element, 'y', 0),
        tapeIndex: this.numberAttr(element, 'cinta', 0),
        initial: this.booleanAttr(element, 'inicial'),
      })),
    );
  }

  private inferGroups(
    machine: LegacyMachine,
    nodes: readonly LegacyNode[],
    nodeById: ReadonlyMap<string, LegacyNode>,
  ): LegacyGroup[] {
    const visited = new Set<string>();
    const groups: LegacyGroup[] = [];
    const starts = [
      ...nodes.filter((node) => !node.previousId || !nodeById.has(node.previousId)),
      ...nodes,
    ];

    for (const start of starts) {
      if (visited.has(start.id)) {
        continue;
      }

      const nodeIds: string[] = [];
      let current: LegacyNode | undefined = start;

      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        nodeIds.push(current.id);

        current = current.nextId ? nodeById.get(current.nextId) : undefined;
      }

      if (nodeIds.length > 0) {
        groups.push({
          id: this.groupId(machine, nodeIds[0]),
          nodeIds,
        });
      }
    }

    return groups;
  }

  private convertNode(node: LegacyNode, submachineIdByName: ReadonlyMap<string, string>): JtvFile['graph']['nodes'][number] {
    const base = {
      id: this.nodeId(node.id),
      type: this.getNodeType(node),
      name: this.getNodeName(node),
      tapeIndex: node.tapeIndex,
      isInitial: node.initial,
    } as JtvFile['graph']['nodes'][number];

    if (!this.isSubmachineNode(node)) {
      return base;
    }

    const repositoryName = this.attr(node.element, 'nombre-repositorio');
    const preinstalled = this.getPreinstalledSubmachine(repositoryName, node.kind);
    const parameterAssignments = this.parseParameters(node.element);

    return {
      ...base,
      submachineId: preinstalled?.id ?? submachineIdByName.get(repositoryName) ?? this.machineId(repositoryName),
      submachineName: preinstalled?.name ?? repositoryName,
      displaySymbol: preinstalled?.displaySymbol ?? 'M',
      parameterName: preinstalled?.parameterName ?? '',
      submachineParameterAssignments: parameterAssignments,
      displaySubscriptLabel: preinstalled?.displaySubscriptLabel,
    };
  }

  private createNodeView(
    node: LegacyNode,
    groupId: string,
    machineByName: ReadonlyMap<string, LegacyMachine>,
  ): MachineNodeView {
    const customSubmachine = node.kind === 'submaquina'
      ? machineByName.get(this.attr(node.element, 'nombre-repositorio'))
      : undefined;

    return {
      nodeId: this.nodeId(node.id),
      groupId,
      kind: this.getNodeViewKind(node),
      label: this.getNodeName(node),
      subscriptLabel: this.isSubmachineNode(node) ? this.getNodeSubscript(node) : undefined,
      subscriptOverline: node.kind === 'buscadora-L-NOT' || node.kind === 'buscadora-R-NOT',
      submachineShortName: customSubmachine?.shortName,
      submachineTooltip: customSubmachine
        ? {
          name: customSubmachine.name,
          shortName: customSubmachine.shortName,
          description: customSubmachine.description,
        }
        : undefined,
      tapeIndex: node.tapeIndex,
      initial: node.initial,
      position: {
        x: node.x,
        y: node.y,
      },
    };
  }

  private convertLinks(
    machineElement: Element,
    groupByNodeId: ReadonlyMap<string, string>,
    nodeById: ReadonlyMap<string, LegacyNode>,
  ): {
    links: JtvFile['graph']['links'];
    autolinks: JtvFile['graph']['autolinks'];
    viewLinks: MachineLinkView[];
  } {
    const links: Array<JtvFile['graph']['links'][number]> = [];
    const autolinks: Array<JtvFile['graph']['autolinks'][number]> = [];
    const viewLinks: MachineLinkView[] = [];

    for (const compound of this.getChildElements(machineElement, 'enlace-compuesto')) {
      const sourceNodeId = this.attr(compound, 'id-previa');
      const sourceGroupId = groupByNodeId.get(sourceNodeId) ?? '';

      for (const link of this.getChildElements(compound, 'enlace')) {
        const linkSourceNodeId = nodeById.has(this.attr(link, 'id-previa'))
          ? this.attr(link, 'id-previa')
          : sourceNodeId;
        const targetNodeId = this.attr(link, 'id-proxima');
        const sourceGroupId = groupByNodeId.get(linkSourceNodeId) ?? '';
        const targetGroupId = groupByNodeId.get(targetNodeId) ?? '';
        const linkId = this.linkId(this.attr(link, 'id'));
        const sourceNode = nodeById.get(linkSourceNodeId) ?? null;
        const targetNode = nodeById.get(targetNodeId) ?? null;
        const vertices = this.getChildElements(link, 'punto').map((point) => ({
          x: this.numberAttr(point, 'x', 0),
          y: this.numberAttr(point, 'y', 0),
        }));

        links.push({
          id: linkId,
          sourceGroupId,
          targetGroupId,
          targetNodeId: this.nodeId(targetNodeId),
          condition: this.convertCondition(link),
        });
        viewLinks.push({
          linkId,
          kind: 'direct',
          sourceGroupId,
          targetGroupId,
          targetNodeId: this.nodeId(targetNodeId),
          points: sourceNode && targetNode
            ? [
              this.getNodeRightAnchor(sourceNode),
              ...vertices,
              this.getNodeLeftAnchor(targetNode),
            ]
            : vertices,
        });
      }

      for (const autolink of this.getChildElements(compound, 'auto-enlace')) {
        const nodeId = this.attr(autolink, 'id-previa');
        const groupId = groupByNodeId.get(nodeId) ?? '';
        const linkId = this.linkId(this.attr(autolink, 'id'));
        const node = nodeById.get(nodeId) ?? null;

        autolinks.push({
          id: linkId,
          nodeId: this.nodeId(nodeId),
          condition: this.convertCondition(autolink),
        });
        viewLinks.push({
          linkId,
          kind: 'autolink',
          autolinkOrientation: this.normalizeAutolinkOrientation(this.attr(autolink, 'orientacion')),
          sourceGroupId: groupId,
          targetGroupId: groupId,
          targetNodeId: this.nodeId(nodeId),
          points: node ? [{ x: node.x, y: node.y }] : undefined,
        });
      }
    }

    return { links, autolinks, viewLinks };
  }

  private convertCondition(element: Element): { clauses: readonly ReadConditionClause[] } | null {
    const clauses = this.getChildElements(element, 'condicion').map((condition) => ({
      tapeIndex: this.numberAttr(condition, 'cinta', 0),
      negated: this.booleanAttr(condition, 'not'),
      assignToVariableName: this.decodeLegacySymbol(this.attr(condition, 'operando-izquierdo')) || undefined,
      acceptedValues: this.getChildElements(condition, 'operando-derecho').map((operand) =>
        this.decodeLegacySymbol(this.attr(operand, 'nombre')),
      ),
    }));

    return clauses.length > 0 ? { clauses } : null;
  }

  private collectMetaValues(
    machine: LegacyMachine,
    nodes: readonly LegacyNode[],
    transitions: readonly ({ condition: { clauses: readonly ReadConditionClause[] } | null })[],
  ): JtvMetaValues {
    const variables = new Set<string>();
    const parameters = new Set<string>();

    for (const parameterName of Object.keys(this.parseParameters(machine.element))) {
      parameters.add(parameterName);
    }

    for (const node of nodes) {
      const nodeName = this.getNodeName(node);

      if (node.kind === 'escritora' && /^[A-Z]$/.test(nodeName)) {
        parameters.add(nodeName);
      } else if (node.kind === 'escritora' && this.isLegacyVariableName(nodeName)) {
        variables.add(nodeName);
      }

      for (const parameterName of Object.keys(this.parseParameters(node.element))) {
        parameters.add(parameterName);
      }
    }

    for (const transition of transitions) {
      for (const clause of transition.condition?.clauses ?? []) {
        if (clause.assignToVariableName) {
          variables.add(clause.assignToVariableName);
        }

        for (const acceptedValue of clause.acceptedValues) {
          if (/^[A-Z]$/.test(acceptedValue)) {
            parameters.add(acceptedValue);
          } else if (this.isLegacyVariableName(acceptedValue)) {
            variables.add(acceptedValue);
          }
        }
      }
    }

    return {
      variables: Array.from(variables).sort((left, right) => left.localeCompare(right)),
      parameters: Array.from(parameters).sort((left, right) => left.localeCompare(right)),
    };
  }

  private collectReferencedCustomSubmachineNames(
    nodes: readonly LegacyNode[],
    machineByName: ReadonlyMap<string, LegacyMachine>,
  ): Set<string> {
    const names = new Set<string>();

    for (const node of nodes) {
      if (node.kind !== 'submaquina') {
        continue;
      }

      const repositoryName = this.attr(node.element, 'nombre-repositorio');

      if (machineByName.has(repositoryName)) {
        names.add(repositoryName);
      }
    }

    return names;
  }

  private getNodeType(node: LegacyNode): JtvFile['graph']['nodes'][number]['type'] {
    if (node.kind === 'R') {
      return 'move-right';
    }

    if (node.kind === 'L') {
      return 'move-left';
    }

    if (node.kind === 'concentrador') {
      return 'hub';
    }

    return this.isSubmachineNode(node) ? 'submachine' : 'writer';
  }

  private getNodeViewKind(node: LegacyNode): MachineNodeView['kind'] {
    if (node.kind === 'concentrador') {
      return 'hub';
    }

    if (this.isSubmachineNode(node)) {
      return 'submachine';
    }

    return node.kind === 'escritora' && /^[A-Z]$/.test(this.getNodeName(node)) ? 'parameter' : 'text';
  }

  private getNodeName(node: LegacyNode): string {
    if (node.kind === 'R') {
      return 'R';
    }

    if (node.kind === 'L') {
      return 'L';
    }

    if (node.kind === 'concentrador') {
      return 'hub';
    }

    if (node.kind === 'escritora') {
      return this.decodeLegacySymbol(this.attr(node.element, 'nombre'));
    }

    return this.getPreinstalledSubmachine(this.attr(node.element, 'nombre-repositorio'), node.kind)?.displaySymbol ?? 'M';
  }

  private getNodeRightAnchor(node: LegacyNode): { x: number; y: number } {
    if (node.kind === 'concentrador') {
      return {
        x: node.x + 6,
        y: node.y,
      };
    }

    const nodeName = this.getNodeName(node);
    const width = Math.max(16, nodeName.length * 14);

    return {
      x: node.x + width,
      y: node.y - 10,
    };
  }

  private getNodeLeftAnchor(node: LegacyNode): { x: number; y: number } {
    if (node.kind === 'concentrador') {
      return {
        x: node.x - 6,
        y: node.y,
      };
    }

    return {
      x: node.x - 5,
      y: node.y - 10,
    };
  }

  private getNodeSubscript(node: LegacyNode): string | undefined {
    if (!this.isSubmachineNode(node)) {
      return undefined;
    }

    return this.getPreinstalledSubmachine(this.attr(node.element, 'nombre-repositorio'), node.kind)?.displaySubscriptLabel ??
      this.parseParameters(node.element)['A'];
  }

  private isSubmachineNode(node: LegacyNode): boolean {
    return [
      'submaquina',
      'buscadora-L',
      'buscadora-L-NOT',
      'buscadora-R',
      'buscadora-R-NOT',
      'SR',
      'SL',
    ].includes(node.kind);
  }

  private getPreinstalledSubmachine(
    repositoryName: string,
    kind: LegacyNodeKind,
  ): { id: string; name: string; displaySymbol: string; parameterName: string; displaySubscriptLabel?: string } | null {
    if (kind === 'buscadora-L') {
      return { id: 'buscadora_l', name: 'BUSCADORA_L', displaySymbol: 'L', parameterName: 'A' };
    }

    if (kind === 'buscadora-L-NOT') {
      return { id: 'buscadora_not_l', name: 'BUSCADORA_NOT_L', displaySymbol: 'L', parameterName: 'A' };
    }

    if (kind === 'buscadora-R') {
      return { id: 'buscadora_r', name: 'BUSCADORA_R', displaySymbol: 'R', parameterName: 'A' };
    }

    if (kind === 'buscadora-R-NOT') {
      return { id: 'buscadora_not_r', name: 'BUSCADORA_NOT_R', displaySymbol: 'R', parameterName: 'A' };
    }

    if (kind === 'SL' || repositoryName === 'SHIFT_L') {
      return { id: 'shift_l', name: 'SHIFT_L', displaySymbol: 'S', parameterName: '', displaySubscriptLabel: 'L' };
    }

    if (kind === 'SR' || repositoryName === 'SHIFT_R') {
      return { id: 'shift_r', name: 'SHIFT_R', displaySymbol: 'S', parameterName: '', displaySubscriptLabel: 'R' };
    }

    return null;
  }

  private parseParameters(element: Element): Record<string, string> {
    return Object.fromEntries(
      this.getChildElements(element, 'parametro').map((parameter) => [
        this.attr(parameter, 'nombre'),
        this.decodeLegacySymbol(this.attr(parameter, 'valor')),
      ]),
    );
  }

  private decodeLegacySymbol(value: string): string {
    const match = /^HELLADA_(\d+)$/.exec(value);

    if (!match) {
      return value;
    }

    return HELLADA_CHARS[Number(match[1])] ?? value;
  }

  private normalizeAutolinkOrientation(value: string): AutolinkOrientation {
    const normalized = value.toLowerCase();

    if (normalized === '0') {
      return 'top';
    }

    if (normalized === '1') {
      return 'bottom';
    }

    if (normalized === '2') {
      return 'right';
    }

    if (normalized === '3') {
      return 'left';
    }

    if (normalized.includes('izq') || normalized === 'left') {
      return 'left';
    }

    if (normalized.includes('der') || normalized === 'right') {
      return 'right';
    }

    if (normalized.includes('abajo') || normalized === 'bottom') {
      return 'bottom';
    }

    return 'top';
  }

  private getChildElements(element: Element, tagName: string): Element[] {
    return Array.from(element.children).filter((child) => child.tagName === tagName);
  }

  private attr(element: Element, name: string): string {
    return element.getAttribute(name)?.trim() ?? '';
  }

  private nullableAttr(element: Element, name: string): string | null {
    const value = this.attr(element, name);

    return !value || value === 'null' ? null : value;
  }

  private numberAttr(element: Element, name: string, fallback: number): number {
    const value = Number(this.attr(element, name));

    return Number.isFinite(value) ? value : fallback;
  }

  private booleanAttr(element: Element, name: string): boolean {
    return this.attr(element, name) === 'true';
  }

  private machineId(machineName: string): string {
    return `legacy-machine-${this.sanitizeId(machineName)}`;
  }

  private groupId(machine: LegacyMachine, nodeId: string): string {
    return `legacy-group-${this.sanitizeId(machine.name)}-${nodeId}`;
  }

  private nodeId(nodeId: string): string {
    return `legacy-node-${nodeId}`;
  }

  private linkId(linkId: string): string {
    return `legacy-link-${linkId}`;
  }

  private sanitizeId(value: string): string {
    return value.trim().replace(/[^A-Za-z0-9_]+/g, '_') || 'unnamed';
  }

  private isLegacyVariableName(value: string): boolean {
    return /^HELLADA_\d+$/.test(value) || /^[\u0370-\u03ff]+$/.test(value);
  }
}
