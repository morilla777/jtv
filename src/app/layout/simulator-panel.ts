import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-simulator-panel',
  imports: [ButtonModule, FormsModule, InputTextModule, SelectModule, ToolbarModule],
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
                [attr.aria-label]="button.label"
                [title]="button.label"
              >
                <img [src]="button.icon" alt="" />
              </button>
            }

            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>

            <p-select
              [options]="tapeOptions"
              [(ngModel)]="selectedTape"
              size="small"
              class="tape-select"
              ariaLabel="Cinta"
            />

            <input
              pInputText
              type="text"
              class="tape-input"
              [(ngModel)]="tapeValue"
              aria-label="Contenido de cinta"
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
                      [attr.aria-label]="button.label"
                      [title]="button.label"
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
        <svg class="tapes-svg" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-label="Cintas de Máquina de Turing">
          @for (tape of tapeRows; track tape.label) {
            <g class="tape-row">
              <text x="28" [attr.y]="tape.y + 21" class="tape-label">{{ tape.label }}</text>
              <rect x="108" [attr.y]="tape.y - 2" width="1032" height="36" rx="4" class="tape-track"></rect>

              @for (cell of tapeCells; track cell.x) {
                <rect
                  [attr.x]="cell.x"
                  [attr.y]="tape.y"
                  width="64"
                  height="32"
                  class="tape-cell"
                  [class.tape-cell-active]="cell.active"
                ></rect>
                <text [attr.x]="cell.x + 32" [attr.y]="tape.y + 22" text-anchor="middle" class="cell-value">
                  {{ cell.value }}
                </text>
              }

              <path [attr.d]="headPath(tape.y)" class="tape-head"></path>
            </g>
          }
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .panel {
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
      height: max(100%, 300px);
      min-height: 280px;
    }

    .tape-label {
      font-size: 18px;
      font-weight: 600;
      fill: var(--p-text-color);
    }

    .tape-track {
      fill: cyan;
      stroke: var(--p-surface-border);
      stroke-width: 1.5;
    }

    .tape-cell {
      fill: cyan;
      stroke: var(--p-surface-border);
      stroke-width: 1.25;
    }

    .tape-cell-active {
      fill: yellow;
      stroke: color-mix(in srgb, yellow 65%, black);
      stroke-width: 2.5;
    }

    .cell-value {
      font-family: 'Times New Roman', Times, serif;
      font-size: 20px;
      font-weight: 600;
      fill: var(--p-text-color);
    }

    .tape-head {
      fill: var(--p-primary-color);
      stroke: color-mix(in srgb, var(--p-primary-color) 72%, black);
      stroke-width: 1;
    }
  `],
})
export class SimulatorPanel {
  readonly tapeButtons = [
    {
      label: 'Agregar cinta',
      icon: 'assets/images/AddTape24.gif',
    },
    {
      label: 'Quitar cinta',
      icon: 'assets/images/RemoveTape24.gif',
    },
    {
      label: 'Limpiar todas las cintas',
      icon: 'assets/images/ClearAllTape24.gif',
    },
    {
      label: 'Limpiar cinta',
      icon: 'assets/images/ClearTape24.gif',
    },
  ];

  readonly tapeNavigationButtons = [
    {
      label: 'Retroceder página de cinta',
      icon: 'assets/images/BackwardTapePage24.gif',
    },
    {
      label: 'Centrar página de cinta',
      icon: 'assets/images/CenterTapePage24.gif',
    },
    {
      label: 'Avanzar página de cinta',
      icon: 'assets/images/ForwardTapePage24.gif',
    },
  ];

  readonly tapeOptions = ['Cinta 1', 'Cinta 2'];
  readonly tapeRows = Array.from({ length: 5 }, (_, index) => ({
    label: `Cinta ${index + 1}`,
    y: 24 + index * 52,
  }));
  readonly tapeCells = Array.from({ length: 16 }, (_, index) => ({
    x: 112 + index * 64,
    value: index === 0 || index > 8 ? '#' : ['a', 'b', 'b', 'a', '1', '0', 'a', 'b'][index - 1],
    active: index === 5,
  }));

  selectedTape = this.tapeOptions[0];
  tapeValue = '';

  headPath(y: number): string {
    const x = 112 + 5 * 64 + 32;
    return `M ${x - 10} ${y + 46} L ${x + 10} ${y + 46} L ${x} ${y + 36} Z`;
  }
}
