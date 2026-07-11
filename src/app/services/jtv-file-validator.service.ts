import { Injectable } from '@angular/core';

import { JTV_FILE_FORMAT, JTV_FILE_VERSION, type JtvFile } from './jtv-file-serializer';

type ValidationPath = string;

const PREINSTALLED_SUBMACHINE_IDS = new Set([
  'buscadora_l',
  'buscadora_r',
  'buscadora_not_l',
  'buscadora_not_r',
  'shift_l',
  'shift_r',
]);

const NODE_TYPES = new Set(['writer', 'move-left', 'move-right', 'hub', 'submachine']);

export class JtvFileValidationError extends Error {
  constructor(readonly errors: readonly string[]) {
    super(errors.join('\n'));
    this.name = 'JtvFileValidationError';
  }
}

@Injectable({ providedIn: 'root' })
export class JtvFileValidatorService {
  validate(file: unknown): asserts file is JtvFile {
    const errors: string[] = [];

    this.validateFile(file, '$', errors);

    if (errors.length > 0) {
      throw new JtvFileValidationError(errors);
    }
  }

  private validateFile(file: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(file)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    if (file['format'] !== JTV_FILE_FORMAT) {
      errors.push(`${path}.format: formato JTV inválido`);
    }

    if (file['version'] !== JTV_FILE_VERSION) {
      errors.push(`${path}.version: versión JTV inválida`);
    }

    this.validateMachine(file['machine'], `${path}.machine`, errors);
    this.validateStringRecord(file['parameterAssignments'], `${path}.parameterAssignments`, errors);
    this.validateMetaValues(file['metaValues'], `${path}.metaValues`, errors);

    if (!this.isNonNegativeInteger(file['tapeCount']) || file['tapeCount'] < 1) {
      errors.push(`${path}.tapeCount: debe ser un entero mayor o igual a 1`);
    }

    this.validateGraphShape(file['graph'], `${path}.graph`, errors);
    this.validateViewShape(file['view'], `${path}.view`, errors);

    const submachines = file['submachines'];

    if (submachines !== undefined && !Array.isArray(submachines)) {
      errors.push(`${path}.submachines: debe ser un arreglo`);
    }

    if (Array.isArray(submachines)) {
      submachines.forEach((submachine, index) => {
        this.validateFile(submachine, `${path}.submachines[${index}]`, errors);
      });
    }

    if (this.isRecord(file['graph']) && this.isRecord(file['view']) && this.isNonNegativeInteger(file['tapeCount'])) {
      this.validateGraphSemantics(file as unknown as JtvFile, path, errors);
    }
  }

  private validateMachine(machine: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(machine)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(machine['id'], `${path}.id`, errors, { allowEmpty: false });
    this.expectString(machine['name'], `${path}.name`, errors);

    if (machine['shortName'] !== undefined) {
      this.expectString(machine['shortName'], `${path}.shortName`, errors);
    }

    if (machine['description'] !== undefined) {
      this.expectString(machine['description'], `${path}.description`, errors);
    }
  }

  private validateMetaValues(metaValues: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(metaValues)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.validateStringArray(metaValues['variables'], `${path}.variables`, errors);
    this.validateStringArray(metaValues['parameters'], `${path}.parameters`, errors);
  }

  private validateGraphShape(graph: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(graph)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(graph['initialGroupId'], `${path}.initialGroupId`, errors);

    if (!Array.isArray(graph['groups'])) {
      errors.push(`${path}.groups: debe ser un arreglo`);
    } else {
      graph['groups'].forEach((group, index) => this.validateGroupShape(group, `${path}.groups[${index}]`, errors));
    }

    if (!Array.isArray(graph['nodes'])) {
      errors.push(`${path}.nodes: debe ser un arreglo`);
    } else {
      graph['nodes'].forEach((node, index) => this.validateNodeShape(node, `${path}.nodes[${index}]`, errors));
    }

    if (!Array.isArray(graph['links'])) {
      errors.push(`${path}.links: debe ser un arreglo`);
    } else {
      graph['links'].forEach((link, index) => this.validateLinkShape(link, `${path}.links[${index}]`, errors));
    }

    if (!Array.isArray(graph['autolinks'])) {
      errors.push(`${path}.autolinks: debe ser un arreglo`);
    } else {
      graph['autolinks'].forEach((autolink, index) =>
        this.validateAutolinkShape(autolink, `${path}.autolinks[${index}]`, errors),
      );
    }
  }

  private validateGroupShape(group: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(group)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(group['id'], `${path}.id`, errors, { allowEmpty: false });
    this.validateStringArray(group['nodeIds'], `${path}.nodeIds`, errors);
  }

  private validateNodeShape(node: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(node)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(node['id'], `${path}.id`, errors, { allowEmpty: false });
    this.expectString(node['name'], `${path}.name`, errors);

    if (typeof node['type'] !== 'string' || !NODE_TYPES.has(node['type'])) {
      errors.push(`${path}.type: tipo de nodo inválido`);
    }

    if (!this.isNonNegativeInteger(node['tapeIndex'])) {
      errors.push(`${path}.tapeIndex: debe ser un entero mayor o igual a 0`);
    }

    if (typeof node['isInitial'] !== 'boolean') {
      errors.push(`${path}.isInitial: debe ser booleano`);
    }

    for (const key of ['submachineId', 'submachineName', 'displaySymbol', 'parameterName', 'displaySubscriptLabel']) {
      if (node[key] !== undefined) {
        this.expectString(node[key], `${path}.${key}`, errors);
      }
    }

    if (node['submachineParameterAssignments'] !== undefined) {
      this.validateStringRecord(node['submachineParameterAssignments'], `${path}.submachineParameterAssignments`, errors);
    }
  }

  private validateLinkShape(link: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(link)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(link['id'], `${path}.id`, errors, { allowEmpty: false });
    this.expectStringOrNull(link['sourceGroupId'], `${path}.sourceGroupId`, errors);
    this.expectStringOrNull(link['targetGroupId'], `${path}.targetGroupId`, errors);

    if (link['targetNodeId'] !== undefined) {
      this.expectStringOrNull(link['targetNodeId'], `${path}.targetNodeId`, errors);
    }

    this.validateCondition(link['condition'], `${path}.condition`, errors);
  }

  private validateAutolinkShape(autolink: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(autolink)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    this.expectString(autolink['id'], `${path}.id`, errors, { allowEmpty: false });
    this.expectStringOrNull(autolink['nodeId'], `${path}.nodeId`, errors);
    this.validateCondition(autolink['condition'], `${path}.condition`, errors);
  }

  private validateCondition(condition: unknown, path: ValidationPath, errors: string[]): void {
    if (condition === null) {
      return;
    }

    if (!this.isRecord(condition)) {
      errors.push(`${path}: debe ser null u objeto`);
      return;
    }

    if (!Array.isArray(condition['clauses'])) {
      errors.push(`${path}.clauses: debe ser un arreglo`);
      return;
    }

    condition['clauses'].forEach((clause, index) => {
      const clausePath = `${path}.clauses[${index}]`;

      if (!this.isRecord(clause)) {
        errors.push(`${clausePath}: debe ser un objeto`);
        return;
      }

      if (!this.isNonNegativeInteger(clause['tapeIndex'])) {
        errors.push(`${clausePath}.tapeIndex: debe ser un entero mayor o igual a 0`);
      }

      this.validateStringArray(clause['acceptedValues'], `${clausePath}.acceptedValues`, errors);

      if (typeof clause['negated'] !== 'boolean') {
        errors.push(`${clausePath}.negated: debe ser booleano`);
      }

      if (clause['assignToVariableName'] !== undefined) {
        this.expectString(clause['assignToVariableName'], `${clausePath}.assignToVariableName`, errors);
      }
    });
  }

  private validateViewShape(view: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(view)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    if (!Array.isArray(view['groups'])) {
      errors.push(`${path}.groups: debe ser un arreglo`);
    }

    if (!Array.isArray(view['nodes'])) {
      errors.push(`${path}.nodes: debe ser un arreglo`);
    }

    if (!Array.isArray(view['links'])) {
      errors.push(`${path}.links: debe ser un arreglo`);
    }
  }

  private validateGraphSemantics(file: JtvFile, path: ValidationPath, errors: string[]): void {
    const groupIds = this.getUniqueIds(file.graph.groups.map((group) => group.id), `${path}.graph.groups`, errors);
    const nodeIds = this.getUniqueIds(file.graph.nodes.map((node) => node.id), `${path}.graph.nodes`, errors);
    const linkIds = this.getUniqueIds(
      [...file.graph.links.map((link) => link.id), ...file.graph.autolinks.map((autolink) => autolink.id)],
      `${path}.graph.links`,
      errors,
    );
    void linkIds;

    if (!groupIds.has(file.graph.initialGroupId)) {
      errors.push(`${path}.graph.initialGroupId: referencia a un grupo inexistente`);
    }

    const nodeOwnerGroup = new Map<string, string>();

    for (const group of file.graph.groups) {
      if (group.nodeIds.length === 0) {
        errors.push(`${path}.graph.groups(${group.id}).nodeIds: el grupo debe tener al menos un nodo`);
      }

      for (const nodeId of group.nodeIds) {
        if (!nodeIds.has(nodeId)) {
          errors.push(`${path}.graph.groups(${group.id}).nodeIds: referencia al nodo inexistente ${nodeId}`);
          continue;
        }

        if (nodeOwnerGroup.has(nodeId)) {
          errors.push(`${path}.graph.groups: el nodo ${nodeId} aparece en más de un grupo`);
        }

        nodeOwnerGroup.set(nodeId, group.id);
      }
    }

    for (const node of file.graph.nodes) {
      if (!nodeOwnerGroup.has(node.id)) {
        errors.push(`${path}.graph.nodes(${node.id}): el nodo no pertenece a ningún grupo`);
      }

      if (node.type !== 'hub' && node.tapeIndex >= file.tapeCount) {
        errors.push(`${path}.graph.nodes(${node.id}).tapeIndex: referencia a una cinta inexistente`);
      }

      if (node.type === 'submachine') {
        this.validateSubmachineReference(file, node, `${path}.graph.nodes(${node.id})`, errors);
      }
    }

    for (const link of file.graph.links) {
      if (link.sourceGroupId !== null && !groupIds.has(link.sourceGroupId)) {
        errors.push(`${path}.graph.links(${link.id}).sourceGroupId: referencia a un grupo inexistente`);
      }

      if (link.targetGroupId !== null && !groupIds.has(link.targetGroupId)) {
        errors.push(`${path}.graph.links(${link.id}).targetGroupId: referencia a un grupo inexistente`);
      }

      if (link.targetNodeId) {
        if (!nodeIds.has(link.targetNodeId)) {
          errors.push(`${path}.graph.links(${link.id}).targetNodeId: referencia a un nodo inexistente`);
        } else if (link.targetGroupId && nodeOwnerGroup.get(link.targetNodeId) !== link.targetGroupId) {
          errors.push(`${path}.graph.links(${link.id}).targetNodeId: el nodo destino no pertenece al grupo destino`);
        }
      }

      this.validateConditionTapeIndexes(link.condition, file.tapeCount, `${path}.graph.links(${link.id}).condition`, errors);
    }

    for (const autolink of file.graph.autolinks) {
      if (autolink.nodeId !== null && !nodeIds.has(autolink.nodeId)) {
        errors.push(`${path}.graph.autolinks(${autolink.id}).nodeId: referencia a un nodo inexistente`);
      }

      this.validateConditionTapeIndexes(
        autolink.condition,
        file.tapeCount,
        `${path}.graph.autolinks(${autolink.id}).condition`,
        errors,
      );
    }

    this.validateViewReferences(file, groupIds, nodeIds, `${path}.view`, errors);
  }

  private validateSubmachineReference(
    file: JtvFile,
    node: JtvFile['graph']['nodes'][number],
    path: ValidationPath,
    errors: string[],
  ): void {
    const submachineId = node.submachineId;

    if (!submachineId || PREINSTALLED_SUBMACHINE_IDS.has(submachineId)) {
      return;
    }

    const childSubmachineIds = new Set((file.submachines ?? []).map((submachine) => submachine.machine.id));

    if (!childSubmachineIds.has(submachineId)) {
      errors.push(`${path}.submachineId: referencia a una submáquina inexistente`);
    }
  }

  private validateConditionTapeIndexes(
    condition: JtvFile['graph']['links'][number]['condition'],
    tapeCount: number,
    path: ValidationPath,
    errors: string[],
  ): void {
    for (const [index, clause] of (condition?.clauses ?? []).entries()) {
      if (clause.tapeIndex >= tapeCount) {
        errors.push(`${path}.clauses[${index}].tapeIndex: referencia a una cinta inexistente`);
      }
    }
  }

  private validateViewReferences(
    file: JtvFile,
    groupIds: ReadonlySet<string>,
    nodeIds: ReadonlySet<string>,
    path: ValidationPath,
    errors: string[],
  ): void {
    for (const groupView of file.view.groups) {
      if (!groupIds.has(groupView.groupId)) {
        errors.push(`${path}.groups(${groupView.groupId}): referencia a un grupo inexistente`);
      }
    }

    for (const nodeView of file.view.nodes) {
      if (!nodeIds.has(nodeView.nodeId)) {
        errors.push(`${path}.nodes(${nodeView.nodeId}): referencia a un nodo inexistente`);
      }

      if (!groupIds.has(nodeView.groupId)) {
        errors.push(`${path}.nodes(${nodeView.nodeId}).groupId: referencia a un grupo inexistente`);
      }
    }
  }

  private getUniqueIds(ids: readonly string[], path: ValidationPath, errors: string[]): ReadonlySet<string> {
    const uniqueIds = new Set<string>();

    for (const id of ids) {
      if (uniqueIds.has(id)) {
        errors.push(`${path}: id duplicado ${id}`);
      }

      uniqueIds.add(id);
    }

    return uniqueIds;
  }

  private validateStringRecord(value: unknown, path: ValidationPath, errors: string[]): void {
    if (!this.isRecord(value)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }

    for (const [key, item] of Object.entries(value)) {
      if (typeof item !== 'string') {
        errors.push(`${path}.${key}: debe ser string`);
      }
    }
  }

  private validateStringArray(value: unknown, path: ValidationPath, errors: string[]): void {
    if (!Array.isArray(value)) {
      errors.push(`${path}: debe ser un arreglo`);
      return;
    }

    value.forEach((item, index) => {
      if (typeof item !== 'string') {
        errors.push(`${path}[${index}]: debe ser string`);
      }
    });
  }

  private expectString(
    value: unknown,
    path: ValidationPath,
    errors: string[],
    options: { allowEmpty?: boolean } = {},
  ): void {
    if (typeof value !== 'string' || (!(options.allowEmpty ?? true) && value.length === 0)) {
      errors.push(`${path}: debe ser string${options.allowEmpty === false ? ' no vacío' : ''}`);
    }
  }

  private expectStringOrNull(value: unknown, path: ValidationPath, errors: string[]): void {
    if (value !== null && typeof value !== 'string') {
      errors.push(`${path}: debe ser string o null`);
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private isNonNegativeInteger(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0;
  }
}
