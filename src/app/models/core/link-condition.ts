import { ConditionEvaluationResult } from './condition-evaluation-result';
import { ExecutionContext } from './execution-context';

export interface ReadConditionClause {
  tapeIndex: number;
  assignToVariableName?: string;
  negated?: boolean;
  acceptedValues: string[];
}

export class LinkCondition {
  constructor(
    public readonly clauses: ReadConditionClause[] = [],
  ) {}

  evaluate(context: ExecutionContext): ConditionEvaluationResult {
    for (const clause of this.clauses) {
      const tape = context.tapes[clause.tapeIndex];

      if (!tape) {
        return {
          success: false,
          error: `Tape ${clause.tapeIndex} does not exist.`,
        };
      }

      const readSymbol = tape.read();

      if (clause.assignToVariableName) {
        const variable = context.metaValues.getVariable(clause.assignToVariableName);

        if (!variable) {
          return {
            success: false,
            error: `Variable "${clause.assignToVariableName}" does not exist.`,
          };
        }

        variable.setValue(readSymbol);
      }

      const matches = clause.acceptedValues.includes(readSymbol.getName());
      const clausePassed = clause.negated ? !matches : matches;

      if (!clausePassed) {
        return {
          success: false,
        };
      }
    }

    return { success: true };
  }

  getAteLabel(): string {
    if (this.clauses.length === 0) {
      return '';
    }

    const [clause] = this.clauses;

    if (this.clauses.length === 1 && clause.acceptedValues.length === 1) {
      return clause.negated ? `[not ${clause.acceptedValues[0]}]` : `[${clause.acceptedValues[0]}]`;
    }

    return this.clauses
      .map((item) => {
        const values = item.acceptedValues.join(',');

        return item.negated ? `not ${values}` : values;
      })
      .join(' & ');
  }
}
