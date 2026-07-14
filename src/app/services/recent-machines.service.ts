import { Injectable, computed, signal } from '@angular/core';

import type { JtvFileHandle } from './jtv-file.service';

export interface RecentMachine {
  readonly id: string;
  readonly fileName: string;
  readonly machineName: string;
  readonly lastOpenedAt: number;
  readonly hasHandle: boolean;
}

const RECENT_MACHINES_STORAGE_KEY = 'jtv-recent-machines';
const RECENT_MACHINES_DB_NAME = 'jtv-recent-machines-db';
const RECENT_MACHINES_STORE_NAME = 'handles';
const RECENT_MACHINES_LIMIT = 10;

@Injectable({ providedIn: 'root' })
export class RecentMachinesService {
  private readonly recentMachinesState = signal<readonly RecentMachine[]>(this.readRecentMachines());

  readonly recentMachines = computed(() => this.recentMachinesState());

  async remember(fileName: string, machineName: string, handle: JtvFileHandle | null): Promise<void> {
    const id = this.createRecentMachineId(fileName);
    const recentMachine: RecentMachine = {
      id,
      fileName,
      machineName,
      lastOpenedAt: Date.now(),
      hasHandle: !!handle,
    };
    const nextMachines = [
      recentMachine,
      ...this.recentMachinesState().filter((machine) => machine.id !== id),
    ].slice(0, RECENT_MACHINES_LIMIT);

    this.recentMachinesState.set(nextMachines);
    localStorage.setItem(RECENT_MACHINES_STORAGE_KEY, JSON.stringify(nextMachines));

    if (handle) {
      await this.saveHandle(id, handle);
    }
  }

  async getHandle(recentMachine: RecentMachine): Promise<JtvFileHandle | null> {
    if (!recentMachine.hasHandle) {
      return null;
    }

    return this.readHandle(recentMachine.id);
  }

  private createRecentMachineId(fileName: string): string {
    return fileName.trim().toLocaleLowerCase();
  }

  private readRecentMachines(): readonly RecentMachine[] {
    const rawRecentMachines = localStorage.getItem(RECENT_MACHINES_STORAGE_KEY);

    if (!rawRecentMachines) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawRecentMachines) as Partial<RecentMachine>[];

      return parsed
        .filter((machine): machine is RecentMachine =>
          typeof machine.id === 'string' &&
          typeof machine.fileName === 'string' &&
          typeof machine.machineName === 'string' &&
          typeof machine.lastOpenedAt === 'number',
        )
        .map((machine) => ({
          ...machine,
          hasHandle: machine.hasHandle === true,
        }))
        .slice(0, RECENT_MACHINES_LIMIT);
    } catch {
      return [];
    }
  }

  private async saveHandle(id: string, handle: JtvFileHandle): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(RECENT_MACHINES_STORE_NAME, 'readwrite');

    transaction.objectStore(RECENT_MACHINES_STORE_NAME).put(handle, id);
    await this.waitForTransaction(transaction);
    database.close();
  }

  private async readHandle(id: string): Promise<JtvFileHandle | null> {
    const database = await this.openDatabase();
    const transaction = database.transaction(RECENT_MACHINES_STORE_NAME, 'readonly');
    const request = transaction.objectStore(RECENT_MACHINES_STORE_NAME).get(id);
    const handle = await new Promise<JtvFileHandle | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as JtvFileHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });

    await this.waitForTransaction(transaction);
    database.close();

    return handle;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(RECENT_MACHINES_DB_NAME, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(RECENT_MACHINES_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private waitForTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}
