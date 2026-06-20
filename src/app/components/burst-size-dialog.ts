import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';

import { TranslatePipe } from '../pipes/translate.pipe';
import { JtvSettingsService } from '../services/jtv-settings.service';

const MIN_BURST_SIZE = 5;
const MAX_BURST_SIZE = 1000;

@Component({
  selector: 'app-burst-size-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputNumberModule, TranslatePipe],
  template: `
    <p-dialog
      [header]="'burstSizeDialog.title' | translate"
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
      <form class="burst-size-form" [formGroup]="form" (ngSubmit)="accept()">
        <label class="burst-size-row" for="burstSizeInput">
          <span>{{ 'burstSizeDialog.burstSize' | translate }}</span>
          <p-inputnumber
            inputId="burstSizeInput"
            formControlName="burstSize"
            [min]="minBurstSize"
            [max]="maxBurstSize"
            [useGrouping]="false"
            [showButtons]="false"
            size="small"
            class="burst-size-input"
          />
        </label>

        @if (burstSizeControl.invalid && (burstSizeControl.dirty || burstSizeControl.touched)) {
          <div class="validation-message">
            {{ 'burstSizeDialog.validation.range' | translate }}
          </div>
        }

        <div class="dialog-actions">
          <button pButton type="submit" label="OK" [disabled]="form.invalid"></button>
          <button pButton type="button" [label]="'burstSizeDialog.cancel' | translate" severity="secondary" (click)="cancel()"></button>
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .burst-size-form {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding-top: 0.125rem;
    }

    .burst-size-row {
      display: grid;
      grid-template-columns: max-content 1fr;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    :host ::ng-deep .burst-size-input,
    :host ::ng-deep .burst-size-input .p-inputnumber,
    :host ::ng-deep .burst-size-input .p-inputtext {
      width: 5.5rem;
    }

    .validation-message {
      color: var(--p-red-600, #dc2626);
      font-size: 0.75rem;
      line-height: 1.2;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
  `],
})
export class BurstSizeDialog {
  private readonly settingsService = inject(JtvSettingsService);

  @Input() visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();

  readonly minBurstSize = MIN_BURST_SIZE;
  readonly maxBurstSize = MAX_BURST_SIZE;
  readonly form = new FormGroup({
    burstSize: new FormControl(300, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(MIN_BURST_SIZE),
        Validators.max(MAX_BURST_SIZE),
      ],
    }),
  });

  get burstSizeControl(): FormControl<number> {
    return this.form.controls.burstSize;
  }

  resetForm(): void {
    this.form.reset({
      burstSize: this.settingsService.getSettings().burstSize,
    });
  }

  accept(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.settingsService.saveBurstSize(this.burstSizeControl.value);
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
