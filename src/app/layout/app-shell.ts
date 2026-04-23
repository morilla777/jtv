import { Component } from '@angular/core';
import { SplitterModule } from 'primeng/splitter';
import { Topbar } from './topbar';
import { ExplorerPanel } from './explorer-panel';
import { DesignerCanvasPanel } from './designer-canvas-panel';
import { PropertiesPanel } from './properties-panel';
import { SimulatorPanel } from './simulator-panel';

@Component({
  selector: 'app-shell',
  imports: [
    SplitterModule,
    Topbar,
    ExplorerPanel,
    DesignerCanvasPanel,
    PropertiesPanel,
    SimulatorPanel,
  ],
  template: `
    <div class="app-shell">
      <app-topbar />

      <div class="workspace">
        <p-splitter
          layout="vertical"
          [panelSizes]="[72, 28]"
          [gutterSize]="6"
          styleClass="main-splitter"
        >
          <ng-template #panel>
            <p-splitter
              [panelSizes]="[18, 66.7, 15.3]"
              [gutterSize]="6"
              styleClass="designer-splitter"
            >
              <ng-template #panel>
                <app-explorer-panel />
              </ng-template>

              <ng-template #panel>
                <app-designer-canvas-panel />
              </ng-template>

              <ng-template #panel>
                <app-properties-panel />
              </ng-template>
            </p-splitter>
          </ng-template>

          <ng-template #panel>
            <app-simulator-panel />
          </ng-template>
        </p-splitter>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .app-shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--p-surface-ground);
    }

    .workspace {
      flex: 1;
      min-height: 0;
      padding: 0.5rem;
      overflow: hidden;
    }

    :host ::ng-deep .main-splitter,
    :host ::ng-deep .designer-splitter {
      height: 100%;
      border: 1px solid var(--p-surface-border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--p-surface-card);
    }

    :host ::ng-deep .p-splitter-panel {
      min-height: 0;
    }
  `],
})
export class AppShell {}
