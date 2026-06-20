import { Injectable, computed, signal } from '@angular/core';

const MIN_VISIBLE_MS = 450;

@Injectable({ providedIn: 'root' })
export class LoadingIndicatorService {
  private readonly activeOperations = signal(0);
  private readonly currentMessage = signal('');

  readonly visible = computed(() => this.activeOperations() > 0);
  readonly message = computed(() => this.currentMessage());

  async run<T>(task: () => T | Promise<T>, message: string = ''): Promise<T> {
    const startedAt = Date.now();

    this.show(message);

    try {
      await this.waitForPaint();
      return await task();
    } finally {
      await this.waitForMinimumVisibleTime(startedAt);
      this.hide();
    }
  }

  private show(message: string): void {
    this.currentMessage.set(message);
    this.activeOperations.update((count) => count + 1);
  }

  private hide(): void {
    this.activeOperations.update((count) => Math.max(0, count - 1));

    if (this.activeOperations() === 0) {
      this.currentMessage.set('');
    }
  }

  private waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(resolve, 0);
    });
  }

  private waitForMinimumVisibleTime(startedAt: number): Promise<void> {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    return new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
