import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import copiadoraLegacyXml from '../../assets/examples/legacy/COPIADORA.jtv';
import copiadora2LegacyXml from '../../assets/examples/legacy/COPIADORA2.jtv';
import igualesAbcLegacyXml from '../../assets/examples/legacy/IGUALES ABC.jtv';
import monusLegacyXml from '../../assets/examples/legacy/MONUS.jtv';
import multiplicadoraLegacyXml from '../../assets/examples/legacy/MULTIPLICADORA.jtv';
import multiplicadora2LegacyXml from '../../assets/examples/legacy/MULTIPLICADORA2.jtv';
import palindromeLegacyXml from '../../assets/examples/legacy/PALINDROME.jtv';
import buscadoraLFile from '../../assets/submachines/buscadora_l.jtv.json';
import buscadoraNotLFile from '../../assets/submachines/buscadora_not_l.jtv.json';
import buscadoraNotRFile from '../../assets/submachines/buscadora_not_r.jtv.json';
import buscadoraRFile from '../../assets/submachines/buscadora_r.jtv.json';
import shiftLFile from '../../assets/submachines/shift_l.jtv.json';
import shiftRFile from '../../assets/submachines/shift_r.jtv.json';
import { AteTraceRecorder } from '../models/ate';
import { MachineGraphRunner } from '../models/core/machine-graph-runner';
import { type SubmachineDefinition } from '../models/core/execution-context';
import { MetaValueDictionary } from '../models/core/meta-value-dictionary';
import { Tape } from '../models/core/tape';
import { restoreMachineFromJtvFile, type JtvFile } from './jtv-file-serializer';
import { LegacyJtvImporter } from './legacy-jtv-importer';

describe('Legacy JTV importer', () => {
  it('imports legacy node ids into executable graph groups', () => {
    const file = importLegacyExample('COPIADORA.jtv');
    const restored = restoreMachineFromJtvFile(file);
    const groupNodeCounts = restored.machineGraph.groups.map((group) => {
      let count = 0;
      let current = group.entry;

      while (current) {
        count += 1;
        current = current.next;
      }

      return count;
    });

    expect(file.graph.nodes).toHaveLength(10);
    expect(file.graph.groups.every((group) => group.nodeIds.every((nodeId) => nodeId.startsWith('legacy-node-')))).toBe(true);
    expect(groupNodeCounts).toEqual([1, 7, 1, 1]);
    expect(file.metaValues.variables).toContain('σ');
  });

  it.each([
    [
      'ab',
      {
        headPosition: 6,
        cells: {
          1: 'a',
          2: 'b',
          4: 'a',
          5: 'b',
        },
      },
    ],
    [
      'aba',
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
  ])('imports and executes the legacy COPIADORA example for "%s"', (input, expectedSnapshot) => {
    expect(runLegacyExampleMachine(importLegacyExample('COPIADORA.jtv'), input)).toEqual(expectedSnapshot);
  });

  it('imports and executes the legacy COPIADORA2 example using two tapes', () => {
    expect(runLegacyExampleMachineTapes(importLegacyExample('COPIADORA2.jtv'), ['ab', ''])).toEqual([
      {
        headPosition: 6,
        cells: {
          1: 'a',
          2: 'b',
          4: 'a',
          5: 'b',
        },
      },
      {
        headPosition: 3,
        cells: {
          1: 'a',
          2: 'b',
        },
      },
    ]);
  });

  it('imports legacy IGUALES ABC autolinks with orientation and anchor points', () => {
    const file = importLegacyExample('IGUALES ABC.jtv');
    const autolinkViews = file.view.links.filter((link) => link.kind === 'autolink');

    expect(file.graph.autolinks).toHaveLength(5);
    expect(autolinkViews.map((link) => link.autolinkOrientation)).toEqual([
      'bottom',
      'bottom',
      'top',
      'bottom',
      'right',
    ]);
    expect(autolinkViews.every((link) => link.points?.length === 1)).toBe(true);
  });

  it('imports and executes the legacy IGUALES ABC example for an accepted input', () => {
    expect(runLegacyExampleMachine(importLegacyExample('IGUALES ABC.jtv'), 'abccabbca')).toEqual({
      headPosition: 0,
      cells: {
        1: 'd',
        2: 'd',
        3: 'd',
        4: 'd',
        5: 'd',
        6: 'd',
        7: 'd',
        8: 'd',
        9: 'd',
      },
    });
  });

  it('suspends the legacy IGUALES ABC example for a looping input', () => {
    const execution = runLegacyExampleMachineBurst(importLegacyExample('IGUALES ABC.jtv'), 'abccabb', 40);
    const expandNode = execution.traceRecorder.root.children.at(-1);

    expect(execution.result.status).toBe('suspended');
    expect(expandNode).toEqual(expect.objectContaining({
      iconSrc: 'assets/images/expand_ATE.gif',
      kind: 'expand',
      label: '',
    }));
    expect(expandNode?.continuation).toEqual(expect.objectContaining({
      currentGroupId: expect.any(String),
      phase: expect.stringMatching(/^(node|after-node|after-group)$/),
      tapeSnapshots: [execution.tape.getSnapshot()],
    }));
  });

  it.each([
    [
      '111111#1111',
      {
        headPosition: 3,
        cells: {
          1: '1',
          2: '1',
        },
      },
    ],
    [
      '1111#1',
      {
        headPosition: 4,
        cells: {
          1: '1',
          2: '1',
          3: '1',
        },
      },
    ],
    [
      '111#111',
      {
        headPosition: 1,
        cells: {},
      },
    ],
  ])('imports and executes the legacy MONUS example for "%s"', (input, expectedSnapshot) => {
    expect(runLegacyExampleMachine(importLegacyExample('MONUS.jtv'), input)).toEqual(expectedSnapshot);
  });

  it.each([
    [
      'aba',
      {
        headPosition: 2,
        cells: {
          1: 'y',
        },
      },
    ],
    [
      'abba',
      {
        headPosition: 2,
        cells: {
          1: 'y',
        },
      },
    ],
  ])('imports and executes the legacy PALINDROME example for "%s"', (input, expectedSnapshot) => {
    expect(runLegacyExampleMachine(importLegacyExample('PALINDROME.jtv'), input)).toEqual(expectedSnapshot);
  });

  it.each(['ab', 'abca', 'ba'])('leaves #n# on tape 1 for legacy non-palindrome "%s"', (input) => {
    expect(runLegacyExampleMachine(importLegacyExample('PALINDROME.jtv'), input)).toEqual({
      headPosition: 2,
      cells: {
        1: 'n',
      },
    });
  });

  it.each([
    [
      '1#1',
      {
        headPosition: 2,
        cells: {
          1: '1',
        },
      },
    ],
    [
      '11#11',
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
    [
      '11111#11',
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
  ])('imports and executes the legacy MULTIPLICADORA example for "%s"', (input, expectedSnapshot) => {
    expect(runLegacyExampleMachine(importLegacyExample('MULTIPLICADORA.jtv'), input)).toEqual(expectedSnapshot);
  });

  it.each([
    [
      '1#1',
      {
        headPosition: 2,
        cells: {
          1: '1',
        },
      },
    ],
    [
      '11#11',
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
    [
      '11111#11',
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
  ])('imports and executes the legacy MULTIPLICADORA2 example for "%s"', (input, expectedSnapshot) => {
    expect(runLegacyExampleMachine(importLegacyExample('MULTIPLICADORA2.jtv'), input)).toEqual(expectedSnapshot);
  });
});

function importLegacyExample(fileName: string): JtvFile {
  const xml = getLegacyExampleXml(fileName);
  const domParser = globalThis.DOMParser;

  globalThis.DOMParser = new JSDOM().window.DOMParser as typeof DOMParser;

  try {
    return new LegacyJtvImporter().importXml(xml);
  } finally {
    globalThis.DOMParser = domParser;
  }
}

function getLegacyExampleXml(fileName: string): string {
  const legacyExamples: Readonly<Record<string, string>> = {
    'COPIADORA.jtv': copiadoraLegacyXml,
    'COPIADORA2.jtv': copiadora2LegacyXml,
    'IGUALES ABC.jtv': igualesAbcLegacyXml,
    'MONUS.jtv': monusLegacyXml,
    'MULTIPLICADORA.jtv': multiplicadoraLegacyXml,
    'MULTIPLICADORA2.jtv': multiplicadora2LegacyXml,
    'PALINDROME.jtv': palindromeLegacyXml,
  };

  const xml = legacyExamples[fileName];

  if (!xml) {
    throw new Error(`Unknown legacy example: ${fileName}`);
  }

  return xml;
}

function runLegacyExampleMachine(file: JtvFile, input: string): ReturnType<Tape['getSnapshot']> {
  return runLegacyExampleMachineTapes(file, [input])[0];
}

function runLegacyExampleMachineTapes(file: JtvFile, inputs: readonly string[]): ReturnType<Tape['getSnapshot']>[] {
  const restored = restoreMachineFromJtvFile(file);
  const tapeCount = Math.max(restored.tapeCount, inputs.length, 1);
  const tapes = Array.from({ length: tapeCount }, (_, index) => {
    const tape = new Tape();
    tape.load(inputs[index] ?? '');

    return tape;
  });

  const ok = new MachineGraphRunner().run(restored.machineGraph, {
    tapes,
    metaValues: new MetaValueDictionary(),
    submachines: createLegacySubmachines(restored),
  });

  expect(ok).toBe(true);

  return tapes.map((tape) => tape.getSnapshot());
}

function runLegacyExampleMachineBurst(file: JtvFile, input: string, maxSteps: number): {
  result: ReturnType<MachineGraphRunner['runBurst']>;
  tape: Tape;
  traceRecorder: AteTraceRecorder;
} {
  const restored = restoreMachineFromJtvFile(file);
  const tape = new Tape();
  tape.load(input);
  const traceRecorder = new AteTraceRecorder(restored.selectedMachine.name);
  const result = new MachineGraphRunner().runBurst(restored.machineGraph, {
    tapes: [tape],
    metaValues: new MetaValueDictionary(),
    submachines: createLegacySubmachines(restored),
  }, traceRecorder, { maxSteps });

  if (result.status === 'suspended' && result.continuation) {
    traceRecorder.recordExpand({
      currentGroupId: result.continuation.currentGroupId,
      currentNodeId: result.continuation.currentNodeId,
      phase: result.continuation.phase,
      tapeSnapshots: [tape.getSnapshot()],
      variableAssignments: {},
      parameterAssignments: {},
    });
  }

  return { result, tape, traceRecorder };
}

function createPreinstalledSubmachines(): ReadonlyMap<string, SubmachineDefinition> {
  return new Map<string, SubmachineDefinition>([
    ['buscadora_l', createSubmachineDefinition(buscadoraLFile as JtvFile)],
    ['buscadora_r', createSubmachineDefinition(buscadoraRFile as JtvFile)],
    ['buscadora_not_l', createSubmachineDefinition(buscadoraNotLFile as JtvFile)],
    ['buscadora_not_r', createSubmachineDefinition(buscadoraNotRFile as JtvFile)],
    ['shift_l', createSubmachineDefinition(shiftLFile as JtvFile)],
    ['shift_r', createSubmachineDefinition(shiftRFile as JtvFile)],
  ]);
}

function createLegacySubmachines(restored: ReturnType<typeof restoreMachineFromJtvFile>): ReadonlyMap<string, SubmachineDefinition> {
  const submachines = new Map<string, SubmachineDefinition>(createPreinstalledSubmachines());

  addRestoredSubmachines(submachines, restored.submachines);

  return submachines;
}

function createSubmachineDefinition(file: JtvFile): SubmachineDefinition {
  const restored = restoreMachineFromJtvFile(file);

  return {
    name: restored.selectedMachine.name,
    graph: restored.machineGraph,
    view: restored.machineGraphView,
    tapeCount: restored.tapeCount,
    parameterAssignments: restored.parameterAssignments,
  };
}

function addRestoredSubmachines(
  submachines: Map<string, SubmachineDefinition>,
  files: readonly JtvFile[],
): void {
  for (const file of files) {
    const restored = restoreMachineFromJtvFile(file);

    submachines.set(restored.selectedMachine.id, {
      name: restored.selectedMachine.name,
      graph: restored.machineGraph,
      view: restored.machineGraphView,
      tapeCount: restored.tapeCount,
      parameterAssignments: restored.parameterAssignments,
    });
    addRestoredSubmachines(submachines, restored.submachines);
  }
}
