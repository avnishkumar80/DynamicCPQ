import React, { useState } from 'react';
import { Rule, ProductAttribute } from './types';
import { INITIAL_RULES, ATTRIBUTES as INITIAL_ATTRIBUTES } from './services/mockData';
import Navbar from './components/Navbar';
import Configurator from './pages/Configurator';
import Authoring from './pages/Authoring';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'configure' | 'author'>('configure');
  const [rules, setRules] = useState<Rule[]>(INITIAL_RULES);
  const [attributes, setAttributes] = useState<ProductAttribute[]>(INITIAL_ATTRIBUTES);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <main>
        {currentTab === 'configure' ? (
          <Configurator 
            rules={rules} 
            setRules={setRules}
            attributes={attributes}
            setAttributes={setAttributes}
          />
        ) : (
          <Authoring 
            rules={rules} 
            setRules={setRules} 
            attributes={attributes}
          />
        )}
      </main>
    </div>
  );
};

export default App;