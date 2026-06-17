import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslationService } from '../services/translation.service';
import { JtvStore } from '../stores/jtv.store';

interface TapeButton {
  readonly labelKey: string;
  readonly icon: string;
  readonly action?: () => void;
}

interface TapeOption {
  readonly value: number;
  readonly label: string;
}

interface TapeCellView {
  readonly index: number;
  readonly position: number;
  readonly x: number;
  readonly value: string;
  readonly active: boolean;
  readonly edge: boolean;
}

interface TapeRowView {
  readonly id: string;
  readonly number: number;
  readonly y: number;
  readonly startPosition: number;
  readonly endPosition: number;
  readonly cells: TapeCellView[];
  readonly activeCells: TapeCellView[];
}

@Component({
  selector: 'app-tapes-panel',
  imports: [ButtonModule, FormsModule, InputTextModule, SelectModule, ToolbarModule, TranslatePipe],
  template: `
    <div class="panel">
      <p-toolbar class="tapes-toolbar">
        <ng-template #center>
          <div class="tapes-main-actions">
            @for (button of tapeButtons; track button.icon) {
              <button
                pButton
                type="button"
                class="image-toolbar-button p-button-secondary"
                [attr.aria-label]="button.labelKey | translate"
                [title]="button.labelKey | translate"
                (click)="button.action?.()"
              >
                <img [src]="button.icon" alt="" />
              </button>
            }

            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>

            <p-select
              [options]="tapeOptions()"
              [(ngModel)]="selectedTapeIndex"
              optionLabel="label"
              optionValue="value"
              size="small"
              class="tape-select"
              appendTo="body"
              [ariaLabel]="'simulator.tapeSelectAria' | translate"
            />

            <input
              pInputText
              type="text"
              class="tape-input"
              [ngModel]="tapeValue"
              (input)="sanitizeTapeValueInput($event)"
              (keydown.enter)="loadSelectedTape(); $event.preventDefault()"
              inputmode="text"
              pattern="[a-z0-9#]*"
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
                      (click)="button.action?.()"
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
        <svg class="tapes-svg" [attr.viewBox]="tapesViewBox()" preserveAspectRatio="xMinYMin meet" [attr.aria-label]="'simulator.tapesCanvasAria' | translate">
          @for (tape of tapeRows(); track tape.id) {
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
                {{ tape.startPosition }}
              </text>
              <rect
                [attr.x]="tapeTrackX"
                [attr.y]="tape.y - 2"
                [attr.width]="tapeTrackWidth"
                [attr.height]="tapeTrackHeight"
                rx="4"
                class="tape-track"
              ></rect>

              @for (cell of tape.cells; track cell.position) {
                <g>
                  <title>{{ tape.number }}[{{ cell.position }}]</title>
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

              @for (cell of tape.activeCells; track cell.position) {
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
                {{ tape.endPosition }}
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

    :host ::ng-deep .tapes-toolbar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      padding: 0.25rem;
    }

    :host ::ng-deep .tapes-toolbar .p-toolbar-center {
      flex: 1 1 auto;
      min-width: 0;
    }

    :host ::ng-deep .tapes-toolbar .p-toolbar-end {
      flex: 0 0 auto;
    }

    :host ::ng-deep .tape-navigation-toolbar {
      border: 0;
      padding: 0;
      background: transparent;
    }

    .tapes-main-actions {
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
export class TapesPanel {
  private readonly store = inject(JtvStore);
  private readonly messageService = inject(MessageService);
  private readonly i18n = inject(TranslationService);
  private readonly tapeViewStartPositions = signal(new Map<string, number>());

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
  readonly tapePageStep = this.tapeCellCount;
  readonly tapesViewBox = computed(() => {
    const rows = this.tapeRows();
    const height = Math.max(1, rows.length) * this.tapeRowStep + 20;

    return `0 0 ${this.tapeEndMarkerX + this.tapeMarkerWidth + 28} ${height}`;
  });

  readonly tapeOptions = computed<TapeOption[]>(() =>
    this.store.tapes().map((_, index) => ({
      value: index,
      label: this.i18n.translate('simulator.tape', { number: index + 1 }),
    })),
  );

  readonly tapeRows = computed<TapeRowView[]>(() =>
    this.store.tapes().map((tapeState, tapeIndex) => {
      const snapshot = this.store.tapeSnapshots()[tapeIndex] ?? tapeState.tape.getSnapshot();
      const startPosition = this.store.selectedAteNode()
        ? this.getCenteredTapeViewStartPosition(snapshot.headPosition)
        : this.getTapeViewStartPosition(tapeState.id, snapshot.headPosition);
      const endPosition = startPosition + this.tapeCellCount - 1;
      const cells = Array.from({ length: this.tapeCellCount }, (_, index) => {
        const position = startPosition + index;

        return {
          index,
          position,
          x: this.tapeStartX + index * this.tapeCellWidth,
          value: snapshot.cells[position] ?? '#',
          active: position === snapshot.headPosition,
          edge: index === 0 || index === this.tapeCellCount - 1,
        };
      });

      return {
        id: tapeState.id,
        number: tapeIndex + 1,
        y: 4 + tapeIndex * this.tapeRowStep,
        startPosition,
        endPosition,
        cells,
        activeCells: cells.filter((cell) => cell.active),
      };
    }),
  );

  readonly tapeButtons: TapeButton[] = [
    {
      labelKey: 'simulator.tapeActions.add',
      icon: 'assets/images/AddTape24.gif',
      action: () => this.store.addTape(),
    },
    {
      labelKey: 'simulator.tapeActions.remove',
      icon: 'assets/images/RemoveTape24.gif',
      action: () => this.removeLastTape(),
    },
    {
      labelKey: 'simulator.tapeActions.clearAll',
      icon: 'assets/images/ClearAllTape24.gif',
      action: () => this.store.clearAllTapes(),
    },
    {
      labelKey: 'simulator.tapeActions.clear',
      icon: 'assets/images/ClearTape24.gif',
      action: () => this.store.clearSelectedTape(),
    },
  ];

  readonly tapeNavigationButtons: TapeButton[] = [
    {
      labelKey: 'simulator.tapeNavigation.backwardPage',
      icon: 'assets/images/BackwardTapePage24.gif',
      action: () => this.moveSelectedTapePage(-1),
    },
    {
      labelKey: 'simulator.tapeNavigation.centerPage',
      icon: 'assets/images/CenterTapePage24.gif',
      action: () => this.centerSelectedTapePage(),
    },
    {
      labelKey: 'simulator.tapeNavigation.forwardPage',
      icon: 'assets/images/ForwardTapePage24.gif',
      action: () => this.moveSelectedTapePage(1),
    },
  ];

  tapeValue = '';

  get selectedTapeIndex(): number {
    return this.store.selectedTapeIndex();
  }

  set selectedTapeIndex(tapeIndex: number | string) {
    this.store.selectTapeIndex(Number(tapeIndex));
  }

  sanitizeTapeValueInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^a-z0-9#]/g, '');

    if (input.value !== value) {
      input.value = value;
    }

    this.tapeValue = value;
  }

  loadSelectedTape(): void {
    this.store.setSelectedTapeValue(this.tapeValue);
    this.centerSelectedTapePage();
  }

  private removeLastTape(): void {
    const tapeNumber = this.store.tapes().length;

    if (this.store.removeSelectedTape()) {
      return;
    }

    if (this.store.lastTapeReferenceCount() > 0) {
      this.messageService.add({
        key: 'simulation',
        severity: 'warn',
        summary: 'JTV',
        detail: this.i18n.translate('toast.removeReferencedTape', { tapeNumber }),
        sticky: true,
        closable: true,
      });
    }
  }

  private moveSelectedTapePage(direction: -1 | 1): void {
    const selectedTape = this.store.selectedTape();

    if (!selectedTape) {
      return;
    }

    const currentStartPosition = this.getTapeViewStartPosition(
      selectedTape.id,
      this.store.selectedTapeSnapshot()?.headPosition ?? selectedTape.tape.getHeadPosition(),
    );

    this.setTapeViewStartPosition(
      selectedTape.id,
      Math.max(0, currentStartPosition + direction * this.tapePageStep),
    );
  }

  private centerSelectedTapePage(): void {
    const selectedTape = this.store.selectedTape();

    if (!selectedTape) {
      return;
    }

    this.setTapeViewStartPosition(
      selectedTape.id,
      this.getCenteredTapeViewStartPosition(
        this.store.selectedTapeSnapshot()?.headPosition ?? selectedTape.tape.getHeadPosition(),
      ),
    );
  }

  private getTapeViewStartPosition(tapeId: string, headPosition: number): number {
    return this.tapeViewStartPositions().get(tapeId) ?? this.getCenteredTapeViewStartPosition(headPosition);
  }

  private setTapeViewStartPosition(tapeId: string, startPosition: number): void {
    this.tapeViewStartPositions.update((positions) => {
      const nextPositions = new Map(positions);

      nextPositions.set(tapeId, startPosition);

      return nextPositions;
    });
  }

  private getCenteredTapeViewStartPosition(headPosition: number): number {
    return Math.max(0, headPosition - this.tapeHeadIndex);
  }

}
