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
        <p-tabs value="ate">
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
              />
            </p-tabpanel>

            <p-tabpanel value="machines">
              <p-tree
                [value]="machineNodes"
                selectionMode="single"
                [(selection)]="selectedMachineNode"
                [style]="treeStyle"
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
      overflow: auto;
      padding: 0.25rem;
    }

    :host ::ng-deep .p-tabpanels {
      padding: 0.25rem 0 0;
    }

    :host ::ng-deep .p-tablist-tab-list {
      gap: 0;
    }

    :host ::ng-deep .p-tree {
      font-size: 0.8125rem;
    }

    :host ::ng-deep .p-tree-node-content {
      padding-block: 0.125rem;
      min-height: 1.75rem;
    }

    :host ::ng-deep .p-tree-node-label {
      line-height: 1.2;
    }

    :host ::ng-deep .p-tree-node-children {
      padding-block: 0;
    }
  `],
})
export class ExplorerPanel {
  readonly treeStyle = {
    width: '100%',
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
      label: 'Ejemplos',
      icon: 'pi pi-folder-open',
      expanded: true,
      selectable: false,
      children: [
        {
          key: 'simple-copier',
          label: 'Copiadora simple',
          icon: 'pi pi-file',
        },
        {
          key: 'anbn-recognizer',
          label: 'Reconocedor de aⁿbⁿ',
          icon: 'pi pi-file',
        },
      ],
    },
  ];

  selectedMachineNode: TreeNode | null = this.machineNodes[0].children?.[0] ?? null;
  selectedExampleNode: TreeNode | null = null;
}
