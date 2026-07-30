import React from 'react';

const Sidebar = ({ isSidebarOpen, tabs, activeTab, onTabChange }) => {
  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed left-0 top-16 bottom-0 z-40 shadow-sm`}>
      <div className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={!isSidebarOpen ? tab.label : ''}
              className={`w-full flex items-center ${isSidebarOpen ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-lg transition-all duration-200 border-l-4 ${
                activeTab === tab.id 
                  ? 'bg-primary-light border-primary text-primary-dark dark:bg-primary-900/30 dark:text-primary-400' 
                  : 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className={`text-xl ${activeTab === tab.id ? 'text-primary' : 'text-gray-500'}`}>
                {tab.icon}
              </div>
              <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
