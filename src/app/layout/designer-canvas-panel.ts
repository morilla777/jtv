import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { MessageService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';

import { ConditionDialog, ConditionDialogValue } from '../components/condition-dialog';
import { ParameterAssignmentDialog } from '../components/parameter-assignment-dialog';
import { TranslationService } from '../services/translation.service';
import { JtvStore } from '../stores/jtv.store';
import { MachineLinkView, MachineNodeView, ViewPoint } from '../models/view';

@Component({
  selector: 'app-designer-canvas-panel',
  imports: [ButtonModule, ContextMenuModule, ConditionDialog, ParameterAssignmentDialog],
  template: `
    <div class="panel">
      <p-contextMenu #nodeContextMenu [model]="nodeContextMenuItems">
        <ng-template #item let-item>
          <div class="node-context-menu-item">
            <img class="node-context-menu-icon" [src]="item.data.iconSrc" alt="" />
            <span>{{ item.label }}</span>
          </div>
        </ng-template>
      </p-contextMenu>
      <p-contextMenu #linkContextMenu [model]="linkContextMenuItems">
        <ng-template #item let-item>
          <div class="node-context-menu-item">
            <img class="node-context-menu-icon" [src]="item.data.iconSrc" alt="" />
            <span>{{ item.label }}</span>
          </div>
        </ng-template>
      </p-contextMenu>

      <div class="canvas-container">
        <svg
          #designerSvg
          class="designer-svg"
          [attr.viewBox]="viewBox()"
          preserveAspectRatio="xMinYMin slice"
          aria-label="Maquina de Turing modular"
          (pointermove)="handleCanvasPointerMove($event)"
          (pointerup)="stopDragging()"
          (pointerleave)="stopDragging()"
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
            [attr.width]="canvasWidth()"
            [attr.height]="canvasHeight()"
            class="canvas-background"
            (click)="handleCanvasClick($event)"
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
                  (click)="handleNodeClick(node.nodeId, $event); $event.stopPropagation()"
                  (dblclick)="editSubmachineParameters(node.nodeId, $event)"
                  (contextmenu)="showNodeContextMenu(node.nodeId, $event)"
                >
                  &gt;
                </text>
              }

              @if (node.kind === 'hub') {
                <circle
                  [attr.cx]="node.position.x"
                  [attr.cy]="node.position.y"
                  r="6"
                  class="machine-hub"
                  [class.machine-hub-selected]="node.selected"
                  [class.machine-hub-canvas-selected]="node.canvasSelected || isTransitionSourceNode(node.nodeId)"
                  [class.machine-hub-hovered]="isHoveredNode(node.nodeId)"
                  (mouseenter)="hoverNode(node.nodeId, $event)"
                  (mousemove)="hoverNode(node.nodeId, $event)"
                  (mouseleave)="clearHoveredElement()"
                  (pointerdown)="startDraggingNodeGroup(node.nodeId, $event)"
                  (click)="handleNodeClick(node.nodeId, $event); $event.stopPropagation()"
                  (contextmenu)="showNodeContextMenu(node.nodeId, $event)"
                ></circle>
              } @else {
                <text
                  [attr.x]="node.position.x"
                  [attr.y]="node.position.y"
                  class="machine-text"
                  [class.machine-text-parameter]="node.kind === 'parameter'"
                  [class.machine-text-selected]="node.selected"
                  [class.machine-text-canvas-selected]="node.canvasSelected || isTransitionSourceNode(node.nodeId)"
                  [class.machine-text-hovered]="isHoveredNode(node.nodeId)"
                  (mouseenter)="hoverNode(node.nodeId, $event)"
                  (mousemove)="hoverNode(node.nodeId, $event)"
                  (mouseleave)="clearHoveredElement()"
                  (pointerdown)="startDraggingNodeGroup(node.nodeId, $event)"
                  (click)="handleNodeClick(node.nodeId, $event); $event.stopPropagation()"
                  (dblclick)="editSubmachineParameters(node.nodeId, $event)"
                  (contextmenu)="showNodeContextMenu(node.nodeId, $event)"
                >
                  <tspan>{{ node.label }}</tspan>
                  @if (node.subscriptLabel) {
                    <tspan class="machine-node-subscript" baseline-shift="sub">{{ node.subscriptLabel }}</tspan>
                  }
                  @if (showTapeIndexes()) {
                    <tspan class="machine-node-tape-index" baseline-shift="super" dy="-8">({{ getNodeTapeNumber(node) }})</tspan>
                  }
                </text>
              }
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
                class="arrow-hit-area"
                (mouseenter)="hoverLink(link.linkId)"
                (mouseleave)="clearHoveredElement()"
                (click)="selectLink(link.linkId); $event.stopPropagation()"
                (dblclick)="editLink(link.linkId, $event)"
                (contextmenu)="showLinkContextMenu(link.linkId, $event)"
              ></path>

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
                (dblclick)="editLink(link.linkId, $event)"
                (contextmenu)="showLinkContextMenu(link.linkId, $event)"
              ></path>

              @if (link.label) {
                @if (getNegatedSymbolLabel(link.label); as symbol) {
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
                    (dblclick)="editLink(link.linkId, $event)"
                    (contextmenu)="showLinkContextMenu(link.linkId, $event)"
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
                    (dblclick)="editLink(link.linkId, $event)"
                    (contextmenu)="showLinkContextMenu(link.linkId, $event)"
                  >
                    {{ link.label }}
                  </text>
                }
              }

              @if (isPointerToolActive() && link.kind !== 'autolink') {
                @for (vertex of getLinkVertices(link); track vertex.pointIndex) {
                  <circle
                    [attr.cx]="vertex.point.x"
                    [attr.cy]="vertex.point.y"
                    r="4"
                    class="link-vertex"
                    [class.link-vertex-selected]="link.canvasSelected"
                    (pointerdown)="startDraggingLinkVertex(link.linkId, vertex.pointIndex, $event)"
                    (mouseenter)="hoverLink(link.linkId)"
                    (mouseleave)="clearHoveredElement()"
                    (click)="selectLink(link.linkId); $event.stopPropagation()"
                    (contextmenu)="showLinkContextMenu(link.linkId, $event)"
                  ></circle>
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

            @for (vertex of transitionDraftVertices(); track $index) {
              <circle
                [attr.cx]="vertex.x"
                [attr.cy]="vertex.y"
                r="3"
                class="link-vertex link-vertex-draft"
              ></circle>
            }
          </g>
        </svg>
      </div>

      <app-condition-dialog
        [visible]="conditionDialogVisible()"
        [showOrientation]="conditionDialogMode() === 'autolink'"
        [leftOrientationDisabled]="isAutolinkLeftOrientationDisabled()"
        [tapeOptions]="tapeOptions()"
        [symbols]="conditionSymbols"
        [variables]="conditionVariables"
        [parameters]="conditionParameters"
        [value]="conditionDialogDraft"
        (accept)="acceptConditionalTransition($event)"
        (cancel)="cancelConditionalTransition()"
      />

      <app-parameter-assignment-dialog
        [(visible)]="submachineParameterDialogVisible"
        [parameters]="submachineParameterDialogParameters"
        [symbolOptions]="conditionSymbols"
        [assignments]="submachineParameterDialogAssignments"
        (assignmentsChange)="saveSubmachineParameterAssignments($event)"
      />
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

    .arrow-hit-area {
      fill: none;
      stroke: transparent;
      stroke-width: 12;
      stroke-linecap: round;
      cursor: default;
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

    .machine-text-parameter {
      fill: rgb(0, 204, 0);
    }

    .machine-node-tape-index {
      font-size: 12px;
    }

    .machine-node-subscript {
      font-size: 12px;
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

    .machine-hub {
      fill: #000;
    }

    .machine-hub-selected {
      fill: red;
    }

    .machine-hub-hovered {
      fill: rgb(255, 175, 175);
    }

    .machine-hub-canvas-selected {
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

    .link-vertex {
      fill: #fff;
      stroke: rgb(255, 0, 255);
      stroke-width: 1.25;
      cursor: move;
    }

    .link-vertex-selected {
      fill: rgb(255, 230, 255);
    }

    .link-vertex-draft {
      pointer-events: none;
    }

    .overline-symbol {
      text-decoration: overline;
    }

    .node-context-menu-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 8rem;
    }

    .node-context-menu-icon {
      width: 16px;
      height: 16px;
      object-fit: contain;
      image-rendering: pixelated;
      flex: 0 0 auto;
    }
  `],
})
export class DesignerCanvasPanel implements AfterViewInit, OnDestroy {
  private readonly store = inject(JtvStore);
  private readonly messageService = inject(MessageService);
  private readonly i18n = inject(TranslationService);
  @ViewChild('nodeContextMenu') private nodeContextMenu?: ContextMenu;
  @ViewChild('linkContextMenu') private linkContextMenu?: ContextMenu;
  @ViewChild('designerSvg') private designerSvg?: ElementRef<SVGSVGElement>;
  private readonly hoveredNodeId = signal<string | null>(null);
  private readonly hoveredLinkId = signal<string | null>(null);
  private readonly hoveredNodeCursorSide = signal<'left' | 'right'>('right');
  private readonly transitionSourceNodeId = signal<string | null>(null);
  private readonly transitionDraftEndPoint = signal<ViewPoint | null>(null);
  readonly transitionDraftVertices = signal<ViewPoint[]>([]);
  readonly showTapeIndexes = computed(() => this.store.tapes().length > 1);
  private readonly conditionalTransitionTargetNodeId = signal<string | null>(null);
  private readonly autolinkTargetNodeId = signal<string | null>(null);
  private readonly editingLinkId = signal<string | null>(null);
  private resizeObserver: ResizeObserver | null = null;
  readonly conditionDialogMode = signal<'conditional-link' | 'autolink' | null>(null);
  readonly conditionDialogVisible = signal(false);
  private draggedNodeGroup: { nodeId: string; lastPoint: ViewPoint } | null = null;
  private readonly clearTransitionDraftWhenToolChanges = effect(() => {
    if (!this.isLinkInsertionToolActive() && !this.isAutolinkInsertionToolActive()) {
      this.transitionSourceNodeId.set(null);
      this.transitionDraftEndPoint.set(null);
      this.transitionDraftVertices.set([]);
      this.conditionalTransitionTargetNodeId.set(null);
      this.autolinkTargetNodeId.set(null);
      this.editingLinkId.set(null);
      this.conditionDialogMode.set(null);
      this.conditionDialogVisible.set(false);
    }
  });

  readonly canvasWidth = signal(560);
  readonly canvasHeight = signal(340);
  readonly machineGraphView = computed(() => this.store.machineGraphView());
  readonly viewBox = computed(() => `0 0 ${this.canvasWidth()} ${this.canvasHeight()}`);
  readonly isPointerToolActive = computed(() => this.store.activeToolId() === 'pointer');
  readonly isLinkInsertionToolActive = computed(() =>
    ['transition', 'conditional-transition'].includes(this.store.activeToolId() ?? ''),
  );
  readonly isAutolinkInsertionToolActive = computed(() => this.store.activeToolId() === 'loop-transition');
  readonly isTransitionToolActive = computed(() => this.isLinkInsertionToolActive());
  readonly isNodeInsertionToolActive = computed(() =>
    ['move-left', 'move-right', 'symbol-lowercase', 'symbol-variable', 'symbol-uppercase', 'hub', 'search-left', 'search-right'].includes(this.store.activeToolId() ?? ''),
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

    const width = node.kind === 'hub' ? 12 : node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: this.hoveredNodeCursorSide() === 'left' ? node.position.x - 5 : node.position.x + width,
      y1: node.kind === 'hub' ? node.position.y - 10 : node.position.y - 26,
      y2: node.kind === 'hub' ? node.position.y + 10 : node.position.y + 6,
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
    const points = [sourcePoint, ...this.transitionDraftVertices(), endPoint];

    return this.getPolylinePath(points);
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
  readonly conditionVariables = [
    'α',
    'β',
    'γ',
    'δ',
    'ε',
    'ζ',
    'η',
    'θ',
    'ι',
    'κ',
    'λ',
    'μ',
    'ν',
    'ξ',
    'ο',
    'π',
    'ρ',
    'σ',
    'τ',
    'υ',
    'φ',
    'χ',
    'ψ',
    'ω',
  ];
  readonly conditionParameters = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
  readonly isAutolinkLeftOrientationDisabled = computed(() => {
    if (this.conditionDialogMode() !== 'autolink') {
      return false;
    }

    const nodeId = this.autolinkTargetNodeId();

    return nodeId ? this.store.hasCanvasNodeLeftNeighbor(nodeId) : false;
  });

  conditionTapeIndex = 0;
  conditionNegated = false;
  conditionAssignToVariable: string | null = null;
  conditionSymbolsSelected: string[] = [this.conditionSymbols[0]];
  conditionVariablesSelected: string[] = [];
  conditionParametersSelected: string[] = [];
  autolinkOrientation: 'top' | 'bottom' | 'left' | 'right' = 'right';
  conditionDialogDraft: ConditionDialogValue = this.createConditionDialogValue();
  submachineParameterDialogVisible = false;
  submachineParameterDialogNodeId: string | null = null;
  submachineParameterDialogParameters: readonly string[] = [];
  submachineParameterDialogAssignments: Readonly<Record<string, string>> = {};
  private contextMenuNodeId: string | null = null;
  private contextMenuLinkId: string | null = null;
  private draggedLinkVertex: { linkId: string; pointIndex: number; lastPoint: ViewPoint } | null = null;

  readonly nodeContextMenuItems: MenuItem[] = [
    {
      label: 'Hacer Inicial',
      data: {
        iconSrc: 'assets/images/Start16.gif',
      },
      disabled: true,
      command: () => this.makeContextNodeInitial(),
    },
    {
      label: 'Eliminar',
      data: {
        iconSrc: 'assets/images/Delete16.gif',
      },
      command: () => this.deleteContextNode(),
    },
  ];
  readonly linkContextMenuItems: MenuItem[] = [
    {
      label: 'Eliminar',
      data: {
        iconSrc: 'assets/images/Delete16.gif',
      },
      command: () => this.deleteContextLink(),
    },
  ];

  ngAfterViewInit(): void {
    this.updateCanvasSize();

    const svg = this.designerSvg?.nativeElement;

    if (!svg) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(svg);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  getLinkPath(link: MachineLinkView): string {
    if (link.kind === 'autolink') {
      return this.getAutolinkPath(link);
    }

    const points = link.points ?? [];

    if (points.length === 0) {
      return '';
    }

    return this.getPolylinePath(points);
  }

  getLinkLabelPosition(link: MachineLinkView): ViewPoint {
    if (link.kind === 'autolink') {
      return this.getAutolinkLabelPosition(link);
    }

    const points = link.points ?? [];

    if (points.length < 2) {
      return points[0] ?? { x: 0, y: 0 };
    }

    const { startPoint, endPoint } = this.getLongestSegment(points);

    return {
      x: (startPoint.x + endPoint.x) / 2 - 8,
      y: (startPoint.y + endPoint.y) / 2 - 6,
    };
  }

  getNegatedSymbolLabel(label: string): string | null {
    return /^\[not (.+)\]$/.exec(label)?.[1] ?? null;
  }

  getNodeTapeNumber(node: MachineNodeView): number {
    return (node.tapeIndex ?? 0) + 1;
  }

  getLinkVertices(link: MachineLinkView): { point: ViewPoint; pointIndex: number }[] {
    const points = link.points ?? [];

    return points.slice(1, -1).map((point, index) => ({
      point,
      pointIndex: index + 1,
    }));
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

  handleNodeClick(nodeId: string, event?: MouseEvent): void {
    if (event && event.detail >= 2 && this.openSubmachineParameterDialog(nodeId, event)) {
      return;
    }

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

  editLink(linkId: string, event: MouseEvent): void {
    if (!this.isPointerToolActive()) {
      return;
    }

    const editState = this.store.getCanvasLinkEditState(linkId);

    if (!editState) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.draggedNodeGroup = null;
    this.clearTransitionDraft();
    this.store.selectCanvasLink(linkId);
    this.editingLinkId.set(linkId);
    this.conditionTapeIndex = editState.clause.tapeIndex;
    this.conditionNegated = editState.clause.negated ?? false;
    this.conditionAssignToVariable = editState.clause.assignToVariableName ?? null;
    this.conditionSymbolsSelected = editState.clause.acceptedValues.filter((value) => this.conditionSymbols.includes(value));
    this.conditionVariablesSelected = editState.clause.acceptedValues.filter((value) => this.conditionVariables.includes(value));
    this.conditionParametersSelected = editState.clause.acceptedValues.filter((value) => this.conditionParameters.includes(value));
    this.autolinkOrientation = editState.autolinkOrientation ?? 'right';
    this.autolinkTargetNodeId.set(editState.nodeId ?? null);
    this.conditionDialogMode.set(editState.mode);
    this.normalizeAutolinkOrientation();
    this.refreshConditionDialogDraft();
    this.conditionDialogVisible.set(true);
  }

  editSubmachineParameters(nodeId: string, event: MouseEvent): void {
    this.openSubmachineParameterDialog(nodeId, event);
  }

  private openSubmachineParameterDialog(nodeId: string, event: MouseEvent): boolean {
    if (!this.isPointerToolActive()) {
      return false;
    }

    const editState = this.store.getCanvasSubmachineParameterEditState(nodeId);

    if (!editState) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    this.draggedNodeGroup = null;
    this.clearTransitionDraft();
    this.store.selectCanvasNode(nodeId);
    this.submachineParameterDialogNodeId = nodeId;
    this.submachineParameterDialogParameters = editState.parameters;
    this.submachineParameterDialogAssignments = editState.assignments;
    this.submachineParameterDialogVisible = true;

    return true;
  }

  handleCanvasPointerMove(event: PointerEvent): void {
    this.dragSelectedNodeGroup(event);
    this.dragLinkVertex(event);
    this.updateTransitionDraft(event);
  }

  handleCanvasClick(event: MouseEvent): void {
    if (this.addTransitionDraftVertex(event)) {
      return;
    }

    this.insertNodeOnCanvas(event);
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
    this.stopDragging();
    this.store.selectCanvasNode(nodeId);
    this.store.beginMachineHistoryTransaction();
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

  startDraggingLinkVertex(linkId: string, pointIndex: number, event: PointerEvent): void {
    if (!this.isPointerToolActive()) {
      return;
    }

    const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;
    const point = svg ? this.getSvgPoint(svg, event) : null;

    if (!point) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.stopDragging();
    this.store.beginMachineHistoryTransaction();
    this.store.selectCanvasLink(linkId);
    this.draggedLinkVertex = {
      linkId,
      pointIndex,
      lastPoint: point,
    };
  }

  dragLinkVertex(event: PointerEvent): void {
    if (!this.draggedLinkVertex) {
      return;
    }

    const point = this.getSvgPoint(event.currentTarget as SVGSVGElement, event);
    const delta = {
      x: point.x - this.draggedLinkVertex.lastPoint.x,
      y: point.y - this.draggedLinkVertex.lastPoint.y,
    };

    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    this.store.moveCanvasLinkVertex(this.draggedLinkVertex.linkId, this.draggedLinkVertex.pointIndex, delta);
    this.draggedLinkVertex = {
      ...this.draggedLinkVertex,
      lastPoint: point,
    };
  }

  stopDragging(): void {
    const hadDrag = !!this.draggedNodeGroup || !!this.draggedLinkVertex;

    this.draggedNodeGroup = null;
    this.draggedLinkVertex = null;

    if (hadDrag) {
      this.store.commitMachineHistoryTransaction();
    }
  }

  addTransitionDraftVertex(event: MouseEvent): boolean {
    if (!this.isTransitionToolActive() || !this.transitionSourceNodeId()) {
      return false;
    }

    const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;

    if (!svg) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    this.transitionDraftVertices.update((vertices) => [...vertices, this.getSvgPoint(svg, event)]);

    return true;
  }

  showNodeContextMenu(nodeId: string, event: MouseEvent): void {
    if (!this.isPointerToolActive()) {
      this.cancelTransitionDraft(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.draggedNodeGroup = null;
    this.contextMenuNodeId = nodeId;
    this.store.selectCanvasNode(nodeId);
    this.nodeContextMenuItems[0].disabled = !this.canMakeContextNodeInitial();
    this.nodeContextMenu?.show(event);
  }

  showLinkContextMenu(linkId: string, event: MouseEvent): void {
    if (!this.isPointerToolActive()) {
      this.cancelTransitionDraft(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.draggedNodeGroup = null;
    this.contextMenuLinkId = linkId;
    this.store.selectCanvasLink(linkId);
    this.linkContextMenu?.show(event);
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

    if (this.store.hasCanvasNodeAutolink(nodeId)) {
      this.messageService.add({
        key: 'simulation',
        severity: 'warn',
        summary: 'JTV',
        detail: this.i18n.translate('toast.duplicateAutolink'),
        sticky: true,
        closable: true,
      });
      return;
    }

    this.autolinkTargetNodeId.set(nodeId);
    this.conditionDialogMode.set('autolink');
    this.normalizeAutolinkOrientation();
    this.refreshConditionDialogDraft();
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
      this.refreshConditionDialogDraft();
      this.conditionDialogVisible.set(true);
      return;
    }

    this.store.createUnconditionalLinkBetweenNodes(sourceNodeId, nodeId, this.transitionDraftVertices());
    this.clearTransitionDraft();
  }

  private updateTransitionDraft(event: PointerEvent): void {
    if (!this.isLinkInsertionToolActive() || !this.transitionSourceNodeId()) {
      return;
    }

    this.transitionDraftEndPoint.set(this.getSvgPoint(event.currentTarget as SVGSVGElement, event));
  }

  private getNodeRightAnchor(node: { kind?: string; label: string; position: ViewPoint; width?: number }): ViewPoint {
    if (node.kind === 'hub') {
      return {
        x: node.position.x + 6,
        y: node.position.y,
      };
    }

    const width = node.width ?? Math.max(16, node.label.length * 14);

    return {
      x: node.position.x + width,
      y: node.position.y - 10,
    };
  }

  private createConditionDialogValue(): ConditionDialogValue {
    return {
      tapeIndex: this.conditionTapeIndex,
      negated: this.conditionNegated,
      assignToVariable: this.conditionAssignToVariable,
      selectedSymbols: [...this.conditionSymbolsSelected],
      selectedVariables: [...this.conditionVariablesSelected],
      selectedParameters: [...this.conditionParametersSelected],
      orientation: this.autolinkOrientation,
    };
  }

  private refreshConditionDialogDraft(): void {
    this.conditionDialogDraft = this.createConditionDialogValue();
  }

  acceptConditionalTransition(value: ConditionDialogValue): void {
    this.applyConditionDialogValue(value);
    const editingLinkId = this.editingLinkId();

    if (editingLinkId) {
      this.store.updateCanvasLinkCondition(
        editingLinkId,
        {
          tapeIndex: this.conditionTapeIndex,
          assignToVariableName: this.conditionAssignToVariable ?? undefined,
          acceptedValues: this.getAcceptedConditionValues(),
          negated: this.conditionNegated,
        },
        this.conditionDialogMode() === 'autolink' ? this.autolinkOrientation : undefined,
      );
      this.conditionDialogVisible.set(false);
      this.conditionDialogMode.set(null);
      this.editingLinkId.set(null);
      this.autolinkTargetNodeId.set(null);
      return;
    }

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
      assignToVariableName: this.conditionAssignToVariable ?? undefined,
      acceptedValues: this.getAcceptedConditionValues(),
      negated: this.conditionNegated,
    }, this.transitionDraftVertices());
    this.conditionDialogVisible.set(false);
    this.conditionalTransitionTargetNodeId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  cancelConditionalTransition(): void {
    this.conditionDialogVisible.set(false);
    this.conditionalTransitionTargetNodeId.set(null);
    this.autolinkTargetNodeId.set(null);
    this.editingLinkId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  saveSubmachineParameterAssignments(assignments: Record<string, string>): void {
    if (!this.submachineParameterDialogNodeId) {
      return;
    }

    this.store.updateCanvasSubmachineParameterAssignments(
      this.submachineParameterDialogNodeId,
      assignments,
    );
    this.submachineParameterDialogNodeId = null;
    this.submachineParameterDialogParameters = [];
    this.submachineParameterDialogAssignments = {};
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
        assignToVariableName: this.conditionAssignToVariable ?? undefined,
        acceptedValues: this.getAcceptedConditionValues(),
        negated: this.conditionNegated,
      },
      this.autolinkOrientation,
    );
    this.conditionDialogVisible.set(false);
    this.autolinkTargetNodeId.set(null);
    this.conditionDialogMode.set(null);
    this.clearTransitionDraft();
  }

  private normalizeAutolinkOrientation(): void {
    if (this.autolinkOrientation === 'left' && this.isAutolinkLeftOrientationDisabled()) {
      this.autolinkOrientation = 'right';
    }
  }

  private getAcceptedConditionValues(): string[] {
    return [...this.conditionSymbolsSelected, ...this.conditionVariablesSelected, ...this.conditionParametersSelected];
  }

  private applyConditionDialogValue(value: ConditionDialogValue): void {
    this.conditionTapeIndex = value.tapeIndex;
    this.conditionNegated = value.negated;
    this.conditionAssignToVariable = value.assignToVariable;
    this.conditionSymbolsSelected = [...value.selectedSymbols];
    this.conditionVariablesSelected = [...value.selectedVariables];
    this.conditionParametersSelected = [...value.selectedParameters];
    this.autolinkOrientation = value.orientation;
  }

  private clearTransitionDraft(): void {
    this.transitionSourceNodeId.set(null);
    this.transitionDraftEndPoint.set(null);
    this.transitionDraftVertices.set([]);
    this.store.clearCanvasSelection();
  }

  private makeContextNodeInitial(): void {
    if (!this.contextMenuNodeId) {
      return;
    }

    this.store.makeCanvasNodeInitial(this.contextMenuNodeId);
  }

  private deleteContextNode(): void {
    if (!this.contextMenuNodeId) {
      return;
    }

    this.store.deleteCanvasNode(this.contextMenuNodeId);
    this.contextMenuNodeId = null;
  }

  private deleteContextLink(): void {
    if (!this.contextMenuLinkId) {
      return;
    }

    this.store.deleteCanvasLink(this.contextMenuLinkId);
    this.contextMenuLinkId = null;
  }

  private canMakeContextNodeInitial(): boolean {
    return this.contextMenuNodeId ? this.store.canMakeCanvasNodeInitial(this.contextMenuNodeId) : false;
  }

  private updateCanvasSize(): void {
    const bounds = this.designerSvg?.nativeElement.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    this.canvasWidth.set(Math.max(560, Math.ceil(bounds.width)));
    this.canvasHeight.set(Math.max(340, Math.ceil(bounds.height)));
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

  private getPolylinePath(points: readonly ViewPoint[]): string {
    const [startPoint, ...restPoints] = points;

    if (!startPoint) {
      return '';
    }

    return [
      `M ${startPoint.x} ${startPoint.y}`,
      ...restPoints.map((point) => `L ${point.x} ${point.y}`),
    ].join(' ');
  }

  private getLongestSegment(points: readonly ViewPoint[]): { startPoint: ViewPoint; endPoint: ViewPoint } {
    let startPoint = points[0];
    let endPoint = points[1];
    let maxDistance = this.getSquaredDistance(startPoint, endPoint);

    for (let index = 1; index < points.length - 1; index++) {
      const currentStart = points[index];
      const currentEnd = points[index + 1];
      const distance = this.getSquaredDistance(currentStart, currentEnd);

      if (distance > maxDistance) {
        startPoint = currentStart;
        endPoint = currentEnd;
        maxDistance = distance;
      }
    }

    return { startPoint, endPoint };
  }

  private getSquaredDistance(first: ViewPoint, second: ViewPoint): number {
    return (second.x - first.x) ** 2 + (second.y - first.y) ** 2;
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
