import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TranslatePipe } from '../i18n/translate.pipe';

interface SimulatorButton {
  readonly labelKey: string;
  readonly icon: string;
}

interface TapeOption {
  readonly value: number;
  readonly labelKey: string;
  readonly number: number;
}

@Component({
  selector: 'app-simulator-panel',
  imports: [ButtonModule, FormsModule, InputTextModule, SelectModule, ToolbarModule, TranslatePipe],
  template: `
    <div class="panel">
      <p-toolbar class="simulator-toolbar">
        <ng-template #center>
          <div class="simulator-main-actions">
            @for (button of tapeButtons; track button.icon) {
              <button
                pButton
                type="button"
                class="image-toolbar-button p-button-secondary"
                [attr.aria-label]="button.labelKey | translate"
                [title]="button.labelKey | translate"
              >
                <img [src]="button.icon" alt="" />
              </button>
            }

            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>

            <p-select
              [options]="tapeOptions"
              [(ngModel)]="selectedTape"
              optionValue="value"
              size="small"
              class="tape-select"
              [ariaLabel]="'simulator.tapeSelectAria' | translate"
            >
              <ng-template #selectedItem let-selectedOption>
                @if (selectedOption) {
                  <span>{{ selectedOption.labelKey | translate: { number: selectedOption.number } }}</span>
                }
              </ng-template>

              <ng-template #item let-tape>
                <span>{{ tape.labelKey | translate: { number: tape.number } }}</span>
              </ng-template>
            </p-select>

            <input
              pInputText
              type="text"
              class="tape-input"
              [(ngModel)]="tapeValue"
              [attr.aria-label]="'simulator.tapeInputAria' | translate"
            />
          </div>
        </ng-template>

        <ng-template #end>
          <div class="toolbar-end-group">
            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>

            <p-toolbar class="tape-navigation-toolbar">
              <ng-template #start>
                <div class="toolbar-actions toolbar-actions-compact">
                  @for (button of tapeNavigationButtons; track button.icon) {
                    <button
                      pButton
                      type="button"
                      class="image-toolbar-button p-button-secondary"
                      [attr.aria-label]="button.labelKey | translate"
                      [title]="button.labelKey | translate"
                    >
                      <img [src]="button.icon" alt="" />
                    </button>
                  }
                </div>
              </ng-template>
            </p-toolbar>
          </div>
        </ng-template>
      </p-toolbar>

      <div class="tapes-canvas">
        <svg class="tapes-svg" [attr.viewBox]="tapesViewBox" preserveAspectRatio="xMinYMin meet" [attr.aria-label]="'simulator.tapesCanvasAria' | translate">
          @for (tape of tapeRows; track tape.number) {
            <g class="tape-row">
              <text x="5" [attr.y]="tape.y + tapeLabelBaselineOffset" class="tape-label">
                {{ tape.number }}
              </text>
              <rect
                [attr.x]="tapeMarkerX"
                [attr.y]="tape.y + tapeMarkerYOffset"
                [attr.width]="tapeMarkerWidth"
                [attr.height]="tapeMarkerHeight"
                class="tape-marker"
              ></rect>
              <text
                [attr.x]="tapeMarkerX + tapeMarkerWidth / 2"
                [attr.y]="tape.y + tapeMarkerTextBaselineOffset"
                text-anchor="middle"
                class="tape-marker-text"
              >
                0
              </text>
              <rect
                [attr.x]="tapeTrackX"
                [attr.y]="tape.y - 2"
                [attr.width]="tapeTrackWidth"
                [attr.height]="tapeTrackHeight"
                rx="4"
                class="tape-track"
              ></rect>

              @for (cell of tapeCells; track cell.x) {
                <g>
                  <title>{{ tape.number }}[{{ cell.index }}]</title>
                  <rect
                    [attr.x]="cell.x"
                    [attr.y]="tape.y"
                    [attr.width]="tapeCellWidth"
                    [attr.height]="tapeCellHeight"
                    [attr.rx]="cell.edge ? 4 : 0"
                    [attr.ry]="cell.edge ? 4 : 0"
                    class="tape-cell"
                    [class.tape-cell-active]="cell.active"
                  ></rect>
                  <text [attr.x]="cell.x + tapeCellWidth / 2" [attr.y]="tape.y + cellTextBaselineOffset" text-anchor="middle" class="cell-value">
                    {{ cell.value }}
                  </text>
                </g>
              }

              @for (cell of activeTapeCells; track cell.x) {
                <rect
                  [attr.x]="cell.x"
                  [attr.y]="tape.y"
                  [attr.width]="tapeCellWidth"
                  [attr.height]="tapeCellHeight"
                  [attr.rx]="cell.edge ? 4 : 0"
                  [attr.ry]="cell.edge ? 4 : 0"
                  class="tape-head-border"
                ></rect>
              }

              <rect
                [attr.x]="tapeEndMarkerX"
                [attr.y]="tape.y + tapeMarkerYOffset"
                [attr.width]="tapeMarkerWidth"
                [attr.height]="tapeMarkerHeight"
                class="tape-marker"
              ></rect>
              <text
                [attr.x]="tapeEndMarkerX + tapeMarkerWidth / 2"
                [attr.y]="tape.y + tapeMarkerTextBaselineOffset"
                text-anchor="middle"
                class="tape-marker-text"
              >
                68
              </text>
            </g>
          }
        </svg>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
    }

    .panel {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--p-surface-card);
    }

    :host ::ng-deep .simulator-toolbar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      padding: 0.25rem;
    }

    :host ::ng-deep .simulator-toolbar .p-toolbar-center {
      flex: 1 1 auto;
      min-width: 0;
    }

    :host ::ng-deep .simulator-toolbar .p-toolbar-end {
      flex: 0 0 auto;
    }

    :host ::ng-deep .tape-navigation-toolbar {
      border: 0;
      padding: 0;
      background: transparent;
    }

    .simulator-main-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      width: 100%;
      min-width: 0;
      flex-wrap: nowrap;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
      flex-wrap: nowrap;
    }

    .toolbar-actions-compact {
      width: auto;
    }

    .toolbar-end-group {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex: 0 0 auto;
    }

    .image-toolbar-button {
      width: 2.25rem;
      height: 2.25rem;
      justify-content: center;
      padding: 0;
    }

    .image-toolbar-button img {
      display: block;
      width: 24px;
      height: 24px;
    }

    .toolbar-separator {
      align-self: stretch;
      width: 1px;
      min-height: 2rem;
      margin-inline: 0.25rem;
      background: var(--p-content-border-color);
    }

    :host ::ng-deep .tape-select {
      width: 7rem;
    }

    .tape-input {
      flex: 1 1 0;
      width: 100%;
      min-width: 0;
    }

    .tapes-canvas {
      flex: 1;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0.5rem;
      background: var(--p-surface-ground);
    }

    .tapes-svg {
      display: block;
      width: 100%;
      height: auto;
      min-height: 0;
    }

    .tape-label {
      font-size: 30px;
      font-weight: 600;
      fill: var(--p-text-color);
    }

    .tape-marker {
      fill: red;
      stroke: #000;
      stroke-width: 1;
    }

    .tape-marker-text {
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: 600;
      fill: #fff;
    }

    .tape-track {
      fill: cyan;
      stroke: var(--p-surface-border);
      stroke-width: 1.5;
    }

    .tape-cell {
      fill: cyan;
      stroke: #000;
      stroke-width: 1.25;
    }

    .tape-cell-active {
      fill: yellow;
      stroke: red;
      stroke-width: 2.5;
    }

    .tape-head-border {
      fill: none;
      stroke: red;
      stroke-width: 2.5;
      pointer-events: none;
    }

    .cell-value {
      font-family: 'Times New Roman', Times, serif;
      font-size: 30px;
      font-weight: 600;
      fill: var(--p-text-color);
    }

  `],
})
export class SimulatorPanel {
  readonly tapeCellCount = 86;
  readonly tapeBaseCellWidth = 32;
  readonly tapeCellWidth = this.tapeBaseCellWidth * 0.8;
  readonly tapeCellHeight = 32;
  readonly tapeTrackHeight = this.tapeCellHeight + 4;
  readonly tapeRowStep = 42;
  readonly tapeLabelBaselineOffset = 27;
  readonly cellTextBaselineOffset = 27;
  readonly tapeStartX = 112;
  readonly tapeMarkerX = 70;
  readonly tapeMarkerWidth = 40;
  readonly tapeMarkerHeight = this.tapeCellHeight / 2;
  readonly tapeMarkerYOffset = (this.tapeCellHeight - this.tapeMarkerHeight) / 2;
  readonly tapeMarkerTextBaselineOffset = 23;
  readonly tapeTrackX = this.tapeStartX - 4;
  readonly tapeTrackWidth = this.tapeCellCount * this.tapeCellWidth + 8;
  readonly tapeEndMarkerX = this.tapeStartX + this.tapeCellCount * this.tapeCellWidth + 2;
  readonly tapeHeadIndex = 43;
  readonly tapesViewBox = `0 0 ${this.tapeTrackX + 70 * this.tapeBaseCellWidth + 28} 230`;

  readonly tapeButtons: SimulatorButton[] = [
    {
      labelKey: 'simulator.tapeActions.add',
      icon: 'assets/images/AddTape24.gif',
    },
    {
      labelKey: 'simulator.tapeActions.remove',
      icon: 'assets/images/RemoveTape24.gif',
    },
    {
      labelKey: 'simulator.tapeActions.clearAll',
      icon: 'assets/images/ClearAllTape24.gif',
    },
    {
      labelKey: 'simulator.tapeActions.clear',
      icon: 'assets/images/ClearTape24.gif',
    },
  ];

  readonly tapeNavigationButtons: SimulatorButton[] = [
    {
      labelKey: 'simulator.tapeNavigation.backwardPage',
      icon: 'assets/images/BackwardTapePage24.gif',
    },
    {
      labelKey: 'simulator.tapeNavigation.centerPage',
      icon: 'assets/images/CenterTapePage24.gif',
    },
    {
      labelKey: 'simulator.tapeNavigation.forwardPage',
      icon: 'assets/images/ForwardTapePage24.gif',
    },
  ];

  readonly tapeOptions: TapeOption[] = [
    { value: 1, labelKey: 'simulator.tape', number: 1 },
    { value: 2, labelKey: 'simulator.tape', number: 2 },
  ];
  readonly tapeRows = Array.from({ length: 5 }, (_, index) => ({
    number: index + 1,
    y: 4 + index * this.tapeRowStep,
  }));
  readonly tapeCells = Array.from({ length: this.tapeCellCount }, (_, index) => ({
    index,
    x: this.tapeStartX + index * this.tapeCellWidth,
    value: index === 0 || index > 8 ? '#' : ['a', 'b', 'b', 'a', '1', '0', 'a', 'b'][index - 1],
    active: index === this.tapeHeadIndex,
    edge: index === 0 || index === this.tapeCellCount - 1,
  }));
  readonly activeTapeCells = this.tapeCells.filter((cell) => cell.active);

  selectedTape = this.tapeOptions[0].value;
  tapeValue = '';

}
