import { describe, expect, it } from 'vitest';

import { AteTraceRecorder } from '../ate';
import { Autolink } from './autolink';
import { LinearMachineGroup } from './linear-machine-group';
import { Link } from './link';
import { LinkCondition } from './link-condition';
import { MachineGraph } from './machine-graph';
import { MachineGraphRunner } from './machine-graph-runner';
import { MachineNode } from './machine-node';
import { HubNode } from './hub-node';
import { MetaValueDictionary } from './meta-value-dictionary';
import { MoveLeftNode } from './move-left-node';
import { MoveRightNode } from './move-right-node';
import { ParameterValue } from './parameter-value';
import { Tape } from './tape';
import { SymbolValue } from './symbol-value';
import { SubmachineDefinition } from './execution-context';
import { SubmachineNode } from './submachine-node';
import { VariableValue } from './variable-value';
import { WriterNode } from './writer-node';
import binarioDecimalFile from '../../../assets/examples/binario_decimal.jtv.json';
import binarioUnarioFile from '../../../assets/examples/binario_unario.jtv.json';
import copiadora2File from '../../../assets/examples/copiadora2.jtv.json';
import copiadoraFile from '../../../assets/examples/copiadora.jtv.json';
import decimalBinarioFile from '../../../assets/examples/decimal_binario.jtv.json';
import decimalUnarioFile from '../../../assets/examples/decimal_unario.jtv.json';
import igualesAbcFile from '../../../assets/examples/iguales_abc.jtv.json';
import monusFile from '../../../assets/examples/monus.jtv.json';
import multiplicadoraFile from '../../../assets/examples/multiplicadora.jtv.json';
import multiplicadora2File from '../../../assets/examples/multiplicadora2.jtv.json';
import palindromeFile from '../../../assets/examples/palindrome.jtv.json';
import subColgFile from '../../../assets/examples/sub_colg.jtv.json';
import subExpandFile from '../../../assets/examples/sub_expand.jtv.json';
import subNdFile from '../../../assets/examples/sub_nd.jtv.json';
import tarea3vfinalFile from '../../../assets/examples/tarea3vfinal.jtv.json';
import unarioBinarioFile from '../../../assets/examples/unario_binario.jtv.json';
import unarioDecimalFile from '../../../assets/examples/unario_decimal.jtv.json';
import buscadoraLFile from '../../../assets/submachines/buscadora_l.jtv.json';
import buscadoraNotLFile from '../../../assets/submachines/buscadora_not_l.jtv.json';
import buscadoraNotRFile from '../../../assets/submachines/buscadora_not_r.jtv.json';
import buscadoraRFile from '../../../assets/submachines/buscadora_r.jtv.json';
import shiftLFile from '../../../assets/submachines/shift_l.jtv.json';
import shiftRFile from '../../../assets/submachines/shift_r.jtv.json';
import { restoreMachineFromJtvFile, type JtvFile } from '../../services/jtv-file-serializer';

describe('MachineGraphRunner', () => {
  it('uses the machine name as the ATE root label without a prefix', () => {
    expect(new AteTraceRecorder('MULTIPLICADORA').root.label).toBe('MULTIPLICADORA');
  });

  it('runs a graph that writes abcd and returns the head to the beginning', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };

    const writeGroupNodes = linkNodes([
      new MoveRightNode('move-right-a', 0, true),
      new WriterNode('write-a', 'a', 0),
      new MoveRightNode('move-right-b', 0),
      new WriterNode('write-b', 'b', 0),
      new MoveRightNode('move-right-c', 0),
      new WriterNode('write-c', 'c', 0),
      new MoveRightNode('move-right-d', 0),
      new WriterNode('write-d', 'd', 0),
    ]);
    const rewindGroupNodes = linkNodes([
      new MoveLeftNode('move-left-1', 0),
      new MoveLeftNode('move-left-2', 0),
      new MoveLeftNode('move-left-3', 0),
      new MoveLeftNode('move-left-4', 0),
    ]);

    const writeGroup = new LinearMachineGroup(
      'write-abcd',
      writeGroupNodes[0],
      writeGroupNodes.at(-1) ?? null,
    );
    const rewindGroup = new LinearMachineGroup(
      'rewind',
      rewindGroupNodes[0],
      rewindGroupNodes.at(-1) ?? null,
    );
    const graph: MachineGraph = {
      groups: [writeGroup, rewindGroup],
      links: [new Link('write-to-rewind', writeGroup, rewindGroup)],
      initialGroupId: writeGroup.id,
    };

    const ok = new MachineGraphRunner().run(graph, context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        1: 'a',
        2: 'b',
        3: 'c',
        4: 'd',
      },
    });
  });

  it('starts a target group at the link target node when one is configured', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const sourceNode = new MoveRightNode('source-right', 0, true);
    const sourceGroup = new LinearMachineGroup('source', sourceNode, sourceNode);
    const targetNodes = linkNodes([
      new WriterNode('write-wrong', 'n', 0, true),
      new WriterNode('write-right', 'y', 0),
    ]);
    const targetGroup = new LinearMachineGroup('target', targetNodes[0], targetNodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [sourceGroup, targetGroup],
      links: [new Link('source-to-target-node', sourceGroup, targetGroup, null, targetNodes[1])],
      initialGroupId: sourceGroup.id,
    };

    const ok = new MachineGraphRunner().run(graph, context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 1,
      cells: {
        1: 'y',
      },
    });
  });

  it('falls back to the target group initial node when a link has no target node', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const sourceNode = new MoveRightNode('source-right', 0, true);
    const sourceGroup = new LinearMachineGroup('source', sourceNode, sourceNode);
    const targetNodes = linkNodes([
      new WriterNode('write-initial', 'a', 0, true),
      new WriterNode('write-next', 'b', 0),
    ]);
    const targetGroup = new LinearMachineGroup('target', targetNodes[0], targetNodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [sourceGroup, targetGroup],
      links: [new Link('source-to-target-group', sourceGroup, targetGroup)],
      initialGroupId: sourceGroup.id,
    };

    const ok = new MachineGraphRunner().run(graph, context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 1,
      cells: {
        1: 'b',
      },
    });
  });

  it('suspends execution when the burst size is reached and resumes from the continuation', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const nodes = linkNodes([
      new WriterNode('write-a', 'a', 0, true),
      new MoveRightNode('move-right', 0),
      new WriterNode('write-b', 'b', 0),
    ]);
    const group = new LinearMachineGroup('write-ab', nodes[0], nodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const runner = new MachineGraphRunner();
    const firstTraceRecorder = new AteTraceRecorder('NUEVA');

    const firstResult = runner.runBurst(graph, context, firstTraceRecorder, { maxSteps: 2 });

    expect(firstResult.status).toBe('suspended');
    expect(firstResult.continuation).toEqual({
      currentGroupId: group.id,
      currentNodeId: 'move-right',
      phase: 'after-node',
    });
    expect(firstTraceRecorder.root.children.map((child) => child.machineNodeId)).toEqual(['write-a', 'move-right']);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 1,
      cells: {
        0: 'a',
      },
    });

    const secondTraceRecorder = new AteTraceRecorder('NUEVA');
    const secondResult = runner.runBurst(graph, context, secondTraceRecorder, {
      maxSteps: 2,
      startAt: firstResult.continuation,
    });

    expect(secondResult.status).toBe('completed');
    expect(secondTraceRecorder.root.children.map((child) => child.machineNodeId)).toEqual(['write-b']);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 1,
      cells: {
        0: 'a',
        1: 'b',
      },
    });
  });

  it('suspends with nondeterministic continuations when multiple outgoing links can traverse', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const startNode = new HubNode('start', 0, true);
    const firstTargetNode = new WriterNode('write-a', 'a', 0, true);
    const secondTargetNode = new WriterNode('write-b', 'b', 0, true);
    const startGroup = new LinearMachineGroup('start-group', startNode, startNode);
    const firstTargetGroup = new LinearMachineGroup('first-target-group', firstTargetNode, firstTargetNode);
    const secondTargetGroup = new LinearMachineGroup('second-target-group', secondTargetNode, secondTargetNode);
    const firstLink = new Link('first-branch', startGroup, firstTargetGroup);
    const secondLink = new Link('second-branch', startGroup, secondTargetGroup);
    const graph: MachineGraph = {
      groups: [startGroup, firstTargetGroup, secondTargetGroup],
      links: [firstLink, secondLink],
      autolinks: [],
      initialGroupId: startGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const result = new MachineGraphRunner().runBurst(graph, context, traceRecorder);

    expect(result.status).toBe('nondeterministic');
    expect(result.continuations).toEqual([
      {
        currentGroupId: startGroup.id,
        currentNodeId: null,
        phase: 'after-group',
        forcedTransitionId: 'first-branch',
      },
      {
        currentGroupId: startGroup.id,
        currentNodeId: null,
        phase: 'after-group',
        forcedTransitionId: 'second-branch',
      },
    ]);
    expect(traceRecorder.root.children.map((child) => child.kind)).toEqual(['machine-node']);
  });

  it('continues a selected nondeterministic branch using the forced transition', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const startNode = new HubNode('start', 0, true);
    const firstTargetNode = new WriterNode('write-a', 'a', 0, true);
    const secondTargetNode = new WriterNode('write-b', 'b', 0, true);
    const startGroup = new LinearMachineGroup('start-group', startNode, startNode);
    const firstTargetGroup = new LinearMachineGroup('first-target-group', firstTargetNode, firstTargetNode);
    const secondTargetGroup = new LinearMachineGroup('second-target-group', secondTargetNode, secondTargetNode);
    const graph: MachineGraph = {
      groups: [startGroup, firstTargetGroup, secondTargetGroup],
      links: [
        new Link('first-branch', startGroup, firstTargetGroup),
        new Link('second-branch', startGroup, secondTargetGroup),
      ],
      autolinks: [],
      initialGroupId: startGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const result = new MachineGraphRunner().runBurst(graph, context, traceRecorder, {
      startAt: {
        currentGroupId: startGroup.id,
        currentNodeId: null,
        phase: 'after-group',
        forcedTransitionId: 'second-branch',
      },
    });

    expect(result.status).toBe('completed');
    expect(traceRecorder.root.children.map((child) => child.linkId ?? child.machineNodeId)).toEqual([
      'second-branch',
      'write-b',
    ]);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        0: 'b',
      },
    });
  });

  it('returns hanging when moving left from the first tape cell', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const moveLeft = new MoveLeftNode('move-left', 0, true);
    const group = new LinearMachineGroup('left-border', moveLeft, moveLeft);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      autolinks: [],
      initialGroupId: group.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const result = new MachineGraphRunner().runBurst(graph, context, traceRecorder);

    expect(result.status).toBe('hanging');
    traceRecorder.recordHanging();
    expect(traceRecorder.root.children.at(-1)).toMatchObject({
      kind: 'hanging',
      label: 'HANGING',
      iconSrc: 'assets/images/hanging_ATE.gif',
    });
  });

  it('returns hanging when outgoing links exist and none can traverse', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const startNode = new WriterNode('write-a', 'a', 0, true);
    const firstTargetNode = new WriterNode('write-b', 'b', 0, true);
    const secondTargetNode = new WriterNode('write-c', 'c', 0, true);
    const startGroup = new LinearMachineGroup('start-group', startNode, startNode);
    const firstTargetGroup = new LinearMachineGroup('first-target-group', firstTargetNode, firstTargetNode);
    const secondTargetGroup = new LinearMachineGroup('second-target-group', secondTargetNode, secondTargetNode);
    const graph: MachineGraph = {
      groups: [startGroup, firstTargetGroup, secondTargetGroup],
      links: [
        new Link(
          'branch-b',
          startGroup,
          firstTargetGroup,
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['b'] }]),
        ),
        new Link(
          'branch-c',
          startGroup,
          secondTargetGroup,
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['c'] }]),
        ),
      ],
      autolinks: [],
      initialGroupId: startGroup.id,
    };

    const result = new MachineGraphRunner().runBurst(graph, context);

    expect(result.status).toBe('hanging');
  });

  it('returns error when the graph has no valid initial group', () => {
    const context = {
      tapes: [new Tape()],
      metaValues: new MetaValueDictionary(),
    };
    const graph: MachineGraph = {
      groups: [],
      links: [],
      autolinks: [],
      initialGroupId: 'missing-group',
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const result = new MachineGraphRunner().runBurst(graph, context, traceRecorder);

    expect(result.status).toBe('error');
    traceRecorder.recordError();
    expect(traceRecorder.root.children.at(-1)).toMatchObject({
      kind: 'error',
      label: 'ERROR',
      iconSrc: 'assets/images/error_ATE.gif',
    });
  });

  it('renders empty labels for unconditional links', () => {
    expect(new Link('unconditional', null, null).getAteLabel()).toBe('');
    expect(new Autolink('unconditional-autolink', null).getAteLabel()).toBe('');
    expect(new LinkCondition([]).getAteLabel()).toBe('');
  });

  it('evaluates multiple accepted symbols as an OR condition', () => {
    const tape = new Tape();
    tape.load('b');
    tape.setHeadPosition(1);
    const condition = new LinkCondition([{ tapeIndex: 0, acceptedValues: ['a', 'b', 'c'] }]);

    expect(condition.getAteLabel()).toBe('[a,b,c]');
    expect(condition.evaluate({ tapes: [tape], metaValues: new MetaValueDictionary() }).success).toBe(true);

    tape.load('d');
    tape.setHeadPosition(1);

    expect(condition.evaluate({ tapes: [tape], metaValues: new MetaValueDictionary() }).success).toBe(false);
  });

  it('evaluates conditions against the selected tape index', () => {
    const firstTape = new Tape();
    const secondTape = new Tape();
    const condition = new LinkCondition([{ tapeIndex: 1, acceptedValues: ['z'] }]);

    firstTape.load('a');
    firstTape.setHeadPosition(1);
    secondTape.load('z');
    secondTape.setHeadPosition(1);

    expect(condition.getAteLabel(true)).toBe('[z;2]');
    expect(condition.evaluate({ tapes: [firstTape, secondTape], metaValues: new MetaValueDictionary() }).success).toBe(true);
  });

  it('writes the current value of a variable node', () => {
    const tape = new Tape();
    const variable = new VariableValue('α');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    variable.setValue(SymbolValue.require('b'));
    context.metaValues.addVariable(variable);

    const ok = new WriterNode('write-alpha', 'α', 0).execute(context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        0: 'b',
      },
    });
  });

  it('executes writer nodes against their configured tape index', () => {
    const firstTape = new Tape();
    const secondTape = new Tape();
    const context = {
      tapes: [firstTape, secondTape],
      metaValues: new MetaValueDictionary(),
    };

    const ok = new WriterNode('write-z-on-second-tape', 'z', 1).execute(context);

    expect(ok).toBe(true);
    expect(firstTape.getSnapshot().cells).toEqual({});
    expect(secondTape.getSnapshot().cells).toEqual({ 0: 'z' });
  });

  it('writes the current value of a parameter node', () => {
    const tape = new Tape();
    const parameter = new ParameterValue('A');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    parameter.setValue(SymbolValue.require('c'));
    context.metaValues.addParameter(parameter);

    const ok = new WriterNode('write-parameter-a', 'A', 0).execute(context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        0: 'c',
      },
    });
  });

  it('records parameter writer nodes with the assigned value in the execution trace', () => {
    const tape = new Tape();
    const parameter = new ParameterValue('A');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    parameter.setValue(SymbolValue.require('3'));
    context.metaValues.addParameter(parameter);
    const writeParameter = new WriterNode('write-parameter-a', 'A', 0, true);
    const graph: MachineGraph = {
      groups: [new LinearMachineGroup('write-parameter', writeParameter, writeParameter)],
      links: [],
      initialGroupId: 'write-parameter',
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(traceRecorder.root.children).toContainEqual(
      expect.objectContaining({
        label: 'A = 3',
        kind: 'machine-node',
        machineNodeId: 'write-parameter-a',
      }),
    );
  });

  it('assigns a read symbol to a variable when the condition passes', () => {
    const tape = new Tape();
    const sigma = '\u03c3';
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    tape.load('a');
    tape.setHeadPosition(1);
    const condition = new LinkCondition([{ tapeIndex: 0, acceptedValues: ['a'], assignToVariableName: sigma }]);

    expect(condition.getAteLabel()).toBe(`[${sigma} = a]`);
    expect(condition.evaluate(context).success).toBe(true);
    expect(context.metaValues.getVariable(sigma)?.resolve().getName()).toBe('a');
  });

  it('assigns a read symbol to a variable when the condition has no accepted values', () => {
    const tape = new Tape();
    const sigma = '\u03c3';
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    tape.load('x');
    tape.setHeadPosition(1);
    const condition = new LinkCondition([{ tapeIndex: 0, acceptedValues: [], assignToVariableName: sigma }]);

    expect(condition.evaluate(context).success).toBe(true);
    expect(context.metaValues.getVariable(sigma)?.resolve().getName()).toBe('x');
  });

  it('records variable assignment links with the link icon in the execution trace', () => {
    const tape = new Tape();
    const sigma = '\u03c3';
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    tape.load('a');
    tape.setHeadPosition(1);
    const startNode = new HubNode('start', 0, true);
    const doneNode = new WriterNode('done', 'b', 0);
    const startGroup = new LinearMachineGroup('start-group', startNode, startNode);
    const doneGroup = new LinearMachineGroup('done-group', doneNode, doneNode);
    const graph: MachineGraph = {
      groups: [startGroup, doneGroup],
      links: [
        new Link(
          'assign-sigma',
          startGroup,
          doneGroup,
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['a'], assignToVariableName: sigma }]),
        ),
      ],
      initialGroupId: startGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(traceRecorder.root.children).toContainEqual(
      expect.objectContaining({
        label: `[${sigma} = a]`,
        iconSrc: 'assets/images/link_ATE.gif',
        kind: 'link',
        linkId: 'assign-sigma',
      }),
    );
  });

  it('records link tape indexes in the execution trace when enabled', () => {
    const firstTape = new Tape();
    const secondTape = new Tape();
    const context = {
      tapes: [firstTape, secondTape],
      metaValues: new MetaValueDictionary(),
    };
    secondTape.load('a');
    secondTape.setHeadPosition(1);
    const startNode = new HubNode('start', 0, true);
    const doneNode = new WriterNode('done', 'b', 1);
    const startGroup = new LinearMachineGroup('start-group', startNode, startNode);
    const doneGroup = new LinearMachineGroup('done-group', doneNode, doneNode);
    const graph: MachineGraph = {
      groups: [startGroup, doneGroup],
      links: [new Link('second-tape-link', startGroup, doneGroup, new LinkCondition([{ tapeIndex: 1, acceptedValues: ['a'] }]))],
      initialGroupId: startGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA', { showTapeIndexes: true });

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(traceRecorder.root.children).toContainEqual(
      expect.objectContaining({
        label: '[a;2]',
        linkId: 'second-tape-link',
      }),
    );
  });

  it('records variable writer nodes with the sigma icon and assigned value in the execution trace', () => {
    const tape = new Tape();
    const sigma = '\u03c3';
    const variable = new VariableValue(sigma);
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    variable.setValue(SymbolValue.require('c'));
    context.metaValues.addVariable(variable);
    const writeVariable = new WriterNode('write-sigma', sigma, 0, true);
    const graph: MachineGraph = {
      groups: [new LinearMachineGroup('write-variable', writeVariable, writeVariable)],
      links: [],
      initialGroupId: 'write-variable',
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(traceRecorder.root.children).toContainEqual(
      expect.objectContaining({
        label: `[${sigma} = c]`,
        iconSrc: 'assets/images/sigma_ATE.gif',
        kind: 'machine-node',
        machineNodeId: 'write-sigma',
      }),
    );
  });

  it('uses variable values as accepted condition operands', () => {
    const tape = new Tape();
    const variable = new VariableValue('β');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    tape.load('b');
    tape.setHeadPosition(1);
    variable.setValue(SymbolValue.require('b'));
    context.metaValues.addVariable(variable);
    const condition = new LinkCondition([{ tapeIndex: 0, acceptedValues: ['β'] }]);

    expect(condition.getAteLabel()).toBe('[β]');
    expect(condition.evaluate(context).success).toBe(true);
  });

  it('uses parameter values as accepted condition operands', () => {
    const tape = new Tape();
    const parameter = new ParameterValue('A');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    tape.load('d');
    tape.setHeadPosition(1);
    parameter.setValue(SymbolValue.require('d'));
    context.metaValues.addParameter(parameter);
    const condition = new LinkCondition([{ tapeIndex: 0, acceptedValues: ['A'] }]);

    expect(condition.getAteLabel()).toBe('[A]');
    expect(condition.evaluate(context).success).toBe(true);
  });

  it('records the deterministic execution trace', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const writeGroupNodes = linkNodes([
      new MoveRightNode('move-right-a', 0, true),
      new WriterNode('write-a', 'a', 0),
    ]);
    const rewindGroupNodes = linkNodes([
      new MoveLeftNode('move-left-1', 0),
    ]);
    const writeGroup = new LinearMachineGroup(
      'write-a',
      writeGroupNodes[0],
      writeGroupNodes.at(-1) ?? null,
    );
    const rewindGroup = new LinearMachineGroup(
      'rewind',
      rewindGroupNodes[0],
      rewindGroupNodes.at(-1) ?? null,
    );
    const graph: MachineGraph = {
      groups: [writeGroup, rewindGroup],
      links: [new Link('write-to-rewind', writeGroup, rewindGroup)],
      initialGroupId: writeGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);
    traceRecorder.recordStop();

    expect(ok).toBe(true);
    expect(traceRecorder.root.children.map((child) => child.label)).toEqual([
      '',
      'a',
      '',
      '',
      '',
    ]);
    expect(traceRecorder.root.children.map((child) => child.iconSrc)).toEqual([
      'assets/images/R_ATE.gif',
      'assets/images/a_ATE.gif',
      'assets/images/link_ATE.gif',
      'assets/images/L_ATE.gif',
      'assets/images/stop_ATE.gif',
    ]);
    expect(traceRecorder.root.children.every((child) => !('tapeSnapshots' in child))).toBe(true);
  });

  it('runs the matching branch for conditional links', () => {
    const matchingTape = runConditionalLinkMachine('abcd');
    const nonMatchingTape = runConditionalLinkMachine('abcc');

    expect(matchingTape.getSnapshot()).toEqual({
      headPosition: 5,
      cells: {
        1: 'a',
        2: 'b',
        3: 'c',
        4: 'd',
        5: 'y',
      },
    });
    expect(nonMatchingTape.getSnapshot()).toEqual({
      headPosition: 5,
      cells: {
        1: 'a',
        2: 'b',
        3: 'c',
        4: 'c',
        5: 'n',
      },
    });
  });

  it('repeats a node while its autolink condition can be traversed', () => {
    const tape = new Tape();
    tape.load('abcd');
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const rewindNode = new MoveLeftNode('rewind-left', 0, true);
    const rewindGroup = new LinearMachineGroup('rewind', rewindNode, rewindNode);
    const graph: MachineGraph = {
      groups: [rewindGroup],
      links: [],
      autolinks: [
        new Autolink(
          'rewind-while-not-blank',
          rewindNode,
          new LinkCondition([{ tapeIndex: 0, acceptedValues: ['#'], negated: true }]),
        ),
      ],
      initialGroupId: rewindGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(tape.getSnapshot().headPosition).toBe(0);
    expect(traceRecorder.root.children.map((child) => child.iconSrc)).toContain('assets/images/autolink_ATE.gif');
  });

  it('starts at the node marked as initial inside the initial group', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const nodes = linkNodes([
      new WriterNode('write-a', 'a', 0),
      new MoveRightNode('move-right', 0, true),
      new WriterNode('write-b', 'b', 0),
    ]);
    const group = new LinearMachineGroup('write-from-middle', nodes[0], nodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [group],
      links: [],
      initialGroupId: group.id,
    };

    const ok = new MachineGraphRunner().run(graph, context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 1,
      cells: {
        1: 'b',
      },
    });
  });

  it('routes through a hub node without changing the tape', () => {
    const tape = new Tape();
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
    };
    const writeGroupNodes = linkNodes([
      new MoveRightNode('move-right-before-hub', 0, true),
      new WriterNode('write-a', 'a', 0),
    ]);
    const hubNode = new HubNode('hub-1', 0);
    const doneGroupNodes = linkNodes([
      new MoveRightNode('move-right-after-hub', 0),
      new WriterNode('write-b', 'b', 0),
    ]);
    const writeGroup = new LinearMachineGroup('write-a', writeGroupNodes[0], writeGroupNodes.at(-1) ?? null);
    const hubGroup = new LinearMachineGroup('hub', hubNode, hubNode);
    const doneGroup = new LinearMachineGroup('write-b', doneGroupNodes[0], doneGroupNodes.at(-1) ?? null);
    const graph: MachineGraph = {
      groups: [writeGroup, hubGroup, doneGroup],
      links: [
        new Link('write-to-hub', writeGroup, hubGroup),
        new Link('hub-to-done', hubGroup, doneGroup),
      ],
      initialGroupId: writeGroup.id,
    };
    const traceRecorder = new AteTraceRecorder('NUEVA');

    const ok = new MachineGraphRunner().run(graph, context, traceRecorder);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 2,
      cells: {
        1: 'a',
        2: 'b',
      },
    });
    expect(traceRecorder.root.children).toContainEqual(
      expect.objectContaining({
        iconSrc: 'assets/images/hub_ATE.gif',
        kind: 'machine-node',
        label: '',
        machineNodeId: hubNode.id,
        children: [],
      }),
    );
  });

  it('executes a submachine node with an isolated context and copies the first tape back', () => {
    const callerTape = new Tape();
    callerTape.load('ab');
    const searchLeftNode = new MoveLeftNode('sub-left', 0, true);
    const searchLeftGroup = new LinearMachineGroup('sub-left-group', searchLeftNode, searchLeftNode);
    const submachine: SubmachineDefinition = {
      name: 'BUSCADORA_L',
      graph: {
        groups: [searchLeftGroup],
        links: [],
        autolinks: [
          new Autolink(
            'keep-searching-left',
            searchLeftNode,
            new LinkCondition([{ tapeIndex: 0, acceptedValues: ['A'], negated: true }]),
          ),
        ],
        initialGroupId: searchLeftGroup.id,
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const submachineNode = new SubmachineNode(
      'search-left-node',
      'buscadora_l',
      'BUSCADORA_L',
      'L',
      'A',
      { A: '#' },
      0,
      true,
    );
    const context = {
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map([['buscadora_l' as const, submachine]]),
    };

    const ok = submachineNode.execute(context);

    expect(ok).toBe(true);
    expect(submachineNode.getAteIconName()).toBe('M_ATE.gif');
    expect(submachineNode.getAteLabel()).toBe('BUSCADORA_L()');
    expect(submachineNode.getAteSubtrace()).toEqual(
      expect.objectContaining({
        machineName: 'BUSCADORA_L',
        graph: submachine.graph,
        root: expect.objectContaining({
          label: 'BUSCADORA_L',
          children: expect.arrayContaining([
            expect.objectContaining({
              iconSrc: 'assets/images/L_ATE.gif',
              machineNodeId: 'sub-left',
            }),
            expect.objectContaining({
              iconSrc: 'assets/images/stop_ATE.gif',
              kind: 'stop',
            }),
          ]),
        }),
        initialTapeSnapshots: [
          {
            headPosition: 3,
            cells: {
              1: 'a',
              2: 'b',
            },
          },
        ],
        finalTapeSnapshots: [
          {
            headPosition: 0,
            cells: {
              1: 'a',
              2: 'b',
            },
          },
        ],
      }),
    );
    expect(callerTape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        1: 'a',
        2: 'b',
      },
    });
  });

  it('executes a submachine node against its configured caller tape', () => {
    const firstCallerTape = new Tape();
    firstCallerTape.load('xx');
    const secondCallerTape = new Tape();
    secondCallerTape.load('ab');
    const searchLeftNode = new MoveLeftNode('sub-left', 0, true);
    const searchLeftGroup = new LinearMachineGroup('sub-left-group', searchLeftNode, searchLeftNode);
    const submachine: SubmachineDefinition = {
      name: 'BUSCADORA_L',
      graph: {
        groups: [searchLeftGroup],
        links: [],
        autolinks: [
          new Autolink(
            'keep-searching-left',
            searchLeftNode,
            new LinkCondition([{ tapeIndex: 0, acceptedValues: ['A'], negated: true }]),
          ),
        ],
        initialGroupId: searchLeftGroup.id,
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const submachineNode = new SubmachineNode(
      'search-left-node',
      'buscadora_l',
      'BUSCADORA_L',
      'L',
      'A',
      { A: '#' },
      1,
      true,
    );
    const context = {
      tapes: [firstCallerTape, secondCallerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map([['buscadora_l' as const, submachine]]),
    };

    const ok = submachineNode.execute(context);

    expect(ok).toBe(true);
    expect(firstCallerTape.getSnapshot()).toEqual({
      headPosition: 3,
      cells: {
        1: 'x',
        2: 'x',
      },
    });
    expect(secondCallerTape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {
        1: 'a',
        2: 'b',
      },
    });
  });

  it('records a specialized M hanging entry when a submachine hangs internally', () => {
    const callerTape = new Tape();
    const hangingNode = new MoveLeftNode('sub-left', 0, true);
    const hangingGroup = new LinearMachineGroup('sub-left-group', hangingNode, hangingNode);
    const submachine: SubmachineDefinition = {
      name: 'COLGADA_SUB',
      graph: {
        groups: [hangingGroup],
        links: [],
        autolinks: [],
        initialGroupId: hangingGroup.id,
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const submachineNode = new SubmachineNode('submachine-node', 'sub-hanging', 'COLGADA_SUB', 'M', '', {}, 0, true);
    const parentGroup = new LinearMachineGroup('parent-group', submachineNode, submachineNode);
    const traceRecorder = new AteTraceRecorder('MAIN');
    const result = new MachineGraphRunner().runBurst({
      groups: [parentGroup],
      links: [],
      autolinks: [],
      initialGroupId: parentGroup.id,
    }, {
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map([['sub-hanging', submachine]]),
    }, traceRecorder);

    expect(result.status).toBe('hanging');
    expect(traceRecorder.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/M_Hanging_ATE.gif',
        label: 'COLGADA_SUB()',
        subtrace: expect.objectContaining({
          root: expect.objectContaining({
            children: [
              expect.objectContaining({
                iconSrc: 'assets/images/hanging_ATE.gif',
                kind: 'hanging',
              }),
            ],
          }),
        }),
      }),
    ]);
  });

  it('records a specialized M expand entry when a submachine reaches the burst limit', () => {
    const callerTape = new Tape();
    const writerNode = new WriterNode('sub-write', 'a', 0, true);
    const writerGroup = new LinearMachineGroup('sub-write-group', writerNode, writerNode);
    const submachine: SubmachineDefinition = {
      name: 'EXPAND_SUB',
      graph: {
        groups: [writerGroup],
        links: [],
        autolinks: [new Autolink('repeat', writerNode)],
        initialGroupId: writerGroup.id,
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const submachineNode = new SubmachineNode('submachine-node', 'sub-expand', 'EXPAND_SUB', 'M', '', {}, 0, true);

    const ok = submachineNode.execute({
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      maxSteps: 1,
      submachines: new Map([['sub-expand', submachine]]),
    });

    expect(ok).toBe(false);
    expect(submachineNode.getExecutionResult()?.status).toBe('suspended');
    expect(submachineNode.getAteIconName()).toBe('M_Expand_ATE.gif');
    expect(submachineNode.getAteSubtrace()?.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/a_ATE.gif',
        machineNodeId: 'sub-write',
      }),
      expect.objectContaining({
        iconSrc: 'assets/images/expand_ATE.gif',
        kind: 'expand',
        continuation: expect.objectContaining({
          currentGroupId: writerGroup.id,
          currentNodeId: writerNode.id,
          phase: 'after-node',
        }),
      }),
    ]);
  });

  it('records a specialized M nondeterminism entry when a submachine branches internally', () => {
    const callerTape = new Tape();
    const writerNode = new WriterNode('sub-write', 'a', 0, true);
    const sourceGroup = new LinearMachineGroup('source-group', writerNode, writerNode);
    const leftNode = new WriterNode('left-write', 'b', 0, true);
    const leftGroup = new LinearMachineGroup('left-group', leftNode, leftNode);
    const rightNode = new WriterNode('right-write', 'c', 0, true);
    const rightGroup = new LinearMachineGroup('right-group', rightNode, rightNode);
    const leftLink = new Link('left-link', sourceGroup, leftGroup);
    const rightLink = new Link('right-link', sourceGroup, rightGroup);
    const submachine: SubmachineDefinition = {
      name: 'ND_SUB',
      graph: {
        groups: [sourceGroup, leftGroup, rightGroup],
        links: [leftLink, rightLink],
        autolinks: [],
        initialGroupId: sourceGroup.id,
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const submachineNode = new SubmachineNode('submachine-node', 'sub-nd', 'ND_SUB', 'M', '', {}, 0, true);

    const ok = submachineNode.execute({
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map([['sub-nd', submachine]]),
    });

    expect(ok).toBe(false);
    expect(submachineNode.getExecutionResult()?.status).toBe('nondeterministic');
    expect(submachineNode.getAteIconName()).toBe('M_ND_ATE.gif');
    expect(submachineNode.getAteSubtrace()?.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/a_ATE.gif',
        machineNodeId: 'sub-write',
      }),
      expect.objectContaining({
        iconSrc: 'assets/images/ND_ATE.gif',
        kind: 'nondeterminism',
      }),
      expect.objectContaining({
        iconSrc: 'assets/images/expand_ATE.gif',
        kind: 'expand',
        continuation: expect.objectContaining({ forcedTransitionId: 'left-link' }),
      }),
      expect.objectContaining({
        iconSrc: 'assets/images/expand_ATE.gif',
        kind: 'expand',
        continuation: expect.objectContaining({ forcedTransitionId: 'right-link' }),
      }),
    ]);
  });

  it('reports M_Error when a submachine definition is missing at execution time', () => {
    const callerTape = new Tape();
    const submachineNode = new SubmachineNode(
      'missing-submachine-node',
      'missing-submachine',
      'MISSING_SUB',
      'M',
      '',
      {},
      0,
      true,
    );

    const ok = submachineNode.execute({
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map(),
    });

    expect(ok).toBe(false);
    expect(submachineNode.getExecutionResult()).toEqual({ status: 'error' });
    expect(submachineNode.getAteIconName()).toBe('M_Error_ATE.gif');
    expect(submachineNode.getAteSubtrace()).toBeNull();
    expect(callerTape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {},
    });
  });

  it('records a specialized M error entry with an internal error trace for an inconsistent in-memory submachine', () => {
    const callerTape = new Tape();
    const submachineNode = new SubmachineNode(
      'corrupt-submachine-node',
      'corrupt-submachine',
      'CORRUPT_SUB',
      'M',
      '',
      {},
      0,
      true,
    );
    const parentGroup = new LinearMachineGroup('parent-group', submachineNode, submachineNode);
    const corruptSubmachine: SubmachineDefinition = {
      name: 'CORRUPT_SUB',
      graph: {
        groups: [],
        links: [],
        autolinks: [],
        initialGroupId: 'missing-initial-group',
      },
      view: { groups: [], nodes: [], links: [] },
      tapeCount: 1,
      parameterAssignments: {},
    };
    const traceRecorder = new AteTraceRecorder('MAIN');
    const result = new MachineGraphRunner().runBurst({
      initialGroupId: parentGroup.id,
      groups: [parentGroup],
      links: [],
      autolinks: [],
    }, {
      tapes: [callerTape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map([['corrupt-submachine', corruptSubmachine]]),
    }, traceRecorder);

    expect(result).toEqual({
      status: 'error',
      continuation: {
        currentGroupId: parentGroup.id,
        currentNodeId: submachineNode.id,
        phase: 'after-node',
      },
      traceTerminalRecorded: true,
    });
    expect(traceRecorder.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/M_Error_ATE.gif',
        label: 'CORRUPT_SUB()',
        subtrace: expect.objectContaining({
          root: expect.objectContaining({
            children: [
              expect.objectContaining({
                iconSrc: 'assets/images/error_ATE.gif',
                kind: 'error',
              }),
            ],
          }),
        }),
      }),
    ]);
  });

  it('renders M_Hanging for the SUB_COLG example submachine invocation', () => {
    const restored = restoreMachineFromJtvFile(subColgFile as JtvFile);
    const tape = new Tape();
    const traceRecorder = new AteTraceRecorder(restored.selectedMachine.name);
    const result = new MachineGraphRunner().runBurst(restored.machineGraph, {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
      submachines: createExampleSubmachines(restored),
    }, traceRecorder);

    expect(result.status).toBe('hanging');
    expect(traceRecorder.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/M_Hanging_ATE.gif',
        label: 'COLGADA2()',
        subtrace: expect.objectContaining({
          root: expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                iconSrc: 'assets/images/hanging_ATE.gif',
                kind: 'hanging',
              }),
            ]),
          }),
        }),
      }),
    ]);
  });

  it('renders M_Expand for the SUB_EXPAND example submachine invocation', () => {
    const restored = restoreMachineFromJtvFile(subExpandFile as JtvFile);
    const tape = new Tape();
    const traceRecorder = new AteTraceRecorder(restored.selectedMachine.name);
    const result = new MachineGraphRunner().runBurst(restored.machineGraph, {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
      maxSteps: 2,
      submachines: createExampleSubmachines(restored),
    }, traceRecorder, { maxSteps: 2 });

    expect(result.status).toBe('suspended');
    expect(traceRecorder.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/M_Expand_ATE.gif',
        label: 'EXPAND()',
        subtrace: expect.objectContaining({
          root: expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                iconSrc: 'assets/images/expand_ATE.gif',
                kind: 'expand',
              }),
            ]),
          }),
        }),
      }),
    ]);
  });

  it('renders M_ND for the SUB_ND example submachine invocation', () => {
    const restored = restoreMachineFromJtvFile(subNdFile as JtvFile);
    const tape = new Tape();
    const traceRecorder = new AteTraceRecorder(restored.selectedMachine.name);
    const result = new MachineGraphRunner().runBurst(restored.machineGraph, {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
      submachines: createExampleSubmachines(restored),
    }, traceRecorder);

    expect(result.status).toBe('nondeterministic');
    expect(traceRecorder.root.children).toEqual([
      expect.objectContaining({
        iconSrc: 'assets/images/M_ND_ATE.gif',
        label: 'ND()',
        subtrace: expect.objectContaining({
          root: expect.objectContaining({
            children: expect.arrayContaining([
              expect.objectContaining({
                iconSrc: 'assets/images/ND_ATE.gif',
                kind: 'nondeterminism',
              }),
              expect.objectContaining({
                iconSrc: 'assets/images/expand_ATE.gif',
                kind: 'expand',
              }),
            ]),
          }),
        }),
      }),
    ]);
  });

  it('executes the TAREA3VFINAL legacy monster example without treating legacy submachine returns as hanging', () => {
    expect(runExampleMachineBurstOutput(tarea3vfinalFile as JtvFile, '10101#1111#s#100#r', 1000)).toBe('#100000#');
  });

  it.each([
    ['101#f#101010#1010#r#m', '#111100000000#'],
    ['100101#101#t#log#10#10001#1010#101#f#r#m#s#d', '#0#'],
    ['101001#1000#100000#r#d', '#error#'],
    ['0#f#1#r#00#p', '#error#'],
    ['10010#1010#1010#1001#000101#01010#01010#01010#p#s#d#r#m#s#log#f#s', '#1101110101111100010010#'],
  ])('executes the TAREA3VFINAL legacy monster example for "%s"', (input, expectedOutput) => {
    expect(runExampleMachineBurstOutput(tarea3vfinalFile as JtvFile, input, 1000)).toBe(expectedOutput);
  });

  it('executes the preinstalled shift-right submachine without looping', () => {
    const tape = new Tape();
    tape.load('ab');
    const buscadoraR = restoreMachineFromJtvFile(buscadoraRFile as JtvFile);
    const shiftR = restoreMachineFromJtvFile(shiftRFile as JtvFile);
    const context = {
      tapes: [tape],
      metaValues: new MetaValueDictionary(),
      submachines: new Map<string, SubmachineDefinition>([
        ['buscadora_r', {
          name: buscadoraR.selectedMachine.name,
          graph: buscadoraR.machineGraph,
          view: buscadoraR.machineGraphView,
          tapeCount: buscadoraR.tapeCount,
          parameterAssignments: buscadoraR.parameterAssignments,
        }],
      ]),
    };

    const ok = new MachineGraphRunner().run(shiftR.machineGraph, context);

    expect(ok).toBe(true);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 4,
      cells: {
        2: 'a',
        3: 'b',
      },
    });
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
  ])('executes the COPIADORA example for "%s"', (input, expectedSnapshot) => {
    expect(runExampleMachine(copiadoraFile as JtvFile, input)).toEqual(expectedSnapshot);
  });

  it('executes the COPIADORA2 example using the configured submachine tape', () => {
    expect(runExampleMachineTapes(copiadora2File as JtvFile, ['ab', ''])).toEqual([
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

  it('executes the COPIADORA2 example for "copyme"', () => {
    expect(runExampleMachineTapes(copiadora2File as JtvFile, ['copyme', ''])).toEqual([
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
  });

  it.each([
    ['1', '1'],
    ['11', '10'],
    ['111', '11'],
    ['1111', '100'],
    ['11111', '101'],
    ['111111', '110'],
    ['11111111', '1000'],
  ])('executes the UNARIO_BINARIO example for "%s"', (input, expectedBinary) => {
    const tapes = runExampleMachineTapes(unarioBinarioFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedBinary}#`);
    expect(tapes[0].headPosition).toBe(expectedBinary.length + 1);
    expect(Object.values(tapes[0].cells)).not.toContain('s');
  });

  it.each([
    ['1', '1'],
    ['10', '11'],
    ['11', '111'],
    ['100', '1111'],
    ['101', '11111'],
    ['110', '111111'],
    ['1000', '11111111'],
  ])('executes the BINARIO_UNARIO example for "%s"', (input, expectedUnary) => {
    const tapes = runExampleMachineTapes(binarioUnarioFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedUnary}#`);
    expect(tapes[0].headPosition).toBe(expectedUnary.length + 1);
  });

  it.each([
    ['1', '1'],
    ['11111', '5'],
    ['111111111', '9'],
    ['1111111111', '10'],
    ['11111111111', '11'],
    ['111111111111', '12'],
  ])('executes the UNARIO_DECIMAL example for "%s"', (input, expectedDecimal) => {
    const tapes = runExampleMachineTapes(unarioDecimalFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedDecimal}#`);
    expect(tapes[0].headPosition).toBe(expectedDecimal.length + 1);
    expect(Object.values(tapes[0].cells)).not.toContain('s');
  });

  it.each([
    ['1', '1'],
    ['5', '11111'],
    ['9', '111111111'],
    ['10', '1111111111'],
    ['11', '11111111111'],
    ['12', '111111111111'],
  ])('executes the DECIMAL_UNARIO example for "%s"', (input, expectedUnary) => {
    const tapes = runExampleMachineTapes(decimalUnarioFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedUnary}#`);
    expect(tapes[0].headPosition).toBe(expectedUnary.length + 1);
    expect(Object.values(tapes[0].cells)).not.toContain('s');
  });

  it.each([
    ['1', '1'],
    ['10', '2'],
    ['11', '3'],
    ['100', '4'],
    ['101', '5'],
    ['1000', '8'],
    ['1010', '10'],
    ['1100', '12'],
  ])('executes the BINARIO_DECIMAL example for "%s"', (input, expectedDecimal) => {
    const tapes = runExampleMachineTapes(binarioDecimalFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedDecimal}#`);
    expect(tapes[0].headPosition).toBe(expectedDecimal.length + 1);
    expect(Object.values(tapes[0].cells)).not.toContain('s');
  });

  it.each([
    ['1', '1'],
    ['2', '10'],
    ['3', '11'],
    ['4', '100'],
    ['5', '101'],
    ['8', '1000'],
    ['10', '1010'],
    ['12', '1100'],
  ])('executes the DECIMAL_BINARIO example for "%s"', (input, expectedBinary) => {
    const tapes = runExampleMachineTapes(decimalBinarioFile as JtvFile, [input, '']);

    expect(tapeSnapshotToDelimitedString(tapes[0])).toBe(`#${expectedBinary}#`);
    expect(tapes[0].headPosition).toBe(expectedBinary.length + 1);
    expect(Object.values(tapes[0].cells)).not.toContain('s');
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
  ])('executes the MONUS example for "%s"', (input, expectedSnapshot) => {
    expect(runExampleMachine(monusFile as JtvFile, input)).toEqual(expectedSnapshot);
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
  ])('executes the MULTIPLICADORA example for "%s"', (input, expectedSnapshot) => {
    expect(runExampleMachine(multiplicadoraFile as JtvFile, input)).toEqual(expectedSnapshot);
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
  ])('executes the MULTIPLICADORA2 example for "%s"', (input, expectedSnapshot) => {
    expect(runExampleMachine(multiplicadora2File as JtvFile, input)).toEqual(expectedSnapshot);
  });

  it('executes the IGUALES_ABC example for an accepted input', () => {
    expect(runExampleMachine(igualesAbcFile as JtvFile, 'abccabbca')).toEqual({
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

  it('executes the IGUALES_ABC example for the minimal accepted input "abc"', () => {
    expect(runExampleMachine(igualesAbcFile as JtvFile, 'abc')).toEqual({
      headPosition: 0,
      cells: {
        1: 'd',
        2: 'd',
        3: 'd',
      },
    });
  });

  it('suspends the IGUALES_ABC example for a looping input', () => {
    const execution = runExampleMachineBurst(igualesAbcFile as JtvFile, 'abccabb', 40);
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
  ])('executes the PALINDROME example for "%s"', (input, expectedSnapshot) => {
    expect(runExampleMachine(palindromeFile as JtvFile, input)).toEqual(expectedSnapshot);
  });

  it.each(['ab', 'abca', 'ba'])('leaves #n# on tape 1 for non-palindrome "%s"', (input) => {
    expect(runExampleMachine(palindromeFile as JtvFile, input)).toEqual({
      headPosition: 2,
      cells: {
        1: 'n',
      },
    });
  });
});

function runConditionalLinkMachine(input: string): Tape {
  const tape = new Tape();
  tape.load(input);

  const context = {
    tapes: [tape],
    metaValues: new MetaValueDictionary(),
  };
  const rewindGroupNodes = linkNodes([
    new MoveLeftNode('rewind-left', 0, true),
  ]);
  const readGroupNodes = linkNodes([
    new MoveRightNode('read-move-right-1', 0),
    new MoveRightNode('read-move-right-2', 0),
    new MoveRightNode('read-move-right-3', 0),
    new MoveRightNode('read-move-right-4', 0),
  ]);
  const yesGroupNodes = linkNodes([
    new MoveRightNode('yes-move-right', 0),
    new WriterNode('write-y', 'y', 0),
  ]);
  const noGroupNodes = linkNodes([
    new MoveRightNode('no-move-right', 0),
    new WriterNode('write-n', 'n', 0),
  ]);
  const rewindGroup = new LinearMachineGroup(
    'rewind-to-left-blank',
    rewindGroupNodes[0],
    rewindGroupNodes.at(-1) ?? null,
  );
  const readGroup = new LinearMachineGroup(
    'read-fourth-symbol',
    readGroupNodes[0],
    readGroupNodes.at(-1) ?? null,
  );
  const yesGroup = new LinearMachineGroup(
    'write-y',
    yesGroupNodes[0],
    yesGroupNodes.at(-1) ?? null,
  );
  const noGroup = new LinearMachineGroup(
    'write-n',
    noGroupNodes[0],
    noGroupNodes.at(-1) ?? null,
  );
  const graph: MachineGraph = {
    groups: [rewindGroup, readGroup, yesGroup, noGroup],
    links: [
      new Link(
        'keep-rewinding-while-not-blank',
        rewindGroup,
        rewindGroup,
        new LinkCondition([{ tapeIndex: 0, acceptedValues: ['#'], negated: true }]),
      ),
      new Link('rewound-to-left-blank', rewindGroup, readGroup),
      new Link(
        'read-d',
        readGroup,
        yesGroup,
        new LinkCondition([{ tapeIndex: 0, acceptedValues: ['d'] }]),
      ),
      new Link(
        'read-not-d',
        readGroup,
        noGroup,
        new LinkCondition([{ tapeIndex: 0, acceptedValues: ['d'], negated: true }]),
      ),
    ],
    initialGroupId: rewindGroup.id,
  };

  expect(new MachineGraphRunner().run(graph, context)).toBe(true);

  return tape;
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

function runExampleMachine(file: JtvFile, input: string): ReturnType<Tape['getSnapshot']> {
  return runExampleMachineTapes(file, [input])[0];
}

function runExampleMachineTapes(file: JtvFile, inputs: readonly string[]): ReturnType<Tape['getSnapshot']>[] {
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
    submachines: createExampleSubmachines(restored),
  });

  expect(ok).toBe(true);
  return tapes.map((tape) => tape.getSnapshot());
}

function runExampleMachineBurst(file: JtvFile, input: string, maxSteps: number): {
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
    submachines: createExampleSubmachines(restored),
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

function runExampleMachineBurstOutput(file: JtvFile, input: string, maxSteps: number): string {
  const restored = restoreMachineFromJtvFile(file);
  const tapeCount = Math.max(restored.tapeCount, 1);
  const tapes = Array.from({ length: tapeCount }, (_, index) => {
    const tape = new Tape();
    tape.load(index === 0 ? input : '');
    return tape;
  });
  const runner = new MachineGraphRunner();
  const context = {
    tapes,
    metaValues: new MetaValueDictionary(),
    submachines: createExampleSubmachines(restored),
  };
  let result = runner.runBurst(restored.machineGraph, context, undefined, { maxSteps });
  let bursts = 1;

  while (result.status === 'suspended' && result.continuation && bursts < 100) {
    result = runner.runBurst(restored.machineGraph, context, undefined, {
      maxSteps,
      startAt: result.continuation,
    });
    bursts++;
  }

  expect(result.status).toBe('completed');

  return tapeSnapshotToDelimitedString(tapes[0].getSnapshot());
}

function tapeSnapshotToDelimitedString(snapshot: ReturnType<Tape['getSnapshot']>): string {
  const positions = Object.keys(snapshot.cells)
    .map((position) => Number(position))
    .filter((position) => Number.isInteger(position));

  if (positions.length === 0) {
    return '##';
  }

  const maxPosition = Math.max(...positions);
  let output = '';

  for (let position = 1; position <= maxPosition; position++) {
    output += snapshot.cells[position] ?? SymbolValue.BLANK;
  }

  return `${SymbolValue.BLANK}${output}${SymbolValue.BLANK}`;
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

function createExampleSubmachines(restored: ReturnType<typeof restoreMachineFromJtvFile>): ReadonlyMap<string, SubmachineDefinition> {
  const submachines = new Map<string, SubmachineDefinition>(createPreinstalledSubmachines());

  addRestoredSubmachines(submachines, restored.submachines);

  return submachines;
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

function linkNodes<T extends MachineNode>(nodes: T[]): T[] {
  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }

  return nodes;
}
