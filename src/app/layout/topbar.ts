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
import { RecentMachine, RecentMachinesService } from '../services/recent-machines.service';
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
              [disabled]="executionLocked"
              (click)="toggleFileMenu($event)"
            >
              <span class="pi pi-file"></span>
              <span>{{ 'topbar.menu.file' | translate }}</span>
            </button>

            @if (fileMenuOpen) {
              <div class="file-menu-panel file-menu-file-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'new')">
                  <img class="file-menu-icon" src="assets/images/New16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.new' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+N</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'open')">
                  <img class="file-menu-icon" src="assets/images/Open16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.open' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+O</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'save')">
                  <img class="file-menu-icon" src="assets/images/Save16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.save' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+S</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'saveAs')">
                  <img class="file-menu-icon" src="assets/images/SaveAs16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.saveAs' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+Shift+S</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'import')">
                  <img class="file-menu-icon" src="assets/images/Import16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.import' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+I</span>
                </button>
                <div class="file-menu-recent-group">
                  <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || recentMachines().length === 0">
                    <img class="file-menu-icon" src="assets/images/Recent16.gif" alt="" />
                    <span>{{ 'topbar.menu.file.recentMachines' | translate }}</span>
                    <span class="file-menu-submenu-arrow">›</span>
                  </button>
                  @if (recentMachines().length > 0) {
                    <div class="file-menu-panel file-menu-recent-list" role="menu">
                      @for (machine of recentMachines(); track machine.id) {
                        <button
                          type="button"
                          role="menuitem"
                          class="file-menu-item file-menu-recent-item"
                          [title]="machine.fileName"
                          [disabled]="executionLocked"
                          (click)="openRecentMachine($event, machine)"
                        >
                          <img class="file-menu-icon" src="assets/images/Gear.gif" alt="" />
                          <span class="file-menu-recent-name">{{ machine.machineName || machine.fileName }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runFileMenuAction($event, 'print')">
                  <img class="file-menu-icon" src="assets/images/Print16.gif" alt="" />
                  <span>{{ 'topbar.menu.file.print' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+P</span>
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
              [disabled]="executionLocked"
              (click)="toggleSettingsMenu($event)"
            >
              <span class="pi pi-cog"></span>
              <span>{{ 'topbar.menu.settings' | translate }}</span>
            </button>

            @if (settingsMenuOpen) {
              <div class="file-menu-panel settings-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runSettingsMenuAction($event, 'burstSize')">
                  <span class="pi pi-bolt"></span>
                  <span>{{ 'topbar.menu.settings.burstSize' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+B</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runSettingsMenuAction($event, 'notationChange')">
                  <img class="file-menu-icon" src="assets/images/NotationChange16.gif" alt="" />
                  <span>{{ 'topbar.menu.settings.notationChange' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+Shift+N</span>
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
              [disabled]="executionLocked"
              (click)="toggleEditMenu($event)"
            >
              <span class="pi pi-pencil"></span>
              <span>{{ 'topbar.menu.edit' | translate }}</span>
            </button>

            @if (editMenuOpen) {
              <div class="file-menu-panel edit-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !canUndo" (click)="runEditMenuAction($event, 'undo')">
                  <img class="file-menu-icon" src="assets/images/Undo16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.undo' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+Z</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !canRedo" (click)="runEditMenuAction($event, 'redo')">
                  <img class="file-menu-icon" src="assets/images/Redo16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.redo' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+Y</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !canMakeSelectedCanvasNodeInitial" (click)="runEditMenuAction($event, 'makeInitial')">
                  <img class="file-menu-icon" src="assets/images/Start16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.makeInitial' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+M</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !hasSelectedCanvasNode" (click)="runEditMenuAction($event, 'changeTape')">
                  <img class="file-menu-icon" src="assets/images/ChangeTape16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.changeTape' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+T</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !hasCanvasSelection" (click)="runEditMenuAction($event, 'cut')">
                  <img class="file-menu-icon" src="assets/images/Cut16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.cut' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+X</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !hasCanvasSelection" (click)="runEditMenuAction($event, 'copy')">
                  <img class="file-menu-icon" src="assets/images/Copy16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.copy' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+C</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !canPasteCanvasElements" (click)="runEditMenuAction($event, 'paste')">
                  <img class="file-menu-icon" src="assets/images/Paste16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.paste' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+V</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked || !hasCanvasSelection" (click)="runEditMenuAction($event, 'delete')">
                  <img class="file-menu-icon" src="assets/images/Delete16.gif" alt="" />
                  <span>{{ 'topbar.menu.edit.delete' | translate }}</span>
                  <span class="menu-shortcut">Delete</span>
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
              [disabled]="executionLocked"
              (click)="toggleHelpMenu($event)"
            >
              <span class="pi pi-question-circle"></span>
              <span>{{ 'topbar.menu.help' | translate }}</span>
            </button>

            @if (helpMenuOpen) {
              <div class="file-menu-panel help-menu-panel" role="menu" (click)="$event.stopPropagation()">
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runHelpMenuAction($event, 'contents')">
                  <span class="pi pi-book"></span>
                  <span>{{ 'topbar.menu.help.contents' | translate }}</span>
                  <span class="menu-shortcut">F1</span>
                </button>
                <button type="button" role="menuitem" class="file-menu-item" [disabled]="executionLocked" (click)="runHelpMenuAction($event, 'about')">
                  <img class="file-menu-icon" src="assets/images/Info16.gif" alt="" />
                  <span>{{ 'topbar.menu.help.about' | translate }}</span>
                  <span class="menu-shortcut">Ctrl+F1</span>
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
                [disabled]="executionLocked"
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

            <img class="menubar-logo" src="assets/images/JTVLogo.png" alt="Java Turing Visual" />
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
              [disabled]="executionLocked"
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
              [disabled]="executionLocked"
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
              [disabled]="executionLocked"
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
              [disabled]="executionLocked"
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
              [disabled]="executionLocked"
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
              [disabled]="executionLocked || !canUndo"
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
              [disabled]="executionLocked || !canRedo"
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
              [disabled]="executionLocked || !hasCanvasSelection"
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
              [disabled]="executionLocked || !hasCanvasSelection"
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
              [disabled]="executionLocked || !canPasteCanvasElements"
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
              [disabled]="executionLocked || !hasCanvasSelection"
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
              [disabled]="executionLocked"
              severity="secondary"
              (onClick)="openParameterAssignmentDialog()"
            />
            <button
              pButton
              type="button"
              class="image-toolbar-button p-button-secondary"
              [attr.aria-label]="'topbar.execute' | translate"
              [title]="'topbar.execute' | translate"
              [disabled]="executionLocked"
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
              [disabled]="!canStopExecution"
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
              [disabled]="executionLocked"
              ariaLabel="Símbolo"
            />
            <p-select
              [options]="greekLowercaseOptions"
              [(ngModel)]="selectedGreekLowercase"
              size="small"
              class="toolbar-select symbol-select"
              panelStyleClass="symbol-select-panel"
              [disabled]="executionLocked"
              ariaLabel="Letra griega"
            />
            <p-select
              [options]="uppercaseOptions"
              [(ngModel)]="selectedUppercase"
              size="small"
              class="toolbar-select symbol-select"
              panelStyleClass="symbol-select-panel"
              [disabled]="executionLocked"
              ariaLabel="Letra mayúscula"
            />
            <p-select
              [options]="machineOptions()"
              [(ngModel)]="selectedSubmachineName"
              size="small"
              class="toolbar-select machine-select"
              [disabled]="executionLocked"
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
        <div class="about-dialog-body">
          <img [src]="aboutSplashImageSrc" alt="Java Turing Visual" class="about-splash-image" />
          <div class="about-legacy-text" [innerHTML]="'aboutDialog.legacyText' | translate"></div>
        </div>
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

    .file-menu-file-panel {
      min-width: 23rem;
    }

    .edit-menu-panel {
      min-width: 21rem;
    }

    .settings-menu-panel {
      min-width: 20rem;
    }

    .help-menu-panel {
      min-width: 17rem;
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

    .file-menu-item > span:not(.menu-shortcut):not(.pi) {
      flex: 1 1 auto;
    }

    .menu-shortcut {
      flex: 0 0 auto;
      margin-left: 1rem;
      color: var(--p-text-muted-color);
      font-size: 0.75rem;
      white-space: nowrap;
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

    .file-menu-recent-group {
      position: relative;
    }

    .file-menu-recent-list {
      position: absolute;
      top: 0;
      left: calc(100% - 0.125rem);
      z-index: 1002;
      display: flex;
      flex-direction: column;
      min-width: 15rem;
      padding: 0.25rem;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }

    .file-menu-recent-group:hover .file-menu-recent-list,
    .file-menu-recent-group:focus-within .file-menu-recent-list {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }

    .file-menu-recent-item {
      max-width: 14rem;
      padding-block: 0.25rem;
    }

    .file-menu-submenu-arrow {
      margin-left: auto;
      font-size: 1rem;
      line-height: 1;
    }

    .file-menu-recent-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-menu-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      image-rendering: pixelated;
      flex: 0 0 auto;
    }

    .file-menu-item > .pi {
      width: 16px;
      flex: 0 0 16px;
      text-align: center;
      font-size: 0.875rem;
      line-height: 1;
    }

    .jtv-topbar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      border-top: 0;
    }

    .menubar-end {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .menubar-logo {
      display: block;
      width: auto;
      height: 2.25rem;
      object-fit: contain;
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
      width: 12rem;
    }

    :host ::ng-deep .about-dialog {
      width: min(94vw, 980px);
    }

    :host ::ng-deep .about-dialog .p-dialog-content {
      max-height: min(82vh, 760px);
      padding: 0 1rem 1rem;
      overflow: auto;
    }

    .about-dialog-body {
      display: grid;
      grid-template-columns: minmax(360px, 1.25fr) minmax(280px, 0.75fr);
      align-items: start;
      gap: 1rem;
    }

    .about-splash-image {
      display: block;
      width: 100%;
      height: auto;
      margin: 0;
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

    @media (max-width: 760px) {
      .about-dialog-body {
        grid-template-columns: 1fr;
      }

      .about-splash-image {
        width: min(100%, 560px);
        margin: 0 auto;
      }
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
  private readonly recentMachinesService = inject(RecentMachinesService);
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
  readonly recentMachines = this.recentMachinesService.recentMachines;

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
    if (this.executionLocked) {
      return;
    }

    this.store.selectSymbol(symbol);
  }

  get selectedGreekLowercase(): string {
    return this.store.selectedVariable();
  }

  set selectedGreekLowercase(variable: string) {
    if (this.executionLocked) {
      return;
    }

    this.store.selectVariable(variable);
  }

  get selectedUppercase(): string {
    return this.store.selectedParameter();
  }

  set selectedUppercase(parameter: string) {
    if (this.executionLocked) {
      return;
    }

    this.store.selectParameter(parameter);
  }

  get insertedParameters(): readonly string[] {
    return this.store.insertedParameters();
  }

  get parameterAssignments(): Readonly<Record<string, string>> {
    return this.store.parameterAssignments();
  }

  get executionBusy(): boolean {
    return this.loading.visible();
  }

  get executionLocked(): boolean {
    return this.executionBusy || this.executionFinished;
  }

  get canStopExecution(): boolean {
    return this.executionFinished;
  }

  get canUndo(): boolean {
    return !this.executionLocked && this.store.canUndo();
  }

  get canRedo(): boolean {
    return !this.executionLocked && this.store.canRedo();
  }

  get hasSelectedCanvasNode(): boolean {
    return !this.executionLocked && this.store.selectedCanvasNodeId() !== null;
  }

  get hasCanvasSelection(): boolean {
    return !this.executionLocked && this.store.hasCanvasSelection();
  }

  get canPasteCanvasElements(): boolean {
    return !this.executionLocked && this.store.canPasteCanvasElements();
  }

  get canMakeSelectedCanvasNodeInitial(): boolean {
    return !this.executionLocked && this.store.canMakeSelectedCanvasNodeInitial();
  }

  get selectedSubmachineName(): string | null {
    return this.store.selectedChildMachineName();
  }

  set selectedSubmachineName(machineName: string | null) {
    if (this.executionLocked) {
      return;
    }

    this.store.selectChildSubmachineByName(machineName);
  }

  get aboutSplashImageSrc(): string {
    return `assets/images/JTVSplash${this.i18n.currentLang().toUpperCase()}.png`;
  }

  openParameterAssignmentDialog(): void {
    if (this.executionLocked) {
      return;
    }

    this.parameterAssignmentDialogVisible = true;
  }

  openBurstSizeDialog(): void {
    if (this.executionLocked) {
      return;
    }

    this.burstSizeDialogVisible = true;
  }

  openNotationChangeDialog(): void {
    if (this.executionLocked) {
      return;
    }

    this.notationChangeDialogVisible = true;
  }

  saveParameterAssignments(assignments: Record<string, string>): void {
    if (this.executionLocked) {
      return;
    }

    this.store.assignParameters(assignments);
  }

  undo(): void {
    if (this.executionLocked) {
      return;
    }

    this.executionFinished = false;
    this.store.undo();
  }

  redo(): void {
    if (this.executionLocked) {
      return;
    }

    this.executionFinished = false;
    this.store.redo();
  }

  printCanvas(): void {
    if (this.executionLocked) {
      return;
    }

    window.dispatchEvent(new Event('jtv-print-canvas'));
  }

  importLegacyMachine(): void {
    if (this.executionLocked) {
      return;
    }

    const input = document.createElement('input');

    input.type = 'file';
    input.accept = '.jtv,.xml,text/xml,application/xml';
    input.style.display = 'none';
    input.addEventListener('change', async () => {
      const file = input.files?.[0] ?? null;

      input.remove();

      if (this.executionLocked) {
        return;
      }

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
    if (this.executionLocked) {
      return;
    }

    this.store.makeSelectedCanvasNodeInitial();
  }

  changeSelectedCanvasNodeTape(): void {
    if (this.executionLocked) {
      return;
    }

    this.store.changeSelectedCanvasNodeTape();
  }

  deleteSelectedCanvasElement(): void {
    if (this.executionLocked) {
      return;
    }

    this.store.deleteSelectedCanvasElement();
  }

  cutSelectedCanvasElements(): void {
    if (this.executionLocked) {
      return;
    }

    this.store.cutSelectedCanvasElements();
  }

  copySelectedCanvasElements(): void {
    if (this.executionLocked) {
      return;
    }

    this.store.copySelectedCanvasElements();
  }

  pasteCanvasElements(): void {
    if (this.executionLocked) {
      return;
    }

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
    if (this.executionLocked) {
      return;
    }

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

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (this.isEditableTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    const hasPrimaryModifier = event.ctrlKey || event.metaKey;

    if (key === 'delete' && !hasPrimaryModifier && !event.altKey && !event.shiftKey) {
      event.preventDefault();

      if (!this.executionLocked) {
        this.deleteSelectedCanvasElement();
      }

      return;
    }

    if (key === 'f1') {
      event.preventDefault();

      if (hasPrimaryModifier) {
        this.openAboutDialogFromShortcut();
        return;
      }

      this.openHelpContentsFromShortcut();
      return;
    }

    if (this.executionLocked || event.altKey || !hasPrimaryModifier) {
      return;
    }

    if (event.shiftKey) {
      this.handleShiftKeyboardShortcut(event, key);
      return;
    }

    this.handlePrimaryKeyboardShortcut(event, key);
  }

  toggleFileMenu(event: Event): void {
    event.stopPropagation();

    if (this.executionLocked) {
      this.closeOpenMenus();
      return;
    }

    this.fileMenuOpen = !this.fileMenuOpen;
    this.settingsMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleSettingsMenu(event: Event): void {
    event.stopPropagation();

    if (this.executionLocked) {
      this.closeOpenMenus();
      return;
    }

    this.settingsMenuOpen = !this.settingsMenuOpen;
    this.fileMenuOpen = false;
    this.editMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleEditMenu(event: Event): void {
    event.stopPropagation();

    if (this.executionLocked) {
      this.closeOpenMenus();
      return;
    }

    this.editMenuOpen = !this.editMenuOpen;
    this.fileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.helpMenuOpen = false;
  }

  toggleHelpMenu(event: Event): void {
    event.stopPropagation();

    if (this.executionLocked) {
      this.closeOpenMenus();
      return;
    }

    this.helpMenuOpen = !this.helpMenuOpen;
    this.fileMenuOpen = false;
    this.settingsMenuOpen = false;
    this.editMenuOpen = false;
  }

  runFileMenuAction(event: Event, action: 'new' | 'open' | 'save' | 'saveAs' | 'import' | 'print'): void {
    event.preventDefault();
    event.stopPropagation();
    this.fileMenuOpen = false;

    if (this.executionLocked) {
      return;
    }

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

    if (this.executionLocked) {
      return;
    }

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

    if (this.executionLocked) {
      return;
    }

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

    if (this.executionLocked) {
      return;
    }

    if (action === 'contents') {
      this.openHelpContents();
      return;
    }

    if (action === 'about') {
      this.aboutDialogVisible = true;
    }
  }

  private handlePrimaryKeyboardShortcut(event: KeyboardEvent, key: string): void {
    if (key === 'n') {
      event.preventDefault();
      this.newMachine();
      return;
    }

    if (key === 'o') {
      event.preventDefault();
      void this.openMachine();
      return;
    }

    if (key === 's') {
      event.preventDefault();
      void this.saveMachine();
      return;
    }

    if (key === 'i') {
      event.preventDefault();
      this.importLegacyMachine();
      return;
    }

    if (key === 'p') {
      event.preventDefault();
      this.printCanvas();
      return;
    }

    if (key === 'z') {
      event.preventDefault();
      this.undo();
      return;
    }

    if (key === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }

    if (key === 'm') {
      event.preventDefault();
      this.makeSelectedCanvasNodeInitial();
      return;
    }

    if (key === 't') {
      event.preventDefault();
      this.changeSelectedCanvasNodeTape();
      return;
    }

    if (key === 'x') {
      event.preventDefault();
      this.cutSelectedCanvasElements();
      return;
    }

    if (key === 'c') {
      event.preventDefault();
      this.copySelectedCanvasElements();
      return;
    }

    if (key === 'v') {
      event.preventDefault();
      this.pasteCanvasElements();
      return;
    }

    if (key === 'b') {
      event.preventDefault();
      this.openBurstSizeDialog();
    }
  }

  private handleShiftKeyboardShortcut(event: KeyboardEvent, key: string): void {
    if (key === 's') {
      event.preventDefault();
      void this.saveMachineAs();
      return;
    }

    if (key === 'n') {
      event.preventDefault();
      this.openNotationChangeDialog();
      return;
    }

    if (key === 'z') {
      event.preventDefault();
      this.redo();
    }
  }

  private openHelpContentsFromShortcut(): void {
    if (this.executionLocked) {
      return;
    }

    this.openHelpContents();
  }

  private openAboutDialogFromShortcut(): void {
    if (this.executionLocked) {
      return;
    }

    this.aboutDialogVisible = true;
  }

  private openHelpContents(): void {
    window.open(environment.jtvSite, '_blank', 'noopener');
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    const element = target instanceof HTMLElement ? target : null;

    return !!element?.closest('input, textarea, select, [contenteditable="true"], .p-dialog');
  }

  newMachine(): void {
    if (this.executionLocked) {
      return;
    }

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
    if (this.executionLocked) {
      return;
    }

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

  async openRecentMachine(event: Event, machine: RecentMachine): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.fileMenuOpen = false;

    if (this.executionLocked) {
      return;
    }

    try {
      const handle = await this.recentMachinesService.getHandle(machine);

      if (!handle) {
        this.messageService.add({
          key: 'simulation',
          severity: 'warn',
          summary: 'JTV',
          detail: this.i18n.translate('toast.recentMachineNeedsPicker'),
          sticky: true,
          closable: true,
        });
        await this.openMachine();
        return;
      }

      const opened = await this.fileService.openHandle(handle);

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
    if (this.executionLocked) {
      return;
    }

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
    if (this.executionLocked) {
      return;
    }

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
    if (this.executionLocked) {
      return;
    }

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
    if (this.executionLocked) {
      return;
    }

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
