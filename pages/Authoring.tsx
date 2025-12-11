import React, { useState } from 'react';
import { Rule, ProductAttribute } from '../types';
import { extractRulesFromText } from '../services/geminiService';
import RuleCard from '../components/RuleCard';

interface AuthoringProps {
  rules: Rule[];
  setRules: React.Dispatch<React.SetStateAction<Rule[]>>;
  attributes: ProductAttribute[];
}

const Authoring: React.FC<AuthoringProps> = ({ rules, setRules, attributes }) => {
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [drafts, setDrafts] = useState<Rule[]>([]);

  const handleIngest = async () => {
    if (!inputText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await extractRulesFromText(inputText, attributes);
      setDrafts(prev => [...extracted, ...prev]);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApprove = (id: string) => {
    const draft = drafts.find(d => d.id === id);
    if (draft) {
      setRules(prev => [...prev, { ...draft, approved: true }]);
      setDrafts(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleDiscard = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const activeRules = rules.filter(r => r.approved);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-4rem)]">
      
      {/* Left Column: Ingestion */}
      <div className="flex flex-col space-y-6 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Ingest Requirements
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste product requirement text below. The LLM will parse it into structured logical rules.
          </p>
          <textarea
            className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
            placeholder={`Example: If the system is operating in a Marine environment, it must use the ACM-600 Cooling Unit. Valid attributes: ${attributes.map(a => a.name).join(', ')}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleIngest}
              disabled={isExtracting || !inputText.trim()}
              className={`flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isExtracting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExtracting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Analysing...
                </>
              ) : 'Extract Rules'}
            </button>
          </div>
        </div>

        {/* Product Data Model Schema (Read-only) */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            Product Data Model
          </h2>
          {attributes.length === 0 ? (
             <p className="text-sm text-gray-400 italic">No attributes defined. Import a project JSON to set the model.</p>
          ) : (
             <div className="space-y-4 max-h-64 overflow-y-auto">
                {attributes.map(attr => (
                    <div key={attr.id} className="text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">{attr.name}</span>
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{attr.id}</span>
                        </div>
                        <div className="mt-1 pl-2 border-l-2 border-gray-100 text-xs text-gray-500">
                            Type: {attr.type}
                            {attr.options && (
                                <div className="mt-1 text-gray-400">
                                    Options: {attr.options.map(o => o.value).join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
             </div>
          )}
        </div>

        {/* Drafts Section */}
        <div className="flex-1 min-h-0">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
             Detected Drafts ({drafts.length})
          </h3>
          {drafts.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              <span className="text-gray-400 text-sm">No new drafts found.</span>
            </div>
          ) : (
            drafts.map(rule => (
              <RuleCard 
                key={rule.id} 
                rule={rule} 
                isDraft={true} 
                onApprove={handleApprove}
                onDelete={handleDiscard}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Column: Active Rules */}
      <div className="flex flex-col h-full bg-gray-50 rounded-xl border border-gray-200 p-6 overflow-hidden">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Active Knowledge Base</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">{activeRules.length} Active Rules</span>
         </div>
         <div className="flex-1 overflow-y-auto pr-2">
            {activeRules.length === 0 ? (
                <p className="text-sm text-gray-500">No active rules defined.</p>
            ) : (
                activeRules.map(rule => (
                    <RuleCard key={rule.id} rule={rule} />
                ))
            )}
         </div>
      </div>
    </div>
  );
};

export default Authoring;