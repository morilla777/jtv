import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MessageService, type ToastMessageOptions } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplitterModule } from 'primeng/splitter';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { Topbar } from './topbar';
import { ExplorerPanel } from './explorer-panel';
import { MachineEditorPanel } from './machine-editor-panel';
import { PropertiesPanel } from './properties-panel';
import { TapesPanel } from './tapes-panel';
import { LoadingOverlay } from '../components/loading-overlay';
import { TranslatePipe } from '../pipes/translate.pipe';
import { JtvFileService } from '../services/jtv-file.service';

@Component({
  selector: 'app-shell',
  imports: [
    SplitterModule,
    ConfirmDialogModule,
    ToastModule,
    Topbar,
    ExplorerPanel,
    MachineEditorPanel,
    PropertiesPanel,
    TapesPanel,
    LoadingOverlay,
    TranslatePipe,
  ],
  template: `
    <div class="app-shell">
      @if (simulationToastModalVisible()) {
        <div class="toast-modal-mask" aria-hidden="true"></div>
      }

      <p-toast key="simulation" position="center" (onClose)="hideSimulationToastModal()" />
      <p-confirmDialog key="machine" />
      <app-loading-overlay />
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
              [panelSizes]="designerPanelSizes()"
              [gutterSize]="6"
              class="designer-splitter"
            >
              <ng-template #panel>
                <app-explorer-panel />
              </ng-template>

              <ng-template #panel>
                <app-machine-editor-panel />
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

      <footer class="status-bar" [title]="currentFilePath() || ('status.file.empty' | translate)">
        <span class="status-label">{{ 'status.file.label' | translate }}</span>
        <span class="status-value">{{ currentFilePath() || ('status.file.empty' | translate) }}</span>
      </footer>
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

    .status-bar {
      flex: 0 0 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
      padding: 0 0.5rem;
      border-top: 1px solid var(--p-content-border-color);
      background: var(--p-surface-card);
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
      line-height: 1;
    }

    .status-label {
      flex: 0 0 auto;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .status-value {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
  private readonly fileService = inject(JtvFileService);
  private readonly subscriptions = new Subscription();

  readonly simulationToastModalVisible = signal(false);
  readonly currentFilePath = this.fileService.currentFilePath;
  private readonly viewportWidth = signal(globalThis.window?.innerWidth ?? 1366);
  private readonly explorerPanelWidth = 245;
  private readonly propertiesPanelWidth = 164;
  readonly designerPanelSizes = computed(() => {
    const workspaceWidth = Math.max(1, this.viewportWidth() - 16);
    const explorerSize = this.explorerPanelWidth * 100 / workspaceWidth;
    const propertiesSize = this.propertiesPanelWidth * 100 / workspaceWidth;

    return [
      explorerSize,
      Math.max(100 - explorerSize - propertiesSize, 1),
      propertiesSize,
    ];
  });

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

  @HostListener('window:resize')
  handleWindowResize(): void {
    this.viewportWidth.set(globalThis.window?.innerWidth ?? 1366);
  }

  private isSimulationToast(message: ToastMessageOptions): boolean {
    return message.key === 'simulation';
  }

}
