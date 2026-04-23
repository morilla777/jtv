export interface ReadConditionClause {
  tapeIndex: number;
  assignToVariableName?: string;
  negated?: boolean;
  acceptedValues: string[];
}
