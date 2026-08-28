import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

const JtvBluePreset = definePreset(Aura, {
  primitive: {
    jtvBlue: {
      50: '#f1f8ff',
      100: '#d9ecff',
      200: '#b7dcff',
      300: '#83c5ff',
      400: '#48a3f0',
      500: '#1b7fca',
      600: '#0b63a5',
      700: '#064f86',
      800: '#043d68',
      900: '#002f5f',
      950: '#001f3f',
    },
    jtvSurface: {
      0: '#ffffff',
      50: '#f6f9fc',
      100: '#edf3f8',
      200: '#d9e5ef',
      300: '#bfd0df',
      400: '#8ea8bd',
      500: '#637f96',
      600: '#486276',
      700: '#33495b',
      800: '#203040',
      900: '#162535',
      950: '#0b1724',
    },
  },
  semantic: {
    primary: {
      50: '{jtvBlue.50}',
      100: '{jtvBlue.100}',
      200: '{jtvBlue.200}',
      300: '{jtvBlue.300}',
      400: '{jtvBlue.400}',
      500: '{jtvBlue.500}',
      600: '{jtvBlue.600}',
      700: '{jtvBlue.700}',
      800: '{jtvBlue.800}',
      900: '{jtvBlue.900}',
      950: '{jtvBlue.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '{jtvSurface.0}',
          50: '{jtvSurface.50}',
          100: '{jtvSurface.100}',
          200: '{jtvSurface.200}',
          300: '{jtvSurface.300}',
          400: '{jtvSurface.400}',
          500: '{jtvSurface.500}',
          600: '{jtvSurface.600}',
          700: '{jtvSurface.700}',
          800: '{jtvSurface.800}',
          900: '{jtvSurface.900}',
          950: '{jtvSurface.950}',
        },
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '{primary.900}',
          focusColor: '{primary.950}',
        },
      },
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            secondary: {
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: '{surface.300}',
              hoverBorderColor: '{primary.300}',
              activeBorderColor: '{primary.400}',
              color: '{surface.800}',
              hoverColor: '{primary.900}',
              activeColor: '{primary.950}',
              focusRing: {
                color: '{primary.500}',
                shadow: 'none',
              },
            },
          },
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    ConfirmationService,
    MessageService,
    providePrimeNG({
      theme: {
        preset: JtvBluePreset,
      },
    }),
  ]
};
