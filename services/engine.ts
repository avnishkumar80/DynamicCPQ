import { Configuration, Rule, ValidationResult, ValidationViolation, ProductAttribute } from '../types';

export interface ValidationEngine {
  validate(config: Configuration, rules: Rule[], attributes: ProductAttribute[]): Promise<ValidationResult> | ValidationResult;
}

export const evaluateCondition = (value: any, operator: string, target: any): boolean => {
  if (value === undefined || value === null) return false;

  switch (operator) {
    case '>': return Number(value) > Number(target);
    case '>=': return Number(value) >= Number(target);
    case '<': return Number(value) < Number(target);
    case '<=': return Number(value) <= Number(target);
    case '==': return value == target; // Loose equality for flexibility
    case '!=': return value != target;
    case 'in': return Array.isArray(target) && target.includes(value);
    default: return false;
  }
};

export const validateDeterministic = (
  config: Configuration,
  rules: Rule[],
  attributes: ProductAttribute[] = []
): ValidationResult => {
  const violations: ValidationViolation[] = [];

  // 1. Schema Validation (Required Fields)
  for (const attr of attributes) {
    if (attr.required) {
      const val = config[attr.id];
      const isEmpty = val === undefined || val === null || val === '';
      if (isEmpty) {
        violations.push({
          rule_id: 'schema-validation',
          message: `${attr.name} is required.`,
          severity: 'error',
          source: 'System Schema',
          involvedAttributes: [attr.id]
        });
      }
    }
  }

  // 2. Rule Validation
  for (const rule of rules) {
    if (!rule.approved) continue;

    try {
      const conditionValue = config[rule.condition.attribute];
      const conditionMet = evaluateCondition(conditionValue, rule.condition.operator, rule.condition.value);

      if (rule.type === 'implication') {
        // IF condition THEN consequence
        if (conditionMet && rule.consequence) {
          const consequenceValue = config[rule.consequence.attribute];
          const consequenceMet = evaluateCondition(consequenceValue, rule.consequence.operator, rule.consequence.value);

          if (!consequenceMet) {
            violations.push({
              rule_id: rule.id,
              message: rule.natural_text,
              severity: 'error',
              source: rule.source_doc,
              involvedAttributes: [rule.condition.attribute, rule.consequence.attribute]
            });
          }
        }
      } else if (rule.type === 'exclusion') {
        // IF condition THEN invalid (Mutual Exclusion)
        if (conditionMet) {
          violations.push({
            rule_id: rule.id,
            message: rule.natural_text,
            severity: 'error',
            source: rule.source_doc,
            involvedAttributes: [rule.condition.attribute]
          });
        }
      }
    } catch (e) {
      console.error(`Error evaluating rule ${rule.id}`, e);
    }
  }

  return {
    isValid: violations.length === 0,
    violations
  };
};

// Default export for backward compatibility if needed, though we will update consumers
export const validateConfiguration = validateDeterministic;