import {
  Workflow,
  Wand2,
  Bot,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/cn';

const menuItems = [
  { id: 'workflow', label: 'Workflow Builder', icon: Workflow },
  { id: 'prompt', label: 'Prompt Studio', icon: Wand2 },
  { id: 'agent', label: 'Agent Builder', icon: Bot },
  { id: 'pipeline', label: 'Content Pipeline', icon: FileText },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { activeMode, setActiveMode, logout, addToast } = useStore();

  const handleSelectMode = (mode: (typeof menuItems)[number]['id']) => {
    setActiveMode(mode);
    onClose();
  };

  const handleLogout = () => {
    const confirmed = window.confirm('Log out now? All local OxAI data in this browser will be deleted.');
    if (!confirmed) return;

    logout();
    onClose();
    window.location.hash = '#logout';
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    addToast({
      type: 'info',
      title: 'Logged out',
      message: 'Local session data has been cleared.',
    });
  };

  return (
    <>
      <aside
        className={cn(
          'group w-72 md:w-20 md:hover:w-64 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 flex flex-col',
          'fixed md:static inset-y-0 left-0 z-50 transition-[transform,width] duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[160px] md:group-hover:opacity-100 transition-all duration-200">
              <h1 className="text-lg font-bold text-white">OxAI</h1>
              <p className="text-xs text-emerald-400">AI Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectMode(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'md:justify-center md:px-2 md:group-hover:justify-start md:group-hover:px-3',
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/20 to-green-600/20 text-white border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'text-emerald-400')} />
                <span className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[180px] md:group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 md:justify-center md:px-2 md:group-hover:justify-start md:group-hover:px-3">
            <Settings className="w-5 h-5" />
            <span className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[180px] md:group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
              Settings
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300/90 hover:text-red-200 hover:bg-red-900/20 transition-all duration-200 md:justify-center md:px-2 md:group-hover:justify-start md:group-hover:px-3"
          >
            <LogOut className="w-5 h-5" />
            <span className="md:max-w-0 md:opacity-0 md:overflow-hidden md:group-hover:max-w-[180px] md:group-hover:opacity-100 transition-all duration-200 whitespace-nowrap">
              Logout
            </span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 md:max-h-0 md:opacity-0 md:overflow-hidden md:group-hover:max-h-20 md:group-hover:opacity-100 transition-all duration-200">
            <p>Version 1.0</p>
            <p>By OxAI . Oxlo.ai Build 2026</p>
          </div>
        </div>
      </aside>

      {isOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}
    </>
  );
}
