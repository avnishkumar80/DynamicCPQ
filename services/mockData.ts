import { ProductAttribute, Rule } from '../types';

export const ATTRIBUTES: ProductAttribute[] = [
  {
    id: 'motor_type',
    name: 'Motor Model',
    type: 'string',
    required: true,
    options: [
      { label: 'Standard Motor (5HP)', value: 'motor-A' },
      { label: 'Performance Motor (12HP)', value: 'motor-B' },
      { label: 'Industrial Motor (20HP)', value: 'motor-C' },
    ]
  },
  {
    id: 'motor_hp',
    name: 'Motor Horsepower',
    type: 'number',
    required: true,
    options: [
        { label: '5 HP', value: 5 },
        { label: '12 HP', value: 12 },
        { label: '20 HP', value: 20 }
    ]
  },
  {
    id: 'cooling_unit',
    name: 'Cooling Unit',
    type: 'string',
    required: true,
    options: [
      { label: 'ACM-400 (4000 BTU)', value: 'ACM-400' },
      { label: 'ACM-500 (5000 BTU)', value: 'ACM-500' },
      { label: 'ACM-600 (7000 BTU)', value: 'ACM-600' },
    ]
  },
  {
    id: 'cooling_capacity',
    name: 'Cooling Capacity (BTU)',
    type: 'number',
    required: true,
    options: [
        { label: '4000 BTU', value: 4000 },
        { label: '5000 BTU', value: 5000 },
        { label: '7000 BTU', value: 7000 }
    ]
  },
  {
    id: 'environment',
    name: 'Operating Environment',
    type: 'string',
    required: true,
    defaultValue: 'indoor',
    options: [
      { label: 'Indoor', value: 'indoor' },
      { label: 'Outdoor', value: 'outdoor' },
      { label: 'Marine', value: 'marine' },
    ]
  },
  {
    id: 'warranty',
    name: 'Extended Warranty',
    type: 'string',
    required: false,
    defaultValue: 'none',
    options: [
      { label: 'None', value: 'none' },
      { label: '1 Year (+ $50)', value: '1yr' },
      { label: '3 Years (+ $120)', value: '3yr' },
    ]
  }
];

export const INITIAL_RULES: Rule[] = [
  {
    id: 'rule-001',
    natural_text: 'If Motor Horsepower is greater than 10, Cooling Capacity must be at least 5000 BTU.',
    type: 'implication',
    condition: { attribute: 'motor_hp', operator: '>', value: 10 },
    consequence: { attribute: 'cooling_capacity', operator: '>=', value: 5000 },
    priority: 1,
    confidence: 1.0,
    approved: true,
    created_at: new Date().toISOString(),
    source_doc: 'manual_v1.pdf'
  }
];