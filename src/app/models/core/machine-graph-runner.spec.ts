import { describe, expect, it } from 'vitest';

import { AteTraceRecorder } from '../ate';
import { Autolink } from './autolink';
import { LinearMachineGroup } from './linear-machine-group';
import { Link } from './link';
import { LinkCondition } from './link-condition';
import { MachineGraph } from './machine-graph';
import { MachineGraphRunner } from './machine-graph-runner';
import { MachineNode } from './machine-node';
import { MetaValueDictionary } from './meta-value-dictionary';
import { MoveLeftNode } from './move-left-node';
import { MoveRightNode } from './move-right-node';
import { Tape } from './tape';
import { WriterNode } from './writer-node';

describe('MachineGraphRunner', () => {
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
      '[1]',
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
