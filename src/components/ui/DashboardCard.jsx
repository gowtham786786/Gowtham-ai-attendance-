import React from 'react';

const DashboardCard = ({ title, subtitle, children, actionButton }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {actionButton && <div>{actionButton}</div>}
      </div>
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;
