import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

import { JtvStore } from '../stores/jtv.store';
import { MachineLinkView, ViewPoint } from '../models/view';

@Component({
  selector: 'app-designer-canvas-panel',
  imports: [ButtonModule, DialogModule, FormsModule],
  template: `
    <div class="panel">
      <div class="canvas-container">
        <svg
          class="designer-svg"
          [attr.viewBox]="viewBox()"
          preserveAspectRatio="xMinYMin meet"
          aria-label="Maquina de Turing modular"
          (pointermove)="handleCanvasPointerMove($event)"
          (pointerup)="stopDraggingNodeGroup()"
          (pointerleave)="stopDraggingNodeGroup()"
          (contextmenu)="cancelTransitionDraft($event)"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" class="arrow-head"></polygon>
            </marker>
            <marker
              id="selected-arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" class="selected-arrow-head"></polygon>
            </marker>
            <marker
              id="hover-arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" class="hover-arrow-head"></polygon>
            </marker>
            <marker
              id="canvas-selected-arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" class="canvas-selected-arrow-head"></polygon>
            </marker>
          </defs>

          <rect
            x="0"
            y="0"
            [attr.width]="canvasWidth"
            [attr.height]="canvasHeight"
            class="canvas-background"
            (click)="insertNodeOnCanvas($event)"
          ></rect>

          <g class="machine-diagram">
            @for (node of machineGraphView().nodes; track node.nodeId) {
              @if (node.initial) {
                <text
                  [attr.x]="node.position.x - 18"
                  [attr.y]="node.position.y"
                  class="machine-text"
                  [class.machine-text-selected]="node.selected"
                  [class.machine-text-canvas-selected]="node.canvasSelected || isTransitionSourceNode(node.nodeId)"
                  [class.machine-text-hovered]="isHoveredNode(node.nodeId)"
                  (mouseenter)="hoverNode(node.nodeId, $event)"
                  (mousemove)="hoverNode(node.nodeId, $event)"
                  (mouseleave)="clearHoveredElement()"
                  (pointerdown)="startDraggingNodeGroup(node.nodeId, $event)"
                  (click)="handleNodeClick(node.nodeId); $event.stopPropagation()"
                >
                  &gt;
                </text>
              }

              <text
                [attr.x]="node.position.x"
                [attr.y]="node.position.y"
                class="machine-text"
                [class.machine-text-selected]="node.selected"
                [class.machine-text-canvas-selected]="node.canvasSelected || isTransitionSourceNode(node.nodeId)"
                [class.machine-text-hovered]="isHoveredNode(node.nodeId)"
                (mouseenter)="hoverNode(node.nodeId, $event)"
                (mousemove)="hoverNode(node.nodeId, $event)"
                (mouseleave)="clearHoveredElement()"
                (pointerdown)="startDraggingNodeGroup(node.nodeId, $event)"
                (click)="handleNodeClick(node.nodeId); $event.stopPropagation()"
              >
                {{ node.label }}
              </text>
            }

            @if (nodeInsertionCursor(); as cursor) {
              <line
                [attr.x1]="cursor.x"
                [attr.y1]="cursor.y1"
                [attr.x2]="cursor.x"
                [attr.y2]="cursor.y2"
                class="node-insertion-cursor"
              ></line>
            }

            @for (link of machineGraphView().links; track link.linkId) {
              <path
                [attr.d]="getLinkPath(link)"
                class="arrow-line"
                [class.arrow-line-selected]="link.selected"
                [class.arrow-line-canvas-selected]="link.canvasSelected"
                [class.arrow-line-hovered]="isHoveredLink(link.linkId)"
                [attr.marker-end]="getLinkMarkerEnd(link)"
                (mouseenter)="hoverLink(link.linkId)"
                (mouseleave)="clearHoveredElement()"
                (click)="selectLink(link.linkId); $event.stopPropagation()"
              ></path>

              @if (link.label) {
                @if (getNegatedSingleSymbolLabel(link.label); as symbol) {
                  <text
                    [attr.x]="getLinkLabelPosition(link).x"
                    [attr.y]="getLinkLabelPosition(link).y"
                    class="edge-label"
                    [class.edge-label-selected]="link.selected"
                    [class.edge-label-canvas-selected]="link.canvasSelected"
                    [class.edge-label-hovered]="isHoveredLink(link.linkId)"
                    (mouseenter)="hoverLink(link.linkId)"
                    (mouseleave)="clearHoveredElement()"
                    (click)="selectLink(link.linkId); $event.stopPropagation()"
                  >
                    <tspan class="overline-symbol">[{{ symbol }}]</tspan>
                  </text>
                } @else {
                  <text
                    [attr.x]="getLinkLabelPosition(link).x"
                    [attr.y]="getLinkLabelPosition(link).y"
                    class="edge-label"
                    [class.edge-label-selected]="link.selected"
                    [class.edge-label-canvas-selected]="link.canvasSelected"
                    [class.edge-label-hovered]="isHoveredLink(link.linkId)"
                    (mouseenter)="hoverLink(link.linkId)"
                    (mouseleave)="clearHoveredElement()"
                    (click)="selectLink(link.linkId); $event.stopPropagation()"
                  >
                    {{ link.label }}
                  </text>
                }
              }
            }

            @if (transitionDraftPath(); as draftPath) {
              <path
                [attr.d]="draftPath"
                class="transition-draft-line"
                marker-end="url(#canvas-selected-arrowhead)"
              ></path>
            }
          </g>
        </svg>
      </div>

      <p-dialog
        header="Condiciones de Transición"
        [visible]="conditionDialogVisible()"
        [modal]="true"
        [closable]="true"
        [style]="{ width: '25rem' }"
        (onHide)="cancelConditionalTransition()"
      >
        <div class="condition-dialog">
          <div class="condition-summary">
            @if (conditionNegated) {
              <span class="condition-overline-symbol">[{{ conditionSymbol }}]</span>
            } @else {
              <span>[{{ conditionSymbol }}]</span>
            }
          </div>

          <div class="condition-grid">
            <fieldset class="condition-fieldset">
              <legend>Cinta</legend>
              <select [(ngModel)]="conditionTapeIndex" class="condition-select">
                @for (tape of tapeOptions(); track tape.value) {
                  <option [ngValue]="tape.value">{{ tape.label }}</option>
                }
              </select>
            </fieldset>

            <label class="condition-not">
              <span>Not</span>
              <input type="checkbox" [(ngModel)]="conditionNegated" />
            </label>

            <fieldset class="condition-fieldset symbols-fieldset">
              <legend>Símbolos</legend>
              <select [(ngModel)]="conditionSymbol" size="5" class="condition-list">
                @for (symbol of conditionSymbols; track symbol) {
                  <option [ngValue]="symbol">{{ symbol }}</option>
                }
              </select>
            </fieldset>

            @if (conditionDialogMode() === 'autolink') {
              <fieldset class="condition-fieldset orientation-fieldset">
                <legend>Orientación</legend>
                <div class="orientation-grid">
                  <button
                    pButton
                    type="button"
                    icon="pi pi-chevron-up"
                    class="orientation-button orientation-top"
                    [class.orientation-button-active]="autolinkOrientation === 'top'"
                    (click)="autolinkOrientation = 'top'"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-chevron-left"
                    class="orientation-button orientation-left"
                    [class.orientation-button-active]="autolinkOrientation === 'left'"
                    (click)="autolinkOrientation = 'left'"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-chevron-right"
                    class="orientation-button orientation-right"
                    [class.orientation-button-active]="autolinkOrientation === 'right'"
                    (click)="autolinkOrientation = 'right'"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-chevron-down"
                    class="orientation-button orientation-bottom"
                    [class.orientation-button-active]="autolinkOrientation === 'bottom'"
                    (click)="autolinkOrientation = 'bottom'"
                  ></button>
                </div>
              </fieldset>
            }
          </div>
        </div>

        <ng-template #footer>
          <button pButton type="button" label="Aceptar" (click)="acceptConditionalTransition()"></button>
          <button pButton type="button" label="Limpiar Todo" severity="secondary" (click)="clearConditionDialog()"></button>
          <button pButton type="button" label="Cancelar" severity="secondary" (click)="cancelConditionalTransition()"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .panel {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--p-surface-card);
    }

    .canvas-container {
      flex: 1;
      min-height: 0;
      overflow: auto;
      background: #fff;
    }

    .designer-svg {
      width: 100%;
      height: 100%;
      min-width: 560px;
      min-height: 340px;
    }

    .canvas-background {
      fill: #fff;
    }

    .arrow-line {
      fill: none;
      stroke: #000;
      stroke-width: 1;
      stroke-linecap: square;
    }

    .arrow-head {
      fill: #000;
    }

    .selected-arrow-head {
      fill: red;
    }

    .hover-arrow-head {
      fill: rgb(255, 175, 175);
    }

    .canvas-selected-arrow-head {
      fill: rgb(255, 0, 255);
    }

    .machine-text {
      font-family: 'Times New Roman', Times, serif;
      font-size: 26px;
      font-style: italic;
      fill: #000;
    }

    .machine-text-selected {
      fill: red;
    }

    .machine-text-hovered {
      fill: rgb(255, 175, 175);
    }

    .machine-text-canvas-selected {
      fill: rgb(255, 0, 255);
    }

    .node-insertion-cursor {
      stroke: rgb(255, 0, 255);
      stroke-width: 1.5;
      pointer-events: none;
    }

    .arrow-line-selected {
      stroke: red;
      stroke-width: 1.5;
    }

    .arrow-line-hovered {
      stroke: rgb(255, 175, 175);
    }

    .arrow-line-canvas-selected {
      stroke: rgb(255, 0, 255);
      stroke-width: 1.5;
    }

    .edge-label {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      font-style: italic;
      fill: #000;
    }

    .edge-label-selected {
      fill: red;
    }

    .edge-label-hovered {
      fill: rgb(255, 175, 175);
    }

    .edge-label-canvas-selected {
      fill: rgb(255, 0, 255);
    }

    .transition-draft-line {
      fill: none;
      stroke: rgb(255, 0, 255);
      stroke-width: 1.5;
      pointer-events: none;
    }

    .overline-symbol {
      text-decoration: overline;
    }

    .condition-dialog {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .condition-summary {
      min-height: 1.5rem;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    .condition-overline-symbol {
      display: inline-block;
      border-top: 1px solid currentColor;
      line-height: 0.9;
      padding-top: 0.125rem;
    }

    .condition-grid {
      display: grid;
      grid-template-columns: 1fr auto 1.25fr;
      gap: 0.5rem;
      align-items: stretch;
    }

    .condition-fieldset {
      border: 1px solid var(--p-content-border-color);
      padding: 0.75rem 0.5rem;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .symbols-fieldset {
      align-items: stretch;
      justify-content: stretch;
    }

    .condition-not {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.375rem;
    }

    .condition-select {
      width: 4rem;
    }

    .condition-list {
      width: 100%;
      min-height: 7rem;
      font-family: 'Times New Roman', Times, serif;
      font-style: italic;
    }

    .orientation-fieldset {
      grid-column: 1;
      align-items: center;
      justify-content: center;
    }

    .orientation-grid {
      display: grid;
      grid-template-columns: repeat(3, 1.5rem);
      grid-template-rows: repeat(3, 1.5rem);
      gap: 0.125rem;
    }

    :host ::ng-deep .orientation-button {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
    }

    .orientation-top {
      grid-column: 2;
      grid-row: 1;
    }

    .orientation-left {
      grid-column: 1;
      grid-row: 2;
    }

    .orientation-right {
      grid-column: 3;
      grid-row: 2;
    }

    .orientation-bottom {
      grid-column: 2;
      grid-row: 3;
    }

    :host ::ng-deep .orientation-button-active {
      border-color: rgb(255, 0, 255);
      background: color-mix(in srgb, rgb(255, 0, 255) 20%, transparent);
    }
  `],
})
export class DesignerCanvasPanel {
  private readonly store = inject(JtvStore);
  private readonly hoveredNodeId = signal<string | null>(null);
  private readonly hoveredLinkId = signal<string | null>(null);
  private readonly hoveredNodeCursorSide = signal<'left' | 'right'>('right');
  private readonly transitionSourceNodeId = signal<string | null>(null);
  private readonly transitionDraftEndPoint = signal<ViewPoint | null>(null);
  private readonly conditionalTransitionTargetNodeId = signal<string | null>(null);
  private readonly autolinkTargetNodeId = signal<string | null>(null);
  readonly conditionDialogMode = signal<'conditional-link' | 'autolink' | null>(null);
  readonly conditionDialogVisible = signal(false);
  private draggedNodeGroup: { nodeId: string; lastPoint: ViewPoint } | null = null;
  private readonly clearTransitionDraftWhenToolChanges = effect(() => {
    if (!this.isLinkInsertionToolActive() && !this.isAutolinkInsertionToolActive()) {
      this.transitionSourceNodeId.set(null);
      this.transitionDraftEndPoint.set(null);
      this.conditionalTransitionTargetNodeId.set(null);
      this.autolinkTargetNodeId.set(null);
      this.conditionDialogMode.set(null);
      this.conditionDialogVisible.set(false);
    }
  });

  readonly canvasWidth = 560;
  readonly canvasHeight = 340;
  readonly machineGraphView = computed(() => this.store.machineGraphView());
  readonly viewBox = computed(() => `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
  readonly isPointerToolActive = computed(() => this.store.activeToolId() === 'pointer');
  readonly isLinkInsertionToolActive = computed(() =>
    ['transition', 'conditional-transition'].includes(this.store.activeToolId() ?? ''),
  );
  readonly isAutolinkInsertionToolActive = computed(() => this.store.activeToolId() === 'loop-transition');
  readonly isTransitionToolActive = computed(() => this.isLinkInsertionToolActive());
  readonly isNodeInsertionToolActive = computed(() =>
    ['move-left', 'move-right', 'symbol-lowercase'].includes(this.store.activeToolId() ?? ''),
  );
  readonly isCanvasCursorActive = computed(
    () =>
      this.isPointerToolActive() ||
      this.isNodeInsertionToolActive() ||
      this.isTransitionToolActive() ||
      this.isAutolinkInsertionToolActive(),
  );
  readonly nodeInsertionCursor = computed(() => {
    if (!this.isCanvasCursorActive()) {
      return null;
    }

    const nodeId = this.hoveredNodeId();
    const node = this.machineGraphView().nodes.find((item) => item.nodeId === nodeId);

    if (!node) {
      return null;
    }

    const width = node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: this.hoveredNodeCursorSide() === 'left' ? node.position.x - 5 : node.position.x + width,
      y1: node.position.y - 26,
      y2: node.position.y + 6,
    };
  });
  readonly transitionDraftPath = computed(() => {
    if (!this.isLinkInsertionToolActive()) {
      return null;
    }

    const sourceNodeId = this.transitionSourceNodeId();
    const endPoint = this.transitionDraftEndPoint();
    const sourceNode = this.machineGraphView().nodes.find((node) => node.nodeId === sourceNodeId);

    if (!sourceNode || !endPoint) {
      return null;
    }

    const sourcePoint = this.getNodeRightAnchor(sourceNode);

    return `M ${sourcePoint.x} ${sourcePoint.y} L ${endPoint.x} ${endPoint.y}`;
  });
  readonly tapeOptions = computed(() =>
    this.store.tapes().map((_, index) => ({
      value: index,
      label: `${index + 1}`,
    })),
  );
  readonly conditionSymbols = [
    '#',
    ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(97 + index)),
    ...Array.from({ length: 10 }, (_, index) => index.toString()),
  ];

  conditionTapeIndex = 0;
  conditionNegated = false;
  conditionSymbol = this.conditionSymbols[0];
  autolinkOrientation: 'top' | 'bottom' | 'left' | 'right' = 'right';

  getLinkPath(link: MachineLinkView): string {
    if (link.kind === 'autolink') {
      return this.getAutolinkPath(link);
    }

    const points = link.points ?? [];

    if (points.length === 0) {
      return '';
    }

    const [startPoint, ...restPoints] = points;

    return [
      `M ${startPoint.x} ${startPoint.y}`,
      ...restPoints.map((point) => `L ${point.x} ${point.y}`),
    ].join(' ');
  }

  getLinkLabelPosition(link: MachineLinkView): ViewPoint {
    if (link.kind === 'autolink') {
      return this.getAutolinkLabelPosition(link);
    }

    const points = link.points ?? [];

    if (points.length < 2) {
      return points[0] ?? { x: 0, y: 0 };
    }

    const startPoint = points[0];
    const endPoint = points[points.length - 1];

    return {
      x: (startPoint.x + endPoint.x) / 2 - 8,
      y: (startPoint.y + endPoint.y) / 2 - 6,
    };
  }

  getNegatedSingleSymbolLabel(label: string): string | null {
    return /^\[not ([a-z0-9#])\]$/.exec(label)?.[1] ?? null;
  }

  getLinkMarkerEnd(link: MachineLinkView): string {
    if (link.canvasSelected) {
      return 'url(#canvas-selected-arrowhead)';
    }

    if (this.isHoveredLink(link.linkId)) {
      return 'url(#hover-arrowhead)';
    }

    return link.selected ? 'url(#selected-arrowhead)' : 'url(#arrowhead)';
  }

  hoverNode(nodeId: string, event?: MouseEvent): void {
    if (!this.isCanvasCursorActive()) {
      return;
    }

    if ((this.isTransitionToolActive() || this.isAutolinkInsertionToolActive()) && !this.isLinkToolHoverableNode(nodeId)) {
      return;
    }

    this.hoveredNodeId.set(nodeId);
    this.hoveredLinkId.set(null);

    if (event) {
      this.hoveredNodeCursorSide.set(this.getNodeCursorSide(event));
    }
  }

  hoverLink(linkId: string): void {
    if (!this.isCanvasCursorActive()) {
      return;
    }

    this.hoveredLinkId.set(linkId);
    this.hoveredNodeId.set(null);
  }

  clearHoveredElement(): void {
    this.hoveredNodeId.set(null);
    this.hoveredLinkId.set(null);
  }

  handleNodeClick(nodeId: string): void {
    if (this.isAutolinkInsertionToolActive()) {
      this.handleAutolinkNodeClick(nodeId);
      return;
    }

    if (this.isTransitionToolActive()) {
      this.handleTransitionNodeClick(nodeId);
      return;
    }

    this.selectNode(nodeId);
  }

  selectNode(nodeId: string): void {
    if (this.isNodeInsertionToolActive()) {
      this.store.insertActiveToolNodeNear(nodeId, this.hoveredNodeCursorSide());
      return;
    }

    this.store.selectCanvasNode(nodeId);
  }

  selectLink(linkId: string): void {
    this.store.selectCanvasLink(linkId);
  }

  handleCanvasPointerMove(event: PointerEvent): void {
    this.dragSelectedNodeGroup(event);
    this.updateTransitionDraft(event);
  }

  insertNodeOnCanvas(event: MouseEvent): void {
    if (!this.isNodeInsertionToolActive()) {
      return;
    }

    const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;

    if (!svg) {
      return;
    }

    const point = this.getSvgPoint(svg, event);

    this.store.insertActiveToolNodeAt(point);
  }

  startDraggingNodeGroup(nodeId: string, event: PointerEvent): void {
    if (!this.isPointerToolActive()) {
      return;
    }

    const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;
    const point = svg ? this.getSvgPoint(svg, event) : null;

    if (!point) {
      return;
    }

    event.preventDefault();
    this.store.selectCanvasNode(nodeId);
    this.draggedNodeGroup = {
      nodeId,
      lastPoint: point,
    };
  }

  dragSelectedNodeGroup(event: PointerEvent): void {
    if (!this.draggedNodeGroup) {
      return;
    }

    const point = this.getSvgPoint(event.currentTarget as SVGSVGElement, event);
    const delta = {
      x: point.x - this.draggedNodeGroup.lastPoint.x,
      y: point.y - this.draggedNodeGroup.lastPoint.y,
    };

    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    this.store.moveCanvasGroupContainingNode(this.draggedNodeGroup.nodeId, delta);
    this.draggedNodeGroup = {
      ...this.draggedNodeGroup,
      lastPoint: point,
    };
  }

  stopDraggingNodeGroup(): void {
    this.draggedNodeGroup = null;
  }

  cancelTransitionDraft(event?: Event): void {
    if (!this.isTransitionToolActive() || !this.transitionSourceNodeId()) {
      return;
    }

    event?.preventDefault();
    this.transitionSourceNodeId.set(null);
    this.transitionDraftEndPoint.set(null);
    this.store.clearCanvasSelection();
  }

  isHoveredNode(nodeId: string): boolean {
    return this.isCanvasCursorActive() && this.hoveredNodeId() === nodeId && this.isHoverEnabledForNode(nodeId);
  }

  isHoveredLink(linkId: string): boolean {
    return this.isCanvasCursorActive() && this.hoveredLinkId() === linkId;
  }

  isTransitionSourceNode(nodeId: string): boolean {
    return this.isTransitionToolActive() && this.transitionSourceNodeId() === nodeId;
  }

  private isHoverEnabledForNode(nodeId: string): boolean {
    return (
      (!this.isTransitionToolActive() && !this.isAutolinkInsertionToolActive()) ||
      this.isLinkToolHoverableNode(nodeId)
    );
  }

  private isLinkToolHoverableNode(nodeId: string): boolean {
    if (this.isAutolinkInsertionToolActive()) {
      return this.store.isCanvasGroupExitNode(nodeId);
    }

    const sourceNodeId = this.transitionSourceNodeId();

    if (sourceNodeId) {
      return sourceNodeId !== nodeId;
    }

    return this.store.isCanvasGroupExitNode(nodeId);
  }

  private handleAutolinkNodeClick(nodeId: string): void {
    if (!this.store.isCanvasGroupExitNode(nodeId)) {
      return;
    }

    this.autolinkTargetNodeId.set(nodeId);
    this.conditionDialogMode.set('autolink');
    this.conditionDialogVisible.set(true);
    this.store.selectCanvasNodeForTransition(nodeId);
  }

  private getNodeCursorSide(event: MouseEvent): 'left' | 'right' {
    const bounds = (event.currentTarget as SVGGraphicsElement).getBoundingClientRect();
    const midpoint = bounds.left + bounds.width / 2;

    return event.clientX < midpoint ? 'left' : 'right';
  }

  private handleTransitionNodeClick(nodeId: string): void {
    const sourceNodeId = this.transitionSourceNodeId();

    if (!sourceNodeId) {
      const exitNodeId = this.store.getCanvasGroupExitNodeId(nodeId);

      if (!exitNodeId) {
        return;
      }

      this.transitionSourceNodeId.set(exitNodeId);
      this.store.selectCanvasNodeForTransition(exitNodeId);
      const sourceNode = this.machineGraphView().nodes.find((node) => node.nodeId === exitNodeId);

      if (sourceNode) {
        this.transitionDraftEndPoint.set(this.getNodeRightAnchor(sourceNode));
      }

      return;
    }

    if (sourceNodeId === nodeId) {
      return;
    }

    if (this.store.activeToolId() === 'conditional-transition') {
      this.conditionalTransitionTargetNodeId.set(nodeId);
      this.conditionDialogMode.set('conditional-link');
      this.conditionDialogVisible.set(true);
      return;
    }

    this.store.createUnconditionalLinkBetweenNodes(sourceNodeId, nodeId);
    this.clearTransitionDraft();
  }

  private updateTransitionDraft(event: PointerEvent): void {
    if (!this.isLinkInsertionToolActive() || !this.transitionSourceNodeId()) {
      return;
    }

    this.transitionDraftEndPoint.set(this.getSvgPoint(event.currentTarget as SVGSVGElement, event));
  }

  private getNodeRightAnchor(node: { label: string; position: ViewPoint; width?: number }): ViewPoint {
    const width = node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: node.position.x + width,
      y: node.position.y - 10,
    };
  }

  acceptConditionalTransition(): void {
    const sourceNodeId = this.transitionSourceNodeId();
    const targetNodeId = this.conditionalTransitionTargetNodeId();

    if (this.conditionDialogMode() === 'autolink') {
      this.acceptAutolinkCondition();
      return;
    }

    if (!sourceNodeId || !targetNodeId) {
      this.cancelConditionalTransition();
      return;
    }

    this.store.createConditionalLinkBetweenNodes(sourceNodeId, targetNodeId, {
      tapeIndex: this.conditionTapeIndex,
      acceptedValues: [this.conditionSymbol],
      negated: this.conditionNegated,
    });
    this.conditionDialogVisible.set(false);
    this.conditionalTransitionTargetNodeId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  cancelConditionalTransition(): void {
    this.conditionDialogVisible.set(false);
    this.conditionalTransitionTargetNodeId.set(null);
    this.autolinkTargetNodeId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  clearConditionDialog(): void {
    this.conditionTapeIndex = 0;
    this.conditionNegated = false;
    this.conditionSymbol = this.conditionSymbols[0];
    this.autolinkOrientation = 'right';
  }

  private acceptAutolinkCondition(): void {
    const nodeId = this.autolinkTargetNodeId();

    if (!nodeId) {
      this.cancelConditionalTransition();
      return;
    }

    this.store.createConditionalAutolinkForNode(
      nodeId,
      {
        tapeIndex: this.conditionTapeIndex,
        acceptedValues: [this.conditionSymbol],
        negated: this.conditionNegated,
      },
      this.autolinkOrientation,
    );
    this.conditionDialogVisible.set(false);
    this.autolinkTargetNodeId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  private clearTransitionDraft(): void {
    this.transitionSourceNodeId.set(null);
    this.transitionDraftEndPoint.set(null);
    this.store.clearCanvasSelection();
  }

  private getSvgPoint(svg: SVGSVGElement, event: MouseEvent | PointerEvent): ViewPoint {
    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

    return {
      x: transformedPoint.x,
      y: transformedPoint.y,
    };
  }

  private getAutolinkPath(link: MachineLinkView): string {
    const anchor = this.getAutolinkAnchor(link);
    const centerX = anchor.x + 8;
    const centerY = anchor.y - 8;

    switch (link.autolinkOrientation ?? 'right') {
      case 'top':
        return [
          `M ${centerX - 14} ${centerY - 3}`,
          `C ${centerX - 28} ${centerY - 38}, ${centerX + 28} ${centerY - 38}, ${centerX + 14} ${centerY - 3}`,
        ].join(' ');
      case 'bottom':
        return [
          `M ${centerX + 14} ${centerY + 3}`,
          `C ${centerX + 28} ${centerY + 38}, ${centerX - 28} ${centerY + 38}, ${centerX - 14} ${centerY + 3}`,
        ].join(' ');
      case 'left':
        return [
          `M ${anchor.x - 3} ${centerY + 14}`,
          `C ${anchor.x - 38} ${centerY + 28}, ${anchor.x - 38} ${centerY - 28}, ${anchor.x - 3} ${centerY - 14}`,
        ].join(' ');
      case 'right':
        const x = anchor.x + 6;
        const y = anchor.y - 8;

        return [
          `M ${x + 3} ${y + 14}`,
          `C ${x + 38} ${y + 28}, ${x + 38} ${y - 28}, ${x + 3} ${y - 14}`,
        ].join(' ');
    }
  }

  private getAutolinkLabelPosition(link: MachineLinkView): ViewPoint {
    const anchor = this.getAutolinkAnchor(link);
    const centerX = anchor.x + 8;
    const centerY = anchor.y - 8;

    switch (link.autolinkOrientation ?? 'right') {
      case 'top':
        return { x: centerX - 8, y: centerY - 36 };
      case 'bottom':
        return { x: centerX - 8, y: centerY + 42 };
      case 'left':
        return { x: anchor.x - 48, y: centerY + 4 };
      case 'right':
        return { x: anchor.x + 38, y: anchor.y - 4 };
    }
  }

  private getAutolinkAnchor(link: MachineLinkView): ViewPoint {
    return link.points?.[0] ?? { x: 0, y: 0 };
  }
}
