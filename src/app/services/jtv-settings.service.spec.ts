import { beforeEach, describe, expect, it } from 'vitest';

import { JtvSettingsService } from './jtv-settings.service';

describe('JtvSettingsService', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  it('returns the default burst size when there are no saved settings', () => {
    expect(new JtvSettingsService().getSettings()).toEqual({
      burstSize: 300,
    });
  });

  it('persists settings as extensible JSON', () => {
    const service = new JtvSettingsService();

    service.saveBurstSize(450);

    expect(JSON.parse(storage.get('jtv-settings') ?? '{}')).toEqual({
      burstSize: 450,
    });
    expect(service.getSettings()).toEqual({
      burstSize: 450,
    });
  });

  it('falls back to defaults when saved settings are invalid', () => {
    storage.set('jtv-settings', '{bad json');

    expect(new JtvSettingsService().getSettings()).toEqual({
      burstSize: 300,
    });
  });
});
