import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-properties-panel',
  imports: [ButtonModule, TooltipModule, TranslatePipe],
  template: `
    <div class="panel">
      <div class="panel-body">
        <div class="button-grid">
          @for (btn of buttons; track btn.id) {
            <button
              pButton
              [pTooltip]="('properties.tool' | translate) + ' ' + btn.id"
              tooltipPosition="top"
              severity="secondary"
              [outlined]="true"
              class="tool-btn"
            >
              <img [src]="btn.icon" [alt]="('properties.tool' | translate) + ' ' + btn.id" class="btn-icon" />
            </button>
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

    .btn-icon {
      width: 24px;
      height: 24px;
      object-fit: contain;
      image-rendering: pixelated;
    }
  `],
})
export class PropertiesPanel {
  readonly buttons = Array.from({ length: 18 }, (_, i) => ({
    id: i + 1,
    icon: 'assets/images/L.gif',
  }));
}
