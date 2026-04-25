import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-simulator-panel',
  imports: [FormsModule, InputTextModule, ButtonModule, TagModule, TranslatePipe],
  template: `
    <div class="panel simulator-panel">
      <div class="panel-header">{{ 'simulator.title' | translate }}</div>

      <div class="simulator-toolbar">
        <input pInputText [(ngModel)]="input" [placeholder]="'simulator.inputPlaceholder' | translate" />
        <p-button [label]="'simulator.initialize' | translate" icon="pi pi-step-forward" severity="secondary" />
        <p-button [label]="'simulator.step' | translate" icon="pi pi-angle-right" severity="info" />
        <p-button [label]="'simulator.run' | translate" icon="pi pi-play" severity="success" />
        <p-button [label]="'simulator.pause' | translate" icon="pi pi-pause" severity="warn" />
        <p-button [label]="'simulator.restart' | translate" icon="pi pi-refresh" severity="contrast" />
      </div>

      <div class="execution-status">
        <p-tag severity="info" [value]="('simulator.currentState' | translate) + ': q0'"></p-tag>
        <p-tag severity="secondary" [value]="('simulator.steps' | translate) + ': 0'"></p-tag>
        <p-tag severity="success" [value]="('simulator.status' | translate) + ': ' + ('simulator.ready' | translate)"></p-tag>
      </div>

      <div class="tape-wrapper">
        <div class="tape">
          @for (cell of tape; track $index) {
            <div class="cell" [class.active]="$index === 1">
              {{ cell }}
            </div>
          }
        </div>
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

    .panel-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid var(--p-surface-border);
    }

    .simulator-toolbar {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--p-surface-border);
      flex-wrap: wrap;
    }

    .execution-status {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--p-surface-border);
      flex-wrap: wrap;
    }

    .tape-wrapper {
      flex: 1;
      overflow: auto;
      padding: 1rem;
    }

    .tape {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      min-height: 72px;
    }

    .cell {
      width: 48px;
      height: 48px;
      border: 1px solid var(--p-surface-border);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--p-surface-card);
      font-weight: 600;
      border-radius: 8px;
    }

    .cell.active {
      border: 2px solid var(--p-primary-color);
      transform: scale(1.05);
    }
  `],
})
export class SimulatorPanel {
  input = 'aabb';
  tape = ['#', 'a', 'a', 'b', 'b', '#', '#', '#', '#', '#'];
}
