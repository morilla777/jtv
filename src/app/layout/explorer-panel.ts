import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService, TreeNode } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TreeModule } from 'primeng/tree';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslationService } from '../services/translation.service';
import { JtvSettingsService } from '../services/jtv-settings.service';
import { JtvFileService } from '../services/jtv-file.service';
import { JtvFileValidatorService } from '../services/jtv-file-validator.service';
import { LoadingIndicatorService } from '../services/loading-indicator.service';
import { MachinePropertiesDialog, MachinePropertiesDialogValue } from '../components/machine-properties-dialog';
import { AteNode } from '../models/ate';
import { JtvMachineTreeNode, JtvStore } from '../stores/jtv.store';

const NEW_NOTATION_ATE_ICON_BY_OLD_ICON: Readonly<Record<string, string>> = {
  'assets/images/L_ATE.gif': 'assets/images/LN_ATE.gif',
  'assets/images/R_ATE.gif': 'assets/images/RN_ATE.gif',
};

const ATE_TREE_RENDER_SPINNER_MIN_MS = 520;

@Component({
  selector: 'app-explorer-panel',
  imports: [TabsModule, TreeModule, ProgressSpinnerModule, TranslatePipe, MachinePropertiesDialog],
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
          <button
            type="button"
            class="machine-context-menu-item"
            role="menuitem"
            [disabled]="item.disabled"
            (click)="runMachineContextMenuItem(item, $event)"
          >
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
        [(visible)]="machinePropertiesDialogVisible"
        [properties]="machinePropertiesDialogValue"
        (acceptProperties)="saveMachineProperties($event)"
      />

      <div class="panel-body">
        <p-tabs [(value)]="activeExplorerTab" class="explorer-tabs" [style]="tabsStyle">
          <p-tablist>
            <p-tab value="ate">{{ 'explorer.ett' | translate }}</p-tab>
            <p-tab value="machines" [disabled]="machineTreeDisabled()">{{ 'explorer.machines' | translate }}</p-tab>
          </p-tablist>

          <p-tabpanels>
            <p-tabpanel value="ate">
              <div
                class="ate-tree-host"
                tabindex="0"
                (keydown)="handleAteKeydown($event)"
                (pointerdown)="handleAteTreePointerDown($event)"
              >
                <p-tree
                  class="ate-tree"
                  [value]="ateNodes()"
                  selectionMode="single"
                  [(selection)]="selectedAteNode"
                  (onNodeSelect)="selectAteNode($event.node)"
                  (onNodeUnselect)="restoreAteSelection()"
                  (onNodeExpand)="handleAteNodeExpand($event.node)"
                  (onNodeCollapse)="handleAteNodeCollapse($event.node)"
                  [style]="treeStyle"
                  [indentation]="0.25"
                >
                  <ng-template pTemplate="default" let-node>
                    <span
                      class="ate-tree-node"
                      (dblclick)="continueAteExecution(node, $event)"
                      (contextmenu)="handleAteNodeContextMenu(node, $event)"
                    >
                      <img class="ate-tree-icon" [src]="node.data.iconSrc" [alt]="node.label" />
                      <span>{{ node.label }}</span>
                    </span>
                  </ng-template>
                </p-tree>
                @if (ateTreeBusy()) {
                  <div class="ate-tree-render-overlay" role="status" aria-live="polite">
                    <p-progress-spinner
                      ariaLabel="loading"
                      strokeWidth="5"
                      [style]="{ width: '2rem', height: '2rem' }"
                    />
                  </div>
                }
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
                    <img class="machine-tree-icon" src="assets/images/Gear.gif" alt="" />
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
      position: relative;
      height: 100%;
      outline: none;
    }

    .ate-tree-render-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.32);
      pointer-events: none;
    }

    :host ::ng-deep .ate-tree-render-overlay .p-progressspinner-circle {
      stroke: var(--p-primary-color);
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
      gap: 0.1875rem;
      min-width: 0;
      line-height: 1;
    }

    .machine-tree-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      flex: 0 0 auto;
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

    .machine-context-menu-item:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .machine-context-menu-item:disabled:hover {
      background: transparent;
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
  private readonly fileService = inject(JtvFileService);
  private readonly fileValidator: JtvFileValidatorService = inject(JtvFileValidatorService);
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
  readonly machineTreeDisabled = computed(() => this.store.ate().children.length > 0);
  activeExplorerTab: 'ate' | 'machines' = 'ate';
  machineContextMenuOpen = false;
  machineContextMenuPosition = { x: 0, y: 0 };
  machinePropertiesDialogVisible = false;
  machinePropertiesDialogValue: MachinePropertiesDialogValue | null = null;
  private machinePropertiesDialogMode: 'create' | 'edit' = 'create';
  private machinePropertiesDialogMachineId: string | null = null;
  private lastAteRightClick: { nodeId: string; timestamp: number } | null = null;

  get machineContextMenuItems(): MenuItem[] {
    const selectedMachineId = this.selectedMachineNode?.data?.machineId ?? '';
    const isRootMachine = selectedMachineId === this.store.rootMachineTreeNodeId();

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
        label: this.i18n.translate('explorer.machineMenu.cut'),
        disabled: !selectedMachineId || isRootMachine,
        data: {
          iconSrc: 'assets/images/Cut16.gif',
        },
        command: () => this.cutSubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.copy'),
        disabled: !selectedMachineId,
        data: {
          iconSrc: 'assets/images/Copy16.gif',
        },
        command: () => this.copySubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.paste'),
        disabled: !selectedMachineId || !this.store.canPasteDesignMachine(),
        data: {
          iconSrc: 'assets/images/Paste16.gif',
        },
        command: () => this.pasteSubmachine(),
      },
      {
        label: this.i18n.translate('explorer.machineMenu.delete'),
        disabled: !selectedMachineId || isRootMachine,
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

  private readonly expandedAteNodeIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly ateTreeBusy = signal(false);
  readonly ateNodes = computed<TreeNode[]>(() => [this.toTreeNode(this.store.ate())]);

  selectedMachineNode: TreeNode | null = null;
  selectedAteNode: TreeNode | null = null;
  private ateTreeBusyToken = 0;
  private readonly syncSelectedMachineTreeNodeEffect = effect(() => {
    this.selectedMachineNode = this.findTreeNodeByMachineId(
      this.mainMachineNodes(),
      this.store.activeMachineTreeNodeId(),
    );
  });
  private readonly syncSelectedAteTreeNode = effect(() => {
    const selectedNodeId = this.store.selectedAteNode()?.id ?? null;
    const nodes = this.ateNodes();

    this.selectedAteNode = selectedNodeId ? this.findTreeNodeByAteNodeId(nodes, selectedNodeId) : null;

    if (this.selectedAteNode) {
      this.scrollSelectedAteNodeIntoView();
    }
  });
  private readonly syncExecutionTabState = effect(() => {
    if (this.machineTreeDisabled()) {
      this.activeExplorerTab = 'ate';
      this.machineContextMenuOpen = false;
    }
  });

  private toTreeNode(node: AteNode): TreeNode {
    const expanded = node.kind === 'root' ||
      this.expandedAteNodeIds().has(node.id) ||
      (node.kind === 'expand' && node.children.length > 0 && !node.continuation);

    return {
      key: node.id,
      label: this.getAteNodeLabel(node),
      data: {
        iconSrc: node.kind === 'root' ? this.getAteRootIconSrc() : this.getAteIconSrc(node.iconSrc),
        ateNodeId: node.id,
      },
      expanded,
      leaf: node.children.length === 0,
      selectable: true,
      children: expanded ? node.children.map((child) => this.toTreeNode(child)) : [],
    };
  }

  private getAteNodeLabel(node: AteNode): string {
    if (node.kind === 'root') {
      return node.label || this.i18n.translate('explorer.ateRootLabel');
    }

    return node.labelKey ? this.i18n.translate(node.labelKey) : node.label;
  }

  selectAteNode(node: TreeNode): void {
    this.store.selectAteNode(node.data?.ateNodeId ?? null);
  }

  showAteTreeRenderSpinner(): void {
    const token = ++this.ateTreeBusyToken;
    const startedAt = Date.now();

    this.ateTreeBusy.set(true);
    void this.waitForAteTreeRender().then(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, ATE_TREE_RENDER_SPINNER_MIN_MS - elapsed);

      window.setTimeout(() => {
        if (token === this.ateTreeBusyToken) {
          this.ateTreeBusy.set(false);
        }
      }, remaining);
    });
  }

  handleAteTreePointerDown(event: PointerEvent): void {
    const target = event.target instanceof Element ? event.target : null;

    if (!target?.closest('.p-tree-node-toggle-button')) {
      return;
    }

    this.showAteTreeRenderSpinner();
  }

  handleAteNodeExpand(node: TreeNode): void {
    const nodeId = node.data?.ateNodeId;

    if (nodeId) {
      this.expandedAteNodeIds.update((current) => new Set([...current, nodeId]));
    }

    this.showAteTreeRenderSpinner();
  }

  handleAteNodeCollapse(node: TreeNode): void {
    const nodeId = node.data?.ateNodeId;
    const collapsedAteNode = nodeId ? this.findAteNodeById(this.store.ate(), nodeId) : null;
    const collapsedIds = collapsedAteNode ? this.flattenAteNodeIds(collapsedAteNode) : [];

    this.expandedAteNodeIds.update((current) => {
      const next = new Set(current);

      for (const nodeId of collapsedIds) {
        next.delete(nodeId);
      }

      return next;
    });
    this.showAteTreeRenderSpinner();
  }

  selectMachineNode(node: TreeNode): void {
    if (this.machineTreeDisabled()) {
      return;
    }

    this.store.selectDesignMachine(node.data?.machineId ?? '');
  }

  showMachineContextMenu(node: TreeNode, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.machineTreeDisabled()) {
      this.machineContextMenuOpen = false;
      return;
    }

    this.selectedMachineNode = node;
    this.store.selectDesignMachine(node.data?.machineId ?? '');
    this.machineContextMenuPosition = { x: event.clientX, y: event.clientY };
    this.machineContextMenuOpen = true;
  }

  runMachineContextMenuItem(item: MenuItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.machineContextMenuOpen = false;

    if (item.disabled) {
      return;
    }

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
    this.machinePropertiesDialogMode = 'create';
    this.machinePropertiesDialogMachineId = null;
    this.machinePropertiesDialogValue = null;
    this.machinePropertiesDialogVisible = true;
  }

  saveMachineProperties(properties: MachinePropertiesDialogValue): void {
    if (this.machinePropertiesDialogMode === 'edit' && this.machinePropertiesDialogMachineId) {
      this.store.updateDesignMachineProperties(this.machinePropertiesDialogMachineId, properties);
    } else {
      if (this.store.hasDesignMachineName(properties.name)) {
        this.messageService.add({
          key: 'simulation',
          severity: 'warn',
          summary: 'JTV',
          detail: this.i18n.translate('toast.machineNameExists', { machineName: properties.name }),
          sticky: true,
          closable: true,
        });
        return;
      }

      this.store.addNewSubmachine(properties);
    }

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

    try {
      const parsedFile = JSON.parse(await file.text()) as unknown;

      this.fileValidator.validate(parsedFile);
      this.store.addExistingSubmachine(parsedFile);
      queueMicrotask(() => {
        this.selectedMachineNode = this.findTreeNodeByMachineId(
          this.mainMachineNodes(),
          this.store.activeMachineTreeNodeId(),
        );
      });
    } catch {
      this.messageService.add({
        key: 'simulation',
        severity: 'error',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineOpenError'),
        sticky: true,
        closable: true,
      });
    }
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

  cutSubmachine(): void {
    const machineId = this.selectedMachineNode?.data?.machineId ?? '';

    if (!machineId || machineId === this.store.rootMachineTreeNodeId()) {
      return;
    }

    if (this.store.isDesignMachineReferencedByInvoker(machineId)) {
      this.messageService.add({
        key: 'simulation',
        severity: 'warn',
        summary: 'JTV',
        detail: this.i18n.translate('toast.submachineCutReferenced'),
        sticky: true,
        closable: true,
      });
      return;
    }

    if (this.store.cutDesignMachine(machineId)) {
      this.syncSelectedMachineTreeNode();
    }
  }

  copySubmachine(): void {
    const machineId = this.selectedMachineNode?.data?.machineId ?? '';

    if (machineId) {
      this.store.copyDesignMachine(machineId);
    }
  }

  pasteSubmachine(): void {
    const parentMachineId = this.selectedMachineNode?.data?.machineId ?? '';

    if (parentMachineId && this.store.pasteDesignMachine(parentMachineId)) {
      this.syncSelectedMachineTreeNode();
    }
  }

  async saveSubmachineAs(): Promise<void> {
    const machineId = this.selectedMachineNode?.data?.machineId ?? '';
    const file = this.store.exportDesignMachineFile(machineId);

    if (!file) {
      return;
    }

    try {
      const fileName = this.getSuggestedMachineFileName(file.machine.name);

      const savedFileName = await this.fileService.exportJsonWithSavePicker(file, fileName);
      this.messageService.add({
        key: 'simulation',
        severity: 'success',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineExported', { fileName: savedFileName }),
        sticky: true,
        closable: true,
      });
    } catch {
      this.messageService.add({
        key: 'simulation',
        severity: 'error',
        summary: 'JTV',
        detail: this.i18n.translate('toast.machineSaveError'),
        sticky: true,
        closable: true,
      });
    }
  }

  openSubmachineProperties(): void {
    const machineId = this.selectedMachineNode?.data?.machineId ?? '';
    const properties = this.store.getDesignMachineProperties(machineId);

    if (!properties) {
      return;
    }

    this.machinePropertiesDialogMode = 'edit';
    this.machinePropertiesDialogMachineId = machineId;
    this.machinePropertiesDialogValue = {
      name: properties.name,
      shortName: properties.shortName ?? '',
      description: properties.description ?? '',
    };
    this.machinePropertiesDialogVisible = true;
  }

  async continueAteExecution(node: TreeNode, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const expandedNodeId = node.data?.ateNodeId ?? '';
    const continued = await this.loading.run(
      () => this.store.continueAteExecution(node.data?.ateNodeId ?? ''),
      this.i18n.translate('loading.executing'),
    );

    if (continued) {
      this.focusAteExpandedBranch(expandedNodeId);
    }
  }

  async handleAteNodeContextMenu(node: TreeNode, event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const nodeId = node.data?.ateNodeId ?? '';
    const now = Date.now();
    const lastRightClick = this.lastAteRightClick;
    const isRightDoubleClick = lastRightClick !== null &&
      lastRightClick.nodeId === nodeId &&
      now - lastRightClick.timestamp <= 500;

    this.lastAteRightClick = { nodeId, timestamp: now };

    if (!isRightDoubleClick) {
      return;
    }

    this.lastAteRightClick = null;
    const returned = await this.loading.run(
      () => this.store.returnFromAteSubtrace(),
      this.i18n.translate('loading.executing'),
    );

    if (returned) {
      this.focusAteExpandedBranch(this.store.selectedAteNode()?.id ?? nodeId);
    }
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

  private focusAteExpandedBranch(ateNodeId: string): void {
    const path = this.findAteNodeIdPath(this.store.ate(), ateNodeId);

    this.expandedAteNodeIds.set(new Set(path));
  }

  private findAteNodeIdPath(root: AteNode, ateNodeId: string): string[] {
    if (root.id === ateNodeId) {
      return [root.id];
    }

    for (const child of root.children) {
      const childPath = this.findAteNodeIdPath(child, ateNodeId);

      if (childPath.length > 0) {
        return [root.id, ...childPath];
      }
    }

    return [];
  }

  private findAteNodeById(root: AteNode, ateNodeId: string): AteNode | null {
    if (root.id === ateNodeId) {
      return root;
    }

    for (const child of root.children) {
      const match = this.findAteNodeById(child, ateNodeId);

      if (match) {
        return match;
      }
    }

    return null;
  }

  private flattenAteNodeIds(node: AteNode): string[] {
    return [node.id, ...node.children.flatMap((child) => this.flattenAteNodeIds(child))];
  }

  private waitForAteTreeRender(): Promise<void> {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
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
      expanded: true,
      selectable: true,
      data: {
        machineId: node.id,
      },
      children: node.children.map((child) => this.toMachineTreeNode(child)),
    };
  }

  private syncSelectedMachineTreeNode(): void {
    queueMicrotask(() => {
      this.selectedMachineNode = this.findTreeNodeByMachineId(
        this.mainMachineNodes(),
        this.store.activeMachineTreeNodeId(),
      );
    });
  }

  private getSuggestedMachineFileName(machineName: string): string {
    return `${(machineName || 'jtv-machine').toLowerCase()}.jtv.json`;
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
