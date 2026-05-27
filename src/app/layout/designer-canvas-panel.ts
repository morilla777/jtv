import { Component, computed, inject } from '@angular/core';

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
          </defs>

          <rect x="0" y="0" [attr.width]="canvasWidth" [attr.height]="canvasHeight" class="canvas-background"></rect>

          <g class="machine-diagram">
            @for (node of machineGraphView().nodes; track node.nodeId) {
              @if (node.initial) {
                <text [attr.x]="node.position.x - 18" [attr.y]="node.position.y" class="machine-text">
                  &gt;
                </text>
              }

              <text
                [attr.x]="node.position.x"
                [attr.y]="node.position.y"
                class="machine-text"
                [class.machine-text-selected]="node.selected"
              >
                {{ node.label }}
              </text>
            }

            @for (link of machineGraphView().links; track link.linkId) {
              <path
                [attr.d]="getLinkPath(link)"
                class="arrow-line"
                [class.arrow-line-selected]="link.selected"
                [attr.marker-end]="link.selected ? 'url(#selected-arrowhead)' : 'url(#arrowhead)'"
              ></path>

              @if (link.label) {
                @if (getNegatedSingleSymbolLabel(link.label); as symbol) {
                  <text
                    [attr.x]="getLinkLabelPosition(link).x"
                    [attr.y]="getLinkLabelPosition(link).y"
                    class="edge-label"
                    [class.edge-label-selected]="link.selected"
                  >
                    <tspan class="overline-symbol">[{{ symbol }}]</tspan>
                  </text>
                } @else {
                  <text
                    [attr.x]="getLinkLabelPosition(link).x"
                    [attr.y]="getLinkLabelPosition(link).y"
                    class="edge-label"
                    [class.edge-label-selected]="link.selected"
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

    .machine-text {
      font-family: 'Times New Roman', Times, serif;
      font-size: 26px;
      font-style: italic;
      fill: #000;
    }

    .machine-text-selected {
      fill: red;
    }

    .arrow-line-selected {
      stroke: red;
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

    .overline-symbol {
      text-decoration: overline;
    }
  `],
})
export class DesignerCanvasPanel {
  private readonly store = inject(JtvStore);

  readonly canvasWidth = 560;
  readonly canvasHeight = 340;
  readonly machineGraphView = computed(() => this.store.machineGraphView());
  readonly viewBox = computed(() => `0 0 ${this.canvasWidth} ${this.canvasHeight}`);

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
