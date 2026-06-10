import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { TranslatePipe } from '../i18n/translate.pipe';

interface ParameterAssignmentRow {
  readonly parameter: string;
  value: string | null;
}

@Component({
  selector: 'app-parameter-assignment-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'parameterDialog.title' | translate"
      [visible]="visible"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '22rem' }"
      (visibleChange)="onVisibleChange($event)"
      (onHide)="close()"
      (onShow)="resetRows()"
    >
      <div class="parameter-dialog">
        <table class="parameter-grid">
          <thead>
            <tr>
              <th>{{ 'parameterDialog.parameter' | translate }}</th>
              <th>{{ 'parameterDialog.value' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.parameter) {
              <tr>
                <td class="parameter-name">{{ row.parameter }}</td>
                <td>
                  <select
                    [(ngModel)]="row.value"
                    class="parameter-value-select"
                  >
                    <option [ngValue]="null"></option>
                    @for (symbol of symbolOptions; track symbol) {
                      <option [ngValue]="symbol">{{ symbol }}</option>
                    }
                  </select>
                </td>
              </tr>
            }
            @if (rows.length === 0) {
              <tr>
                <td colspan="2" class="empty-row">{{ 'parameterDialog.empty' | translate }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="dialog-actions">
          <button pButton type="button" [label]="'parameterDialog.accept' | translate" (click)="accept()"></button>
          <button pButton type="button" [label]="'parameterDialog.cancel' | translate" severity="secondary" (click)="cancel()"></button>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [`
    .parameter-dialog {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.875rem;
      padding-top: 0.25rem;
    }

    .parameter-grid {
      width: 9.5rem;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .parameter-grid th,
    .parameter-grid td {
      width: 50%;
      height: 1.375rem;
      border: 1px solid #7f96b0;
      padding: 0;
      text-align: center;
      vertical-align: middle;
    }

    .parameter-grid th {
      background: #e8edf4;
      font-weight: 400;
    }

    .parameter-name {
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    .empty-row {
      height: 3.25rem;
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
    }

    .parameter-value-select {
      width: 100%;
      height: 100%;
      border: 0;
      box-shadow: none;
      border-radius: 0;
      background: transparent;
      padding: 0 0.25rem;
      line-height: 1.25rem;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
      text-align: left;
      cursor: pointer;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 0.375rem;
    }
  `],
})
export class ParameterAssignmentDialog implements OnChanges {
  @Input() visible = false;
  @Input() parameters: readonly string[] = [];
  @Input() symbolOptions: readonly string[] = [];
  @Input() assignments: Readonly<Record<string, string>> = {};

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() assignmentsChange = new EventEmitter<Record<string, string>>();

  rows: ParameterAssignmentRow[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parameters'] || changes['assignments'] || (changes['visible'] && this.visible)) {
      this.resetRows();
    }
  }

  resetRows(): void {
    this.rows = this.parameters.map((parameter) => ({
      parameter,
      value: this.assignments[parameter] ?? null,
    }));
  }

  accept(): void {
    const nextAssignments: Record<string, string> = {};

    for (const row of this.rows) {
      if (row.value) {
        nextAssignments[row.parameter] = row.value;
      }
    }

    this.assignmentsChange.emit(nextAssignments);
    this.close();
  }

  cancel(): void {
    this.close();
  }

  onVisibleChange(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  close(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.visibleChange.emit(false);
  }
}
