import { Configuration, Rule, ValidationResult, ValidationViolation } from '../types';

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

export const validateConfiguration = (config: Configuration, rules: Rule[]): ValidationResult => {
  const violations: ValidationViolation[] = [];

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
              source: rule.source_doc
            });
          }
        }
      } else if (rule.type === 'exclusion') {
        // IF condition THEN invalid (Mutual Exclusion)
        // Usually exclusion rules might have complex structure, simplifying here to:
        // If condition matches, it is invalid.
        if (conditionMet) {
             violations.push({
              rule_id: rule.id,
              message: rule.natural_text,
              severity: 'error',
              source: rule.source_doc
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