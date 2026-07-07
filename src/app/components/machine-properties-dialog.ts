import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { TranslatePipe } from '../pipes/translate.pipe';

export interface MachinePropertiesDialogValue {
  readonly name: string;
  readonly shortName: string;
  readonly description: string;
}

const MACHINE_NAME_PATTERN = /^[A-Za-z0-9_]+$/;

@Component({
  selector: 'app-machine-properties-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'machinePropertiesDialog.title' | translate"
      [visible]="visible"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '19rem' }"
      (visibleChange)="onVisibleChange($event)"
      (onHide)="close()"
      (onShow)="resetForm()"
    >
      <form class="machine-properties-form" [formGroup]="form" (ngSubmit)="accept()">
        <label class="field-row" for="machineNameInput">
          <span>{{ 'machinePropertiesDialog.name' | translate }}</span>
          <input
            pInputText
            id="machineNameInput"
            type="text"
            formControlName="name"
            maxlength="15"
            autocomplete="off"
          />
        </label>

        <label class="field-row short-name-row" for="machineShortNameInput">
          <span>{{ 'machinePropertiesDialog.shortName' | translate }}</span>
          <input
            pInputText
            id="machineShortNameInput"
            type="text"
            formControlName="shortName"
            maxlength="4"
            autocomplete="off"
          />
        </label>

        <fieldset class="description-panel">
          <legend>{{ 'machinePropertiesDialog.description' | translate }}</legend>
          <textarea
            id="machineDescriptionInput"
            formControlName="description"
            maxlength="100"
            rows="5"
          ></textarea>
        </fieldset>

        <div class="dialog-actions">
          <button pButton type="submit" [label]="'machinePropertiesDialog.accept' | translate" [disabled]="form.invalid"></button>
          <button
            pButton
            type="button"
            [label]="'machinePropertiesDialog.cancel' | translate"
            severity="secondary"
            (click)="cancel()"
          ></button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .machine-properties-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding-top: 0.25rem;
    }

    .field-row {
      display: grid;
      grid-template-columns: 6.25rem 1fr;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .short-name-row {
      grid-template-columns: 6.25rem 3rem;
    }

    .field-row span {
      white-space: nowrap;
    }

    .field-row input {
      width: 100%;
      height: 1.5rem;
      padding: 0.125rem 0.25rem;
      font-size: 0.8125rem;
    }

    .description-panel {
      min-width: 0;
      margin: 0.375rem 0 0;
      padding: 0.25rem 0.25rem 0.375rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 0;
    }

    .description-panel legend {
      padding: 0 0.125rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .description-panel textarea {
      width: 100%;
      min-height: 5.5rem;
      resize: none;
      border: 0;
      outline: none;
      background: var(--p-inputtext-background);
      color: var(--p-inputtext-color);
      font: inherit;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.125rem;
    }
  `],
})
export class MachinePropertiesDialog {
  @Input() visible = false;
  @Input() properties: MachinePropertiesDialogValue | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() acceptProperties = new EventEmitter<MachinePropertiesDialogValue>();

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(15),
        Validators.pattern(MACHINE_NAME_PATTERN),
      ],
    }),
    shortName: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(4),
        Validators.pattern(MACHINE_NAME_PATTERN),
      ],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
  });

  resetForm(): void {
    const properties = this.properties ?? {
      name: '',
      shortName: '',
      description: '',
    };

    this.form.reset({
      name: properties.name,
      shortName: properties.shortName,
      description: properties.description,
    });
  }

  accept(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();

    this.acceptProperties.emit({
      name: value.name.trim(),
      shortName: value.shortName.trim(),
      description: value.description.trim(),
    });
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
