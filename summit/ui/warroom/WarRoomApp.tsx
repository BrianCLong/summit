import React, { useState } from 'react';
import { WarRoomWorkspace } from './WarRoomWorkspace';
import { WarRoomCommandPalette } from './WarRoomCommandPalette';

export const WarRoomApp = () => {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden font-sans">
      {/* Left Sidebar for Navigation/Tools */}
      <div className="w-16 border-r border-gray-800 bg-gray-900 flex flex-col items-center py-4 space-y-4 z-20 shadow-2xl">
         <div title="Graph Intelligence" className="w-10 h-10 bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center group active:scale-95">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
         </div>
         <div title="Investigations" className="w-10 h-10 bg-purple-600 rounded-lg cursor-pointer hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20 flex items-center justify-center group active:scale-95">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
         </div>
         <div title="Agent Console" className="w-10 h-10 bg-green-600 rounded-lg cursor-pointer hover:bg-green-500 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center group active:scale-95">
            <svg className="w-6 h-6 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
         </div>
         <div className="flex-1"></div>
         <div title="Settings" className="w-10 h-10 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center group active:scale-95">
            <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
         </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Toolbar/Command Palette Trigger */}
        <div className="h-14 border-b border-gray-800 bg-gray-900 flex items-center px-6 justify-between z-10 shadow-sm relative">
           <div className="flex items-center space-x-4">
              <div className="text-xl font-bold tracking-tight text-white flex items-center">
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mr-2">Summit</span>
                 <span className="font-light">War Room</span>
              </div>
              <div className="h-6 w-px bg-gray-700"></div>
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wider bg-gray-800 px-2 py-1 rounded">OSINT Fusion Active</div>
           </div>

           <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
              <div className="relative group cursor-pointer w-96" onClick={() => setCmdOpen(true)}>
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
                 <input
                   type="text"
                   readOnly
                   placeholder="Search entities, queries, simulations..."
                   className="block w-full pl-10 pr-3 py-1.5 border border-gray-700 rounded-md leading-5 bg-gray-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors shadow-inner cursor-pointer"
                 />
                 <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <kbd className="inline-flex items-center border border-gray-700 rounded px-2 text-sm font-sans font-medium text-gray-500 bg-gray-900 shadow-sm">
                       Cmd K
                    </kbd>
                 </div>
              </div>
           </div>

           <div className="flex items-center space-x-3">
              <div className="flex -space-x-2 overflow-hidden mr-2">
                 <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-900 hover:z-10 transition-transform hover:scale-110" src="https://ui-avatars.com/api/?name=Analyst+A&background=random" alt="" />
                 <img className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-900 hover:z-10 transition-transform hover:scale-110" src="https://ui-avatars.com/api/?name=Agent+M&background=0D8ABC&color=fff" alt="" />
                 <div className="inline-block h-8 w-8 rounded-full ring-2 ring-gray-900 bg-gray-700 flex items-center justify-center text-xs font-medium text-white hover:z-10 transition-transform hover:scale-110 cursor-pointer">+2</div>
              </div>
              <div className="h-6 w-px bg-gray-700"></div>
              <button className="text-gray-400 hover:text-white transition-colors relative group">
                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                 </svg>
                 <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900 animate-pulse"></span>
              </button>
           </div>
        </div>

        {/* Workspace Layout */}
        <WarRoomWorkspace />

        {cmdOpen && (
           <div onClick={() => setCmdOpen(false)}>
              <WarRoomCommandPalette />
           </div>
        )}
      </div>
    </div>
  );
};
