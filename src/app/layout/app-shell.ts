import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MessageService, type ToastMessageOptions } from 'primeng/api';
import { SplitterModule } from 'primeng/splitter';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { Topbar } from './topbar';
import { ExplorerPanel } from './explorer-panel';
import { DesignerCanvasPanel } from './designer-canvas-panel';
import { PropertiesPanel } from './properties-panel';
import { TapesPanel } from './tapes-panel';

@Component({
  selector: 'app-shell',
  imports: [
    SplitterModule,
    ToastModule,
    Topbar,
    ExplorerPanel,
    DesignerCanvasPanel,
    PropertiesPanel,
    TapesPanel,
  ],
  template: `
    <div class="app-shell">
      @if (simulationToastModalVisible()) {
        <div class="toast-modal-mask" aria-hidden="true"></div>
      }

      <p-toast key="simulation" position="center" (onClose)="hideSimulationToastModal()" />
      <app-topbar />

      <div class="workspace">
        <p-splitter
          layout="vertical"
          [panelSizes]="[72, 28]"
          [gutterSize]="6"
          class="main-splitter"
        >
          <ng-template #panel>
            <p-splitter
              [panelSizes]="[18, 66.7, 15.3]"
              [gutterSize]="6"
              class="designer-splitter"
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
            <app-tapes-panel />
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

    .toast-modal-mask {
      position: fixed;
      inset: 0;
      z-index: 1099;
      background: rgba(0, 0, 0, 0.35);
      pointer-events: auto;
    }

    :host ::ng-deep .p-toast {
      z-index: 1100;
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
      min-width: 0;
    }

    :host ::ng-deep .p-splitter-panel > * {
      width: 100%;
      height: 100%;
      min-width: 0;
    }
  `],
})
export class AppShell implements OnInit, OnDestroy {
  private readonly messageService = inject(MessageService);
  private readonly subscriptions = new Subscription();

  readonly simulationToastModalVisible = signal(false);

  ngOnInit(): void {
    this.subscriptions.add(
      this.messageService.messageObserver.subscribe((message) => {
        const messages = Array.isArray(message) ? message : [message];

        if (messages.some((item) => this.isSimulationToast(item))) {
          this.simulationToastModalVisible.set(true);
        }
      }),
    );
    this.subscriptions.add(
      this.messageService.clearObserver.subscribe((key) => {
        if (key === null || key === 'simulation') {
          this.hideSimulationToastModal();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  hideSimulationToastModal(): void {
    this.simulationToastModalVisible.set(false);
  }

  private isSimulationToast(message: ToastMessageOptions): boolean {
    return message.key === 'simulation';
  }
}
