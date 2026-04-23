import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-topbar',
  imports: [ToolbarModule, ButtonModule],
  template: `
    <p-toolbar styleClass="jtv-topbar">
      <ng-template #start>
        <div class="brand">
          <span class="brand-title">JTV 2.0</span>
          <span class="brand-subtitle">Java Turing Visual - Web MVP</span>
        </div>
      </ng-template>

      <ng-template #center>
        <div class="toolbar-actions">
          <p-button label="Nueva" icon="pi pi-file" severity="secondary" />
          <p-button label="Guardar" icon="pi pi-save" severity="secondary" />
          <p-button label="Importar" icon="pi pi-upload" severity="secondary" />
          <p-button label="Exportar" icon="pi pi-download" severity="secondary" />
          <p-button label="Validar" icon="pi pi-check-circle" severity="info" />
          <p-button label="Ejecutar" icon="pi pi-play" severity="success" />
          <p-button label="Reset" icon="pi pi-refresh" severity="contrast" />
        </div>
      </ng-template>

      <ng-template #end>
        <span class="machine-name">Máquina: NUEVA</span>
      </ng-template>
    </p-toolbar>
  `,
  styles: [`
    :host {
      display: block;
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

    .machine-name {
      font-size: 0.9rem;
      color: var(--p-text-muted-color);
    }
  `],
})
export class Topbar {}
