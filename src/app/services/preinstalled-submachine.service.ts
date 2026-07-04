import { Injectable } from '@angular/core';

import buscadoraL from '../../assets/submachines/buscadora_l.jtv.json';
import buscadoraNotL from '../../assets/submachines/buscadora_not_l.jtv.json';
import buscadoraNotR from '../../assets/submachines/buscadora_not_r.jtv.json';
import buscadoraR from '../../assets/submachines/buscadora_r.jtv.json';
import shiftL from '../../assets/submachines/shift_l.jtv.json';
import shiftR from '../../assets/submachines/shift_r.jtv.json';
import { SubmachineDefinition } from '../models/core/execution-context';
import { PreinstalledSubmachineId } from '../models/core/submachine-node';
import { JtvFile, restoreMachineFromJtvFile } from './jtv-file-serializer';

@Injectable({ providedIn: 'root' })
export class PreinstalledSubmachineService {
  private readonly submachines = new Map<PreinstalledSubmachineId, SubmachineDefinition>([
    ['buscadora_l', this.restoreSubmachine(buscadoraL as JtvFile)],
    ['buscadora_r', this.restoreSubmachine(buscadoraR as JtvFile)],
    ['buscadora_not_l', this.restoreSubmachine(buscadoraNotL as JtvFile)],
    ['buscadora_not_r', this.restoreSubmachine(buscadoraNotR as JtvFile)],
    ['shift_l', this.restoreSubmachine(shiftL as JtvFile)],
    ['shift_r', this.restoreSubmachine(shiftR as JtvFile)],
  ]);

  getSubmachines(): ReadonlyMap<PreinstalledSubmachineId, SubmachineDefinition> {
    return this.submachines;
  }

  private restoreSubmachine(file: JtvFile): SubmachineDefinition {
    const restored = restoreMachineFromJtvFile(file);

    return {
      name: restored.selectedMachine.name,
      graph: restored.machineGraph,
      view: restored.machineGraphView,
      tapeCount: restored.tapeCount,
      parameterAssignments: restored.parameterAssignments,
    };
  }
}
