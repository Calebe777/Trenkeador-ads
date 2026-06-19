import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Layers, 
  Users, 
  Link as LinkIcon, 
  Settings, 
  LogOut,
  X,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inbox', label: 'Inbox (Chat)', icon: MessageSquare },
    { to: '/pipeline', label: 'Pipeline CRM', icon: Layers },
    { to: '/leads', label: 'Leads', icon: Users },
    { to: '/followups', label: 'Follow-ups', icon: Calendar },
    { to: '/links', label: 'Links Rastreáveis', icon: LinkIcon },
    { to: '/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full text-zinc-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
            LT
          </div>
          <span className="font-bold text-xl tracking-tight text-[#00a884]">
            LeadTrack
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-violet-600 text-white font-medium shadow-md shadow-violet-600/10'
                  : 'hover:bg-zinc-800 hover:text-zinc-100'
              }`
            }
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <Icon 
                    size={20} 
                    className={isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200 transition-colors'} 
                  />
                  <span>{item.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        {user && (
          <div className="flex items-center space-x-3 px-2 py-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-semibold text-violet-400 border border-zinc-700">
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{user.nome}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-zinc-400 transition-all duration-200 group"
        >
          <LogOut size={20} className="text-zinc-400 group-hover:text-red-400 transition-colors" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};
