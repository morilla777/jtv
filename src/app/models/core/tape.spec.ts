import { describe, expect, it } from 'vitest';

import { SymbolValue } from './symbol-value';
import { Tape } from './tape';

describe('Tape', () => {
  const blank = SymbolValue.require(SymbolValue.BLANK);
  const a = SymbolValue.require('a');
  const b = SymbolValue.require('b');
  const zero = SymbolValue.require('0');

  it('reads the blank symbol from empty cells', () => {
    const tape = new Tape();

    expect(tape.read()).toBe(blank);
  });

  it('writes and reads a symbol at the current head position', () => {
    const tape = new Tape();

    tape.write(a);

    expect(tape.read()).toBe(a);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: { 0: 'a' },
    });
  });

  it('removes a cell when writing the blank symbol', () => {
    const tape = new Tape();

    tape.write(a);
    tape.write(blank);

    expect(tape.read()).toBe(blank);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {},
    });
  });

  it('moves the head to the right and prevents moving left from position zero', () => {
    const tape = new Tape();

    expect(tape.moveLeft()).toBe(false);
    expect(tape.getHeadPosition()).toBe(0);

    expect(tape.moveRight()).toBe(true);
    expect(tape.getHeadPosition()).toBe(1);

    expect(tape.moveLeft()).toBe(true);
    expect(tape.getHeadPosition()).toBe(0);
  });

  it('loads input starting at position one and places the head after the input', () => {
    const tape = new Tape();

    tape.load('ab0');

    expect(tape.getHeadPosition()).toBe(4);
    expect(tape.getInitialHeadPosition()).toBe(4);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 4,
      cells: {
        1: 'a',
        2: 'b',
        3: '0',
      },
    });
    expect(tape.getInitialSnapshot()).toEqual(tape.getSnapshot());
  });

  it('does not store blank symbols when loading input', () => {
    const tape = new Tape();

    tape.load('a#b');

    expect(tape.getSnapshot()).toEqual({
      headPosition: 4,
      cells: {
        1: 'a',
        3: 'b',
      },
    });
  });

  it('restores the loaded initial values after runtime changes', () => {
    const tape = new Tape();

    tape.load('ab');
    tape.setHeadPosition(1);
    tape.write(zero);
    tape.moveRight();
    tape.write(blank);

    tape.restoreInitialValues();

    expect(tape.getSnapshot()).toEqual({
      headPosition: 3,
      cells: {
        1: 'a',
        2: 'b',
      },
    });
  });

  it('clears current and initial values', () => {
    const tape = new Tape();

    tape.load('ab');
    tape.clear();

    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {},
    });
    expect(tape.getInitialSnapshot()).toEqual({
      headPosition: 0,
      cells: {},
    });
  });

  it('throws when setting a negative head position', () => {
    const tape = new Tape();

    expect(() => tape.setHeadPosition(-1)).toThrow(
      'Head position cannot be negative.',
    );
  });

  it('supports a custom blank symbol', () => {
    const tape = new Tape(zero);

    expect(tape.read()).toBe(zero);

    tape.write(a);
    tape.write(zero);

    expect(tape.read()).toBe(zero);
    expect(tape.getSnapshot()).toEqual({
      headPosition: 0,
      cells: {},
    });
  });
});
