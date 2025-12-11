import React, { useState, useEffect, useRef } from 'react';
import { Rule, Configuration, ValidationResult, ProductAttribute, ProjectData } from '../types';
import { validateConfiguration } from '../services/engine';
import { getFixSuggestions } from '../services/geminiService';

interface ConfiguratorProps {
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
  attributes: ProductAttribute[];
  setAttributes: (attrs: ProductAttribute[]) => void;
}

const Configurator: React.FC<ConfiguratorProps> = ({ rules, setRules, attributes, setAttributes }) => {
  // Initialize with a default state based on provided attributes
  const [config, setConfig] = useState<Configuration>(() => {
    // Initial default values to prevent empty state
    const defaults: Configuration = {};
    attributes.forEach(attr => {
        if (attr.options && attr.options.length > 0) {
            defaults[attr.id] = attr.options[0].value;
        }
    });
    return defaults;
  });

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, violations: [] });
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync related attributes (just for UX convenience in this demo)
  const handleSelection = (attrId: string, val: any) => {
    const newConfig = { ...config, [attrId]: val };
    
    // Simple lookup to auto-fill related fields for smoother UX (demo logic only)
    if (attrId === 'motor_type') {
        const hp = attributes.find(a => a.id === 'motor_hp')?.options?.find(o => o.label.includes(val === 'motor-A' ? '5' : val === 'motor-B' ? '12' : '20'))?.value;
        if (hp) newConfig['motor_hp'] = hp;
    }
    if (attrId === 'cooling_unit') {
        const cap = attributes.find(a => a.id === 'cooling_capacity')?.options?.find(o => o.label.includes(val === 'ACM-400' ? '4000' : val === 'ACM-500' ? '5000' : '7000'))?.value;
        if (cap) newConfig['cooling_capacity'] = cap;
    }

    setConfig(newConfig);
    setSuggestion(null);
  };

  // Run validation engine on every change
  useEffect(() => {
    const result = validateConfiguration(config, rules);
    setValidation(result);
  }, [config, rules]);

  const handleAskAdvisor = async () => {
    if (validation.isValid) return;
    setIsSuggesting(true);
    const text = await getFixSuggestions(config, validation.violations);
    setSuggestion(text);
    setIsSuggesting(false);
  };

  const handleExport = () => {
    const data: ProjectData = {
      attributes,
      rules,
      config,
      metadata: {
        appName: 'Antigravity CPQ',
        exportedAt: new Date().toISOString()
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cpq-project-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // 1. Load Attributes (The Model)
        if (json.attributes && Array.isArray(json.attributes)) {
          setAttributes(json.attributes);
          
          // 2. Load or Generate Config
          if (json.config) {
             setConfig(json.config);
          } else {
             // If importing just a model (attributes) without a specific config, 
             // reset config to defaults for the new model.
             const defaults: Configuration = {};
             json.attributes.forEach((attr: ProductAttribute) => {
                if (attr.options && attr.options.length > 0) {
                    defaults[attr.id] = attr.options[0].value;
                }
             });
             setConfig(defaults);
          }
        }

        // 3. Load Rules
        if (json.rules && Array.isArray(json.rules)) {
          setRules(json.rules);
        }
        
        // Optional: Clear any existing suggestions
        setSuggestion(null);

        alert('Project loaded successfully.');
      } catch (err) {
        console.error(err);
        alert('Failed to parse JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Action Toolbar */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
           <h2 className="text-xl font-bold text-gray-900">Product Configurator</h2>
           <p className="text-xs text-gray-500">Model: {attributes.length > 0 ? (attributes[0].name.includes('Motor') ? 'Default Motor System' : 'Custom Product') : 'Empty'}</p>
        </div>
        <div className="space-x-3">
          <button 
             onClick={handleImportClick}
             className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
             Import Project JSON
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".json"
          />
          <button 
             onClick={handleExport}
             className="px-4 py-2 bg-indigo-600 border border-transparent text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
          >
             Export Project JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {attributes.length === 0 ? (
             <div className="text-center py-12 text-gray-500">
                No attributes defined. Import a JSON file to start modeling.
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attributes.filter(a => ['string', 'number'].includes(a.type)).map(attr => (
                <div key={attr.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                    {attr.name}
                    </label>
                    <div className="relative">
                    <select
                        value={config[attr.id] || ''}
                        onChange={(e) => handleSelection(attr.id, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                    >
                        {attr.options?.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>
                            {opt.label}
                        </option>
                        ))}
                    </select>
                    </div>
                </div>
                ))}
            </div>
          )}

          {/* Live Config State Visualization (Debug/Demo view) */}
          <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current State (JSON)</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-auto">
                  {JSON.stringify(config, null, 2)}
              </pre>
          </div>
        </div>

        {/* Validation & Advisor Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Status Card */}
          <div className={`rounded-lg p-6 border ${validation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors duration-300`}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full ${validation.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} mr-3`}>
                  {validation.isValid ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  )}
              </div>
              <h3 className={`text-lg font-bold ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {validation.isValid ? 'Configuration Valid' : 'Constraint Violations'}
              </h3>
            </div>

            {!validation.isValid && (
              <div className="space-y-3">
                  {validation.violations.map((v, idx) => (
                      <div key={idx} className="text-sm text-red-700 bg-red-100/50 p-2 rounded border border-red-100">
                          <span className="font-semibold block mb-1">Rule {v.rule_id}</span>
                          {v.message}
                      </div>
                  ))}
              </div>
            )}
          </div>

          {/* AI Advisor */}
          {!validation.isValid && (
              <div className="bg-white rounded-lg border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                  <h3 className="text-md font-bold text-gray-900 mb-2 flex items-center z-10 relative">
                    <span className="mr-2 text-xl">✨</span> AI Advisor
                  </h3>
                  
                  {!suggestion ? (
                      <div className="text-center py-4">
                          <p className="text-sm text-gray-500 mb-4">Need help resolving these conflicts?</p>
                          <button 
                              onClick={handleAskAdvisor}
                              disabled={isSuggesting}
                              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex justify-center items-center"
                          >
                            {isSuggesting ? 'Thinking...' : 'Suggest a Fix'}
                          </button>
                      </div>
                  ) : (
                      <div className="mt-2 animate-fade-in">
                          <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100 text-sm text-indigo-900 leading-relaxed">
                              {suggestion}
                          </div>
                          <button onClick={() => setSuggestion(null)} className="mt-3 text-xs text-indigo-600 underline hover:text-indigo-800">
                              Clear suggestion
                          </button>
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configurator;