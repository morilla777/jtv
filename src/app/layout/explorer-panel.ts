import { Component } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-explorer-panel',
  imports: [TabsModule, TreeModule, TranslatePipe],
  template: `
    <div class="panel">
      <div class="panel-body">
        <p-tabs value="ate" class="explorer-tabs" [style]="tabsStyle">
          <p-tablist>
            <p-tab value="ate">ATE</p-tab>
            <p-tab value="machines">{{ 'explorer.machines' | translate }}</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel value="ate">
              <p-tree
                [value]="exampleNodes"
                selectionMode="single"
                [(selection)]="selectedExampleNode"
                [style]="treeStyle"
                [indentation]="0.25"
              >
                <ng-template pTemplate="default" let-node>
                  <span class="ate-tree-node">
                    <img class="ate-tree-icon" [src]="node.data.iconSrc" [alt]="node.label" />
                    <span>{{ node.label }}</span>
                  </span>
                </ng-template>
              </p-tree>
            </p-tabpanel>

            <p-tabpanel value="machines">
              <p-tree
                [value]="machineNodes"
                selectionMode="single"
                [(selection)]="selectedMachineNode"
                [style]="treeStyle"
                [indentation]="0.25"
              />
            </p-tabpanel>

          </p-tabpanels>
        </p-tabs>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--p-surface-card);
    }

    .panel-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 2px;
    }

    :host ::ng-deep .p-tabpanels {
      padding: 2px 0 0 !important;
    }

    :host ::ng-deep .explorer-tabs,
    :host ::ng-deep p-tabs.explorer-tabs {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    :host ::ng-deep .explorer-tabs .p-tablist {
      flex: 0 0 auto;
      display: flex;
    }

    :host ::ng-deep .explorer-tabs .p-tabpanels {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }

    :host ::ng-deep .explorer-tabs .p-tabpanels,
    :host ::ng-deep .explorer-tabs .p-tabpanel,
    :host ::ng-deep .explorer-tabs .p-tabs-panel {
      margin: 0;
      min-height: 0;
    }

    :host ::ng-deep .explorer-tabs .p-tabpanels,
    :host ::ng-deep .explorer-tabs .p-tabpanel,
    :host ::ng-deep .explorer-tabs .p-tabs-panel {
      padding: 2px 0 0 !important;
    }

    :host ::ng-deep .explorer-tabs .p-tabpanel,
    :host ::ng-deep .explorer-tabs .p-tabs-panel {
      height: 100%;
      overflow: hidden;
    }

    :host ::ng-deep .p-tablist-tab-list {
      gap: 0;
    }

    :host ::ng-deep .p-tree {
      font-size: 0.8125rem;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      height: 100%;
      overflow: hidden;
    }

    :host ::ng-deep .p-tree-root {
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
    }

    :host ::ng-deep .p-tree-root-children {
      margin: 0;
      padding: 0 !important;
      gap: 1px !important;
    }

    :host ::ng-deep .p-tree-node-children {
      margin: 0;
      padding-block-start: 0 !important;
      padding-inline-start: 0.25rem !important;
      gap: 1px !important;
    }

    :host ::ng-deep .p-tree-node-content {
      padding: 0 0.25rem !important;
      min-height: 0 !important;
    }

    :host ::ng-deep .p-tree-node-label {
      line-height: 1;
    }

    :host ::ng-deep .p-tree-node-toggle-button {
      width: 0.875rem !important;
      height: 0.875rem !important;
    }

    :host ::ng-deep .p-tree-node-children {
      padding-block: 0;
    }

    .ate-tree-node {
      display: inline-flex;
      align-items: center;
      gap: 0.1875rem;
      min-width: 0;
      line-height: 1;
    }

    .ate-tree-icon {
      object-fit: contain;
      flex: 0 0 auto;
    }
  `],
})
export class ExplorerPanel {
  private readonly ateIconFiles = [
    '#_ATE.gif',
    '0_ATE.gif',
    '1_ATE.gif',
    '2_ATE.gif',
    '3_ATE.gif',
    '4_ATE.gif',
    '5_ATE.gif',
    '6_ATE.gif',
    '7_ATE.gif',
    '8_ATE.gif',
    '9_ATE.gif',
    'a_ATE.gif',
    'b_ATE.gif',
    'c_ATE.gif',
    'd_ATE.gif',
    'e_ATE.gif',
    'f_ATE.gif',
    'g_ATE.gif',
    'h_ATE.gif',
    'i_ATE.gif',
    'j_ATE.gif',
    'k_ATE.gif',
    'l_ATE.gif',
    'm_ATE.gif',
    'n_ATE.gif',
    'o_ATE.gif',
    'p_ATE.gif',
    'q_ATE.gif',
    'r_ATE.gif',
    's_ATE.gif',
    't_ATE.gif',
    'u_ATE.gif',
    'v_ATE.gif',
    'w_ATE.gif',
    'x_ATE.gif',
    'y_ATE.gif',
    'z_ATE.gif',
    'alpha_ATE.gif',
    'beta_ATE.gif',
    'gamma_ATE.gif',
    'delta_ATE.gif',
    'epsilon_ATE.gif',
    'zeta_ATE.gif',
    'eta_ATE.gif',
    'theta_ATE.gif',
    'iota_ATE.gif',
    'kappa_ATE.gif',
    'lambda_ATE.gif',
    'mu_ATE.gif',
    'nu_ATE.gif',
    'xi_ATE.gif',
    'omicron_ATE.gif',
    'pi_ATE.gif',
    'rho_ATE.gif',
    'sigma_ATE.gif',
    'varsigma_ATE.gif',
    'tau_ATE.gif',
    'upsilon_ATE.gif',
    'phi_ATE.gif',
    'chi_ATE.gif',
    'psi_ATE.gif',
    'omega_ATE.gif',
  ];

  readonly tabsStyle = {
    width: '100%',
    height: '100%',
    '--p-tabs-tabpanel-padding': '2px 0 0',
  };

  readonly treeStyle = {
    width: '100%',
    padding: '0',
    border: '0',
    borderRadius: '0',
    '--p-tree-padding': '0',
    '--p-tree-indent': '0.25rem',
    '--p-tree-gap': '1px',
    '--p-tree-node-padding': '0 0.25rem',
    '--p-tree-node-gap': '0.1875rem',
    '--p-tree-node-toggle-button-size': '0.875rem',
  };

  readonly machineNodes: TreeNode[] = [
    {
      key: 'machines-root',
      label: 'Máquinas',
      icon: 'pi pi-cog',
      expanded: true,
      selectable: false,
      children: [
        {
          key: 'new',
          label: 'NUEVA',
          icon: 'pi pi-cog',
        },
        {
          key: 'palindrome',
          label: 'Palíndromo',
          icon: 'pi pi-cog',
        },
        {
          key: 'parity',
          label: 'Paridad',
          icon: 'pi pi-cog',
        },
      ],
    },
  ];

  readonly exampleNodes: TreeNode[] = [
    {
      key: 'examples-root',
      label: 'ATE',
      data: {
        iconSrc: 'assets/images/ATE_ATE.gif',
      },
      expanded: true,
      selectable: false,
      children: this.ateIconFiles.map((fileName) => ({
        key: `ate-${fileName}`,
        label: this.getAteLabel(fileName),
        data: {
          iconSrc: this.getAteIconSrc(fileName),
        },
      })),
    },
  ];

  selectedMachineNode: TreeNode | null = this.machineNodes[0].children?.[0] ?? null;
  selectedExampleNode: TreeNode | null = null;

  private getAteLabel(fileName: string): string {
    return fileName.replace('_ATE.gif', '');
  }

  private getAteIconSrc(fileName: string): string {
    return `assets/images/${encodeURIComponent(fileName)}`;
  }
}
