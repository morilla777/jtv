import { ConditionAssignmentResult, ConditionEvaluationResult } from './condition-evaluation-result';
import { ExecutionContext } from './execution-context';
import { SymbolValue } from './symbol-value';

export interface ReadConditionClause {
  tapeIndex: number;
  assignToVariableName?: string;
  negated?: boolean;
  acceptedValues: string[];
}

export class LinkCondition {
  private lastAssignment: ConditionAssignmentResult | null = null;

  constructor(
    public readonly clauses: ReadConditionClause[] = [],
  ) {}

  evaluate(context: ExecutionContext): ConditionEvaluationResult {
    this.lastAssignment = null;

    for (const clause of this.clauses) {
      const tape = context.tapes[clause.tapeIndex];

      if (!tape) {
        return {
          success: false,
          error: `Tape ${clause.tapeIndex} does not exist.`,
        };
      }

      const readSymbol = tape.read();
      const hasAcceptedValues = clause.acceptedValues.length > 0;
      const matches = hasAcceptedValues
        ? clause.acceptedValues.some((acceptedValue) => this.matchesAcceptedValue(readSymbol, acceptedValue, context))
        : true;
      const clausePassed = hasAcceptedValues && clause.negated ? !matches : matches;

      if (!clausePassed) {
        return {
          success: false,
        };
      }

      if (clause.assignToVariableName) {
        context.metaValues.getOrCreateVariable(clause.assignToVariableName).setValue(readSymbol);
        this.lastAssignment = {
          variableName: clause.assignToVariableName,
          valueName: readSymbol.getName(),
        };
      }
    }

    return { success: true, assignment: this.lastAssignment ?? undefined };
  }

  getLastAssignment(): ConditionAssignmentResult | null {
    return this.lastAssignment;
  }

  getAteLabel(showTapeIndex: boolean = false): string {
    if (this.clauses.length === 0) {
      return '';
    }

    const [clause] = this.clauses;

    if (this.clauses.length === 1) {
      const values = clause.acceptedValues.join(',');
      const content = this.formatClauseContent(clause, values, showTapeIndex);

      return values ? (clause.negated ? `[not ${content}]` : `[${content}]`) : '';
    }

    return this.clauses
      .map((item) => {
        const values = item.acceptedValues.join(',');
        const content = this.formatClauseContent(item, values, showTapeIndex);

        return item.negated ? `not ${content}` : content;
      })
      .join(' & ');
  }

  private formatClauseContent(clause: ReadConditionClause, values: string, showTapeIndex: boolean): string {
    const content = clause.assignToVariableName ? `${clause.assignToVariableName} = ${values}` : values;

    return showTapeIndex ? `${content};${clause.tapeIndex + 1}` : content;
  }

  private matchesAcceptedValue(readSymbol: SymbolValue, acceptedValue: string, context: ExecutionContext): boolean {
    const metaValue = context.metaValues.getMetaValue(acceptedValue);

    if (metaValue) {
      try {
        return readSymbol.equals(metaValue);
      } catch {
        return false;
      }
    }

    const symbol = SymbolValue.of(acceptedValue);

    return symbol ? readSymbol.equals(symbol) : false;
  }
}
