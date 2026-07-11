import { describe, expect, it } from 'vitest';

import { JTV_FILE_FORMAT, JTV_FILE_VERSION, type JtvFile } from './jtv-file-serializer';
import { JtvFileValidationError, JtvFileValidatorService } from './jtv-file-validator.service';

describe('JtvFileValidatorService', () => {
  it('accepts a valid minimal JTV file', () => {
    const validator = new JtvFileValidatorService();

    expect(() => validator.validate(createValidFile())).not.toThrow();
  });

  it('rejects a link pointing to an unknown target node', () => {
    const validator = new JtvFileValidatorService();
    const file = createValidFile({
      graph: {
        ...createValidFile().graph,
        links: [
          {
            id: 'link-1',
            sourceGroupId: 'group-1',
            targetGroupId: 'group-1',
            targetNodeId: 'missing-node',
            condition: null,
          },
        ],
      },
    });

    expect(() => validator.validate(file)).toThrow(JtvFileValidationError);
  });

  it('rejects a node that references a non-existing tape', () => {
    const validator = new JtvFileValidatorService();
    const file = createValidFile({
      graph: {
        ...createValidFile().graph,
        nodes: [
          {
            id: 'node-1',
            type: 'writer',
            name: 'a',
            tapeIndex: 2,
            isInitial: true,
          },
        ],
      },
    });

    expect(() => validator.validate(file)).toThrow(JtvFileValidationError);
  });

  it('rejects a custom submachine node that references a missing child machine', () => {
    const validator = new JtvFileValidatorService();
    const file = createValidFile({
      graph: {
        ...createValidFile().graph,
        nodes: [
          {
            id: 'node-1',
            type: 'submachine',
            name: 'M',
            tapeIndex: 0,
            isInitial: true,
            submachineId: 'missing-submachine',
            submachineName: 'MISSING',
          },
        ],
      },
    });

    expect(() => validator.validate(file)).toThrow(JtvFileValidationError);
  });
});

function createValidFile(overrides: Partial<JtvFile> = {}): JtvFile {
  const base: JtvFile = {
    format: JTV_FILE_FORMAT,
    version: JTV_FILE_VERSION,
    machine: {
      id: 'machine-1',
      name: 'VALID',
    },
    parameterAssignments: {},
    metaValues: {
      variables: [],
      parameters: [],
    },
    tapeCount: 1,
    submachines: [],
    graph: {
      initialGroupId: 'group-1',
      groups: [
        {
          id: 'group-1',
          nodeIds: ['node-1'],
        },
      ],
      nodes: [
        {
          id: 'node-1',
          type: 'writer',
          name: 'a',
          tapeIndex: 0,
          isInitial: true,
        },
      ],
      links: [],
      autolinks: [],
    },
    view: {
      groups: [
        {
          groupId: 'group-1',
          label: 'a',
          position: { x: 0, y: 0 },
        },
      ],
      nodes: [
        {
          nodeId: 'node-1',
          groupId: 'group-1',
          label: 'a',
          position: { x: 0, y: 0 },
        },
      ],
      links: [],
    },
  };

  return {
    ...base,
    ...overrides,
  };
}
