import React from 'react';

export const InvestigationDashboard = () => {
  return (
    <div className="w-full h-full bg-gray-950 p-6 overflow-auto">
       <div className="flex justify-between items-center mb-6">
          <div>
             <h1 className="text-2xl font-bold text-white tracking-tight">Active Investigations</h1>
             <p className="text-sm text-gray-400 mt-1">Manage ongoing cases, hypotheses, and evidence.</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium shadow hover:bg-blue-700 transition-colors flex items-center space-x-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
             <span>New Case</span>
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-blue-500/50 transition-colors cursor-pointer group shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-pulse"></span>
                      <span className="font-semibold text-gray-200">Operation Chimera {i}</span>
                   </div>
                   <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">INV-00{i}</span>
                </div>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">Investigation into anomalous financial flows associated with synthetic identity networks.</p>
                <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800 pt-3">
                   <div className="flex space-x-3">
                      <span className="flex items-center"><svg className="w-3.5 h-3.5 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> 12 Entities</span>
                      <span className="flex items-center"><svg className="w-3.5 h-3.5 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 5 Evidences</span>
                   </div>
                   <span className="flex items-center">
                      <img className="inline-block h-5 w-5 rounded-full ring-2 ring-gray-900" src="https://ui-avatars.com/api/?name=Analyst+A&background=random" alt="" />
                   </span>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};
