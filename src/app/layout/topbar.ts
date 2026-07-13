import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService, type MenuItem } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MenubarModule } from 'primeng/menubar';
import { SelectModule, type SelectChangeEvent } from 'primeng/select';
import { BurstSizeDialog } from '../components/burst-size-dialog';
import { NotationChangeDialog } from '../components/notation-change-dialog';
import { ParameterAssignmentDialog } from '../components/parameter-assignment-dialog';
import { TranslatePipe } from '../pipes/translate.pipe';
import { JtvFileService } from '../services/jtv-file.service';
import { JtvFileValidatorService } from '../services/jtv-file-validator.service';
import { LegacyJtvImporter } from '../services/legacy-jtv-importer';
import { LoadingIndicatorService } from '../services/loading-indicator.service';
import { TranslationService, type Language } from '../services/translation.service';
import { JtvStore } from '../stores/jtv.store';
import { environment } from '../../environments/environment';

interface LanguageOption {
  code: Language;
  label: string;
  flagSrc: string;
  flagAlt: string;
}

@Component({
  selector: 'app-topbar',
  imports: [FormsModule, MenubarModule, ToolbarModule, ButtonModule, DialogModule, SelectModule, BurstSizeDialog, NotationChangeDialog, ParameterAssignmentDialog, TranslatePipe],
  template: `
    <div class="topbar-shell">
      <p-menubar [model]="menuItems" class="jtv-menubar">
        <ng-template #start>
          <div class="file-menu-shell">
            <button
              type="button"
              class="file-menu-trigger"
              [attr.aria-expanded]="fileMenuOpen"
              aria-haspopup="menu"
              (click)="toggleFileMenu($event)"
            >
              <span class="pi pi-file"></span>
              <span>{{ 'topbar.menu.file' | translate }}</span>
            </button>

            @if (fileMenuOpen) {
              <div class="file-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'new')">
                  <img class="file-menu-icon" src="assets/images/New16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.new' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'open')">
                  <img class="file-menu-icon" src="assets/images/Open16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.open' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'save')">
                  <img class="file-menu-icon" src="assets/images/Save16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.save' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'saveAs')">
                  <img class="file-menu-icon" src="assets/images/SaveAs16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.saveAs' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'import')">
                  <img class="file-menu-icon" src="assets/images/Import16.gif" alt="" />
                  <span>{{ 'topbar.import' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runFileMenuAction($event, 'print')">
                  <img class="file-menu-icon" src="assets/images/Print16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.print' | translate }}</span>
                </button>
              </div>
            }
          </div>

          <div class="file-menu-shell">
            <button
              type="button"
              class="file-menu-trigger"
              [attr.aria-expanded]="settingsMenuOpen"
              aria-haspopup="menu"
              (click)="toggleSettingsMenu($event)"
            >
              <span class="pi pi-cog"></span>
              <span>{{ 'topbar.menu.settings' | translate }}</span>
            </button>

            @if (settingsMenuOpen) {
              <div class="file-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" (click)="runSettingsMenuAction($event, 'burstSize')">
                  <span class="pi pi-bolt"></span>
                  <span>{{ 'topbar.menu.settings.burstSize' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runSettingsMenuAction($event, 'notationChange')">
                  <img class="file-menu-icon" src="assets/images/NotationChange16.gif" alt="" />
                  <span>{{ 'topbar.menu.settings.notationChange' | translate }}</span>
                </button>
              </div>
            }
          </div>

          <div class="file-menu-shell">
            <button
              type="button"
              class="file-menu-trigger"
              [attr.aria-expanded]="editMenuOpen"
              aria-haspopup="menu"
              (click)="toggleEditMenu($event)"
            >
              <span class="pi pi-pencil"></span>
              <span>{{ 'topbar.menu.edit' | translate }}</span>
            </button>

            @if (editMenuOpen) {
              <div class="file-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!canUndo" (click)="runEditMenuAction($event, 'undo')">
                  <img class="file-menu-icon" src="assets/images/Undo16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.undo' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!canRedo" (click)="runEditMenuAction($event, 'redo')">
                  <img class="file-menu-icon" src="assets/images/Redo16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.redo' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!canMakeSelectedCanvasNodeInitial" (click)="runEditMenuAction($event, 'makeInitial')">
                  <img class="file-menu-icon" src="assets/images/Start16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.makeInitial' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!hasSelectedCanvasNode" (click)="runEditMenuAction($event, 'changeTape')">
                  <img class="file-menu-icon" src="assets/images/ChangeTape16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.changeTape' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!hasCanvasSelection" (click)="runEditMenuAction($event, 'cut')">
                  <img class="file-menu-icon" src="assets/images/Cut16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.cut' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!hasCanvasSelection" (click)="runEditMenuAction($event, 'copy')">
                  <img class="file-menu-icon" src="assets/images/Copy16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.copy' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!canPasteCanvasElements" (click)="runEditMenuAction($event, 'paste')">
                  <img class="file-menu-icon" src="assets/images/Paste16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.paste' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="!hasCanvasSelection" (click)="runEditMenuAction($event, 'delete')">
                  <img class="file-menu-icon" src="assets/images/Delete16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.delete' | translate }}</span>
                </button>
              </div>
            }
          </div>

          <div class="file-menu-shell">
            <button
              type="button"
              class="file-menu-trigger"
              [attr.aria-expanded]="helpMenuOpen"
              aria-haspopup="menu"
              (click)="toggleHelpMenu($event)"
            >
              <span class="pi pi-question-circle"></span>
              <span>{{ 'topbar.menu.help' | translate }}</span>
            </button>

            @if (helpMenuOpen) {
              <div class="file-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" (click)="runHelpMenuAction($event, 'contents')">
                  <span class="pi pi-book"></span>
                  <span>{{ 'topbar.menu.help.contents' | translate }}</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" (click)="runHelpMenuAction($event, 'about')">
                  <img class="file-menu-icon" src="assets/images/Info16.gif" alt="" />
                  <span>{{ 'topbar.menu.help.about' | translate }}</span>
                </button>
              </div>
            }
          </div>
        </ng-template>

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
              (click)="newMachine()"
            >
              <img src="assets/images/New24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.file.open' | translate"
              [title]="'topbar.menu.file.open' | translate"
              (click)="openMachine()"
            >
              <img src="assets/images/Open24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.save' | translate"
              [title]="'topbar.save' | translate"
              (click)="saveMachine()"
            >
              <img src="assets/images/Save24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.import' | translate"
              [title]="'topbar.import' | translate"
              (click)="importLegacyMachine()"
            >
              <img src="assets/images/Import24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.print' | translate"
              [title]="'topbar.print' | translate"
              (click)="printCanvas()"
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
              [disabled]="!canUndo"
              (click)="undo()"
            >
              <img src="assets/images/Undo24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.redo' | translate"
              [title]="'topbar.menu.edit.redo' | translate"
              [disabled]="!canRedo"
              (click)="redo()"
            >
              <img src="assets/images/Redo24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.cut' | translate"
              [title]="'topbar.menu.edit.cut' | translate"
              [disabled]="!hasCanvasSelection"
              (click)="cutSelectedCanvasElements()"
            >
              <img src="assets/images/Cut24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.copy' | translate"
              [title]="'topbar.menu.edit.copy' | translate"
              [disabled]="!hasCanvasSelection"
              (click)="copySelectedCanvasElements()"
            >
              <img src="assets/images/Copy24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.paste' | translate"
              [title]="'topbar.menu.edit.paste' | translate"
              [disabled]="!canPasteCanvasElements"
              (click)="pasteCanvasElements()"
            >
              <img src="assets/images/Paste24.gif" alt="" />
            </button>
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.menu.edit.delete' | translate"
              [title]="'topbar.menu.edit.delete' | translate"
              [disabled]="!hasCanvasSelection"
              (click)="deleteSelectedCanvasElement()"
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
              (onClick)="openParameterAssignmentDialog()"
            />
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.execute' | translate"
              [title]="'topbar.execute' | translate"
              [disabled]="executionFinished"
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
              [disabled]="!executionFinished"
              (click)="stopSimulation()"
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
              [options]="machineOptions()"
              [(ngModel)]="selectedSubmachineName"
              size="small"
              class="toolbar-select machine-select"
              ariaLabel="Máquina"
            >
              <ng-template #empty></ng-template>
            </p-select>
          </div>
        </ng-template>
      </p-toolbar>

      <app-parameter-assignment-dialog
        [(visible)]="parameterAssignmentDialogVisible"
        [parameters]="insertedParameters"
        [symbolOptions]="symbolOptions"
        [assignments]="parameterAssignments"
        (assignmentsChange)="saveParameterAssignments($event)"
      />

      <app-burst-size-dialog
        [(visible)]="burstSizeDialogVisible"
      />

      <app-notation-change-dialog
        [(visible)]="notationChangeDialogVisible"
      />

      <p-dialog
        [(visible)]="aboutDialogVisible"
        [modal]="true"
        [header]="'topbar.menu.help.about' | translate"
        [draggable]="false"
        [resizable]="false"
        styleClass="about-dialog"
      >
        <img [src]="aboutSplashImageSrc" alt="Java Turing Visual" class="about-splash-image" />
        <div class="about-legacy-text" [innerHTML]="'aboutDialog.legacyText' | translate"></div>
      </p-dialog>
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

    .file-menu-shell {
      position: relative;
      display: flex;
      align-items: center;
      height: 100%;
    }

    .file-menu-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 2rem;
      padding: 0.5rem 0.75rem;
      border: 0;
      border-radius: var(--p-menubar-item-border-radius, 4px);
      color: var(--p-menubar-item-color, var(--p-text-color));
      background: transparent;
      cursor: pointer;
      font: inherit;
    }

    .file-menu-trigger:hover,
    .file-menu-trigger[aria-expanded="true"] {
      color: var(--p-menubar-item-focus-color, var(--p-text-color));
      background: var(--p-menubar-item-focus-background, var(--p-content-hover-background));
    }

    .file-menu-panel {
      position: absolute;
      top: calc(100% + 2px);
      left: 0;
      z-index: 1002;
      min-width: 13rem;
      padding: 0.25rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-menubar-submenu-border-radius, 4px);
      background: var(--p-content-background);
      box-shadow: var(--p-overlay-popover-shadow);
    }

    .file-menu-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      min-height: 2rem;
      padding: 0.5rem 0.75rem;
      border: 0;
      border-radius: var(--p-menubar-item-border-radius, 4px);
      color: var(--p-menubar-item-color, var(--p-text-color));
      background: transparent;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .file-menu-item:hover {
      color: var(--p-menubar-item-focus-color, var(--p-text-color));
      background: var(--p-menubar-item-focus-background, var(--p-content-hover-background));
    }

    .file-menu-item:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .file-menu-item:disabled:hover {
      color: var(--p-menubar-item-color, var(--p-text-color));
      background: transparent;
    }

    .file-menu-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      image-rendering: pixelated;
      flex: 0 0 auto;
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

    :host ::ng-deep .about-dialog {
      width: min(92vw, 608px);
    }

    :host ::ng-deep .about-dialog .p-dialog-content {
      padding: 0 10% 1rem;
      overflow: auto;
    }

    .about-splash-image {
      display: block;
      width: 82%;
      height: auto;
      margin: 0 auto 1rem;
    }

    .about-legacy-text {
      font-family: inherit;
      font-size: 0.82rem;
      line-height: 1.25;
      text-align: justify;
    }

    .about-legacy-text ::ng-deep .about-title {
      text-align: center;
      text-decoration: underline;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    .about-legacy-text ::ng-deep a {
      color: var(--p-primary-color);
    }
  `],
})
export class Topbar {
  readonly i18n = inject(TranslationService);
  private readonly fileService = inject(JtvFileService);
  private readonly fileValidator: JtvFileValidatorService = inject(JtvFileValidatorService);
  private readonly legacyImporter = inject(LegacyJtvImporter);
  private readonly loading = inject(LoadingIndicatorService);
  private readonly messageService = inject(MessageService);
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

  readonly machineOptions = this.store.activeChildMachineNames;

  executionFinished = false;
  fileMenuOpen = false;
  settingsMenuOpen = false;
  editMenuOpen = false;
  helpMenuOpen = false;
  parameterAssignmentDialogVisible = false;
  burstSizeDialogVisible = false;
  notationChangeDialogVisible = false;
  aboutDialogVisible = false;

  get selectedSymbol(): string {
    return this.store.selectedSymbol();
  }

  set selectedSymbol(symbol: string) {
    this.store.selectSymbol(symbol);
  }

  get selectedGreekLowercase(): string {
    return this.store.selectedVariable();
  }

  set selectedGreekLowercase(variable: string) {
    this.store.selectVariable(variable);
  }

  get selectedUppercase(): string {
    return this.store.selectedParameter();
  }

  set selectedUppercase(parameter: string) {
    this.store.selectParameter(parameter);
  }

  get insertedParameters(): readonly string[] {
    return this.store.insertedParameters();
  }

  get parameterAssignments(): Readonly<Record<string, string>> {
    return this.store.parameterAssignments();
  }

  get canUndo(): boolean {
    return this.store.canUndo();
  }

  get canRedo(): boolean {
    return this.store.canRedo();
  }

  get hasSelectedCanvasNode(): boolean {
    return this.store.selectedCanvasNodeId() !== null;
  }

  get hasCanvasSelection(): boolean {
    return this.store.hasCanvasSelection();
  }

  get canPasteCanvasElements(): boolean {
    return this.store.canPasteCanvasElements();
  }

  get canMakeSelectedCanvasNodeInitial(): boolean {
    return this.store.canMakeSelectedCanvasNodeInitial();
  }

  get selectedSubmachineName(): string | null {
    return this.store.selectedChildMachineName();
  }

  set selectedSubmachineName(machineName: string | null) {
    this.store.selectChildSubmachineByName(machineName);
  }

  get aboutSplashImageSrc(): string {
    return `assets/images/JTVSplash${this.i18n.currentLang().toUpperCase()}.png`;
  }

  openParameterAssignmentDialog(): void {
    this.parameterAssignmentDialogVisible = true;
  }

  openBurstSizeDialog(): void {
    this.burstSizeDialogVisible = true;
  }

  openNotationChangeDialog(): void {
    this.notationChangeDialogVisible = true;
  }

  saveParameterAssignments(assignments: Record<string, string>): void {
    this.store.assignParameters(assignments);
  }

  undo(): void {
    this.executionFinished = false;
    this.store.undo();
  }

  redo(): void {
    this.executionFinished = false;
    this.store.redo();
  }

  printCanvas(): void {
    window.dispatchEvent(new Event('jtv-print-canvas'));
  }

  importLegacyMachine(): void {
    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.jtv,.xml,text/xml,application/xml';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0] ?? null;

      input.remove();

      if (!file) {
        return;
      }

      try {
        const importedFile = this.legacyImporter.importXml(await file.text());

        this.fileValidator.validate(importedFile);
        this.store.importMachineFile(importedFile);
        this.fileService.clearCurrentFile();
        this.messageService.add({
          key: 'simulation',
          severity: 'success',
          summary: 'JTV',
          detail: this.i18n.translate('toast.legacyMachineImported', { fileName: file.name }),
          sticky: true,
          closable: true,
        });
      } catch {
        this.messageService.add({
          key: 'simulation',
          severity: 'error',
          summary: 'JTV',
          detail: this.i18n.translate('toast.legacyMachineImportError'),
          sticky: true,
          closable: true,
        });
      }
    }, { once: true });
    document.body.appendChild(input);
    input.click();
  }

  makeSelectedCanvasNodeInitial(): void {
    this.store.makeSelectedCanvasNodeInitial();
  }

  changeSelectedCanvasNodeTape(): void {
    this.store.changeSelectedCanvasNodeTape();
  }

  deleteSelectedCanvasElement(): void {
    this.store.deleteSelectedCanvasElement();
  }

  cutSelectedCanvasElements(): void {
    this.store.cutSelectedCanvasElements();
  }

  copySelectedCanvasElements(): void {
    this.store.copySelectedCanvasElements();
  }

  pasteCanvasElements(): void {
    this.store.pasteCanvasElements();
  }

  get menuItems(): MenuItem[] {
    return [];
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
      flagSrc: 'assets/images/flag-us.svg',
      flagAlt: 'Bandera estadounidense',
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

  @HostListener('document:click')
  closeOpenMenus(): void {
    this.fileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleFileMenu(event: Event): void {
    event.stopPropagation();
    this.fileMenuOpen = !this.fileMenuOpen;
    this.settingsMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleSettingsMenu(event: Event): void {
    event.stopPropagation();
    this.settingsMenuOpen = !this.settingsMenuOpen;
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleEditMenu(event: Event): void {
    event.stopPropagation();
    this.editMenuOpen = !this.editMenuOpen;
    this.fileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleHelpMenu(event: Event): void {
    event.stopPropagation();
    this.helpMenuOpen = !this.helpMenuOpen;
    this.fileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.editMenuOpen = false;
  }

  runFileMenuAction(event: Event, action: 'new' | 'open' | 'save' | 'saveAs' | 'import' | 'print'): void {
    event.preventDefault();
    event.stopPropagation();
    this.fileMenuOpen = false;

    if (action === 'new') {
      this.newMachine();
      return;
    }

    if (action === 'open') {
      void this.openMachine();
      return;
    }

    if (action === 'save') {
      void this.saveMachine();
      return;
    }

    if (action === 'saveAs') {
      void this.saveMachineAs();
      return;
    }

    if (action === 'import') {
      this.importLegacyMachine();
      return;
    }

    this.printCanvas();
  }

  runSettingsMenuAction(event: Event, action: 'burstSize' | 'notationChange'): void {
    event.preventDefault();
    event.stopPropagation();
    this.settingsMenuOpen = false;

    if (action === 'burstSize') {
      this.openBurstSizeDialog();
      return;
    }

    this.openNotationChangeDialog();
  }

  runEditMenuAction(
    event: Event,
    action: 'undo' | 'redo' | 'makeInitial' | 'changeTape' | 'cut' | 'copy' | 'paste' | 'delete',
  ): void {
    event.preventDefault();
    event.stopPropagation();
    this.editMenuOpen = false;

    if (action === 'undo') {
      this.undo();
      return;
    }

    if (action === 'redo') {
      this.redo();
      return;
    }

    if (action === 'makeInitial') {
      if (!this.hasSelectedCanvasNode) {
        return;
      }

      this.makeSelectedCanvasNodeInitial();
      return;
    }

    if (action === 'changeTape') {
      if (!this.hasSelectedCanvasNode) {
        return;
      }

      this.changeSelectedCanvasNodeTape();
      return;
    }

    if (action === 'cut') {
      this.cutSelectedCanvasElements();
      return;
    }

    if (action === 'copy') {
      this.copySelectedCanvasElements();
      return;
    }

    if (action === 'paste') {
      this.pasteCanvasElements();
      return;
    }

    if (!this.hasCanvasSelection) {
      return;
    }

    this.deleteSelectedCanvasElement();
  }

  runHelpMenuAction(event: Event, action: 'contents' | 'about'): void {
    event.preventDefault();
    event.stopPropagation();
    this.helpMenuOpen = false;

    if (action === 'contents') {
      window.open(environment.jtvSite, '_blank', 'noopener');
      return;
    }

    if (action === 'about') {
      this.aboutDialogVisible = true;
    }
  }

  newMachine(): void {
    this.executionFinished = false;
    this.fileService.clearCurrentFile();
    this.store.createNewMachine();
    this.messageService.add({
      key: 'simulation',
      severity: 'info',
      summary: 'JTV',
      detail: this.i18n.translate('toast.machineNew'),
      sticky: true,
      closable: true,
    });
  }

  async openMachine(): Promise<void> {
    try {
      const opened = await this.fileService.open();

      if (!opened) {
        return;
      }

      this.executionFinished = false;
      this.store.importMachineFile(opened.file);
      this.messageService.add({
        key: 'simulation',
        severity: 'success',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineOpened', { fileName: opened.fileName }),
        sticky: true,
        closable: true,
      });
    } catch {
      this.showPersistenceError('toast.machineOpenError');
    }
  }

  async saveMachine(): Promise<void> {
    try {
      const fileName = this.getSuggestedMachineFileName();
      const saved = await this.fileService.save(this.store.exportMachineFile(), fileName);

      this.store.renameRootMachine(saved.machineName);
      this.store.clearDesignMachineDirtyFlags();
      this.messageService.add({
        key: 'simulation',
        severity: 'success',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineSaved', { fileName: saved.fileName }),
        sticky: true,
        closable: true,
      });
    } catch {
      this.showPersistenceError('toast.machineSaveError');
    }
  }

  async saveMachineAs(): Promise<void> {
    try {
      const fileName = this.getSuggestedMachineFileName();

      const saved = await this.fileService.saveAs(this.store.exportMachineFile(), fileName);

      this.store.renameRootMachine(saved.machineName);
      this.store.clearDesignMachineDirtyFlags();
      this.messageService.add({
        key: 'simulation',
        severity: 'success',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineSaved', { fileName: saved.fileName }),
        sticky: true,
        closable: true,
      });
    } catch {
      this.showPersistenceError('toast.machineSaveError');
    }
  }

  async exportMachineJson(): Promise<void> {
    try {
      const fileName = this.getSuggestedMachineFileName();

      await this.fileService.exportJson(this.store.exportMachineFile(), fileName);
      this.messageService.add({
        key: 'simulation',
        severity: 'success',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineExported', { fileName }),
        sticky: true,
        closable: true,
      });
    } catch {
      this.showPersistenceError('toast.machineSaveError');
    }
  }

  private getSuggestedMachineFileName(): string {
    const machineName = this.store.getRootMachineName() || 'jtv-machine';
    const normalizedName = machineName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return `${normalizedName || 'jtv-machine'}.jtv.json`;
  }

  private showPersistenceError(messageKey: string): void {
    this.messageService.add({
      key: 'simulation',
      severity: 'error',
      summary: 'JTV',
      detail: this.i18n.translate(messageKey),
      sticky: true,
      closable: true,
    });
  }

  async executeMachine(): Promise<void> {
    const hasUnassignedParameters = this.insertedParameters.some((parameter) => !this.parameterAssignments[parameter]);

    if (hasUnassignedParameters) {
      this.messageService.add({
        key: 'simulation',
        severity: 'warn',
        summary: 'JTV',
        detail: this.i18n.translate('toast.unassignedParameters'),
        sticky: true,
        closable: true,
      });
      return;
    }

    await this.loading.run(
      () => this.store.runMachineOnFirstTape(),
      this.i18n.translate('loading.executing'),
    );
    this.executionFinished = true;
    this.messageService.add({
      key: 'simulation',
      severity: 'info',
      summary: 'JTV',
      detail: this.i18n.translate('toast.simulationStarted'),
      sticky: true,
      closable: true,
    });
  }

  stopSimulation(): void {
    this.store.clearAte();
    this.executionFinished = false;
    this.messageService.add({
      key: 'simulation',
      severity: 'info',
      summary: 'JTV',
      detail: this.i18n.translate('toast.simulationStopped'),
      sticky: true,
      closable: true,
    });
  }
}
