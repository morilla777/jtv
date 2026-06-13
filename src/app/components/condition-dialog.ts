import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { TranslatePipe } from '../pipes/translate.pipe';
import { AutolinkOrientation } from '../models/view';

export interface ConditionDialogTapeOption {
  readonly value: number;
  readonly label: string;
}

export interface ConditionDialogValue {
  tapeIndex: number;
  negated: boolean;
  assignToVariable: string | null;
  selectedSymbols: string[];
  selectedVariables: string[];
  selectedParameters: string[];
  orientation: AutolinkOrientation;
}

@Component({
  selector: 'app-condition-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'conditionDialog.title' | translate"
      [visible]="visible"
      [modal]="true"
      [closable]="true"
      [style]="{ width: '25rem' }"
      (onHide)="handleHide()"
      (onShow)="resetDraft()"
    >
      <div class="condition-dialog">
        <div class="condition-summary">
          @if (draft.negated) {
            <span class="condition-overline-symbol">[{{ conditionSymbolLabel() }}]</span>
          } @else {
            <span>[{{ conditionSymbolLabel() }}]</span>
          }
        </div>

        <div class="condition-grid" [class.condition-grid-without-orientation]="!showOrientation">
          <fieldset class="condition-fieldset tape-fieldset">
            <legend>{{ 'conditionDialog.tape' | translate }}</legend>
            <select [(ngModel)]="draft.tapeIndex" class="condition-select">
              @for (tape of tapeOptions; track tape.value) {
                <option [ngValue]="tape.value">{{ tape.label }}</option>
              }
            </select>
          </fieldset>

          <label class="condition-not">
            <span>{{ 'conditionDialog.not' | translate }}</span>
            <input type="checkbox" [(ngModel)]="draft.negated" />
          </label>

          <fieldset class="condition-fieldset symbols-fieldset">
            <legend>{{ 'conditionDialog.symbols' | translate }}</legend>
            <select [(ngModel)]="draft.selectedSymbols" multiple size="3" class="condition-list">
              @for (symbol of symbols; track symbol) {
                <option [ngValue]="symbol">{{ symbol }}</option>
              }
            </select>
          </fieldset>

          <fieldset class="condition-fieldset variable-fieldset">
            <legend>{{ 'conditionDialog.variable' | translate }}</legend>
            <select [(ngModel)]="draft.assignToVariable" class="condition-select">
              <option [ngValue]="null"></option>
              @for (variable of variables; track variable) {
                <option [ngValue]="variable">{{ variable }}</option>
              }
            </select>
          </fieldset>

          <div></div>

          <fieldset class="condition-fieldset symbols-fieldset">
            <legend>{{ 'conditionDialog.variables' | translate }}</legend>
            <select [(ngModel)]="draft.selectedVariables" multiple size="3" class="condition-list">
              @for (variable of variables; track variable) {
                <option [ngValue]="variable">{{ variable }}</option>
              }
            </select>
          </fieldset>

          @if (showOrientation) {
            <fieldset class="condition-fieldset orientation-fieldset">
              <legend>{{ 'conditionDialog.orientation' | translate }}</legend>
              <div class="orientation-grid">
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-up"
                  class="orientation-button orientation-top"
                  [class.orientation-button-active]="draft.orientation === 'top'"
                  (click)="draft.orientation = 'top'"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-left"
                  class="orientation-button orientation-left"
                  [class.orientation-button-active]="draft.orientation === 'left'"
                  [disabled]="leftOrientationDisabled"
                  (click)="draft.orientation = 'left'"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-right"
                  class="orientation-button orientation-right"
                  [class.orientation-button-active]="draft.orientation === 'right'"
                  (click)="draft.orientation = 'right'"
                ></button>
                <button
                  pButton
                  type="button"
                  icon="pi pi-chevron-down"
                  class="orientation-button orientation-bottom"
                  [class.orientation-button-active]="draft.orientation === 'bottom'"
                  (click)="draft.orientation = 'bottom'"
                ></button>
              </div>
            </fieldset>
          }

          <div></div>

          <fieldset class="condition-fieldset symbols-fieldset">
            <legend>{{ 'conditionDialog.parameters' | translate }}</legend>
            <select [(ngModel)]="draft.selectedParameters" multiple size="3" class="condition-list">
              @for (parameter of parameters; track parameter) {
                <option [ngValue]="parameter">{{ parameter }}</option>
              }
            </select>
          </fieldset>
        </div>
      </div>

      <ng-template #footer>
        <button pButton type="button" [label]="'conditionDialog.accept' | translate" (click)="acceptDraft()"></button>
        <button pButton type="button" [label]="'conditionDialog.clearAll' | translate" severity="secondary" (click)="clearDraft()"></button>
        <button pButton type="button" [label]="'conditionDialog.cancel' | translate" severity="secondary" (click)="cancelDraft()"></button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .condition-dialog {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .condition-summary {
      min-height: 1.5rem;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    .condition-overline-symbol {
      display: inline-block;
      border-top: 1px solid currentColor;
      line-height: 0.9;
      padding-top: 0.125rem;
    }

    .condition-grid {
      display: grid;
      grid-template-columns: 1fr auto 1.25fr;
      gap: 0.5rem;
      align-items: stretch;
    }

    .condition-fieldset {
      border: 1px solid var(--p-content-border-color);
      padding: 0.75rem 0.5rem;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .symbols-fieldset {
      align-items: stretch;
      justify-content: stretch;
    }

    .condition-grid-without-orientation .tape-fieldset {
      grid-row: 1 / span 2;
    }

    .condition-grid-without-orientation .variable-fieldset {
      grid-row: 3 / span 2;
    }

    .condition-not {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.375rem;
    }

    .condition-select {
      width: 4rem;
    }

    .condition-list {
      width: 100%;
      min-height: 3.5rem;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    .orientation-fieldset {
      grid-column: 1;
      align-items: center;
      justify-content: center;
    }

    .orientation-grid {
      display: grid;
      grid-template-columns: repeat(3, 1.5rem);
      grid-template-rows: repeat(3, 1.5rem);
      gap: 0.125rem;
    }

    :host ::ng-deep .orientation-button {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
    }

    .orientation-top {
      grid-column: 2;
      grid-row: 1;
    }

    .orientation-left {
      grid-column: 1;
      grid-row: 2;
    }

    .orientation-right {
      grid-column: 3;
      grid-row: 2;
    }

    .orientation-bottom {
      grid-column: 2;
      grid-row: 3;
    }

    :host ::ng-deep .orientation-button-active {
      border-color: rgb(255, 0, 255);
      background: color-mix(in srgb, rgb(255, 0, 255) 20%, transparent);
    }
  `],
})
export class ConditionDialog implements OnChanges {
  @Input() visible = false;
  @Input() showOrientation = false;
  @Input() leftOrientationDisabled = false;
  @Input() tapeOptions: readonly ConditionDialogTapeOption[] = [];
  @Input() symbols: readonly string[] = [];
  @Input() variables: readonly string[] = [];
  @Input() parameters: readonly string[] = [];
  @Input() value: ConditionDialogValue = createEmptyConditionDialogValue();

  @Output() accept = new EventEmitter<ConditionDialogValue>();
  @Output() cancel = new EventEmitter<void>();

  draft: ConditionDialogValue = createEmptyConditionDialogValue();
  private suppressNextHide = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || (changes['visible'] && this.visible)) {
      this.resetDraft();
    }

    if (this.leftOrientationDisabled && this.draft.orientation === 'left') {
      this.draft = {
        ...this.draft,
        orientation: 'right',
      };
    }
  }

  resetDraft(): void {
    this.draft = cloneConditionDialogValue(this.value);

    if (this.leftOrientationDisabled && this.draft.orientation === 'left') {
      this.draft = {
        ...this.draft,
        orientation: 'right',
      };
    }
  }

  conditionSymbolLabel(): string {
    const values = this.getAcceptedConditionValues().join(',');

    return this.draft.assignToVariable ? `${this.draft.assignToVariable} = ${values}` : values;
  }

  acceptDraft(): void {
    this.suppressNextHide = true;
    this.accept.emit(cloneConditionDialogValue(this.draft));
  }

  clearDraft(): void {
    this.draft = {
      ...this.draft,
      tapeIndex: 0,
      negated: false,
      assignToVariable: null,
      selectedSymbols: [],
      selectedVariables: [],
      selectedParameters: [],
      orientation: 'right',
    };
  }

  cancelDraft(): void {
    this.suppressNextHide = true;
    this.cancel.emit();
  }

  handleHide(): void {
    if (this.suppressNextHide) {
      this.suppressNextHide = false;
      return;
    }

    this.cancel.emit();
  }

  private getAcceptedConditionValues(): string[] {
    return [...this.draft.selectedSymbols, ...this.draft.selectedVariables, ...this.draft.selectedParameters];
  }
}

function createEmptyConditionDialogValue(): ConditionDialogValue {
  return {
    tapeIndex: 0,
    negated: false,
    assignToVariable: null,
    selectedSymbols: [],
    selectedVariables: [],
    selectedParameters: [],
    orientation: 'right',
  };
}

function cloneConditionDialogValue(value: ConditionDialogValue): ConditionDialogValue {
  return {
    tapeIndex: value.tapeIndex,
    negated: value.negated,
    assignToVariable: value.assignToVariable,
    selectedSymbols: [...value.selectedSymbols],
    selectedVariables: [...value.selectedVariables],
    selectedParameters: [...value.selectedParameters],
    orientation: value.orientation,
  };
}
