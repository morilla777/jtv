import { Injectable, signal, computed } from '@angular/core';
import { es } from '../i18n/translations/es';
import { en } from '../i18n/translations/en';

export const AVAILABLE_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof AVAILABLE_LANGUAGES)[number];

const TRANSLATIONS: Record<Language, Record<string, string>> = { es, en };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly currentLang = signal<Language>('es');
  readonly availableLanguages = AVAILABLE_LANGUAGES;

  private readonly translations = computed(() => TRANSLATIONS[this.currentLang()]);

  constructor() {
    const queryLanguage = this.getQueryLanguage();

    if (queryLanguage) {
      this.setLanguage(queryLanguage);
      return;
    }

    const saved = localStorage.getItem('jtv-lang');
    if (saved && this.isValidLanguage(saved)) {
      this.currentLang.set(saved);
    }
  }

  translate(key: string, params?: Record<string, string | number>): string {
    let text = this.translations()[key] ?? key;
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        text = text.replaceAll(`{{${param}}}`, String(value));
      }
    }
    return text;
  }

  setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    localStorage.setItem('jtv-lang', lang);
  }

  private isValidLanguage(value: string): value is Language {
    return (AVAILABLE_LANGUAGES as readonly string[]).includes(value);
  }

  private getQueryLanguage(): Language | null {
    const language = new URLSearchParams(window.location.search).get('lang')?.toLowerCase();

    return language && this.isValidLanguage(language) ? language : null;
  }
}
