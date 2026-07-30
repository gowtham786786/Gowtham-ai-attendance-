import React from 'react';

const StatsCard = ({ title, value, icon, bgColor = 'bg-primary-light', textColor = 'text-primary-dark', iconColor = 'text-primary' }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md duration-300">
      <div className={`p-4 rounded-full ${bgColor} ${iconColor} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className={`text-2xl font-bold ${textColor} dark:text-white mt-1`}>{value}</p>
      </div>
    </div>
  );
};

export default StatsCard;
