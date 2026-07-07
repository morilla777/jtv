import { Injectable, computed, signal } from '@angular/core';

import { JtvFile } from './jtv-file-serializer';

export interface OpenedJtvFile {
  readonly file: JtvFile;
  readonly fileName: string;
}

export interface SavedJtvFile {
  readonly fileName: string;
  readonly machineName: string;
}

interface WritableFileHandle {
  readonly name: string;

  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface ReadableFileHandle {
  readonly name: string;

  getFile(): Promise<File>;
}

type JtvFileHandle = WritableFileHandle & ReadableFileHandle;

interface FilePickerWindow extends Window {
  showSaveFilePicker?: (options: unknown) => Promise<JtvFileHandle>;
  showOpenFilePicker?: (options: unknown) => Promise<JtvFileHandle[]>;
}

@Injectable({ providedIn: 'root' })
export class JtvFileService {
  private currentFileHandle: JtvFileHandle | null = null;
  private readonly activeFilePath = signal<string | null>(null);
  private readonly dirty = signal(false);

  readonly currentFilePath = computed(() => {
    const filePath = this.activeFilePath();

    return filePath && this.dirty() ? `${filePath} *` : filePath;
  });

  clearCurrentFile(): void {
    this.currentFileHandle = null;
    this.activeFilePath.set(null);
    this.dirty.set(false);
  }

  markDirty(): void {
    if (this.activeFilePath()) {
      this.dirty.set(true);
    }
  }

  async open(): Promise<OpenedJtvFile | null> {
    return this.openFromPicker({ trackCurrentFile: true });
  }

  async openDetached(): Promise<OpenedJtvFile | null> {
    return this.openFromPicker({ trackCurrentFile: false });
  }

  private async openFromPicker(options: { trackCurrentFile: boolean }): Promise<OpenedJtvFile | null> {
    const pickerWindow = window as FilePickerWindow;

    if (pickerWindow.showOpenFilePicker) {
      const [handle] = await pickerWindow.showOpenFilePicker({
        types: [this.getFilePickerType()],
        excludeAcceptAllOption: false,
        multiple: false,
      });
      const file = await handle.getFile();

      if (options.trackCurrentFile) {
        this.currentFileHandle = handle;
        this.activeFilePath.set(file.name);
        this.dirty.set(false);
      }

      return {
        file: JSON.parse(await file.text()) as JtvFile,
        fileName: file.name,
      };
    }

    return this.openWithFileInput(options);
  }

  async save(file: JtvFile, suggestedName: string): Promise<SavedJtvFile> {
    if (!this.currentFileHandle) {
      return this.saveAs(file, suggestedName);
    }

    return this.writeToHandle(file, this.currentFileHandle);
  }

  async saveAs(file: JtvFile, suggestedName: string): Promise<SavedJtvFile> {
    const pickerWindow = window as FilePickerWindow;

    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName,
        types: [this.getFilePickerType()],
      });

      this.currentFileHandle = handle;
      return this.writeToHandle(file, handle);
    }

    const fileName = this.ensureJtvJsonFileName(suggestedName);
    const machineName = this.getMachineNameFromFileName(fileName);

    this.download(this.createJsonBlob(this.withMachineName(file, machineName)), fileName);
    this.activeFilePath.set(fileName);
    this.dirty.set(false);
    return { fileName, machineName };
  }

  async exportJson(file: JtvFile, suggestedName: string): Promise<void> {
    this.download(this.createJsonBlob(file), suggestedName);
  }

  async exportJsonWithSavePicker(file: JtvFile, suggestedName: string): Promise<string> {
    const pickerWindow = window as FilePickerWindow;
    const fileName = this.ensureJtvJsonFileName(suggestedName);

    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [this.getFilePickerType()],
      });

      const writable = await handle.createWritable();

      await writable.write(this.createJsonBlob(file));
      await writable.close();

      return this.ensureJtvJsonFileName(handle.name);
    }

    this.download(this.createJsonBlob(file), fileName);
    return fileName;
  }

  private openWithFileInput(options: { trackCurrentFile: boolean }): Promise<OpenedJtvFile | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');

      input.type = 'file';
      input.accept = '.jtv,.json,application/json';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files?.[0] ?? null;

        input.remove();

        if (!file) {
          resolve(null);
          return;
        }

        try {
          if (options.trackCurrentFile) {
            this.currentFileHandle = null;
            this.activeFilePath.set(file.name);
            this.dirty.set(false);
          }

          resolve({
            file: JSON.parse(await file.text()) as JtvFile,
            fileName: file.name,
          });
        } catch (error) {
          reject(error);
        }
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  private async writeToHandle(file: JtvFile, handle: JtvFileHandle): Promise<SavedJtvFile> {
    const fileName = this.ensureJtvJsonFileName(handle.name);
    const machineName = this.getMachineNameFromFileName(fileName);
    const writable = await handle.createWritable();

    await writable.write(this.createJsonBlob(this.withMachineName(file, machineName)));
    await writable.close();

    this.activeFilePath.set(fileName);
    this.dirty.set(false);
    return { fileName, machineName };
  }

  private createJsonBlob(file: JtvFile): Blob {
    return new Blob([`${JSON.stringify(file, null, 2)}\n`], { type: 'application/json' });
  }

  private withMachineName(file: JtvFile, machineName: string): JtvFile {
    return {
      ...file,
      machine: {
        ...file.machine,
        name: machineName,
      },
    };
  }

  private getMachineNameFromFileName(fileName: string): string {
    return this.stripKnownExtension(fileName).trim().toUpperCase() || 'NUEVA';
  }

  private ensureJtvJsonFileName(fileName: string): string {
    return fileName.toLowerCase().endsWith('.jtv.json') ? fileName : `${this.stripKnownExtension(fileName)}.jtv.json`;
  }

  private stripKnownExtension(fileName: string): string {
    if (fileName.toLowerCase().endsWith('.jtv.json')) {
      return fileName.slice(0, -'.jtv.json'.length);
    }

    if (fileName.toLowerCase().endsWith('.json')) {
      return fileName.slice(0, -'.json'.length);
    }

    if (fileName.toLowerCase().endsWith('.jtv')) {
      return fileName.slice(0, -'.jtv'.length);
    }

    return fileName;
  }

  private download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private getFilePickerType(): { description: string; accept: Record<string, string[]> } {
    return {
      description: 'JTV machine',
      accept: {
        'application/json': ['.jtv', '.json'],
      },
    };
  }
}
