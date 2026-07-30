import React, { useState } from 'react';
import TopNavbar from './TopNavbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

const DashboardLayout = ({ children, tabs, activeTab, onTabChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans flex flex-col transition-colors duration-200">
      <TopNavbar onMenuClick={toggleSidebar} />
      
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        {tabs && tabs.length > 0 && (
          <Sidebar 
            isSidebarOpen={isSidebarOpen} 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={onTabChange} 
          />
        )}
        
        {/* Main Content Area */}
        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${tabs && tabs.length > 0 ? (isSidebarOpen ? 'ml-64' : 'ml-20') : ''}`}>
          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
