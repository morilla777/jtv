import '@angular/compiler';

import { createEnvironmentInjector, EnvironmentInjector, Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { JtvStore } from './jtv.store';
import { type JtvFile } from '../services/jtv-file-serializer';
import { JtvFileValidatorService } from '../services/jtv-file-validator.service';
import { JtvFileService } from '../services/jtv-file.service';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { PreinstalledSubmachineService } from '../services/preinstalled-submachine.service';
import { RecentMachinesService } from '../services/recent-machines.service';
import copiadoraFile from '../../assets/examples/copiadora.jtv.json';
import copiadora2File from '../../assets/examples/copiadora2.jtv.json';
import igualesAbcFile from '../../assets/examples/iguales_abc.jtv.json';
import monusFile from '../../assets/examples/monus.jtv.json';
import multiplicadoraFile from '../../assets/examples/multiplicadora.jtv.json';
import multiplicadora2File from '../../assets/examples/multiplicadora2.jtv.json';
import palindromeFile from '../../assets/examples/palindrome.jtv.json';
import tarea3vfinalFile from '../../assets/examples/tarea3vfinal.jtv.json';
import subsNd2File from '../../assets/examples/subs_nd2.jtv.json';

type TestJtvStore = JtvStore & { destroy: () => void };
let storage: Map<string, string>;

describe('JtvStore ATE subtrace navigation', () => {
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
    const injector = createJtvInjector();

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
      expect(store.designMachineTabs().find((tab) => tab.id === store.activeDesignMachineTabId())?.name).toBe('SUB_EXPAND');
      expect(store.designMachineTabs().map((tab) => tab.name)).toEqual(['MAIN', 'SUB_EXPAND']);
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
      expect(store.designMachineTabs().find((tab) => tab.id === store.activeDesignMachineTabId())?.name).toBe('MAIN');
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 1,
        cells: {
          0: 'a',
          1: 'b',
        },
      });

      expect(store.continueAteExecution(machineExpandNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_EXPAND');
      expect(store.designMachineTabs().find((tab) => tab.id === store.activeDesignMachineTabId())?.name).toBe('SUB_EXPAND');
      expect(store.ate().children[2].children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));
      expect(store.ate().children[2].continuation).toBeUndefined();
      const revisitedStopNode = store.ate().children[2].children.at(-1)!;
      expect(store.continueAteExecution(revisitedStopNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('MAIN');
      expect(store.designMachineTabs().find((tab) => tab.id === store.activeDesignMachineTabId())?.name).toBe('MAIN');
      expect(store.ate().children).toHaveLength(2);

      expect(store.continueAteExecution(machineExpandNode.id)).toBe(true);
      expect(store.returnFromAteSubtrace()).toBe(true);
      expect(store.designMachineTabs().find((tab) => tab.id === store.activeDesignMachineTabId())?.name).toBe('MAIN');
    } finally {
      injector.destroy();
    }
  });

  it('returns from a suspended submachine trace without continuing it', () => {
    const injector = createJtvInjector();

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

  it('restores the caller ATE tape snapshot after navigating back from a completed submachine trace', () => {
    const store = createStoreWithBurstSize(20);

    try {
      store.importMachineFile(createSubmachineThenCallerWriteFile());
      expect(store.runMachineOnFirstTape()).toBe(true);

      const machineNode = store.ate().children[0];
      const mainStopNode = store.ate().children.at(-1)!;
      expect(machineNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/M_ATE.gif',
        label: 'SUB_WRITE()',
      }));
      expect(mainStopNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));

      expect(store.continueAteExecution(machineNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_WRITE');
      const submachineStopNode = store.ate().children.at(-1)!;
      expect(store.continueAteExecution(submachineStopNode.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('MAIN');

      store.selectAteNode(mainStopNode.id);
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 1,
        cells: {
          0: 'a',
          1: 'c',
        },
      });

      store.clearAte();
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 1,
        cells: {
          0: 'a',
          1: 'c',
        },
      });
    } finally {
      store.destroy();
    }
  });

  it('expands nondeterministic submachine branches with terminal, suspended, hanging and nested nondeterministic outcomes', () => {
    const injector = createJtvInjector();

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

  it.each([
    { branchIndex: 0, writtenSymbol: 'a' },
    { branchIndex: 1, writtenSymbol: 'b' },
    { branchIndex: 2, writtenSymbol: 'c' },
  ])('expands nested nondeterministic custom submachine branch $writtenSymbol without recording errors', ({ branchIndex, writtenSymbol }) => {
    storage.set('jtv-settings', JSON.stringify({
      burstSize: 1000,
      maxTapeCount: 10,
      oldNotation: false,
    }));
    const injector = createJtvInjector();

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(subsNd2File as JtvFile);
      expect(store.runMachineOnFirstTape()).toBe(true);

      const subNdNode = store.ate().children[0];
      expect(subNdNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/M_ND_ATE.gif',
        label: 'SUB_ND()',
      }));

      expect(store.continueAteExecution(subNdNode.id)).toBe(true);
      expect(store.ate().children).toHaveLength(1);
      const nestedNdNode = store.ate().children[0];
      expect(nestedNdNode).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/M_ND_ATE.gif',
        label: 'ND2()',
      }));

      expect(store.continueAteExecution(nestedNdNode.id)).toBe(true);
      const branches = store.ate().children.filter((node) => node.iconSrc === 'assets/images/expand_ATE.gif');
      expect(branches).toHaveLength(3);

      const selectedBranch = branches[branchIndex];
      expect(store.continueAteExecution(selectedBranch.id)).toBe(true);
      expect(selectedBranch.children.at(-1)).not.toEqual(expect.objectContaining({
        iconSrc: 'assets/images/error_ATE.gif',
        kind: 'error',
      }));
      expect(selectedBranch.children.map((node) => [node.iconSrc, node.label])).toEqual([
        ['assets/images/link_ATE.gif', ''],
        ['assets/images/a_ATE.gif', writtenSymbol],
        ['assets/images/R_ATE.gif', ''],
        ['assets/images/stop_ATE.gif', ''],
      ]);
      expect(store.ate().children.flatMap((node) => node.children).some((node) => node.kind === 'error')).toBe(false);

      const selectedBranchStop = selectedBranch.children.at(-1);
      expect(selectedBranchStop).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));

      expect(store.continueAteExecution(selectedBranchStop!.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUB_ND');
      expect(store.ate().children.map((node) => node.iconSrc)).toEqual([
        'assets/images/M_ND_ATE.gif',
        'assets/images/stop_ATE.gif',
      ]);

      const subNdStop = store.ate().children.at(-1)!;
      expect(store.continueAteExecution(subNdStop.id)).toBe(true);
      expect(store.selectedMachine().name).toBe('SUBS-ND2');
      expect(store.ate().children.map((node) => [node.iconSrc, node.label])).toEqual([
        ['assets/images/M_ND_ATE.gif', 'SUB_ND()'],
        ['assets/images/R_ATE.gif', ''],
        ['assets/images/a_ATE.gif', 'd'],
        ['assets/images/R_ATE.gif', ''],
        ['assets/images/a_ATE.gif', 'e'],
        ['assets/images/stop_ATE.gif', ''],
      ]);
      const finalStop = store.ate().children.at(-1)!;
      store.selectAteNode(finalStop.id);
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 4,
        cells: {
          1: writtenSymbol,
          3: 'd',
          4: 'e',
        },
      });
      expect(finalStop).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));
    } finally {
      injector.destroy();
    }
  });

  it('executes the COPIADORA2 example from the store for "copyme"', () => {
    storage.set('jtv-settings', JSON.stringify({
      burstSize: 1000,
      maxTapeCount: 10,
      oldNotation: false,
    }));
    const injector = createJtvInjector();

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(copiadora2File as JtvFile);
      store.setTapeValue('tape-1', 'copyme');
      store.setTapeValue('tape-2', '');

      expect(store.runMachineOnFirstTape()).toBe(true);
      expect(store.ate().children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));
      expect(store.tapeSnapshots()).toEqual([
        {
          headPosition: 14,
          cells: {
            1: 'c',
            2: 'o',
            3: 'p',
            4: 'y',
            5: 'm',
            6: 'e',
            8: 'c',
            9: 'o',
            10: 'p',
            11: 'y',
            12: 'm',
            13: 'e',
          },
        },
        {
          headPosition: 7,
          cells: {
            1: 'c',
            2: 'o',
            3: 'p',
            4: 'y',
            5: 'm',
            6: 'e',
          },
        },
      ]);
    } finally {
      injector.destroy();
    }
  });

  it('executes the IGUALES_ABC example from the store for "abc"', () => {
    storage.set('jtv-settings', JSON.stringify({
      burstSize: 1000,
      maxTapeCount: 10,
      oldNotation: false,
    }));
    const injector = createJtvInjector();

    try {
      const store = runInInjectionContext(injector, () => injector.get(JtvStore));

      store.importMachineFile(igualesAbcFile as JtvFile);
      store.setTapeValue('tape-1', 'abc');

      expect(store.runMachineOnFirstTape()).toBe(true);
      expect(store.ate().children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));
      expect(store.selectedTapeSnapshot()).toEqual({
        headPosition: 0,
        cells: {
          1: 'd',
          2: 'd',
          3: 'd',
        },
      });
    } finally {
      injector.destroy();
    }
  });

  it.each([
    [
      'COPIADORA',
      copiadoraFile as JtvFile,
      ['aba'],
      [
        {
          headPosition: 8,
          cells: {
            1: 'a',
            2: 'b',
            3: 'a',
            5: 'a',
            6: 'b',
            7: 'a',
          },
        },
      ],
    ],
    [
      'MONUS',
      monusFile as JtvFile,
      ['111111#1111'],
      [
        {
          headPosition: 3,
          cells: {
            1: '1',
            2: '1',
          },
        },
      ],
    ],
    [
      'MULTIPLICADORA',
      multiplicadoraFile as JtvFile,
      ['11111#11'],
      [
        {
          headPosition: 11,
          cells: {
            1: '1',
            2: '1',
            3: '1',
            4: '1',
            5: '1',
            6: '1',
            7: '1',
            8: '1',
            9: '1',
            10: '1',
          },
        },
      ],
    ],
    [
      'MULTIPLICADORA2',
      multiplicadora2File as JtvFile,
      ['11#11'],
      [
        {
          headPosition: 5,
          cells: {
            1: '1',
            2: '1',
            3: '1',
            4: '1',
          },
        },
      ],
    ],
    [
      'PALINDROME',
      palindromeFile as JtvFile,
      ['abba'],
      [
        {
          headPosition: 2,
          cells: {
            1: 'y',
          },
        },
      ],
    ],
    [
      'TAREA3VFINAL',
      tarea3vfinalFile as JtvFile,
      ['10101#1111#s#100#r'],
      [
        {
          headPosition: 7,
          cells: {
            1: '1',
            2: '0',
            3: '0',
            4: '0',
            5: '0',
            6: '0',
          },
        },
        {
          headPosition: 0,
          cells: {},
        },
      ],
    ],
  ])('executes the %s example from the store and records Stop in the ATE', (
    _name,
    file,
    inputs,
    expectedSnapshots,
  ) => {
    const store = createStoreWithBurstSize(1000);

    try {
      store.importMachineFile(file);

      for (const [index, input] of inputs.entries()) {
        store.setTapeValue(`tape-${index + 1}`, input);
      }

      expect(store.runMachineOnFirstTape()).toBe(true);
      expect(store.ate().children.at(-1)).toEqual(expect.objectContaining({
        iconSrc: 'assets/images/stop_ATE.gif',
        kind: 'stop',
      }));
      expect(store.tapeSnapshots()).toEqual(expectedSnapshots);
    } finally {
      store.destroy();
    }
  });

  it('inserts custom submachines with their declared parameters as editable subscripts', () => {
    const store = createStoreWithBurstSize(20);

    try {
      store.importMachineFile(createCustomParameterizedSubmachineFile());

      store.selectTool('submachine');
      store.insertActiveToolNodeAt({ x: 200, y: 120 });

      const insertedNode = store.machineGraphView().nodes.find((node) => node.label === 'M');

      expect(insertedNode).toEqual(expect.objectContaining({
        kind: 'submachine',
        subscriptLabel: 'A,B',
      }));

      store.selectTool('pointer');
      const editState = store.getCanvasSubmachineParameterEditState(insertedNode!.nodeId);

      expect(editState).toEqual({
        nodeId: insertedNode!.nodeId,
        parameters: ['A', 'B'],
        assignments: {
          A: '',
          B: '',
        },
      });

      store.updateCanvasSubmachineParameterAssignments(insertedNode!.nodeId, {
        A: 'a',
        B: 'b',
      });

      expect(store.machineGraphView().nodes.find((node) => node.nodeId === insertedNode!.nodeId)).toEqual(
        expect.objectContaining({
          subscriptLabel: 'a,b',
        }),
      );

      store.updateCanvasSubmachineParameterAssignments(insertedNode!.nodeId, {
        A: 'a',
      });

      expect(store.machineGraphView().nodes.find((node) => node.nodeId === insertedNode!.nodeId)).toEqual(
        expect.objectContaining({
          subscriptLabel: 'a,B',
        }),
      );

      store.updateCanvasSubmachineParameterAssignments(insertedNode!.nodeId, {
        A: 'a',
        B: 'b',
      });

      store.selectTool('symbol-lowercase');
      store.selectSymbol('c');
      store.insertActiveToolNodeNear(insertedNode!.nodeId, 'right');

      const insertedNeighbor = store.machineGraphView().nodes.find((node) => node.label === 'c');

      expect(insertedNeighbor?.position.x).toBeGreaterThan(220);

      const childMachineId = store.machineTree().children?.[0]?.id;

      expect(childMachineId).toBeTruthy();

      store.selectDesignMachine(childMachineId!);
      store.selectTool('symbol-uppercase');
      store.selectParameter('C');
      store.insertActiveToolNodeAt({ x: 100, y: 100 });
      store.selectDesignMachine(store.rootMachineTreeNodeId());

      const expandedNeighborX = store.machineGraphView().nodes.find((node) => node.label === 'c')?.position.x;

      expect(store.machineGraphView().nodes.find((node) => node.nodeId === insertedNode!.nodeId)).toEqual(
        expect.objectContaining({
          subscriptLabel: 'a,b,C',
        }),
      );

      expect(expandedNeighborX).toBeGreaterThan(insertedNeighbor!.position.x);

      store.selectDesignMachine(childMachineId!);
      store.selectTool('pointer');
      const parameterCNode = store.machineGraphView().nodes.find((node) => node.label === 'C');

      expect(parameterCNode).toBeTruthy();

      store.deleteCanvasNode(parameterCNode!.nodeId);
      store.selectDesignMachine(store.rootMachineTreeNodeId());

      const compactedNeighborX = store.machineGraphView().nodes.find((node) => node.label === 'c')?.position.x;

      expect(store.machineGraphView().nodes.find((node) => node.nodeId === insertedNode!.nodeId)).toEqual(
        expect.objectContaining({
          subscriptLabel: 'a,b',
        }),
      );
      expect(compactedNeighborX).toBe(insertedNeighbor!.position.x);
    } finally {
      store.destroy();
    }
  });
});

function createCustomParameterizedSubmachineFile(): JtvFile {
  return {
    format: 'jtv-web-machine',
    version: 2,
    machine: {
      id: 'main-custom-parameters',
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
          id: 'parameterized-child',
          name: 'PARAM_CHILD',
          shortName: 'PCH',
          description: '',
        },
        parameterAssignments: {},
        metaValues: {
          variables: [],
          parameters: ['A', 'B'],
        },
        tapeCount: 1,
        submachines: [],
        graph: {
          initialGroupId: 'parameterized-child-group',
          groups: [
            {
              id: 'parameterized-child-group',
              nodeIds: ['parameterized-child-node-a', 'parameterized-child-node-b'],
            },
          ],
          nodes: [
            {
              id: 'parameterized-child-node-a',
              type: 'writer',
              name: 'A',
              tapeIndex: 0,
              isInitial: true,
            },
            {
              id: 'parameterized-child-node-b',
              type: 'writer',
              name: 'B',
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
              groupId: 'parameterized-child-group',
              label: 'AB',
              position: { x: 100, y: 100 },
              width: 40,
              height: 32,
            },
          ],
          nodes: [
            {
              nodeId: 'parameterized-child-node-a',
              groupId: 'parameterized-child-group',
              kind: 'parameter',
              label: 'A',
              tapeIndex: 0,
              initial: true,
              position: { x: 100, y: 100 },
            },
            {
              nodeId: 'parameterized-child-node-b',
              groupId: 'parameterized-child-group',
              kind: 'parameter',
              label: 'B',
              tapeIndex: 0,
              initial: false,
              position: { x: 120, y: 100 },
            },
          ],
          links: [],
        },
      },
    ],
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

function createSubmachineThenCallerWriteFile(): JtvFile {
  return {
    format: 'jtv-web-machine',
    version: 2,
    machine: {
      id: 'main-sub-then-write',
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
          id: 'sub-write',
          name: 'SUB_WRITE',
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
          initialGroupId: 'sub-write-group',
          groups: [
            {
              id: 'sub-write-group',
              nodeIds: ['sub-write-a'],
            },
          ],
          nodes: [
            {
              id: 'sub-write-a',
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
              groupId: 'sub-write-group',
              label: 'a',
              position: { x: 100, y: 100 },
              width: 28,
              height: 32,
            },
          ],
          nodes: [
            {
              nodeId: 'sub-write-a',
              groupId: 'sub-write-group',
              kind: 'text',
              label: 'a',
              tapeIndex: 0,
              initial: true,
              position: { x: 100, y: 100 },
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
          nodeIds: ['call-sub', 'move-right', 'write-c'],
        },
      ],
      nodes: [
        {
          id: 'call-sub',
          type: 'submachine',
          name: 'M',
          tapeIndex: 0,
          isInitial: true,
          submachineId: 'sub-write',
          submachineName: 'SUB_WRITE',
          displaySymbol: 'M',
          parameterName: '',
          submachineParameterAssignments: {},
        },
        {
          id: 'move-right',
          type: 'move-right',
          name: 'R',
          tapeIndex: 0,
          isInitial: false,
        },
        {
          id: 'write-c',
          type: 'writer',
          name: 'c',
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
          groupId: 'main-group',
          label: 'MRc',
          position: { x: 200, y: 200 },
          width: 68,
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
        {
          nodeId: 'move-right',
          groupId: 'main-group',
          kind: 'text',
          label: 'R',
          tapeIndex: 0,
          initial: false,
          position: { x: 220, y: 200 },
        },
        {
          nodeId: 'write-c',
          groupId: 'main-group',
          kind: 'text',
          label: 'c',
          tapeIndex: 0,
          initial: false,
          position: { x: 240, y: 200 },
        },
      ],
      links: [],
    },
  };
}

function createStoreWithBurstSize(burstSize: number): TestJtvStore {
  storage.set('jtv-settings', JSON.stringify({
    burstSize,
    maxTapeCount: 10,
    oldNotation: false,
  }));
  const injector = createJtvInjector();
  const store = runInInjectionContext(injector, () => injector.get(JtvStore));

  return Object.assign(store, {
    destroy: () => injector.destroy(),
  });
}

function createJtvInjector(): EnvironmentInjector {
  return createEnvironmentInjector([
    JtvStore,
    JtvFileService,
    JtvFileValidatorService,
    JtvSettingsService,
    PreinstalledSubmachineService,
    RecentMachinesService,
  ], Injector.NULL as unknown as EnvironmentInjector);
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
