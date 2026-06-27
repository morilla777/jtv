import { Injectable, computed, signal } from '@angular/core';

export interface JtvSettings {
  readonly burstSize: number;
  readonly oldNotation: boolean;
}

export const DEFAULT_JTV_SETTINGS: JtvSettings = {
  burstSize: 300,
  oldNotation: false,
};

const JTV_SETTINGS_STORAGE_KEY = 'jtv-settings';

@Injectable({ providedIn: 'root' })
export class JtvSettingsService {
  private readonly settingsState = signal<JtvSettings>(this.loadSettings());
  readonly settings = computed(() => this.settingsState());

  getSettings(): JtvSettings {
    return this.settingsState();
  }

  saveSettings(settings: JtvSettings): void {
    this.settingsState.set(settings);
    localStorage.setItem(JTV_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  saveBurstSize(burstSize: number): void {
    this.saveSettings({
      ...this.getSettings(),
      burstSize,
    });
  }

  saveOldNotation(oldNotation: boolean): void {
    this.saveSettings({
      ...this.getSettings(),
      oldNotation,
    });
  }

  private loadSettings(): JtvSettings {
    const savedSettings = this.readSavedSettings();

    return {
      ...DEFAULT_JTV_SETTINGS,
      ...savedSettings,
    };
  }

  private readSavedSettings(): Partial<JtvSettings> {
    const rawSettings = localStorage.getItem(JTV_SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return {};
    }

    try {
      const parsedSettings = JSON.parse(rawSettings) as Partial<JtvSettings>;
      const burstSize = Number(parsedSettings.burstSize);
      const settings: { burstSize?: number; oldNotation?: boolean } = {};

      if (Number.isFinite(burstSize)) {
        settings.burstSize = burstSize;
      }

      if (typeof parsedSettings.oldNotation === 'boolean') {
        settings.oldNotation = parsedSettings.oldNotation;
      }

      return settings;
    } catch {
      return {};
    }
  }
}
