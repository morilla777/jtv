import { Injectable } from '@angular/core';

export interface JtvSettings {
  readonly burstSize: number;
}

export const DEFAULT_JTV_SETTINGS: JtvSettings = {
  burstSize: 300,
};

const JTV_SETTINGS_STORAGE_KEY = 'jtv-settings';

@Injectable({ providedIn: 'root' })
export class JtvSettingsService {
  getSettings(): JtvSettings {
    const savedSettings = this.readSavedSettings();

    return {
      ...DEFAULT_JTV_SETTINGS,
      ...savedSettings,
    };
  }

  saveSettings(settings: JtvSettings): void {
    localStorage.setItem(JTV_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  saveBurstSize(burstSize: number): void {
    this.saveSettings({
      ...this.getSettings(),
      burstSize,
    });
  }

  private readSavedSettings(): Partial<JtvSettings> {
    const rawSettings = localStorage.getItem(JTV_SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return {};
    }

    try {
      const parsedSettings = JSON.parse(rawSettings) as Partial<JtvSettings>;
      const burstSize = Number(parsedSettings.burstSize);

      return Number.isFinite(burstSize)
        ? { burstSize }
        : {};
    } catch {
      return {};
    }
  }
}
