import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { LeadOut, NegocioOut } from '../types';
import { 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Trash2
} from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const [negocios, setNegocios] = useState<NegocioOut[]>([]);
  const [leads, setLeads] = useState<LeadOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGanhoModalOpen, setIsGanhoModalOpen] = useState(false);
  const [selectedNegocio, setSelectedNegocio] = useState<NegocioOut | null>(null);
  
  // Forms state
  const [submitting, setSubmitting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealStage, setDealStage] = useState('novo');
  
  // Ganho modal value input
  const [ganhoValue, setGanhoValue] = useState('');

  // Dragging states
  const [draggedOverStage, setDraggedOverStage] = useState<string | null>(null);

  const stages = [
    { id: 'novo', name: 'Novo Lead', color: 'border-t-zinc-500 bg-zinc-900/50' },
    { id: 'em_atendimento', name: 'Em Atendimento', color: 'border-t-blue-500 bg-blue-500/5' },
    { id: 'qualificado', name: 'Qualificado', color: 'border-t-violet-500 bg-violet-500/5' },
    { id: 'negociacao', name: 'Negociação', color: 'border-t-amber-500 bg-amber-500/5' },
    { id: 'ganho', name: 'Ganho (Vendido)', color: 'border-t-emerald-500 bg-emerald-500/5' },
    { id: 'perdido', name: 'Perdido', color: 'border-t-red-500 bg-red-500/5' },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [negociosRes, leadsRes] = await Promise.all([
        apiClient.get<NegocioOut[]>('/negocios'),
        apiClient.get<LeadOut[]>('/leads'),
      ]);

      // Hydrate businesses with lead information
      const hydratedNegocios = negociosRes.data.map(negocio => {
        const lead = leadsRes.data.find(l => l.id === negocio.lead_id);
        return {
          ...negocio,
          lead_nome: lead?.nome || 'Lead s/ Nome',
          lead_telefone: lead?.telefone || '',
        };
      });

      setNegocios(hydratedNegocios);
      setLeads(leadsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar o pipeline de vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDraggedOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDraggedOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const negocioId = e.dataTransfer.getData('text/plain');
    const negocio = negocios.find(n => n.id === negocioId);
    
    if (!negocio || negocio.etapa === targetStage) return;

    if (targetStage === 'ganho') {
      // If we move it to Ganho, open modal to ask for value
      setSelectedNegocio(negocio);
      setGanhoValue(negocio.valor ? String(negocio.valor) : '');
      setIsGanhoModalOpen(true);
    } else {
      // Direct stage transition
      try {
        setNegocios(prev => prev.map(n => n.id === negocioId ? { ...n, etapa: targetStage } : n));
        
        let status = 'aberto';
        if (targetStage === 'perdido') status = 'perdido';

        await apiClient.patch(`/negocios/${negocioId}`, {
          etapa: targetStage,
          status: status
        });
        fetchData(); // reload to get exact state from DB
      } catch (err) {
        console.error('Failed to update stage', err);
        fetchData(); // reset on error
      }
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    setSubmitting(true);
    try {
      await apiClient.post('/negocios', {
        lead_id: selectedLeadId,
        valor: dealValue ? Number(dealValue) : null,
        etapa: dealStage,
      });
      setIsCreateModalOpen(false);
      setSelectedLeadId('');
      setDealValue('');
      setDealStage('novo');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar negócio.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGanhoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNegocio) return;

    setSubmitting(true);
    try {
      await apiClient.patch(`/negocios/${selectedNegocio.id}`, {
        etapa: 'ganho',
        status: 'ganho',
        valor: ganhoValue ? Number(ganhoValue) : null,
      });
      setIsGanhoModalOpen(false);
      setSelectedNegocio(null);
      setGanhoValue('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Falha ao confirmar venda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPerdido = async (negocio: NegocioOut) => {
    if (!confirm(`Deseja marcar o negócio de ${negocio.lead_nome} como PERDIDO?`)) return;

    try {
      await apiClient.patch(`/negocios/${negocio.id}`, {
        etapa: 'perdido',
        status: 'perdido',
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar negócio.');
    }
  };

  const handleDeleteNegocio = async (id: string, leadNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o negócio de "${leadNome}" do CRM?`)) return;
    try {
      await apiClient.delete(`/negocios/${id}`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao excluir negócio.');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Funil de Vendas (CRM)</h1>
          <p className="text-zinc-500">Mova os leads pelas etapas de vendas. Fechar venda como "Ganho" dispara conversão Meta CAPI.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer w-full sm:w-auto text-sm"
        >
          <Plus size={18} />
          <span>Novo Negócio</span>
        </button>
      </div>

      {loading && negocios.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <Loader2 size={36} className="animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-3 m-4">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      ) : (
        /* Kanban Columns Grid Scrollable */
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 select-none min-h-[500px]">
          {stages.map((stage) => {
            const stageDeals = negocios.filter(n => n.etapa === stage.id);
            const stageTotalValue = stageDeals.reduce((sum, n) => sum + Number(n.valor || 0), 0);

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`w-72 shrink-0 border-t-2 rounded-2xl border-x border-b border-zinc-800 flex flex-col max-h-[75vh] transition-colors duration-200 ${stage.color} ${
                  draggedOverStage === stage.id ? 'bg-zinc-800/40 border-violet-600' : ''
                }`}
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-bold text-white text-sm">{stage.name}</h3>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">
                      {stageDeals.length} {stageDeals.length === 1 ? 'negócio' : 'negócios'}
                    </span>
                  </div>
                  {stageTotalValue > 0 && (
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      {stageTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {stageDeals.length === 0 ? (
                    <div className="h-20 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-600">
                      Arraste cards aqui
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-zinc-700 hover:bg-zinc-800/50 transition-all shadow-md group relative"
                      >
                        <h4 className="font-semibold text-white text-sm truncate pr-6">{deal.lead_nome}</h4>
                        <p className="text-xs text-zinc-500 font-mono mt-1">{deal.lead_telefone || 'Sem whatsapp'}</p>
                        
                        <div className="mt-3 flex justify-between items-center text-xs">
                          <span className="font-semibold text-zinc-300 font-mono">
                            {deal.valor 
                              ? Number(deal.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : <span className="text-zinc-600 text-[10px]">Sem valor</span>
                            }
                          </span>

                          <div className="flex items-center space-x-1.5">
                            {deal.status === 'ganho' && (
                              <span className="flex items-center text-[10px] bg-emerald-500/10 text-emerald-400 py-0.5 px-1.5 rounded-full border border-emerald-500/20">
                                <CheckCircle size={10} className="mr-1" /> Ganho
                              </span>
                            )}
                            {deal.status === 'perdido' && (
                              <span className="flex items-center text-[10px] bg-red-500/10 text-red-400 py-0.5 px-1.5 rounded-full border border-red-500/20">
                                <XCircle size={10} className="mr-1" /> Perdido
                              </span>
                            )}
                            {deal.status === 'aberto' && (
                              <span className="flex items-center text-[10px] bg-amber-500/10 text-amber-400 py-0.5 px-1.5 rounded-full border border-amber-500/20">
                                <Clock size={10} className="mr-1" /> Aberto
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover Quick Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          {deal.status === 'aberto' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedNegocio(deal);
                                  setGanhoValue(deal.valor ? String(deal.valor) : '');
                                  setIsGanhoModalOpen(true);
                                }}
                                title="Marcar Ganho"
                                className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 border border-emerald-500/20 hover:text-white transition-colors cursor-pointer"
                              >
                                <CheckCircle size={12} />
                              </button>
                              <button
                                onClick={() => handleMarkPerdido(deal)}
                                title="Marcar Perdido"
                                className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 border border-red-500/20 hover:text-white transition-colors cursor-pointer"
                              >
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteNegocio(deal.id, deal.lead_nome || 'Lead s/ Nome')}
                            title="Excluir Negócio"
                            className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 border border-red-500/20 hover:text-white transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal Form */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-2">Novo Negócio no CRM</h2>
            <p className="text-zinc-500 text-sm mb-6">Associe um lead existente a uma oportunidade de venda.</p>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Selecione o Lead <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-sm"
                >
                  <option value="">Selecione um lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.nome || 'Lead s/ Nome'} ({lead.telefone || 'sem telefone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Valor Estimado (R$) (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500 text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-violet-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Etapa Inicial
                </label>
                <select
                  value={dealStage}
                  onChange={(e) => setDealStage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-sm"
                >
                  <option value="novo">Novo Lead</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="qualificado">Qualificado</option>
                  <option value="negociacao">Negociação</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setSelectedLeadId('');
                    setDealValue('');
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation of Ganho with Final Value input */}
      {isGanhoModalOpen && selectedNegocio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => {
            setIsGanhoModalOpen(false);
            setSelectedNegocio(null);
          }} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex items-center space-x-3 mb-3 text-emerald-400">
              <TrendingUp size={24} />
              <h2 className="text-xl font-bold text-white">Fechar Venda (Ganho)</h2>
            </div>
            
            <p className="text-zinc-500 text-xs mb-6">
              Insira o valor final faturado. Isso disparará o evento de Conversão <span className="font-semibold text-zinc-300">Purchase</span> no Meta via CAPI.
            </p>

            <form onSubmit={handleGanhoSubmit} className="space-y-4">
              <div className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl mb-4 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-500">Lead Associado:</span>
                  <span className="font-bold text-white">{selectedNegocio.lead_nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Telefone:</span>
                  <span className="font-mono text-zinc-400">{selectedNegocio.lead_telefone || '-'}</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Valor da Venda (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500 text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={ganhoValue}
                    onChange={(e) => setGanhoValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-violet-600 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsGanhoModalOpen(false);
                    setSelectedNegocio(null);
                    setGanhoValue('');
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Venda</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
