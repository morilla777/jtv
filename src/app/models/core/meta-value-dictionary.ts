import { MetaValue } from './meta-value';
import { ParameterValue } from './parameter-value';
import { VariableValue } from './variable-value';

export class MetaValueDictionary {
  private variables = new Map<string, VariableValue>();
  private parameters = new Map<string, ParameterValue>();

  private initialVariables = new Map<string, VariableValue>();
  private initialParameters = new Map<string, ParameterValue>();

  addVariable(variable: VariableValue): void {
    this.variables.set(variable.getName(), variable);
  }

  addParameter(parameter: ParameterValue): void {
    this.parameters.set(parameter.getName(), parameter);
  }

  getVariable(name: string): VariableValue | undefined {
    return this.variables.get(name);
  }

  getOrCreateVariable(name: string): VariableValue {
    let variable = this.variables.get(name);

    if (!variable) {
      variable = new VariableValue(name);
      this.addVariable(variable);
    }

    return variable;
  }

  getParameter(name: string): ParameterValue | undefined {
    return this.parameters.get(name);
  }

  getMetaValue(name: string): MetaValue | undefined {
    return this.getVariable(name) ?? this.getParameter(name);
  }

  hasMetaValue(name: string): boolean {
    return this.variables.has(name) || this.parameters.has(name);
  }

  restoreInitialValues(): void {
    this.variables = new Map(this.initialVariables);
    this.parameters = new Map(this.initialParameters);
  }

  saveCurrentAsInitialValues(): void {
    this.initialVariables = new Map(this.variables);
    this.initialParameters = new Map(this.parameters);
  }

  clearAll(): void {
    this.variables.clear();
    this.parameters.clear();
    this.initialVariables.clear();
    this.initialParameters.clear();
  }

  clearVariablesOnly(): void {
    this.variables.clear();
    this.initialVariables.clear();
  }

  getVariables(): Map<string, VariableValue> {
    return new Map(this.variables);
  }

  getParameters(): Map<string, ParameterValue> {
    return new Map(this.parameters);
  }
}
