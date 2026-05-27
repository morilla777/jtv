import { Component, computed, inject, signal } from '@angular/core';

import { JtvStore } from '../stores/jtv.store';
import { MachineLinkView, ViewPoint } from '../models/view';

@Component({
  selector: 'app-designer-canvas-panel',
  imports: [],
  template: `
    <div class="panel">
      <div class="canvas-container">
        <svg class="designer-svg" [attr.viewBox]="viewBox()" preserveAspectRatio="xMinYMin meet" aria-label="Maquina de Turing modular">
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

          <rect x="0" y="0" [attr.width]="canvasWidth" [attr.height]="canvasHeight" class="canvas-background"></rect>

          <g class="machine-diagram">
            @for (node of machineGraphView().nodes; track node.nodeId) {
              @if (node.initial) {
                <text
                  [attr.x]="node.position.x - 18"
                  [attr.y]="node.position.y"
                  class="machine-text"
                  [class.machine-text-selected]="node.selected"
                  [class.machine-text-canvas-selected]="node.canvasSelected"
                  [class.machine-text-hovered]="isHoveredNode(node.nodeId)"
                  (mouseenter)="hoverNode(node.nodeId, $event)"
                  (mousemove)="hoverNode(node.nodeId, $event)"
                  (mouseleave)="clearHoveredElement()"
                  (click)="selectNode(node.nodeId)"
                >
                  &gt;
                </text>
              }

              <text
                [attr.x]="node.position.x"
                [attr.y]="node.position.y"
                class="machine-text"
                [class.machine-text-selected]="node.selected"
                [class.machine-text-canvas-selected]="node.canvasSelected"
                [class.machine-text-hovered]="isHoveredNode(node.nodeId)"
                (mouseenter)="hoverNode(node.nodeId, $event)"
                (mousemove)="hoverNode(node.nodeId, $event)"
                (mouseleave)="clearHoveredElement()"
                (click)="selectNode(node.nodeId)"
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
                (click)="selectLink(link.linkId)"
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
                    (click)="selectLink(link.linkId)"
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
                    (click)="selectLink(link.linkId)"
                  >
                    {{ link.label }}
                  </text>
                }
              }
            }
          </g>
        </svg>
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

    .overline-symbol {
      text-decoration: overline;
    }
  `],
})
export class DesignerCanvasPanel {
  private readonly store = inject(JtvStore);
  private readonly hoveredNodeId = signal<string | null>(null);
  private readonly hoveredLinkId = signal<string | null>(null);
  private readonly hoveredNodeCursorSide = signal<'left' | 'right'>('right');

  readonly canvasWidth = 560;
  readonly canvasHeight = 340;
  readonly machineGraphView = computed(() => this.store.machineGraphView());
  readonly viewBox = computed(() => `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
  readonly isPointerToolActive = computed(() => this.store.activeToolId() === 'pointer');
  readonly isNodeInsertionToolActive = computed(() => ['move-left', 'move-right'].includes(this.store.activeToolId() ?? ''));
  readonly isCanvasCursorActive = computed(() => this.isPointerToolActive() || this.isNodeInsertionToolActive());
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

  isHoveredNode(nodeId: string): boolean {
    return this.isCanvasCursorActive() && this.hoveredNodeId() === nodeId;
  }

  isHoveredLink(linkId: string): boolean {
    return this.isCanvasCursorActive() && this.hoveredLinkId() === linkId;
  }

  private getNodeCursorSide(event: MouseEvent): 'left' | 'right' {
    const bounds = (event.currentTarget as SVGGraphicsElement).getBoundingClientRect();
    const midpoint = bounds.left + bounds.width / 2;

    return event.clientX < midpoint ? 'left' : 'right';
  }

  private getAutolinkPath(link: MachineLinkView): string {
    const anchor = this.getAutolinkAnchor(link);

    switch (link.autolinkOrientation ?? 'right') {
      case 'top':
        return [
          `M ${anchor.x - 16} ${anchor.y - 12}`,
          `C ${anchor.x - 34} ${anchor.y - 48}, ${anchor.x + 34} ${anchor.y - 48}, ${anchor.x + 16} ${anchor.y - 12}`,
        ].join(' ');
      case 'bottom':
        return [
          `M ${anchor.x + 16} ${anchor.y + 12}`,
          `C ${anchor.x + 34} ${anchor.y + 48}, ${anchor.x - 34} ${anchor.y + 48}, ${anchor.x - 16} ${anchor.y + 12}`,
        ].join(' ');
      case 'left':
        return [
          `M ${anchor.x - 12} ${anchor.y + 16}`,
          `C ${anchor.x - 48} ${anchor.y + 34}, ${anchor.x - 48} ${anchor.y - 34}, ${anchor.x - 12} ${anchor.y - 16}`,
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

    switch (link.autolinkOrientation ?? 'right') {
      case 'top':
        return { x: anchor.x + 30, y: anchor.y - 36 };
      case 'bottom':
        return { x: anchor.x + 30, y: anchor.y + 42 };
      case 'left':
        return { x: anchor.x - 58, y: anchor.y + 4 };
      case 'right':
        return { x: anchor.x + 44, y: anchor.y - 4 };
    }
  }

  private getAutolinkAnchor(link: MachineLinkView): ViewPoint {
    return link.points?.[0] ?? { x: 0, y: 0 };
  }
}
