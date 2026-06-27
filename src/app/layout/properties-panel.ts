import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '../pipes/translate.pipe';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { JtvStore, type JtvToolId } from '../stores/jtv.store';

interface ToolButton {
  readonly id: number;
  readonly toolId: JtvToolId | null;
  readonly tooltipKey: string | null;
  readonly icon: string | null;
  readonly pushIcon: string | null;
}

const NEW_NOTATION_ICON_BY_OLD_ICON: Readonly<Record<string, string>> = {
  'assets/images/L.gif': 'assets/images/LN.gif',
  'assets/images/LPush.gif': 'assets/images/LNPush.gif',
  'assets/images/LSigma.gif': 'assets/images/LSigmaN.gif',
  'assets/images/LSigmaPush.gif': 'assets/images/LSigmaNPush.gif',
  'assets/images/L!Sigma.gif': 'assets/images/L!SigmaN.gif',
  'assets/images/L!SigmaPush.gif': 'assets/images/L!SigmaNPush.gif',
  'assets/images/R.gif': 'assets/images/RN.gif',
  'assets/images/RPush.gif': 'assets/images/RNPush.gif',
  'assets/images/RSigma.gif': 'assets/images/RSigmaN.gif',
  'assets/images/RSigmaPush.gif': 'assets/images/RSigmaNPush.gif',
  'assets/images/R!Sigma.gif': 'assets/images/R!SigmaN.gif',
  'assets/images/R!SigmaPush.gif': 'assets/images/R!SigmaNPush.gif',
};

@Component({
  selector: 'app-properties-panel',
  imports: [ButtonModule, TranslatePipe],
  template: `
    <div class="panel">
      <div class="panel-body">
        <div class="button-grid">
          @for (btn of buttons; track btn.id) {
            @if (btn.icon) {
              <button
                pButton
                type="button"
                [attr.aria-label]="btn.tooltipKey ? (btn.tooltipKey | translate) : ''"
                [title]="btn.tooltipKey ? (btn.tooltipKey | translate) : ''"
                [class.tool-btn-active]="activeToolId() === btn.toolId"
                class="tool-btn p-button-secondary"
                (click)="toggleTool(btn)"
              >
                <img [src]="getIcon(btn)" [alt]="btn.tooltipKey ? (btn.tooltipKey | translate) : ''" class="btn-icon" />
              </button>
            } @else {
              <div class="empty-cell" aria-hidden="true"></div>
            }
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

    .panel-body {
      padding: 0.5rem;
      flex: 1;
      min-height: 0;
    }

    .button-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(6, 1fr);
      gap: 0.5rem;
      height: 100%;
      max-height: 100%;
    }

    .tool-btn {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
    }

    .tool-btn-active {
      border-color: var(--p-primary-color);
      background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
    }

    .empty-cell {
      width: 100%;
      height: 100%;
    }

    .btn-icon {
      width: 24px;
      height: 24px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  `],
})
export class PropertiesPanel {
  private readonly store = inject(JtvStore);
  private readonly settingsService = inject(JtvSettingsService);

  readonly activeToolId = computed(() => this.store.activeToolId());

  readonly buttons: ToolButton[] = [
    {
      id: 1,
      toolId: 'symbol-lowercase',
      tooltipKey: 'properties.tools.symbolLowercase',
      icon: 'assets/images/ALowerCase.gif',
      pushIcon: 'assets/images/ALowerCasePush.gif',
    },
    {
      id: 2,
      toolId: 'symbol-variable',
      tooltipKey: 'properties.tools.symbolVariable',
      icon: 'assets/images/Sigma.gif',
      pushIcon: 'assets/images/SigmaPush.gif',
    },
    {
      id: 3,
      toolId: 'symbol-uppercase',
      tooltipKey: 'properties.tools.symbolUppercase',
      icon: 'assets/images/AUpperCase.gif',
      pushIcon: 'assets/images/AUpperCasePush.gif',
    },
    {
      id: 4,
      toolId: 'move-left',
      tooltipKey: 'properties.tools.moveLeft',
      icon: 'assets/images/L.gif',
      pushIcon: 'assets/images/LPush.gif',
    },
    {
      id: 5,
      toolId: 'move-right',
      tooltipKey: 'properties.tools.moveRight',
      icon: 'assets/images/R.gif',
      pushIcon: 'assets/images/RPush.gif',
    },
    {
      id: 6,
      toolId: 'hub',
      tooltipKey: 'properties.tools.hub',
      icon: 'assets/images/Hub.gif',
      pushIcon: 'assets/images/HubPush.gif',
    },
    {
      id: 7,
      toolId: 'search-left',
      tooltipKey: 'properties.tools.searchLeft',
      icon: 'assets/images/LSigma.gif',
      pushIcon: 'assets/images/LSigmaPush.gif',
    },
    {
      id: 8,
      toolId: 'search-right',
      tooltipKey: 'properties.tools.searchRight',
      icon: 'assets/images/RSigma.gif',
      pushIcon: 'assets/images/RSigmaPush.gif',
    },
    {
      id: 9,
      toolId: 'loop-transition',
      tooltipKey: 'properties.tools.loopTransition',
      icon: 'assets/images/ArrowLoop.gif',
      pushIcon: 'assets/images/ArrowLoopPush.gif',
    },
    {
      id: 10,
      toolId: 'search-left-inverse',
      tooltipKey: 'properties.tools.searchLeftInverse',
      icon: 'assets/images/L!Sigma.gif',
      pushIcon: 'assets/images/L!SigmaPush.gif',
    },
    {
      id: 11,
      toolId: 'search-right-inverse',
      tooltipKey: 'properties.tools.searchRightInverse',
      icon: 'assets/images/R!Sigma.gif',
      pushIcon: 'assets/images/R!SigmaPush.gif',
    },
    {
      id: 12,
      toolId: 'transition',
      tooltipKey: 'properties.tools.transition',
      icon: 'assets/images/Arrow.gif',
      pushIcon: 'assets/images/ArrowPush.gif',
    },
    {
      id: 13,
      toolId: 'shift-left',
      tooltipKey: 'properties.tools.shiftLeft',
      icon: 'assets/images/SL.gif',
      pushIcon: 'assets/images/SLPush.gif',
    },
    {
      id: 14,
      toolId: 'shift-right',
      tooltipKey: 'properties.tools.shiftRight',
      icon: 'assets/images/SR.gif',
      pushIcon: 'assets/images/SRPush.gif',
    },
    {
      id: 15,
      toolId: 'conditional-transition',
      tooltipKey: 'properties.tools.conditionalTransition',
      icon: 'assets/images/ArrowSigma.gif',
      pushIcon: 'assets/images/ArrowSigmaPush.gif',
    },
    {
      id: 16,
      toolId: 'submachine',
      tooltipKey: 'properties.tools.submachine',
      icon: 'assets/images/M.gif',
      pushIcon: 'assets/images/MPush.gif',
    },
    {
      id: 17,
      toolId: 'pointer',
      tooltipKey: 'properties.tools.pointer',
      icon: 'assets/images/Pointer.gif',
      pushIcon: 'assets/images/PointerPush.gif',
    },
    {
      id: 18,
      toolId: null,
      tooltipKey: null,
      icon: null,
      pushIcon: null,
    },
  ];

  getIcon(button: ToolButton): string | null {
    const icon = button.toolId && this.activeToolId() === button.toolId ? button.pushIcon : button.icon;

    return this.getNotationIcon(icon);
  }

  private getNotationIcon(icon: string | null): string | null {
    if (!icon || this.settingsService.settings().oldNotation) {
      return icon;
    }

    return NEW_NOTATION_ICON_BY_OLD_ICON[icon] ?? icon;
  }

  toggleTool(button: ToolButton): void {
    if (button.toolId) {
      this.store.toggleTool(button.toolId);
    }
  }
}
