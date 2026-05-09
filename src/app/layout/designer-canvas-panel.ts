import { Component } from '@angular/core';

@Component({
  selector: 'app-designer-canvas-panel',
  imports: [],
  template: `
    <div class="panel">
      <div class="canvas-container">
        <svg class="designer-svg" viewBox="0 0 560 340" preserveAspectRatio="xMinYMin meet" aria-label="Máquina de Turing modular">
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

          <rect x="0" y="0" width="560" height="340" class="canvas-background"></rect>

          <g class="machine-diagram">
            <text x="28" y="72" class="machine-text">&gt; a L<tspan baseline-shift="sub" font-size="12">#</tspan></text>
            <text x="84" y="82" class="machine-text">L<tspan baseline-shift="sub" font-size="12">#</tspan></text>
            <path d="M 92 62 L 186 62" class="arrow-line"></path>
            <text x="138" y="58" class="edge-label">[1]</text>

            <text x="190" y="75" class="machine-text"># <tspan>L</tspan></text>
            <path d="M 218 64 L 238 64" class="arrow-line"></path>
            <path d="M 244 64 L 328 64" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="282" y="58" class="edge-label">[1]</text>

            <text x="338" y="74" class="machine-text">a R<tspan baseline-shift="sub" font-size="12">#</tspan> M<tspan baseline-shift="sub" font-size="12">a</tspan> L<tspan baseline-shift="sub" font-size="12">#</tspan></text>
            <text x="370" y="88" class="sub-label">a</text>
            <text x="397" y="88" class="sub-label">COPI</text>
            <text x="449" y="88" class="sub-label">a</text>
            <path d="M 247 57 L 247 18 L 490 18 L 490 60 L 460 60" class="return-line"></path>

            <path d="M 91 74 L 82 228" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="86" y="151" class="edge-label">[#]</text>

            <text x="84" y="255" class="machine-text">R a</text>
            <path d="M 122 240 L 142 240" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="145" y="255" class="machine-text">R</text>
            <path d="M 164 236 L 245 236" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="203" y="230" class="edge-label">[1]</text>
            <text x="249" y="254" class="machine-text">#</text>
            <path d="M 148 226 L 148 203 L 298 203 L 298 235 L 264 235" class="return-line"></path>

            <path d="M 149 246 L 158 286" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="154" y="268" class="edge-label">[a]</text>
            <text x="148" y="312" class="machine-text"># L<tspan baseline-shift="sub" font-size="12">a</tspan>#</text>

            <path d="M 238 68 L 213 167 L 260 167" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="231" y="166" class="edge-label">[#]</text>
            <text x="262" y="177" class="machine-text">a R<tspan baseline-shift="sub" font-size="12">#</tspan></text>
            <path d="M 314 166 L 356 166" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="354" y="178" class="machine-text">L</text>

            <path d="M 366 160 L 404 160" class="arrow-line"></path>
            <text x="400" y="159" class="edge-label">[#]</text>
            <text x="430" y="177" class="machine-text">1 R<tspan baseline-shift="sub" font-size="12">#</tspan> #</text>
            <path d="M 369 155 L 369 125 L 538 125 L 538 166 L 493 166" class="return-line"></path>

            <path d="M 358 178 L 345 278" class="arrow-line" marker-end="url(#arrowhead)"></path>
            <text x="350" y="232" class="edge-label">[a]</text>
            <text x="333" y="300" class="machine-text"># R<tspan baseline-shift="sub" font-size="12">#</tspan></text>
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

    .return-line {
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

    .sub-label {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10px;
      fill: #000;
    }
  `],
})
export class DesignerCanvasPanel {}
