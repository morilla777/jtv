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
import { VariableValue } from './variable-value';
import { WriterNode } from './writer-node';

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

function linkNodes<T extends MachineNode>(nodes: T[]): T[] {
  for (let index = 0; index < nodes.length - 1; index++) {
    nodes[index].next = nodes[index + 1];
    nodes[index + 1].previous = nodes[index];
  }

  return nodes;
}
