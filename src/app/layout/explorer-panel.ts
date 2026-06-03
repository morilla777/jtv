import { Component, computed, inject } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { TranslatePipe } from '../i18n/translate.pipe';
import { AteNode } from '../models/ate';
import { JtvStore } from '../stores/jtv.store';

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
              <div class="ate-tree-host" tabindex="0" (keydown)="handleAteKeydown($event)">
                <p-tree
                  [value]="ateNodes()"
                  selectionMode="single"
                  [(selection)]="selectedAteNode"
                  (onNodeSelect)="selectAteNode($event.node)"
                  (onNodeUnselect)="restoreAteSelection()"
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
              </div>
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

    .ate-tree-host {
      height: 100%;
      outline: none;
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
  private readonly store = inject(JtvStore);

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

  readonly ateNodes = computed<TreeNode[]>(() => [this.toTreeNode(this.store.ate())]);

  selectedMachineNode: TreeNode | null = this.machineNodes[0].children?.[0] ?? null;
  selectedAteNode: TreeNode | null = null;

  private toTreeNode(node: AteNode): TreeNode {
    return {
      key: node.id,
      label: node.label,
      data: {
        iconSrc: node.iconSrc,
        ateNodeId: node.id,
      },
      expanded: true,
      selectable: node.kind !== 'root',
      children: node.children.map((child) => this.toTreeNode(child)),
    };
  }

  selectAteNode(node: TreeNode): void {
    this.store.selectAteNode(node.data?.ateNodeId ?? null);
  }

  restoreAteSelection(): void {
    const selectedNodeId = this.store.selectedAteNode()?.id ?? null;

    if (!selectedNodeId) {
      return;
    }

    queueMicrotask(() => {
      this.selectedAteNode = this.findTreeNodeByAteNodeId(this.ateNodes(), selectedNodeId);
    });
  }

  handleAteKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    const nodes = this.getSelectableAteNodes();

    if (nodes.length === 0) {
      return;
    }

    event.preventDefault();

    const currentNodeId = this.selectedAteNode?.data?.ateNodeId ?? this.store.selectedAteNode()?.id ?? null;
    const currentIndex = nodes.findIndex((node) => node.data?.ateNodeId === currentNodeId);
    const nextIndex = event.key === 'ArrowDown'
      ? Math.min(currentIndex + 1, nodes.length - 1)
      : Math.max(currentIndex < 0 ? nodes.length - 1 : currentIndex - 1, 0);
    const nextNode = nodes[nextIndex];

    this.selectedAteNode = nextNode;
    this.store.selectAteNode(nextNode.data?.ateNodeId ?? null);
  }

  private getSelectableAteNodes(): TreeNode[] {
    return this.ateNodes().flatMap((node) => this.flattenSelectableTreeNodes(node));
  }

  private findTreeNodeByAteNodeId(nodes: readonly TreeNode[], ateNodeId: string): TreeNode | null {
    for (const node of nodes) {
      if (node.data?.ateNodeId === ateNodeId) {
        return node;
      }

      const childMatch = this.findTreeNodeByAteNodeId(node.children ?? [], ateNodeId);

      if (childMatch) {
        return childMatch;
      }
    }

    return null;
  }

  private flattenSelectableTreeNodes(node: TreeNode): TreeNode[] {
    const children = node.children?.flatMap((child) => this.flattenSelectableTreeNodes(child)) ?? [];

    return node.selectable === false ? children : [node, ...children];
  }
}
