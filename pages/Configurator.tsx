import React, { useState, useEffect, useRef } from 'react';
import { Rule, Configuration, ValidationResult, ProductAttribute, ProjectData } from '../types';
import { validateDeterministic } from '../services/engine';
import { Z3SatEngine } from '../services/z3Service';
import { getFixSuggestions } from '../services/geminiService';

interface ConfiguratorProps {
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
  attributes: ProductAttribute[];
  setAttributes: (attrs: ProductAttribute[]) => void;
}

const z3Engine = new Z3SatEngine();

const Configurator: React.FC<ConfiguratorProps> = ({ rules, setRules, attributes, setAttributes }) => {
  // Initialize config with default values defined in the schema
  const [config, setConfig] = useState<Configuration>(() => {
    const defaults: Configuration = {};
    attributes.forEach(attr => {
      if (attr.defaultValue !== undefined) {
        defaults[attr.id] = attr.defaultValue;
      }
    });
    return defaults;
  });

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, violations: [] });
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [solverMode, setSolverMode] = useState<'deterministic' | 'z3'>('deterministic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync related attributes (just for UX convenience in this demo)
  const handleSelection = (attrId: string, val: any) => {
    const newConfig = { ...config, [attrId]: val };

    // If value is empty string, remove it from config (cleaner state)
    if (val === '') {
      delete newConfig[attrId];
    }

    // Simple lookup to auto-fill related fields for smoother UX (demo logic only)
    if (attrId === 'motor_type' && val) {
      const hp = attributes.find(a => a.id === 'motor_hp')?.options?.find(o => o.label.includes(val === 'motor-A' ? '5' : val === 'motor-B' ? '12' : '20'))?.value;
      if (hp) newConfig['motor_hp'] = hp;
    }
    if (attrId === 'cooling_unit' && val) {
      const cap = attributes.find(a => a.id === 'cooling_capacity')?.options?.find(o => o.label.includes(val === 'ACM-400' ? '4000' : val === 'ACM-500' ? '5000' : '7000'))?.value;
      if (cap) newConfig['cooling_capacity'] = cap;
    }

    setConfig(newConfig);
    setSuggestion(null);
  };

  // Run validation engine on every change
  useEffect(() => {
    // Debounce validation to prevent solver thrashing/concurrency issues
    // Z3 needs more time/resources, so we delay it. Deterministic is fast.
    const delay = solverMode === 'z3' ? 1500 : 50;

    const timer = setTimeout(async () => {
      let result: ValidationResult;
      // Show "Validating..." state? 
      // For now, just run.

      if (solverMode === 'z3') {
        result = await z3Engine.validate(config, rules, attributes);
      } else {
        result = validateDeterministic(config, rules, attributes);
      }
      setValidation(result);
    }, delay);

    return () => clearTimeout(timer);
  }, [config, rules, attributes, solverMode]);

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
            // Reset to defaults if no specific config is provided
            const defaults: Configuration = {};
            json.attributes.forEach((attr: ProductAttribute) => {
              if (attr.defaultValue !== undefined) {
                defaults[attr.id] = attr.defaultValue;
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

  const handleJumpToField = (attrId: string) => {
    const el = document.getElementById(`input-${attrId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      // Add a temporary highlight effect
      el.classList.add('ring-4', 'ring-indigo-300');
      setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-300'), 1500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Action Toolbar */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Product Configurator</h2>
          <p className="text-xs text-gray-500">Model: {attributes.length > 0 ? (attributes[0].name.includes('Motor') ? 'Default Motor System' : 'Custom Product') : 'Empty'}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Solver Switch */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSolverMode('deterministic')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${solverMode === 'deterministic'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Standard
            </button>
            <button
              onClick={() => setSolverMode('z3')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${solverMode === 'z3'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Z3 Solver (SAT)
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          <button
            onClick={handleImportClick}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Import Project
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
            Export Project
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
                    {attr.required && <span className="text-red-500 ml-1" title="Required">*</span>}
                    {!attr.required && <span className="text-gray-400 text-xs ml-1 font-normal">(Optional)</span>}
                  </label>
                  <div className="relative">
                    <select
                      id={`input-${attr.id}`}
                      value={config[attr.id] || ''}
                      onChange={(e) => handleSelection(attr.id, isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                      className={`block w-full pl-3 pr-10 py-2.5 text-base focus:outline-none sm:text-sm rounded-md border transition-all duration-200
                            ${validation.violations.some(v => v.message.includes(attr.name) && v.rule_id === 'schema-validation')
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    >
                      <option value="">{attr.required ? '-- Select --' : '-- None --'}</option>
                      {attr.options?.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>
                          {opt.label} {attr.defaultValue === opt.value ? '(Default)' : ''}
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
          <div className={`rounded-lg p-6 border ${validation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors duration-300 sticky top-24`}>
            <div className="flex items-center mb-4">
              <div className={`p-2 rounded-full ${validation.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} mr-3`}>
                {validation.isValid ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                )}
              </div>
              <div>
                <h3 className={`text-lg font-bold ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {validation.isValid ? 'Configuration Valid' : 'Incomplete / Invalid'}
                </h3>
                <div className="text-xs font-mono opacity-75 mt-1">
                  Engine: {solverMode === 'z3' ? 'Z3-SMT' : 'Deterministic'}
                </div>
              </div>
            </div>

            {!validation.isValid && (
              <div className="space-y-3">
                {validation.violations.map((v, idx) => (
                  <div key={idx} className="text-sm text-red-700 bg-red-100/50 p-3 rounded border border-red-100 flex flex-col items-start">
                    <div className="flex items-start">
                      <span className="mr-2 mt-0.5">•</span>
                      <div className="flex-1">
                        {v.rule_id === 'schema-validation' ? (
                          <strong>{v.message}</strong>
                        ) : (
                          <span><span className="font-semibold block text-xs uppercase tracking-wide opacity-75">Rule {v.rule_id}</span>{v.message}</span>
                        )}
                      </div>
                    </div>

                    {/* Hyperlinks to fields */}
                    {v.involvedAttributes && v.involvedAttributes.length > 0 && (
                      <div className="mt-2 ml-4 flex flex-wrap gap-2">
                        {v.involvedAttributes.map(attrId => {
                          const attrName = attributes.find(a => a.id === attrId)?.name || attrId;
                          return (
                            <button
                              key={attrId}
                              onClick={() => handleJumpToField(attrId)}
                              className="inline-flex items-center text-xs text-indigo-700 hover:text-indigo-900 hover:underline bg-white/60 hover:bg-white px-2 py-1 rounded border border-indigo-100 transition-colors"
                              title={`Scroll to ${attrName}`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              Fix {attrName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Advisor */}
          {!validation.isValid && (
            <div className="bg-white rounded-lg border border-indigo-100 shadow-sm p-6 relative overflow-hidden sticky top-[500px]">
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