import React from 'react';

interface NavbarProps {
  currentTab: 'configure' | 'author';
  onTabChange: (tab: 'configure' | 'author') => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600 tracking-tight">Antigravity CPQ</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <button
                onClick={() => onTabChange('configure')}
                className={`${
                  currentTab === 'configure'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors`}
              >
                Configurator
              </button>
              <button
                onClick={() => onTabChange('author')}
                className={`${
                  currentTab === 'author'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors`}
              >
                Rule Authoring
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">v1.0.0-beta</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;