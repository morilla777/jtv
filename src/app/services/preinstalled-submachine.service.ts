import { Injectable } from '@angular/core';

import buscadoraL from '../../assets/submachines/buscadora_l.jtv.json';
import buscadoraR from '../../assets/submachines/buscadora_r.jtv.json';
import { SubmachineDefinition } from '../models/core/execution-context';
import { PreinstalledSubmachineId } from '../models/core/submachine-node';
import { JtvFile, restoreMachineFromJtvFile } from './jtv-file-serializer';

@Injectable({ providedIn: 'root' })
export class PreinstalledSubmachineService {
  private readonly submachines = new Map<PreinstalledSubmachineId, SubmachineDefinition>([
    ['buscadora_l', this.restoreSubmachine(buscadoraL as JtvFile)],
    ['buscadora_r', this.restoreSubmachine(buscadoraR as JtvFile)],
  ]);

  getSubmachines(): ReadonlyMap<PreinstalledSubmachineId, SubmachineDefinition> {
    return this.submachines;
  }

  private restoreSubmachine(file: JtvFile): SubmachineDefinition {
    const restored = restoreMachineFromJtvFile(file);

    return {
      graph: restored.machineGraph,
      tapeCount: restored.tapeCount,
      parameterAssignments: restored.parameterAssignments,
    };
  }
}
