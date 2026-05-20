import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type MenuItem } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { SelectModule, type SelectChangeEvent } from 'primeng/select';
import { TranslatePipe } from '../i18n/translate.pipe';
import { TranslationService, type Language } from '../i18n/translation.service';
import { JtvStore } from '../stores/jtv.store';

interface LanguageOption {
  code: Language;
  label: string;
  flagSrc: string;
  flagAlt: string;
}

@Component({
  selector: 'app-topbar',
  imports: [FormsModule, MenubarModule, ToolbarModule, ButtonModule, SelectModule, TranslatePipe],
  template: `
    <div class="topbar-shell">
      <p-menubar [model]="menuItems" class="jtv-menubar">
        <ng-template #end>
          <div class="menubar-end">
            <div class="lang-switcher">
              <p-select
                [options]="languageOptions"
                [ngModel]="selectedLanguageOption"
                optionLabel="label"
                size="small"
                class="language-select"
                panelStyleClass="language-select-panel"
                (onChange)="onLanguageChange($event)"
              >
                <ng-template #selectedItem let-selectedOption>
                  @if (selectedOption) {
                    <div class="language-option">
                      <img class="language-flag" [src]="selectedOption.flagSrc" [alt]="selectedOption.flagAlt" />
                      <span>{{ selectedOption.label }}</span>
                    </div>
                  }
                </ng-template>

                <ng-template #item let-language>
                  <div class="language-option">
                    <img class="language-flag" [src]="language.flagSrc" [alt]="language.flagAlt" />
                    <span>{{ language.label }}</span>
                  </div>
                </ng-template>
              </p-select>
            </div>

            <div class="brand menubar-brand">
              <span class="brand-title">JTV 2.0</span>
              <span class="brand-subtitle">{{ 'topbar.brandSubtitle' | translate }}</span>
            </div>
          </div>
        </ng-template>
      </p-menubar>

      <p-toolbar class="jtv-topbar">
        <ng-template #center>
          <div class="toolbar-actions">
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.new' | translate"
              [title]="'topbar.new' | translate"
            >
              <img src="assets/images/New24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.save' | translate"
              [title]="'topbar.save' | translate"
            >
              <img src="assets/images/Save24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.import' | translate"
              [title]="'topbar.import' | translate"
            >
              <img src="assets/images/Open24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.export' | translate"
              [title]="'topbar.export' | translate"
            >
              <img src="assets/images/Print24.gif" alt="" />
            </button>
            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.undo' | translate"
              [title]="'topbar.menu.edit.undo' | translate"
            >
              <img src="assets/images/Undo24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.redo' | translate"
              [title]="'topbar.menu.edit.redo' | translate"
            >
              <img src="assets/images/Redo24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.cut' | translate"
              [title]="'topbar.menu.edit.cut' | translate"
            >
              <img src="assets/images/Cut24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.copy' | translate"
              [title]="'topbar.menu.edit.copy' | translate"
            >
              <img src="assets/images/Copy24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.paste' | translate"
              [title]="'topbar.menu.edit.paste' | translate"
            >
              <img src="assets/images/Paste24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.delete' | translate"
              [title]="'topbar.menu.edit.delete' | translate"
            >
              <img src="assets/images/Delete24.gif" alt="" />
            </button>
            <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
            <p-button
              label="A="
              class="notation-button"
              [attr.aria-label]="'topbar.parameterAssignment' | translate"
              [title]="'topbar.parameterAssignment' | translate"
              severity="secondary"
            />
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.execute' | translate"
              [title]="'topbar.execute' | translate"
              (click)="executeMachine()"
            >
              <img src="assets/images/Play24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.stop' | translate"
              [title]="'topbar.stop' | translate"
            >
              <img src="assets/images/Stop24.gif" alt="" />
            </button>
          </div>
        </ng-template>

        <ng-template #end>
          <div class="topbar-end">
            <p-select
              [options]="symbolOptions"
              [(ngModel)]="selectedSymbol"
              size="small"
              class="toolbar-select symbol-select"
              panelStyleClass="symbol-select-panel"
              ariaLabel="Símbolo"
            />
            <p-select
              [options]="greekLowercaseOptions"
              [(ngModel)]="selectedGreekLowercase"
              size="small"
              class="toolbar-select symbol-select"
              panelStyleClass="symbol-select-panel"
              ariaLabel="Letra griega"
            />
            <p-select
              [options]="uppercaseOptions"
              [(ngModel)]="selectedUppercase"
              size="small"
              class="toolbar-select symbol-select"
              panelStyleClass="symbol-select-panel"
              ariaLabel="Letra mayúscula"
            />
            <p-select
              [options]="machineOptions"
              [(ngModel)]="selectedMachine"
              size="small"
              class="toolbar-select machine-select"
              ariaLabel="Máquina"
            />
          </div>
        </ng-template>
      </p-toolbar>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      z-index: 1000;
    }

    .topbar-shell {
      display: flex;
      flex-direction: column;
    }

    :host ::ng-deep .jtv-menubar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      min-height: 2.5rem;
      padding-block: 0.125rem;
    }

    :host ::ng-deep .jtv-menubar .p-menubar-submenu {
      z-index: 1001;
    }

    .jtv-topbar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
    }

    .brand {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .menubar-brand {
      align-items: flex-end;
      padding-inline: 0.5rem;
      white-space: nowrap;
    }

    .menubar-end {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-title {
      font-weight: 700;
      font-size: 1rem;
    }

    .brand-subtitle {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
    }

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .image-toolbar-button {
      width: 2.25rem;
      height: 2.25rem;
      justify-content: center;
      padding: 0;
    }

    .image-toolbar-button img {
      display: block;
      width: 24px;
      height: 24px;
    }

    .toolbar-separator {
      align-self: stretch;
      width: 1px;
      min-height: 2rem;
      margin-inline: 0.25rem;
      background: var(--p-content-border-color);
    }

    :host ::ng-deep .notation-button .p-button-label {
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    :host ::ng-deep .notation-button {
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      justify-content: center;
    }

    :host ::ng-deep .notation-button .p-button {
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      justify-content: center;
    }

    .topbar-end {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
    }

    .lang-switcher {
      display: flex;
      min-width: 6.5rem;
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      line-height: 1;
    }

    .language-flag {
      width: 1.25rem;
      height: 0.875rem;
      border-radius: 2px;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--p-text-color) 15%, transparent);
      object-fit: cover;
    }

    :host ::ng-deep .language-select {
      width: 6.5rem;
    }

    :host ::ng-deep .language-select .p-select-label {
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
    }

    :host ::ng-deep .toolbar-select .p-select-label {
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
      font-size: 0.875rem;
    }

    :host ::ng-deep .symbol-select {
      width: 5rem;
    }

    :host ::ng-deep .symbol-select .p-select-label {
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    :host ::ng-deep .symbol-select-panel .p-select-option {
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    :host ::ng-deep .machine-select {
      width: 9.5rem;
    }
  `],
})
export class Topbar {
  readonly i18n = inject(TranslationService);
  private readonly store = inject(JtvStore);

  readonly symbolOptions = [
    '#',
    ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(97 + index)),
    ...Array.from({ length: 10 }, (_, index) => index.toString()),
  ];

  readonly greekLowercaseOptions = [
    'α',
    'β',
    'γ',
    'δ',
    'ε',
    'ζ',
    'η',
    'θ',
    'ι',
    'κ',
    'λ',
    'μ',
    'ν',
    'ξ',
    'ο',
    'π',
    'ρ',
    'σ',
    'τ',
    'υ',
    'φ',
    'χ',
    'ψ',
    'ω',
  ];

  readonly uppercaseOptions = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

  readonly machineOptions = ['MAQUINA 1', 'MÁQUINA 2'];

  selectedSymbol = this.symbolOptions[0];
  selectedGreekLowercase = this.greekLowercaseOptions[0];
  selectedUppercase = this.uppercaseOptions[0];
  selectedMachine = this.machineOptions[0];

  get menuItems(): MenuItem[] {
    return [
      {
        label: this.i18n.translate('topbar.menu.file'),
        icon: 'pi pi-file',
        items: [
          {
            label: this.i18n.translate('topbar.menu.file.new'),
            icon: 'pi pi-plus',
          },
          {
            label: this.i18n.translate('topbar.menu.file.open'),
            icon: 'pi pi-folder-open',
          },
          {
            label: this.i18n.translate('topbar.menu.file.save'),
            icon: 'pi pi-save',
          },
          {
            label: this.i18n.translate('topbar.menu.file.saveAs'),
            icon: 'pi pi-save',
          },
          {
            label: this.i18n.translate('topbar.menu.file.print'),
            icon: 'pi pi-print',
          },
          {
            label: this.i18n.translate('topbar.menu.file.recentMachines'),
            icon: 'pi pi-history',
            items: [
              {
                label: this.i18n.translate('topbar.menu.file.recentMachines.dummyOne'),
                icon: 'pi pi-cog',
              },
              {
                label: this.i18n.translate('topbar.menu.file.recentMachines.dummyTwo'),
                icon: 'pi pi-cog',
              },
            ],
          },
          {
            label: this.i18n.translate('topbar.menu.file.exportTo'),
            icon: 'pi pi-download',
            items: [
              {
                label: this.i18n.translate('topbar.menu.file.exportTo.json'),
                icon: 'pi pi-code',
              },
              {
                label: this.i18n.translate('topbar.menu.file.exportTo.png'),
                icon: 'pi pi-image',
              },
            ],
          },
          {
            separator: true,
          },
          {
            label: this.i18n.translate('topbar.menu.file.exit'),
            icon: 'pi pi-sign-out',
          },
        ],
      },
      {
        label: this.i18n.translate('topbar.menu.edit'),
        icon: 'pi pi-pencil',
        items: [
          {
            label: this.i18n.translate('topbar.menu.edit.undo'),
            icon: 'pi pi-undo',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.redo'),
            icon: 'pi pi-refresh',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.makeInitial'),
            icon: 'pi pi-flag',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.changeTape'),
            icon: 'pi pi-sliders-h',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.cut'),
            icon: 'pi pi-eraser',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.copy'),
            icon: 'pi pi-copy',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.paste'),
            icon: 'pi pi-clone',
          },
          {
            label: this.i18n.translate('topbar.menu.edit.delete'),
            icon: 'pi pi-trash',
          },
        ],
      },
      {
        label: this.i18n.translate('topbar.menu.settings'),
        icon: 'pi pi-cog',
        items: [
          {
            label: this.i18n.translate('topbar.menu.settings.burstSize'),
            icon: 'pi pi-bolt',
          },
          {
            label: this.i18n.translate('topbar.menu.settings.notationChange'),
            icon: 'pi pi-language',
          },
        ],
      },
      {
        label: this.i18n.translate('topbar.menu.help'),
        icon: 'pi pi-question-circle',
        items: [
          {
            label: this.i18n.translate('topbar.menu.help.contents'),
            icon: 'pi pi-book',
          },
          {
            label: this.i18n.translate('topbar.menu.help.about'),
            icon: 'pi pi-info-circle',
          },
        ],
      },
    ];
  }

  readonly languageOptions: LanguageOption[] = [
    {
      code: 'es',
      label: 'ES',
      flagSrc: 'assets/images/flag-cl.svg',
      flagAlt: 'Bandera chilena',
    },
    {
      code: 'en',
      label: 'EN',
      flagSrc: 'assets/images/flag-gb.svg',
      flagAlt: 'Bandera britanica',
    },
  ];

  get selectedLanguageOption(): LanguageOption {
    return this.languageOptions.find((language) => language.code === this.i18n.currentLang()) ?? this.languageOptions[0];
  }

  onLanguageChange(event: SelectChangeEvent): void {
    const selected = event.value as LanguageOption | null;

    if (selected) {
      this.i18n.setLanguage(selected.code);
    }
  }

  executeMachine(): void {
    this.store.runMachineOnFirstTape();
  }
}
