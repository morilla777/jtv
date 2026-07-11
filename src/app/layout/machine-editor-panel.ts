import { Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslationService } from '../services/translation.service';
import { JtvStore } from '../stores/jtv.store';
import { DesignerCanvasPanel } from './designer-canvas-panel';

@Component({
  selector: 'app-machine-editor-panel',
  imports: [DesignerCanvasPanel, TranslatePipe],
  template: `
    <div class="machine-editor">
      <div class="machine-tabs" role="tablist">
        @for (tab of machineTabs(); track tab.id) {
          <div
            class="machine-tab"
            [class.machine-tab-active]="tab.id === activeMachineTabId()"
            role="tab"
            [attr.aria-selected]="tab.id === activeMachineTabId()"
            [title]="getTabTitle(tab.name, tab.dirty)"
            (click)="activateTab(tab.id)"
          >
            <img class="machine-tab-icon" src="assets/images/Gear.gif" alt="" />
            <span class="machine-tab-label">
              {{ tab.name || ('explorer.ateRootLabel' | translate) }}
              @if (tab.dirty) {
                <span class="machine-tab-dirty" aria-hidden="true">*</span>
              }
            </span>
            @if (!tab.isRoot) {
              <button
                type="button"
                class="machine-tab-close"
                [attr.aria-label]="'editor.closeTab' | translate"
                (click)="closeTab(tab.id, $event)"
              >
                <span class="pi pi-times" aria-hidden="true"></span>
              </button>
            }
          </div>
        }
      </div>

      <div class="machine-editor-canvas">
        <app-designer-canvas-panel />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
    }

    .machine-editor {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      background: var(--p-content-background);
    }

    .machine-tabs {
      display: flex;
      flex: 0 0 2rem;
      align-items: stretch;
      min-width: 0;
      overflow-x: auto;
      overflow-y: hidden;
      border-bottom: 1px solid var(--p-content-border-color);
      background: var(--p-surface-100);
      scrollbar-width: thin;
    }

    .machine-tab {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 0.3rem;
      min-width: 7rem;
      max-width: 13rem;
      padding: 0 0.45rem;
      border-right: 1px solid var(--p-content-border-color);
      border-top: 3px solid transparent;
      color: var(--p-text-muted-color);
      cursor: pointer;
      font-size: 0.78rem;
      user-select: none;
    }

    .machine-tab-active {
      background: var(--p-content-background);
      color: var(--p-text-color);
      border-top-color: red;
      font-weight: 600;
    }

    .machine-tab-active::after {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 2px;
      background: red;
      content: '';
    }

    .machine-tab-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .machine-tab-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .machine-tab-dirty {
      margin-left: 0.125rem;
      color: red;
      font-weight: 700;
    }

    .machine-tab-close {
      display: inline-flex;
      flex: 0 0 1.25rem;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      margin-left: auto;
      padding: 0;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .machine-tab-close:hover {
      background: var(--p-content-hover-background);
    }

    .machine-tab-close .pi {
      font-size: 0.65rem;
    }

    .machine-editor-canvas {
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    .machine-editor-canvas > app-designer-canvas-panel {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class MachineEditorPanel {
  private readonly store = inject(JtvStore);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly i18n = inject(TranslationService);

  readonly machineTabs = this.store.designMachineTabs;
  readonly activeMachineTabId = this.store.activeDesignMachineTabId;

  activateTab(machineId: string): void {
    this.store.selectDesignMachine(machineId);
  }

  closeTab(machineId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.store.isDesignMachineDirty(machineId)) {
      this.confirmationService.confirm({
        key: 'machine',
        message: this.i18n.translate('confirm.closeDirtyTab'),
        acceptLabel: this.i18n.translate('confirm.yes'),
        rejectLabel: this.i18n.translate('confirm.no'),
        accept: () => {
          this.store.closeDesignMachineTab(machineId);
        },
      });
      return;
    }

    this.store.closeDesignMachineTab(machineId);
  }

  getTabTitle(name: string, dirty: boolean): string {
    const tabName = name || this.i18n.translate('explorer.ateRootLabel');

    return dirty ? `${tabName} *` : tabName;
  }
}
