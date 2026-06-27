import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';

import { TranslatePipe } from '../pipes/translate.pipe';
import { JtvSettingsService } from '../services/jtv-settings.service';

@Component({
  selector: 'app-notation-change-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, RadioButtonModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'notationChangeDialog.title' | translate"
      [visible]="visible"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '18rem' }"
      (visibleChange)="onVisibleChange($event)"
      (onHide)="close()"
      (onShow)="resetForm()"
    >
      <form class="notation-change-form" [formGroup]="form" (ngSubmit)="accept()">
        <div class="notation-options" role="radiogroup" [attr.aria-label]="'notationChangeDialog.title' | translate">
          <label class="notation-option" for="oldNotationOption">
            <p-radiobutton inputId="oldNotationOption" formControlName="oldNotation" [value]="true" />
            <span>{{ 'notationChangeDialog.old' | translate }}</span>
          </label>

          <label class="notation-option" for="newNotationOption">
            <p-radiobutton inputId="newNotationOption" formControlName="oldNotation" [value]="false" />
            <span>{{ 'notationChangeDialog.new' | translate }}</span>
          </label>
        </div>

        <div class="dialog-actions">
          <button pButton type="submit" label="OK"></button>
          <button pButton type="button" [label]="'notationChangeDialog.cancel' | translate" severity="secondary" (click)="cancel()"></button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .notation-change-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 0.125rem;
    }

    .notation-options {
      display: flex;
      flex-direction: row;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .notation-option {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
  `],
})
export class NotationChangeDialog {
  private readonly settingsService = inject(JtvSettingsService);

  @Input() visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();

  readonly form = new FormGroup({
    oldNotation: new FormControl(false, { nonNullable: true }),
  });

  get oldNotationControl(): FormControl<boolean> {
    return this.form.controls.oldNotation;
  }

  resetForm(): void {
    this.form.reset({
      oldNotation: this.settingsService.getSettings().oldNotation,
    });
  }

  accept(): void {
    this.settingsService.saveOldNotation(this.oldNotationControl.value);
    this.close();
  }

  cancel(): void {
    this.close();
  }

  onVisibleChange(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  close(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.visibleChange.emit(false);
  }
}
