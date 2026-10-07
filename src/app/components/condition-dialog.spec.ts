import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { ConditionDialog, ConditionDialogValue } from './condition-dialog';

describe('ConditionDialog', () => {
  it('preserves independent conditions while switching between tapes', () => {
    const dialog = new ConditionDialog();
    dialog.tapeOptions = [
      { value: 0, label: '1' },
      { value: 1, label: '2' },
    ];
    dialog.value = createDialogValue();
    dialog.resetDraft();

    dialog.selectTape(1);
    dialog.draft.selectedSymbols = ['b'];
    dialog.draft.negated = true;
    dialog.selectTape(0);

    expect(dialog.draft.selectedSymbols).toEqual(['a']);
    expect(dialog.draft.negated).toBe(false);

    dialog.selectTape(1);

    expect(dialog.draft.selectedSymbols).toEqual(['b']);
    expect(dialog.draft.negated).toBe(true);
    expect(dialog.conditionSummary()).toEqual([
      { tapeIndex: 0, label: 'a;1', negated: false },
      { tapeIndex: 1, label: 'b;2', negated: true },
    ]);

    let acceptedValue: ConditionDialogValue | undefined;
    dialog.accept.subscribe((value) => acceptedValue = value);
    dialog.acceptDraft();

    expect(acceptedValue?.clauses).toEqual([
      {
        tapeIndex: 0,
        negated: false,
        assignToVariable: null,
        selectedSymbols: ['a'],
        selectedVariables: [],
        selectedParameters: [],
      },
      {
        tapeIndex: 1,
        negated: true,
        assignToVariable: null,
        selectedSymbols: ['b'],
        selectedVariables: [],
        selectedParameters: [],
      },
    ]);
  });
});

function createDialogValue(): ConditionDialogValue {
  return {
    tapeIndex: 0,
    negated: false,
    assignToVariable: null,
    selectedSymbols: ['a'],
    selectedVariables: [],
    selectedParameters: [],
    clauses: [{
      tapeIndex: 0,
      negated: false,
      assignToVariable: null,
      selectedSymbols: ['a'],
      selectedVariables: [],
      selectedParameters: [],
    }],
    orientation: 'right',
  };
}
