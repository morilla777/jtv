import { Component, OnInit, signal } from '@angular/core';
import { AppShell } from './layout/app-shell';

@Component({
  selector: 'app-root',
  imports: [AppShell],
  template: `
    @if (showSplash()) {
      <div class="splash-screen" aria-label="Java Turing Visual">
        <img src="assets/images/JTVSplash.jpg" alt="Java Turing Visual" class="splash-image" />
      </div>
    } @else {
      <app-shell />
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .splash-screen {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }

    .splash-image {
      display: block;
      max-width: min(90vw, 720px);
      max-height: 80vh;
      object-fit: contain;
    }
  `],
})
export class App implements OnInit {
  private readonly splashDurationMs = 1800;
  readonly showSplash = signal(true);

  ngOnInit(): void {
    window.setTimeout(() => {
      this.showSplash.set(false);
    }, this.splashDurationMs);
  }
}
