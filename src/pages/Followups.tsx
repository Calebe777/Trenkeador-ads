import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Followup, LeadOut } from '../types';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  Check
} from 'lucide-react';

export const Followups: React.FC = () => {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const [followupsRes, leadsRes] = await Promise.all([
        apiClient.get<Followup[]>('/followups'),
        apiClient.get<LeadOut[]>('/leads')
      ]);

      // Hydrate followups with lead name/phone
      const hydrated = followupsRes.data.map(item => {
        const lead = leadsRes.data.find(l => l.id === item.lead_id);
        return {
          ...item,
          lead_nome: lead?.nome || 'Lead s/ Nome',
          lead_telefone: lead?.telefone || ''
        };
      });

      setFollowups(hydrated);
    } catch (err) {
      console.error('Error fetching follow-ups', err);
      setError('Falha ao carregar agenda de follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, []);

  const handleMarkComplete = async (id: string) => {
    try {
      await apiClient.patch(`/followups/${id}/feito`);
      // Update locally
      setFollowups(prev => prev.map(item => 
        item.id === id ? { ...item, feito: true } : item
      ));
    } catch (err) {
      console.error('Error marking followup complete', err);
      alert('Falha ao marcar follow-up como concluído.');
    }
  };

  // Filter followups based on search
  const filtered = followups.filter(f => {
    const nome = f.lead_nome?.toLowerCase() || '';
    const nota = f.nota?.toLowerCase() || '';
    const busca = searchTerm.toLowerCase();
    return nome.includes(busca) || nota.includes(busca);
  });

  const now = new Date();

  // Categorize
  const overdue = filtered.filter(f => !f.feito && new Date(f.quando) < now);
  const today = filtered.filter(f => {
    if (f.feito) return false;
    const itemDate = new Date(f.quando);
    return itemDate >= now && itemDate.toDateString() === now.toDateString();
  });
  const upcoming = filtered.filter(f => {
    if (f.feito) return false;
    const itemDate = new Date(f.quando);
    return itemDate > now && itemDate.toDateString() !== now.toDateString();
  });
  const completed = filtered.filter(f => f.feito);

  if (loading && followups.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Agenda de Follow-ups</h1>
        <p className="text-zinc-500">Acompanhe lembretes e agendamentos de contato com seus leads. Evite deixar tarefas atrasarem.</p>
      </div>

      {/* Search Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Pesquisar follow-up por cliente ou nota lembrete..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-3">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      )}

      {/* Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Overdue and Today */}
        <div className="space-y-8">
          {/* Overdue section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center">
              <AlertCircle size={16} className="mr-1.5" />
              <span>Atrasados / Pendentes ({overdue.length})</span>
            </h3>

            {overdue.length === 0 ? (
              <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 italic">
                Nenhum follow-up atrasado. Bom trabalho!
              </div>
            ) : (
              <div className="space-y-3">
                {overdue.map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-red-500/20 rounded-2xl p-4 flex justify-between items-center hover:border-red-500/40 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{item.lead_nome}</h4>
                      <p className="text-xs text-zinc-400">{item.nota || 'Sem nota cadastrada'}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-red-400 font-mono">
                        <Clock size={12} />
                        <span>Atrasado desde {new Date(item.quando).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkComplete(item.id)}
                      className="p-2.5 bg-red-500/10 hover:bg-emerald-600 text-red-400 hover:text-white rounded-xl border border-red-500/20 hover:border-emerald-600 transition-all cursor-pointer"
                      title="Marcar Concluído"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center">
              <Clock size={16} className="mr-1.5" />
              <span>Para Hoje ({today.length})</span>
            </h3>

            {today.length === 0 ? (
              <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 italic">
                Nenhum contato agendado para hoje.
              </div>
            ) : (
              <div className="space-y-3">
                {today.map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center hover:border-zinc-700 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{item.lead_nome}</h4>
                      <p className="text-xs text-zinc-400">{item.nota || 'Sem nota cadastrada'}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-amber-400 font-mono">
                        <Clock size={12} />
                        <span>Lembrete às {new Date(item.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkComplete(item.id)}
                      className="p-2.5 bg-zinc-950 hover:bg-emerald-600 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 hover:border-emerald-600 transition-all cursor-pointer"
                      title="Marcar Concluído"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming and Completed */}
        <div className="space-y-8">
          {/* Upcoming section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider flex items-center">
              <Calendar size={16} className="mr-1.5" />
              <span>Próximos Dias ({upcoming.length})</span>
            </h3>

            {upcoming.length === 0 ? (
              <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 italic">
                Nenhum follow-up futuro programado.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center hover:border-zinc-700 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-sm">{item.lead_nome}</h4>
                      <p className="text-xs text-zinc-400">{item.nota || 'Sem nota cadastrada'}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-violet-400 font-mono">
                        <Calendar size={12} />
                        <span>Programado: {new Date(item.quando).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkComplete(item.id)}
                      className="p-2.5 bg-zinc-950 hover:bg-emerald-600 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 hover:border-emerald-600 transition-all cursor-pointer"
                      title="Marcar Concluído"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center">
              <CheckCircle2 size={16} className="mr-1.5" />
              <span>Concluídos ({completed.length})</span>
            </h3>

            {completed.length === 0 ? (
              <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 italic">
                Nenhum follow-up concluído no histórico.
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {completed.map(item => (
                  <div key={item.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex justify-between items-center opacity-60">
                    <div className="space-y-1">
                      <h4 className="font-bold text-zinc-400 text-sm line-through">{item.lead_nome}</h4>
                      <p className="text-xs text-zinc-500 line-through">{item.nota || 'Sem nota'}</p>
                      <span className="text-[9px] text-zinc-600 block">Tarefa finalizada</span>
                    </div>
                    <span className="text-emerald-400 p-2">
                      <CheckCircle2 size={18} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
