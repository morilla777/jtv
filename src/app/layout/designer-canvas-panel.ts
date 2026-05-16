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
          </defs>

          <rect x="0" y="0" [attr.width]="canvasWidth" [attr.height]="canvasHeight" class="canvas-background"></rect>

          <g class="machine-diagram">
            @for (node of machineGraphView().nodes; track node.nodeId) {
              @if (node.initial) {
                <text [attr.x]="node.position.x - 18" [attr.y]="node.position.y" class="machine-text">
                  &gt;
                </text>
              }

              <text [attr.x]="node.position.x" [attr.y]="node.position.y" class="machine-text">
                {{ node.label }}
              </text>
            }

            @for (link of machineGraphView().links; track link.linkId) {
              <path [attr.d]="getLinkPath(link)" class="arrow-line" marker-end="url(#arrowhead)"></path>

              @if (link.label) {
                <text [attr.x]="getLinkLabelPosition(link).x" [attr.y]="getLinkLabelPosition(link).y" class="edge-label">
                  {{ link.label }}
                </text>
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

    .machine-text {
      font-family: 'Times New Roman', Times, serif;
      font-size: 26px;
      font-style: italic;
      fill: #000;
    }

    .edge-label {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      font-style: italic;
      fill: #000;
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
}
