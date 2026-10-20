import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { parseLinkConditionLabel } from './designer-canvas-panel';

describe('parseLinkConditionLabel', () => {
  it('marks only the negated clause in a multi-tape condition', () => {
    expect(parseLinkConditionLabel('[not a;1][b;2]')).toEqual([
      { content: 'a;1', negated: true, text: '[not a;1]' },
      { content: 'b;2', negated: false, text: '[b;2]' },
    ]);
  });

  it('supports a negated clause after a regular clause', () => {
    expect(parseLinkConditionLabel('[a;1][not b;2]')).toEqual([
      { content: 'a;1', negated: false, text: '[a;1]' },
      { content: 'b;2', negated: true, text: '[not b;2]' },
    ]);
  });

  it('keeps a non-condition label unchanged', () => {
    expect(parseLinkConditionLabel('label')).toEqual([
      { content: 'label', negated: false, text: 'label' },
    ]);
  });
});
