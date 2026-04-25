import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-designer-canvas-panel',
  imports: [ButtonModule, TranslatePipe],
  template: `
    <div class="panel">
      <div class="panel-header">{{ 'designer.title' | translate }}</div>

      <div class="canvas-toolbar">
        <p-button icon="pi pi-plus" [label]="'designer.state' | translate" size="small" severity="secondary" />
        <p-button icon="pi pi-share-alt" [label]="'designer.transition' | translate" size="small" severity="secondary" />
        <p-button icon="pi pi-search-plus" size="small" severity="contrast" />
        <p-button icon="pi pi-search-minus" size="small" severity="contrast" />
        <p-button icon="pi pi-compass" [label]="'designer.center' | translate" size="small" severity="contrast" />
      </div>

      <div class="canvas-container">
        <svg class="designer-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" class="arrow-head"></polygon>
            </marker>
          </defs>

          <rect x="0" y="0" width="1200" height="800" fill="transparent"></rect>

          <line x1="120" y1="220" x2="196" y2="220" class="arrow-line" marker-end="url(#arrowhead)"></line>

          <line x1="284" y1="220" x2="476" y2="220" class="arrow-line" marker-end="url(#arrowhead)"></line>
          <text x="380" y="190" text-anchor="middle" class="transition-label">a → a, R</text>

          <line x1="564" y1="220" x2="796" y2="220" class="arrow-line" marker-end="url(#arrowhead)"></line>
          <text x="680" y="190" text-anchor="middle" class="transition-label"># → #, S</text>

          <circle cx="240" cy="220" r="44" class="state state-initial"></circle>
          <text x="240" y="226" text-anchor="middle" class="state-label">q0</text>

          <circle cx="520" cy="220" r="44" class="state"></circle>
          <text x="520" y="226" text-anchor="middle" class="state-label">q1</text>

          <circle cx="840" cy="220" r="44" class="state state-accept"></circle>
          <circle cx="840" cy="220" r="38" class="state-accept-inner"></circle>
          <text x="840" y="226" text-anchor="middle" class="state-label">qa</text>
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

    .panel-header {
      padding: 0.75rem 1rem;
      font-weight: 600;
      border-bottom: 1px solid var(--p-surface-border);
    }

    .canvas-toolbar {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--p-surface-border);
      flex-wrap: wrap;
    }

    .canvas-container {
      flex: 1;
      min-height: 0;
      overflow: auto;
      background:
        linear-gradient(to right, rgba(128, 128, 128, 0.08) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(128, 128, 128, 0.08) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .designer-svg {
      width: 100%;
      height: 100%;
      min-width: 900px;
      min-height: 600px;
    }

    .state {
      fill: var(--p-surface-card);
      stroke: var(--p-text-color);
      stroke-width: 2;
    }

    .state-initial {
      stroke-width: 3;
    }

    .state-accept {
      stroke-width: 2;
    }

    .state-accept-inner {
      fill: none;
      stroke: var(--p-text-color);
      stroke-width: 2;
    }

    .state-label {
      font-size: 20px;
      fill: var(--p-text-color);
      font-weight: 600;
    }

    .arrow-line {
      stroke: var(--p-text-color);
      stroke-width: 2;
    }

    .arrow-head {
      fill: var(--p-text-color);
    }

    .transition-label {
      font-size: 18px;
      fill: var(--p-text-muted-color);
    }
  `],
})
export class DesignerCanvasPanel {}
