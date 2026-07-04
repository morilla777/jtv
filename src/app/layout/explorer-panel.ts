import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService, TreeNode } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslationService } from '../services/translation.service';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { LoadingIndicatorService } from '../services/loading-indicator.service';
import { MachinePropertiesDialog, MachinePropertiesDialogValue } from '../components/machine-properties-dialog';
import { AteNode } from '../models/ate';
import { JtvMachineTreeNode, JtvStore } from '../stores/jtv.store';

const NEW_NOTATION_ATE_ICON_BY_OLD_ICON: Readonly<Record<string, string>> = {
  'assets/images/L_ATE.gif': 'assets/images/LN_ATE.gif',
  'assets/images/R_ATE.gif': 'assets/images/RN_ATE.gif',
};

@Component({
  selector: 'app-explorer-panel',
  imports: [TabsModule, TreeModule, TranslatePipe, MachinePropertiesDialog],
  template: `
    <div class="panel">
      @if (machineContextMenuOpen) {
        <div
          class="machine-context-menu"
          [style.left.px]="machineContextMenuPosition.x"
          [style.top.px]="machineContextMenuPosition.y"
          (click)="$event.stopPropagation()"
          role="menu"
        >
          @for (item of machineContextMenuItems; track item.label) {
          <button type="button" class="machine-context-menu-item" role="menuitem" (click)="runMachineContextMenuItem(item, $event)">
            <img class="machine-context-menu-icon" [src]="item['data']?.iconSrc" alt="" />
            <span>{{ item.label }}</span>
          </button>
          }
        </div>
      }
      <input
        #existingSubmachineFileInput
        type="file"
        accept=".jtv,.json,application/json"
        class="hidden-file-input"
        (change)="loadExistingSubmachineFromInput($event)"
      />
      <app-machine-properties-dialog
        [(visible)]="newSubmachineDialogVisible"
        (acceptProperties)="createNewSubmachine($event)"
      />

      <div class="panel-body">
        <p-tabs value="ate" class="explorer-tabs" [style]="tabsStyle">
          <p-tablist>
            <p-tab value="ate">{{ 'explorer.ett' | translate }}</p-tab>
            <p-tab value="machines">{{ 'explorer.machines' | translate }}</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel value="ate">
              <div class="ate-tree-host" tabindex="0" (keydown)="handleAteKeydown($event)">
                <p-tree
                  class="ate-tree"
                  [value]="ateNodes()"
                  selectionMode="single"
                  [(selection)]="selectedAteNode"
                  (onNodeSelect)="selectAteNode($event.node)"
                  (onNodeUnselect)="restoreAteSelection()"
                  [style]="treeStyle"
                  [indentation]="0.25"
                >
                  <ng-template pTemplate="default" let-node>
                    <span class="ate-tree-node" (dblclick)="continueAteExecution(node, $event)">
                      <img class="ate-tree-icon" [src]="node.data.iconSrc" [alt]="node.label" />
                      <span>{{ node.label }}</span>
                    </span>
                  </ng-template>
                </p-tree>
              </div>
            </p-tabpanel>

            <p-tabpanel value="machines">
              <p-tree
                [value]="mainMachineNodes()"
                selectionMode="single"
                [(selection)]="selectedMachineNode"
                (onNodeSelect)="selectMachineNode($event.node)"
                [style]="treeStyle"
                [indentation]="0.25"
              >
                <ng-template pTemplate="default" let-node>
                  <span class="machine-tree-node" (contextmenu)="showMachineContextMenu(node, $event)">
                    <span>{{ node.label }}</span>
                  </span>
                </ng-template>
              </p-tree>
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

    .hidden-file-input {
      display: none;
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

    :host ::ng-deep .ate-tree .p-tree-node-content.p-tree-node-selected {
      background: red !important;
      color: #fff !important;
    }

    :host ::ng-deep .ate-tree .p-tree-node-content.p-tree-node-selected .p-tree-node-label,
    :host ::ng-deep .ate-tree .p-tree-node-content.p-tree-node-selected .ate-tree-node,
    :host ::ng-deep .ate-tree .p-tree-node-content.p-tree-node-selected .ate-tree-node span {
      color: #fff !important;
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

    .machine-tree-node {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      line-height: 1;
    }

    .machine-context-menu-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      width: 100%;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 0.375rem 0.5rem;
      text-align: left;
    }

    .machine-context-menu {
      position: fixed;
      z-index: 1100;
      min-width: 10rem;
      padding: 0.25rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: 4px;
      background: var(--p-content-background);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    }

    .machine-context-menu-item:hover {
      background: var(--p-content-hover-background);
    }

    .machine-context-menu-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      flex: 0 0 auto;
    }
  `],
})
export class ExplorerPanel {
  @ViewChild('existingSubmachineFileInput') private existingSubmachineFileInput?: ElementRef<HTMLInputElement>;

  private readonly store = inject(JtvStore);
  private readonly i18n = inject(TranslationService);
  private readonly settingsService = inject(JtvSettingsService);
  private readonly loading = inject(LoadingIndicatorService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly hostElement = inject(ElementRef<HTMLElement>);

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

  readonly mainMachineNodes = computed<TreeNode[]>(() => [this.toMachineTreeNode(this.store.machineTree())]);
  machineContextMenuOpen = false;
  machineContextMenuPosition = { x: 0, y: 0 };
  newSubmachineDialogVisible = false;

  get machineContextMenuItems(): MenuItem[] {
    return [
      {
        label: this.i18n.translate('explorer.machineMenu.addNew'),
        data: {
          iconSrc: 'assets/images/New16.gif',
        },
        command: () => this.addNewSubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.addExisting'),
        data: {
          iconSrc: 'assets/images/Add16.gif',
          action: 'add-existing',
        },
        command: () => this.addExistingSubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.delete'),
        data: {
          iconSrc: 'assets/images/Delete16.gif',
        },
        command: () => this.deleteSubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.saveAs'),
        data: {
          iconSrc: 'assets/images/SaveAs16.gif',
        },
        command: () => this.saveSubmachineAs(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.properties'),
        data: {
          iconSrc: 'assets/images/Properties16.gif',
        },
        command: () => this.openSubmachineProperties(),
      },
    ];
  }

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

  selectedMachineNode: TreeNode | null = null;
  selectedAteNode: TreeNode | null = null;
  private readonly syncSelectedAteTreeNode = effect(() => {
    const selectedNodeId = this.store.selectedAteNode()?.id ?? null;
    const nodes = this.ateNodes();

    this.selectedAteNode = selectedNodeId ? this.findTreeNodeByAteNodeId(nodes, selectedNodeId) : null;

    if (this.selectedAteNode) {
      this.scrollSelectedAteNodeIntoView();
    }
  });

  private toTreeNode(node: AteNode): TreeNode {
    return {
      key: node.id,
      label: node.kind === 'root' ? node.label || this.i18n.translate('explorer.ateRootLabel') : node.label,
      data: {
        iconSrc: node.kind === 'root' ? this.getAteRootIconSrc() : this.getAteIconSrc(node.iconSrc),
        ateNodeId: node.id,
      },
      expanded: true,
      selectable: true,
      children: node.children.map((child) => this.toTreeNode(child)),
    };
  }

  selectAteNode(node: TreeNode): void {
    this.store.selectAteNode(node.data?.ateNodeId ?? null);
  }

  selectMachineNode(node: TreeNode): void {
    this.store.selectDesignMachine(node.data?.machineId ?? '');
  }

  showMachineContextMenu(node: TreeNode, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.selectedMachineNode = node;
    this.store.selectDesignMachine(node.data?.machineId ?? '');
    this.machineContextMenuPosition = { x: event.clientX, y: event.clientY };
    this.machineContextMenuOpen = true;
  }

  runMachineContextMenuItem(item: MenuItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.machineContextMenuOpen = false;
    item.command?.({ originalEvent: event, item });
  }

  @HostListener('document:click')
  closeMachineContextMenu(): void {
    this.machineContextMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeMachineContextMenuWithEscape(): void {
    this.machineContextMenuOpen = false;
  }

  addNewSubmachine(): void {
    this.newSubmachineDialogVisible = true;
  }

  createNewSubmachine(properties: MachinePropertiesDialogValue): void {
    this.store.addNewSubmachine(properties);
    queueMicrotask(() => {
      this.selectedMachineNode = this.findTreeNodeByMachineId(
        this.mainMachineNodes(),
        this.store.activeMachineTreeNodeId(),
      );
    });
  }

  addExistingSubmachine(): void {
    const input = this.existingSubmachineFileInput?.nativeElement;

    if (!input) {
      return;
    }

    input.value = '';
    input.click();
  }

  async loadExistingSubmachineFromInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    this.store.addExistingSubmachine(JSON.parse(await file.text()));
    queueMicrotask(() => {
      this.selectedMachineNode = this.findTreeNodeByMachineId(
        this.mainMachineNodes(),
        this.store.activeMachineTreeNodeId(),
      );
    });
  }

  deleteSubmachine(): void {
    const machineId = this.selectedMachineNode?.data?.machineId ?? '';

    if (!machineId || machineId === this.store.rootMachineTreeNodeId()) {
      return;
    }

    if (this.store.isDesignMachineReferencedByInvoker(machineId)) {
      this.messageService.add({
        key: 'simulation',
        severity: 'warn',
        summary: 'JTV',
        detail: this.i18n.translate('toast.submachineReferenced'),
        sticky: true,
        closable: true,
      });
      return;
    }

    this.confirmationService.confirm({
      key: 'machine',
      message: this.i18n.translate('confirm.deleteSubmachine'),
      acceptLabel: this.i18n.translate('confirm.yes'),
      rejectLabel: this.i18n.translate('confirm.no'),
      accept: () => {
        this.store.deleteDesignMachine(machineId);
        queueMicrotask(() => {
          this.selectedMachineNode = this.findTreeNodeByMachineId(
            this.mainMachineNodes(),
            this.store.activeMachineTreeNodeId(),
          );
        });
      },
    });
  }

  saveSubmachineAs(): void {}

  openSubmachineProperties(): void {}

  async continueAteExecution(node: TreeNode, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.loading.run(
      () => this.store.continueAteExecution(node.data?.ateNodeId ?? ''),
      this.i18n.translate('loading.executing'),
    );
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

  private scrollSelectedAteNodeIntoView(): void {
    window.requestAnimationFrame(() => {
      const selectedElement = this.hostElement.nativeElement.querySelector(
        '.ate-tree .p-tree-node-content.p-tree-node-selected',
      );

      selectedElement?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });
  }

  private toMachineTreeNode(node: JtvMachineTreeNode): TreeNode {
    return {
      key: node.id,
      label: node.name || this.i18n.translate('explorer.ateRootLabel'),
      icon: 'pi pi-cog',
      expanded: true,
      selectable: true,
      data: {
        machineId: node.id,
      },
      children: node.children.map((child) => this.toMachineTreeNode(child)),
    };
  }

  private findTreeNodeByMachineId(nodes: readonly TreeNode[], machineId: string): TreeNode | null {
    for (const node of nodes) {
      if (node.data?.machineId === machineId) {
        return node;
      }

      const childMatch = this.findTreeNodeByMachineId(node.children ?? [], machineId);

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

  private getAteRootIconSrc(): string {
    const fileName = this.i18n.currentLang() === 'en' ? 'ETT_ATE.gif' : 'ATE_ATE.gif';

    return `assets/images/${fileName}`;
  }

  private getAteIconSrc(iconSrc: string): string {
    if (this.settingsService.settings().oldNotation) {
      return iconSrc;
    }

    return NEW_NOTATION_ATE_ICON_BY_OLD_ICON[iconSrc] ?? iconSrc;
  }

}
