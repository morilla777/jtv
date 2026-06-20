import { Component, inject } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { TranslatePipe } from '../pipes/translate.pipe';
import { LoadingIndicatorService } from '../services/loading-indicator.service';

@Component({
  selector: 'app-loading-overlay',
  imports: [ProgressSpinnerModule, TranslatePipe],
  template: `
    @if (loading.visible()) {
      <div class="loading-overlay" role="status" aria-live="polite">
        <div class="loading-panel">
          <p-progress-spinner
            ariaLabel="loading"
            strokeWidth="5"
            [style]="{ width: '3.25rem', height: '3.25rem' }"
          />
          <span>{{ loading.message() || ('loading.executing' | translate) }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 1080;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(1px);
      pointer-events: auto;
    }

    .loading-panel {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 12rem;
      padding: 1rem 1.125rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 6px;
      background: var(--p-content-background);
      color: var(--p-text-color);
      box-shadow: var(--p-overlay-popover-shadow);
      font-size: 0.875rem;
      font-weight: 600;
    }

    :host ::ng-deep .p-progressspinner-circle {
      stroke: var(--p-primary-color);
    }
  `],
})
export class LoadingOverlay {
  readonly loading = inject(LoadingIndicatorService);
}
