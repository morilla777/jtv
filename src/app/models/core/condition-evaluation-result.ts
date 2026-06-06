export interface ConditionEvaluationResult {
  success: boolean;
  error?: string;
  assignment?: ConditionAssignmentResult;
}

export interface ConditionAssignmentResult {
  variableName: string;
  valueName: string;
}
