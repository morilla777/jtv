import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-explorer-panel',
  imports: [TabsModule, TranslatePipe],
  template: `
    <div class="panel">
      <div class="panel-header">{{ 'explorer.title' | translate }}</div>

      <div class="panel-body">
        <p-tabs value="machines">
          <p-tablist>
            <p-tab value="machines">{{ 'explorer.machines' | translate }}</p-tab>
            <p-tab value="examples">{{ 'explorer.examples' | translate }}</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel value="machines">
              <div class="placeholder-list">
                <div class="item selected">NUEVA</div>
                <div class="item">Palíndromo</div>
                <div class="item">Paridad</div>
              </div>
            </p-tabpanel>

            <p-tabpanel value="examples">
              <div class="placeholder-list">
                <div class="item">Copiadora simple</div>
                <div class="item">Reconocedor de aⁿbⁿ</div>
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
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

    .panel-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0.75rem;
    }

    .placeholder-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item {
      padding: 0.75rem;
      border: 1px solid var(--p-surface-border);
      border-radius: 10px;
      cursor: pointer;
      background: var(--p-surface-ground);
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .item:hover {
      background: var(--p-surface-hover);
    }

    .item.selected {
      border-color: var(--p-primary-color);
      background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
    }
  `],
})
export class ExplorerPanel {}
