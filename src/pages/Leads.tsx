import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { 
  LeadOut, 
  LeadDetalhe, 
  UsuarioOut, 
  Tag
} from '../types';
import { 
  Search, 
  MapPin, 
  ChevronRight, 
  X, 
  Loader2, 
  AlertCircle,
  Globe,
  Info,
  Layers,
  Tag as TagIcon,
  Plus,
  User,
  Check,
  Edit2,
  Clock,
  FileText
} from 'lucide-react';

export const Leads: React.FC = () => {
  const [leads, setLeads] = useState<LeadOut[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOut[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [atendenteFilter, setAtendenteFilter] = useState('all');

  // Detailed view drawer state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetalhe | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editAtendenteId, setEditAtendenteId] = useState('');
  
  // Tag creation
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#8b5cf6');
  const [showTagForm, setShowTagForm] = useState(false);

  // Annotation text
  const [newAnotacao, setNewAnotacao] = useState('');
  const [submittingAnotacao, setSubmittingAnotacao] = useState(false);

  // Follow-up scheduling
  const [followupQuando, setFollowupQuando] = useState('');
  const [followupNota, setFollowupNota] = useState('');
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [leadsRes, usuariosRes, tagsRes] = await Promise.all([
        apiClient.get<LeadOut[]>('/leads'),
        apiClient.get<UsuarioOut[]>('/usuarios'),
        apiClient.get<Tag[]>('/tags')
      ]);
      setLeads(leadsRes.data);
      setUsuarios(usuariosRes.data);
      setAllTags(tagsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar leads e atendentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSelectLead = async (id: string) => {
    setSelectedLeadId(id);
    setLoadingDetail(true);
    setLeadDetail(null);
    setIsEditing(false);
    try {
      const response = await apiClient.get<LeadDetalhe>(`/leads/${id}`);
      const detail = response.data;
      setLeadDetail(detail);

      // Hydrate edit fields
      setEditNome(detail.lead.nome || '');
      setEditTelefone(detail.lead.telefone || '');
      setEditCidade(detail.lead.cidade || '');
      setEditEstado(detail.lead.estado || '');
      setEditAtendenteId(detail.lead.atendente_id || '');
    } catch (err) {
      console.error('Failed to load lead details', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateLeadInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    try {
      const response = await apiClient.patch<LeadOut>(`/leads/${selectedLeadId}`, {
        nome: editNome.trim() || null,
        telefone: editTelefone.trim() || null,
        cidade: editCidade.trim() || null,
        estado: editEstado.trim() || null,
        atendente_id: editAtendenteId || null
      });

      // Update leads list locally
      setLeads(prev => prev.map(l => l.id === selectedLeadId ? response.data : l));
      
      // Update details window
      if (leadDetail) {
        setLeadDetail({
          ...leadDetail,
          lead: response.data
        });
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating lead info', err);
      alert('Erro ao atualizar informações do lead.');
    }
  };

  // Add tag to lead
  const handleAddTagToLead = async (tagId: string) => {
    if (!selectedLeadId || !leadDetail) return;
    if (leadDetail.tags.some(t => t.id === tagId)) return;

    try {
      await apiClient.post(`/leads/${selectedLeadId}/tags/${tagId}`);
      // Refresh details
      const response = await apiClient.get<LeadDetalhe>(`/leads/${selectedLeadId}`);
      setLeadDetail(response.data);
    } catch (err) {
      console.error('Failed to associate tag', err);
    }
  };

  // Remove tag from lead
  const handleRemoveTagFromLead = async (tagId: string) => {
    if (!selectedLeadId || !leadDetail) return;

    try {
      await apiClient.delete(`/leads/${selectedLeadId}/tags/${tagId}`);
      // Refresh details
      const response = await apiClient.get<LeadDetalhe>(`/leads/${selectedLeadId}`);
      setLeadDetail(response.data);
    } catch (err) {
      console.error('Failed to remove tag association', err);
    }
  };

  // Create a brand new global tag
  const handleCreateNewTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await apiClient.post('/tags', {
        nome: newTagName.trim(),
        cor: newTagColor
      });
      setNewTagName('');
      setShowTagForm(false);
      
      // Reload global tags list
      const tagsRes = await apiClient.get<Tag[]>('/tags');
      setAllTags(tagsRes.data);
    } catch (err) {
      console.error('Error creating tag', err);
      alert('Esta tag já existe ou ocorreu um erro.');
    }
  };

  // Create an annotation
  const handleAddAnotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !newAnotacao.trim() || submittingAnotacao) return;

    setSubmittingAnotacao(true);
    try {
      await apiClient.post(`/leads/${selectedLeadId}/anotacoes`, {
        texto: newAnotacao.trim()
      });
      setNewAnotacao('');
      
      // Refresh lead details
      const response = await apiClient.get<LeadDetalhe>(`/leads/${selectedLeadId}`);
      setLeadDetail(response.data);
    } catch (err) {
      console.error(err);
      alert('Falha ao registrar anotação.');
    } finally {
      setSubmittingAnotacao(false);
    }
  };

  // Schedule a follow-up
  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !followupQuando || schedulingFollowup) return;

    setSchedulingFollowup(true);
    try {
      // Input datetime-local is YYYY-MM-DDTHH:MM, we convert to ISO
      const isoDate = new Date(followupQuando).toISOString();
      await apiClient.post(`/leads/${selectedLeadId}/followups`, {
        quando: isoDate,
        nota: followupNota.trim() || null
      });
      setFollowupQuando('');
      setFollowupNota('');
      alert('Follow-up agendado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Falha ao agendar follow-up.');
    } finally {
      setSchedulingFollowup(false);
    }
  };

  // Filter leads list
  const filteredLeads = leads.filter(lead => {
    const nome = lead.nome?.toLowerCase() || '';
    const telefone = lead.telefone || '';
    const busca = searchTerm.toLowerCase();
    
    const matchesSearch = nome.includes(busca) || telefone.includes(busca);
    const matchesAtendente = atendenteFilter === 'all' || 
      (atendenteFilter === 'unassigned' && !lead.atendente_id) ||
      lead.atendente_id === atendenteFilter;

    return matchesSearch && matchesAtendente;
  });

  return (
    <div className="relative h-full flex flex-col space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Gestão de Leads</h1>
        <p className="text-zinc-500">Administre contatos capturados, altere atendentes responsáveis, agende follow-ups e registre anotações.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Pesquisar lead por nome ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors text-sm"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-2">
          <span className="text-zinc-500 text-xs font-semibold whitespace-nowrap">Responsável:</span>
          <select
            value={atendenteFilter}
            onChange={(e) => setAtendenteFilter(e.target.value)}
            className="bg-transparent border-none text-zinc-300 font-semibold focus:outline-none text-xs cursor-pointer min-w-[120px]"
          >
            <option value="all">Todos</option>
            <option value="unassigned">Sem Atendente</option>
            {usuarios.map(user => (
              <option key={user.id} value={user.id}>{user.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Leads Roster Table + Drawer Panel detail */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start overflow-hidden min-h-0">
        
        {/* Datatable */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 size={36} className="animate-spin text-violet-500" />
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-3 m-4">
              <AlertCircle size={24} />
              <span>{error}</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              Nenhum lead correspondente aos filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Lead / Contato</th>
                    <th className="px-6 py-4">Telefone</th>
                    <th className="px-6 py-4">Atendente</th>
                    <th className="px-6 py-4">Localização (IP)</th>
                    <th className="px-6 py-4">Criado em</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredLeads.map((lead) => {
                    const assignedAgent = usuarios.find(u => u.id === lead.atendente_id);
                    return (
                      <tr 
                        key={lead.id} 
                        onClick={() => handleSelectLead(lead.id)}
                        className={`hover:bg-zinc-800/30 transition-colors cursor-pointer ${
                          selectedLeadId === lead.id ? 'bg-violet-600/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">
                            {lead.nome || 'Lead s/ Nome'}
                          </div>
                          <span className="text-[10px] text-zinc-500 block truncate max-w-xs">{lead.id}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300 font-mono">
                          {lead.telefone || '-'}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-300">
                          {assignedAgent ? (
                            <span className="flex items-center text-violet-400 font-medium">
                              <User size={12} className="mr-1" /> {assignedAgent.nome}
                            </span>
                          ) : (
                            <span className="text-zinc-600">Fila Geral</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {lead.cidade || lead.estado ? (
                            <div className="flex items-center space-x-1.5">
                              <MapPin size={14} className="text-zinc-500" />
                              <span>{[lead.cidade, lead.estado].filter(Boolean).join(' - ')}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">Não detectado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400">
                          <span>{new Date(lead.criado_em).toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800">
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed drawer (scrolls alongside table or overlaps) */}
        {selectedLeadId && (
          <div className="w-full lg:w-96 shrink-0 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col h-[75vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h3 className="font-bold text-white text-lg flex items-center space-x-2">
                <Info size={18} className="text-violet-400" />
                <span>Perfil do Lead</span>
              </h3>
              <button 
                onClick={() => setSelectedLeadId(null)}
                className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            ) : leadDetail ? (
              <div className="space-y-6">
                
                {/* 1. Edit Lead Details Form */}
                <div className="bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Cadastro</span>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      <span>{isEditing ? 'Cancelar' : 'Editar'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleUpdateLeadInfo} className="space-y-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">Nome</label>
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">WhatsApp</label>
                        <input
                          type="text"
                          value={editTelefone}
                          onChange={(e) => setEditTelefone(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">Cidade</label>
                          <input
                            type="text"
                            value={editCidade}
                            onChange={(e) => setEditCidade(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">Estado</label>
                          <input
                            type="text"
                            value={editEstado}
                            onChange={(e) => setEditEstado(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase block font-semibold mb-1">Atendente Responsável</label>
                        <select
                          value={editAtendenteId}
                          onChange={(e) => setEditAtendenteId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-white"
                        >
                          <option value="">Fila Geral (Unassigned)</option>
                          {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nome}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center space-x-1 cursor-pointer"
                      >
                        <Check size={12} />
                        <span>Salvar Edição</span>
                      </button>
                    </form>
                  ) : (
                    /* Display static details */
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-zinc-500 font-semibold block">Nome Completo:</span>
                        <span className="text-white text-sm font-bold block">{leadDetail.lead.nome || 'Lead s/ Nome'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-semibold block">WhatsApp:</span>
                        <span className="text-white font-mono">{leadDetail.lead.telefone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-semibold block">Atendente Atribuído:</span>
                        <span className="text-violet-400 font-semibold">
                          {usuarios.find(u => u.id === leadDetail.lead.atendente_id)?.nome || 'Fila Geral'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Tags Management */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-white uppercase tracking-wider">
                    <span className="flex items-center"><TagIcon size={14} className="text-violet-400 mr-1" /> Tags</span>
                    <button 
                      onClick={() => setShowTagForm(!showTagForm)}
                      className="text-violet-400 hover:text-violet-300 font-semibold flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Nova Tag</span>
                    </button>
                  </div>

                  {showTagForm && (
                    <form onSubmit={handleCreateNewTag} className="flex gap-2 items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                      <input
                        type="text"
                        required
                        placeholder="Nome da tag..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1 px-2 text-xs text-white"
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-6 h-6 border-none bg-transparent rounded cursor-pointer"
                      />
                      <button
                        type="submit"
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded p-1"
                      >
                        <Check size={14} />
                      </button>
                    </form>
                  )}

                  {/* Associated tags list */}
                  <div className="flex flex-wrap gap-1.5">
                    {leadDetail.tags.map(tag => (
                      <span 
                        key={tag.id} 
                        style={{ backgroundColor: `${tag.cor}20`, borderColor: `${tag.cor}50`, color: tag.cor }}
                        className="text-[10px] font-semibold py-0.5 px-2 rounded-lg border flex items-center"
                      >
                        <span>{tag.nome}</span>
                        <button 
                          onClick={() => handleRemoveTagFromLead(tag.id)}
                          className="ml-1 opacity-70 hover:opacity-100 hover:scale-105"
                          title="Remover"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add existing tag dropdown selector */}
                  {allTags.filter(t => !leadDetail.tags.some(lt => lt.id === t.id)).length > 0 && (
                    <div className="mt-2 text-xs">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddTagToLead(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-zinc-400 focus:outline-none text-[11px]"
                      >
                        <option value="">Adicionar tag existente...</option>
                        {allTags
                          .filter(t => !leadDetail.tags.some(lt => lt.id === t.id))
                          .map(tag => (
                            <option key={tag.id} value={tag.id}>{tag.nome}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>

                {/* 3. Follow-up Scheduler */}
                <div className="bg-zinc-950/40 p-4 border border-zinc-800/80 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                    <Clock size={14} className="text-amber-500 mr-1" />
                    <span>Agendar Follow-up</span>
                  </span>

                  <form onSubmit={handleAddFollowup} className="space-y-2 text-xs">
                    <input
                      type="datetime-local"
                      required
                      value={followupQuando}
                      onChange={(e) => setFollowupQuando(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-violet-600 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Nota lembrete (ex: Ligar para confirmar)..."
                      value={followupNota}
                      onChange={(e) => setFollowupNota(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-violet-600 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={schedulingFollowup || !followupQuando}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl flex justify-center items-center space-x-1 cursor-pointer"
                    >
                      {schedulingFollowup ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <span>Agendar Lembrete</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* 4. Annotations Timeline */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                    <FileText size={14} className="text-emerald-500 mr-1" />
                    <span>Anotações do Lead</span>
                  </span>

                  {/* Add Annotation Form */}
                  <form onSubmit={handleAddAnotacao} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Escrever uma anotação..."
                      value={newAnotacao}
                      onChange={(e) => setNewAnotacao(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-violet-600"
                    />
                    <button
                      type="submit"
                      disabled={submittingAnotacao || !newAnotacao.trim()}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer"
                    >
                      {submittingAnotacao ? <Loader2 size={14} className="animate-spin" /> : <span>Add</span>}
                    </button>
                  </form>

                  {/* Annotations List */}
                  <div className="space-y-3 pt-2">
                    {leadDetail.anotacoes.length === 0 ? (
                      <p className="text-[11px] text-zinc-600 text-center italic">Nenhuma anotação registrada ainda.</p>
                    ) : (
                      leadDetail.anotacoes
                        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()) // latest first
                        .map(anot => (
                          <div key={anot.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1.5 relative">
                            <p className="text-xs text-zinc-300 leading-normal">{anot.texto}</p>
                            <span className="text-[9px] text-zinc-500 block font-mono text-right">
                              {new Date(anot.criado_em).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* 5. Tracking rich details (original click information) */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center space-x-1.5 text-zinc-400 font-bold text-xs">
                    <Layers size={14} className="text-emerald-500" />
                    <span>Origem Rastreável do Clique</span>
                  </div>

                  {leadDetail.origem ? (
                    <div className="space-y-4 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 text-xs">
                      {/* Campaign details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <span className="text-[10px] text-zinc-500 font-medium">Plataforma Ads</span>
                          <span className="block text-white font-semibold">{leadDetail.origem.plataforma || 'Tráfego Orgânico'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 font-medium">utm_source</span>
                          <span className="block text-zinc-300">{leadDetail.origem.utm_source || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 font-medium">utm_medium</span>
                          <span className="block text-zinc-300">{leadDetail.origem.utm_medium || '-'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-zinc-500 font-medium">utm_campaign</span>
                          <span className="block text-zinc-300 font-mono truncate select-all">{leadDetail.origem.utm_campaign || '-'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-zinc-500 font-medium">Criativo (utm_content)</span>
                          <span className="block text-violet-400 font-mono truncate select-all">{leadDetail.origem.utm_content || '-'}</span>
                        </div>
                      </div>

                      {/* Technical parameters */}
                      <div className="border-t border-zinc-800/60 pt-3 space-y-2">
                        <div>
                          <span className="text-[9px] text-zinc-500 font-medium">Meta Click ID (fbclid)</span>
                          <span className="block text-[10px] font-mono text-zinc-400 break-all bg-zinc-950 p-1.5 rounded border border-zinc-900 select-all">
                            {leadDetail.origem.fbclid || 'Não capturado'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-zinc-500">Ad Account ID</span>
                          <span className="text-zinc-400 font-mono">{leadDetail.origem.ad_id || '-'}</span>
                        </div>
                      </div>

                      {/* Geo IP & Devices */}
                      <div className="border-t border-zinc-800/60 pt-3 space-y-2 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Dispositivo Tipo:</span>
                          <span className="text-white capitalize">{leadDetail.origem.device_tipo || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">SO / Plataforma:</span>
                          <span className="text-white">{leadDetail.origem.os || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Navegador:</span>
                          <span className="text-white truncate max-w-[150px]">{leadDetail.origem.navegador || '-'}</span>
                        </div>
                        {leadDetail.origem.dispositivo && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Dispositivo Modelo:</span>
                            <span className="text-white">{leadDetail.origem.dispositivo}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Endereço IP:</span>
                          <span className="text-zinc-400 font-mono select-all">{leadDetail.origem.ip || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Geolocalidade (IP):</span>
                          <span className="text-white">
                            {[leadDetail.origem.cidade_ip, leadDetail.origem.estado_ip, leadDetail.origem.pais].filter(Boolean).join(', ') || '-'}
                          </span>
                        </div>
                      </div>

                      {/* URLs metadata */}
                      <div className="border-t border-zinc-800/60 pt-3 space-y-2 text-[9px] font-mono">
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 font-sans block">Landing URL</span>
                          <span className="text-zinc-500 break-all select-all block leading-tight">{leadDetail.origem.landing_url || '-'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-zinc-500 font-sans block">Referrer</span>
                          <span className="text-zinc-500 break-all block leading-tight">{leadDetail.origem.referrer || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-center text-xs text-zinc-500 flex flex-col items-center space-y-1">
                      <Globe size={18} className="text-zinc-600" />
                      <span>Este lead não passou por nenhum link de rastreamento.</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center text-zinc-500 py-10">
                Falha ao carregar detalhes.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
