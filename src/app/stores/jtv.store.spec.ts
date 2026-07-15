import '@angular/compiler';

import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { JtvStore } from './jtv.store';
import { type JtvFile } from '../services/jtv-file-serializer';
import { JtvFileValidatorService } from '../services/jtv-file-validator.service';
import { JtvFileService } from '../services/jtv-file.service';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { PreinstalledSubmachineService } from '../services/preinstalled-submachine.service';
import { RecentMachinesService } from '../services/recent-machines.service';

describe('JtvStore ATE subtrace navigation', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    storage.set('jtv-settings', JSON.stringify({
      burstSize: 2,
      maxTapeCount: 10,
      oldNotation: false,
    }));

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });

  });

  it('continues an expanded submachine trace internally and propagates its first tape on return', () => {
    const injector = createEnvironmentInjector([
      JtvStore,
      JtvFileService,
      JtvFileValidatorService,
      JtvSettingsService,
      PreinstalledSubmachineService,
      RecentMachinesService,
    ]);

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(createSubmachineExpansionFile());
      expect(store.runMachineOnFirstTape()).toBe(true);

      const machineExpandNode = store.ate().children[0];
      expect(machineExpandNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/M_Expand_ATE.gif',
        label: 'SUB_EXPAND()',
      }));
      expect(store.ate().children).toHaveLength(1);

      expect(store.continueAteExecution(machineExpandNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_EXPAND');
      expect(store.ate().children.map((node) => node.iconSrc)).toEqual([
        'assets/images/a_ATE.gif',
        'assets/images/R_ATE.gif',
        'assets/images/expand_ATE.gif',
      ]);

      const internalExpandNode = store.ate().children[2];
      expect(store.continueAteExecution(internalExpandNode.id)).toBe(true);
      const expandedBranch = store.ate().children[2];
      expect(expandedBranch.children.map((node) => node.iconSrc)).toEqual([
        'assets/images/a_ATE.gif',
        'assets/images/stop_ATE.gif',
      ]);
      expect(expandedBranch.children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));

      const stopNode = expandedBranch.children.at(-1)!;
      expect(store.continueAteExecution(stopNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('MAIN');
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 1,
        cells: {
          0: 'a',
          1: 'b',
        },
      });
    } finally {
      injector.destroy();
    }
  });

  it('returns from a suspended submachine trace without continuing it', () => {
    const injector = createEnvironmentInjector([
      JtvStore,
      JtvFileService,
      JtvFileValidatorService,
      JtvSettingsService,
      PreinstalledSubmachineService,
      RecentMachinesService,
    ]);

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(createSubmachineExpansionFile());
      expect(store.runMachineOnFirstTape()).toBe(true);

      const machineExpandNode = store.ate().children[0];
      expect(store.continueAteExecution(machineExpandNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_EXPAND');

      expect(store.returnFromAteSubtrace()).toBe(true);
      expect(store.selectedMachine().name).toBe('MAIN');
      expect(store.selectedAteNode()).toEqual(expect.objectContaining({
        id: machineExpandNode.id,
        iconSrc: 'assets/images/M_Expand_ATE.gif',
      }));
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 1,
        cells: {
          0: 'a',
        },
      });
    } finally {
      injector.destroy();
    }
  });

  it('expands nondeterministic submachine branches with terminal, suspended, hanging and nested nondeterministic outcomes', () => {
    const injector = createEnvironmentInjector([
      JtvStore,
      JtvFileService,
      JtvFileValidatorService,
      JtvSettingsService,
      PreinstalledSubmachineService,
      RecentMachinesService,
    ]);

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(createSubmachineNondeterministicFile());
      expect(store.runMachineOnFirstTape()).toBe(true);

      const machineNdNode = store.ate().children[0];
      expect(machineNdNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/M_ND_ATE.gif',
        label: 'SUB_ND()',
      }));

      expect(store.continueAteExecution(machineNdNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_ND');
      expect(store.ate().children.map((node) => node.iconSrc)).toEqual([
        'assets/images/a_ATE.gif',
        'assets/images/ND_ATE.gif',
        'assets/images/expand_ATE.gif',
        'assets/images/expand_ATE.gif',
        'assets/images/expand_ATE.gif',
        'assets/images/expand_ATE.gif',
      ]);

      const [completedBranch, suspendedBranch, hangingBranch, nestedNdBranch] = store.ate().children.slice(2);

      expect(store.continueAteExecution(completedBranch.id)).toBe(true);
      expect(store.ate().children[2].children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));

      expect(store.continueAteExecution(suspendedBranch.id)).toBe(true);
      expect(store.ate().children[3].children.map((node) => node.iconSrc)).toEqual([
        'assets/images/link_ATE.gif',
        'assets/images/a_ATE.gif',
        'assets/images/expand_ATE.gif',
      ]);

      expect(store.continueAteExecution(hangingBranch.id)).toBe(true);
      expect(store.ate().children[4].children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/hanging_ATE.gif',
        kind: 'hanging',
      }));

      expect(store.continueAteExecution(nestedNdBranch.id)).toBe(true);
      expect(store.ate().children[5].children.map((node) => node.iconSrc)).toEqual([
        'assets/images/link_ATE.gif',
        'assets/images/ND_ATE.gif',
        'assets/images/expand_ATE.gif',
        'assets/images/expand_ATE.gif',
      ]);
    } finally {
      injector.destroy();
    }
  });
});

function createSubmachineExpansionFile(): JtvFile {
  return {
    format: 'jtv-web-machine',
    version: 2,
    machine: {
      id: 'main',
      name: 'MAIN',
    },
    parameterAssignments: {},
    metaValues: {
      variables: [],
      parameters: [],
    },
    tapeCount: 1,
    submachines: [
      {
        format: 'jtv-web-machine',
        version: 2,
        machine: {
          id: 'sub-expand',
          name: 'SUB_EXPAND',
          shortName: 'SUB',
          description: '',
        },
        parameterAssignments: {},
        metaValues: {
          variables: [],
          parameters: [],
        },
        tapeCount: 1,
        submachines: [],
        graph: {
          initialGroupId: 'sub-group',
          groups: [
            {
              id: 'sub-group',
              nodeIds: ['write-a', 'move-right', 'write-b'],
            },
          ],
          nodes: [
            {
              id: 'write-a',
              type: 'writer',
              name: 'a',
              tapeIndex: 0,
              isInitial: true,
            },
            {
              id: 'move-right',
              type: 'move-right',
              name: 'R',
              tapeIndex: 0,
              isInitial: false,
            },
            {
              id: 'write-b',
              type: 'writer',
              name: 'b',
              tapeIndex: 0,
              isInitial: false,
            },
          ],
          links: [],
          autolinks: [],
        },
        view: {
          groups: [
            {
              groupId: 'sub-group',
              label: 'aRb',
              position: { x: 100, y: 100 },
              width: 68,
              height: 32,
            },
          ],
          nodes: [
            {
              nodeId: 'write-a',
              groupId: 'sub-group',
              kind: 'text',
              label: 'a',
              tapeIndex: 0,
              initial: true,
              position: { x: 100, y: 100 },
            },
            {
              nodeId: 'move-right',
              groupId: 'sub-group',
              kind: 'text',
              label: 'R',
              tapeIndex: 0,
              initial: false,
              position: { x: 120, y: 100 },
            },
            {
              nodeId: 'write-b',
              groupId: 'sub-group',
              kind: 'text',
              label: 'b',
              tapeIndex: 0,
              initial: false,
              position: { x: 140, y: 100 },
            },
          ],
          links: [],
        },
      },
    ],
    graph: {
      initialGroupId: 'main-group',
      groups: [
        {
          id: 'main-group',
          nodeIds: ['call-sub'],
        },
      ],
      nodes: [
        {
          id: 'call-sub',
          type: 'submachine',
          name: 'M',
          tapeIndex: 0,
          isInitial: true,
          submachineId: 'sub-expand',
          submachineName: 'SUB_EXPAND',
          displaySymbol: 'M',
          parameterName: '',
          submachineParameterAssignments: {},
        },
      ],
      links: [],
      autolinks: [],
    },
    view: {
      groups: [
        {
          groupId: 'main-group',
          label: 'M',
          position: { x: 200, y: 200 },
          width: 28,
          height: 32,
        },
      ],
      nodes: [
        {
          nodeId: 'call-sub',
          groupId: 'main-group',
          kind: 'submachine',
          label: 'M',
          tapeIndex: 0,
          initial: true,
          position: { x: 200, y: 200 },
        },
      ],
      links: [],
    },
  };
}

function createSubmachineNondeterministicFile(): JtvFile {
  return {
    format: 'jtv-web-machine',
    version: 2,
    machine: {
      id: 'main-nd',
      name: 'MAIN_ND',
    },
    parameterAssignments: {},
    metaValues: {
      variables: [],
      parameters: [],
    },
    tapeCount: 1,
    submachines: [
      {
        format: 'jtv-web-machine',
        version: 2,
        machine: {
          id: 'sub-nd',
          name: 'SUB_ND',
          shortName: 'ND',
          description: '',
        },
        parameterAssignments: {},
        metaValues: {
          variables: [],
          parameters: [],
        },
        tapeCount: 1,
        submachines: [],
        graph: {
          initialGroupId: 'sub-start',
          groups: [
            { id: 'sub-start', nodeIds: ['write-s'] },
            { id: 'sub-completed', nodeIds: [] },
            { id: 'sub-suspended', nodeIds: ['write-x', 'move-right'] },
            { id: 'sub-hanging', nodeIds: ['move-left'] },
            { id: 'sub-nested-nd', nodeIds: [] },
            { id: 'sub-nested-left', nodeIds: [] },
            { id: 'sub-nested-right', nodeIds: [] },
          ],
          nodes: [
            {
              id: 'write-s',
              type: 'writer',
              name: 's',
              tapeIndex: 0,
              isInitial: true,
            },
            {
              id: 'write-x',
              type: 'writer',
              name: 'x',
              tapeIndex: 0,
              isInitial: true,
            },
            {
              id: 'move-right',
              type: 'move-right',
              name: 'R',
              tapeIndex: 0,
              isInitial: false,
            },
            {
              id: 'move-left',
              type: 'move-left',
              name: 'L',
              tapeIndex: 0,
              isInitial: true,
            },
          ],
          links: [
            {
              id: 'to-completed',
              sourceGroupId: 'sub-start',
              targetGroupId: 'sub-completed',
              condition: null,
            },
            {
              id: 'to-suspended',
              sourceGroupId: 'sub-start',
              targetGroupId: 'sub-suspended',
              condition: null,
            },
            {
              id: 'to-hanging',
              sourceGroupId: 'sub-start',
              targetGroupId: 'sub-hanging',
              condition: null,
            },
            {
              id: 'to-nested-nd',
              sourceGroupId: 'sub-start',
              targetGroupId: 'sub-nested-nd',
              condition: null,
            },
            {
              id: 'nested-left',
              sourceGroupId: 'sub-nested-nd',
              targetGroupId: 'sub-nested-left',
              condition: null,
            },
            {
              id: 'nested-right',
              sourceGroupId: 'sub-nested-nd',
              targetGroupId: 'sub-nested-right',
              condition: null,
            },
          ],
          autolinks: [],
        },
        view: {
          groups: [
            { groupId: 'sub-start', label: 's', position: { x: 100, y: 100 }, width: 28, height: 32 },
            { groupId: 'sub-completed', label: 'OK', position: { x: 180, y: 60 }, width: 28, height: 32 },
            { groupId: 'sub-suspended', label: 'xR', position: { x: 180, y: 100 }, width: 48, height: 32 },
            { groupId: 'sub-hanging', label: 'L', position: { x: 180, y: 140 }, width: 28, height: 32 },
            { groupId: 'sub-nested-nd', label: 'ND', position: { x: 180, y: 180 }, width: 28, height: 32 },
            { groupId: 'sub-nested-left', label: 'NL', position: { x: 260, y: 160 }, width: 28, height: 32 },
            { groupId: 'sub-nested-right', label: 'NR', position: { x: 260, y: 200 }, width: 28, height: 32 },
          ],
          nodes: [
            {
              nodeId: 'write-s',
              groupId: 'sub-start',
              kind: 'text',
              label: 's',
              tapeIndex: 0,
              initial: true,
              position: { x: 100, y: 100 },
            },
            {
              nodeId: 'write-x',
              groupId: 'sub-suspended',
              kind: 'text',
              label: 'x',
              tapeIndex: 0,
              initial: true,
              position: { x: 180, y: 100 },
            },
            {
              nodeId: 'move-right',
              groupId: 'sub-suspended',
              kind: 'text',
              label: 'R',
              tapeIndex: 0,
              initial: false,
              position: { x: 200, y: 100 },
            },
            {
              nodeId: 'move-left',
              groupId: 'sub-hanging',
              kind: 'text',
              label: 'L',
              tapeIndex: 0,
              initial: true,
              position: { x: 180, y: 140 },
            },
          ],
          links: [
            { linkId: 'to-completed', kind: 'direct', sourceGroupId: 'sub-start', targetGroupId: 'sub-completed' },
            { linkId: 'to-suspended', kind: 'direct', sourceGroupId: 'sub-start', targetGroupId: 'sub-suspended' },
            { linkId: 'to-hanging', kind: 'direct', sourceGroupId: 'sub-start', targetGroupId: 'sub-hanging' },
            { linkId: 'to-nested-nd', kind: 'direct', sourceGroupId: 'sub-start', targetGroupId: 'sub-nested-nd' },
            { linkId: 'nested-left', kind: 'direct', sourceGroupId: 'sub-nested-nd', targetGroupId: 'sub-nested-left' },
            { linkId: 'nested-right', kind: 'direct', sourceGroupId: 'sub-nested-nd', targetGroupId: 'sub-nested-right' },
          ],
        },
      },
    ],
    graph: {
      initialGroupId: 'main-group',
      groups: [
        {
          id: 'main-group',
          nodeIds: ['call-sub-nd'],
        },
      ],
      nodes: [
        {
          id: 'call-sub-nd',
          type: 'submachine',
          name: 'M',
          tapeIndex: 0,
          isInitial: true,
          submachineId: 'sub-nd',
          submachineName: 'SUB_ND',
          displaySymbol: 'M',
          parameterName: '',
          submachineParameterAssignments: {},
        },
      ],
      links: [],
      autolinks: [],
    },
    view: {
      groups: [
        {
          groupId: 'main-group',
          label: 'M',
          position: { x: 200, y: 200 },
          width: 28,
          height: 32,
        },
      ],
      nodes: [
        {
          nodeId: 'call-sub-nd',
          groupId: 'main-group',
          kind: 'submachine',
          label: 'M',
          tapeIndex: 0,
          initial: true,
          position: { x: 200, y: 200 },
        },
      ],
      links: [],
    },
  };
}
