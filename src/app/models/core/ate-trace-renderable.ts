export interface AteTraceRenderable {
  getAteIconName(): string;
  getAteLabel(): string;
  getAteLabelKey?(): string | undefined;
}
