import React from 'react';
import { Rule } from '../types';

interface RuleCardProps {
  rule: Rule;
  onApprove?: (id: string) => void;
  onDelete?: (id: string) => void;
  isDraft?: boolean;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onApprove, onDelete, isDraft }) => {
  return (
    <div className={`p-4 rounded-lg border ${isDraft ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-white'} shadow-sm mb-3 transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isDraft ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            {isDraft ? 'Draft' : 'Active'}
          </span>
          <span className="ml-2 text-xs text-gray-500 font-mono">{rule.id}</span>
        </div>
        <div className="text-xs text-gray-400">
          Confidence: {(rule.confidence * 100).toFixed(0)}%
        </div>
      </div>
      
      <p className="text-sm text-gray-800 font-medium mb-2">{rule.natural_text}</p>
      
      <div className="bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 mb-3 overflow-x-auto">
        <div>IF {rule.condition.attribute} {rule.condition.operator} {rule.condition.value}</div>
        {rule.consequence && (
            <div>THEN {rule.consequence.attribute} {rule.consequence.operator} {rule.consequence.value}</div>
        )}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Source: {rule.source_doc || 'Manual'}</span>
        {isDraft && (
          <div className="space-x-2">
             <button 
                onClick={() => onDelete?.(rule.id)}
                className="text-red-600 hover:text-red-800 font-medium"
            >
              Discard
            </button>
            <button 
                onClick={() => onApprove?.(rule.id)}
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleCard;