import React, { useState, useEffect } from 'react';
import { AppView, EmailTemplate, UserProfile } from './types';
import { getTemplates, deleteTemplate, mockConnectGmail, getMockUser, disconnectGmail } from './services/mockBackend';
import TemplateGenerator from './components/TemplateGenerator';
import TemplateEditor from './components/TemplateEditor';
import EmailSender from './components/EmailSender';
import { 
  Plus, 
  Layout, 
  Settings, 
  LogOut, 
  Mail, 
  Trash2, 
  Edit3, 
  Send as SendIcon, 
  Zap,
  Github
} from 'lucide-react';

const App = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Load initial data
  useEffect(() => {
    refreshTemplates();
    const existingUser = getMockUser();
    if (existingUser) setUser(existingUser);
  }, []);

  const refreshTemplates = () => {
    setTemplates(getTemplates());
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
      refreshTemplates();
    }
  };

  const handleConnect = async () => {
    const success = await mockConnectGmail();
    if (success) {
      setUser(getMockUser());
    }
  };

  const handleDisconnect = () => {
    disconnectGmail();
    setUser(null);
  };

  const renderContent = () => {
    switch (view) {
      case AppView.GENERATOR:
        return (
          <TemplateGenerator 
            onGenerated={(t) => {
              setActiveTemplate(t);
              setView(AppView.EDITOR);
            }}
            onCancel={() => setView(AppView.DASHBOARD)}
          />
        );
      
      case AppView.EDITOR:
        return activeTemplate ? (
          <TemplateEditor
            template={activeTemplate}
            onBack={() => {
              setActiveTemplate(null);
              refreshTemplates(); // Ensure list is up to date if we saved
              setView(AppView.DASHBOARD);
            }}
            onSave={(updated) => {
              setActiveTemplate(updated);
              refreshTemplates();
            }}
          />
        ) : null;

      case AppView.SENDER:
         return activeTemplate ? (
           <div className="p-8">
             <EmailSender 
               template={activeTemplate}
               onClose={() => setView(AppView.DASHBOARD)}
             />
           </div>
         ) : null;

      case AppView.DASHBOARD:
      default:
        return (
          <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Templates</h1>
                <p className="text-gray-500">Manage and create your email campaigns with Sirz</p>
              </div>
              <button
                onClick={() => setView(AppView.GENERATOR)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-shadow shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                New Template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <Layout className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No templates yet</h3>
                <p className="text-gray-500 mb-6">Ask Sirz to generate your first professional email.</p>
                <button
                  onClick={() => setView(AppView.GENERATOR)}
                  className="text-indigo-600 font-medium hover:text-indigo-800"
                >
                  Start Generator &rarr;
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                  <div 
                    key={t.id} 
                    className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden cursor-pointer"
                    onClick={() => {
                      setActiveTemplate(t);
                      setView(AppView.EDITOR);
                    }}
                  >
                    {/* Mock Preview Thumbnail */}
                    <div className="h-40 bg-gray-100 border-b border-gray-100 relative overflow-hidden">
                       <iframe 
                          srcDoc={t.html} 
                          className="w-[200%] h-[200%] transform scale-50 origin-top-left pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" 
                          tabIndex={-1}
                          title="thumbnail"
                       />
                       <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={(e) => handleDelete(t.id, e)}
                           className="p-1.5 bg-white text-red-500 rounded-md shadow hover:bg-red-50"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-800 mb-1 truncate">{t.title}</h3>
                      <p className="text-sm text-gray-500 mb-4 truncate">Sub: {t.subject}</p>
                      
                      <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-100">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setActiveTemplate(t);
                             setView(AppView.EDITOR);
                           }}
                           className="flex-1 flex justify-center items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 py-1.5 hover:bg-indigo-50 rounded transition-colors"
                         >
                           <Edit3 className="w-3.5 h-3.5" /> Edit
                         </button>
                         <div className="w-px h-4 bg-gray-200"></div>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setActiveTemplate(t);
                             setView(AppView.SENDER);
                           }}
                           className="flex-1 flex justify-center items-center gap-2 text-sm font-medium text-gray-600 hover:text-green-600 py-1.5 hover:bg-green-50 rounded transition-colors"
                         >
                           <SendIcon className="w-3.5 h-3.5" /> Send
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-800">Sirz<span className="text-indigo-600">Mail</span></span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.DASHBOARD ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Layout className="w-5 h-5" />
            Dashboard
          </button>
          
          <div className="pt-4 mt-4 border-t border-gray-100">
             <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Settings</div>
             <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
               <Settings className="w-5 h-5" />
               Configuration
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
               <Github className="w-5 h-5" />
               Documentation
             </button>
          </div>
        </nav>

        {/* User Profile / Connect */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold border border-green-200">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-gray-900 truncate w-24">{user.name}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Gmail Connected
                  </p>
                </div>
              </div>
              <button 
                onClick={handleDisconnect}
                className="text-gray-400 hover:text-red-500 transition-colors" 
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50 relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;