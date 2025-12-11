export interface ProductAttribute {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  options?: { label: string; value: any }[];
}

export interface Configuration {
  [attributeId: string]: any;
}

export interface RuleCondition {
  attribute: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=' | 'in';
  value: any;
}

export interface Rule {
  id: string;
  source_doc?: string;
  source_clause?: string;
  natural_text: string;
  type: 'implication' | 'exclusion';
  condition: RuleCondition;
  consequence?: RuleCondition; // For implication
  priority: number;
  confidence: number;
  approved: boolean;
  created_at: string;
}

export interface ValidationViolation {
  rule_id: string;
  message: string;
  severity: 'error' | 'warning';
  source?: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
}

export interface Suggestion {
  id: string;
  type: 'replace' | 'update';
  field: string;
  value: any;
  explanation: string;
}

export interface ProjectData {
  attributes: ProductAttribute[];
  rules: Rule[];
  config?: Configuration;
  metadata?: {
    appName: string;
    exportedAt: string;
  };
}