export type AppEnvironmentName = 'local' | 'develop' | 'qa' | 'demo' | 'prod';

export interface AppEnvironment {
  readonly name: AppEnvironmentName;
  readonly production: boolean;
  readonly jtvSite: string;
}
