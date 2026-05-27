import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    MessageService,
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
  ]
};
