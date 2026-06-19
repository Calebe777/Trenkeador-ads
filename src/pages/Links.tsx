import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { LinkOut, LinkIn } from '../types';
import { 
  Plus, 
  Copy, 
  Check, 
  Search, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Edit2,
  Trash2
} from 'lucide-react';

export const Links: React.FC = () => {
  const [links, setLinks] = useState<LinkOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form Fields
  const [codigoCurto, setCodigoCurto] = useState('');
  const [destinoNumero, setDestinoNumero] = useState('');
  const [mensagemPrefill, setMensagemPrefill] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [utmTerm, setUtmTerm] = useState('');

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<LinkOut[]>('/links');
      setLinks(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar links rastreáveis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCopy = async (id: string, shortCode: string) => {
    const apiBase = import.meta.env.VITE_API_BASE || 'https://api.criatividads.com.br';
    const redirectUrl = `${apiBase}/r/${shortCode}`;
    try {
      await navigator.clipboard.writeText(redirectUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const [editingLink, setEditingLink] = useState<LinkOut | null>(null);

  const handleEditClick = (link: LinkOut) => {
    setEditingLink(link);
    setCodigoCurto(link.codigo_curto);
    setDestinoNumero(link.destino_numero);
    setMensagemPrefill(link.mensagem_prefill || '');
    setUtmSource(link.utm_source || '');
    setUtmMedium(link.utm_medium || '');
    setUtmCampaign(link.utm_campaign || '');
    setUtmContent(link.utm_content || '');
    setUtmTerm(link.utm_term || '');
    setIsModalOpen(true);
  };

  const handleDeleteLink = async (id: string, shortCode: string) => {
    if (!confirm(`Tem certeza que deseja excluir o link curto '#${shortCode}'?`)) return;
    try {
      await apiClient.delete(`/links/${id}`);
      fetchLinks();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Falha ao excluir o link curto.');
    }
  };

  const resetForm = () => {
    setCodigoCurto('');
    setDestinoNumero('');
    setMensagemPrefill('');
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setUtmContent('');
    setUtmTerm('');
    setFormError(null);
    setEditingLink(null);
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload: LinkIn = {
      codigo_curto: codigoCurto.trim(),
      destino_numero: destinoNumero.trim().replace(/\D/g, ''), // Keep numbers only
      mensagem_prefill: mensagemPrefill.trim() || null,
      utm_source: utmSource.trim() || null,
      utm_medium: utmMedium.trim() || null,
      utm_campaign: utmCampaign.trim() || null,
      utm_content: utmContent.trim() || null,
      utm_term: utmTerm.trim() || null,
    };

    try {
      if (editingLink) {
        await apiClient.patch(`/links/${editingLink.id}`, payload);
      } else {
        await apiClient.post('/links', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchLinks();
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 409) {
        setFormError('Este código curto já está em uso nesta conta. Escolha outro termo exclusivo.');
      } else {
        setFormError(err.response?.data?.detail || 'Erro ao criar o link. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filter links based on search
  const filteredLinks = links.filter(link => 
    link.codigo_curto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.destino_numero.includes(searchTerm)
  );

  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.criatividads.com.br';

  return (
    <div className="space-y-8">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Links Rastreáveis</h1>
          <p className="text-zinc-500">Crie links curtos para campanhas de tráfego pago e rastreie os leads no WhatsApp.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer w-full sm:w-auto"
        >
          <Plus size={18} />
          <span>Criar Novo Link</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Pesquisar por código curto ou número de destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-600 transition-colors text-sm"
          />
        </div>
      </div>

      {/* Main Links Container */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={36} className="animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-3">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="text-center bg-zinc-900 border border-zinc-800 rounded-3xl p-12 space-y-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-500">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Nenhum link encontrado</h3>
            <p className="text-zinc-500 text-sm mt-1">Crie um novo link para começar a gerar e rastrear cliques.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLinks.map((link) => (
            <div key={link.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between hover:border-zinc-700 transition-all duration-200">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col space-y-1.5">
                    <div className="px-3 py-1 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400 text-sm font-semibold w-fit">
                      #{link.codigo_curto}
                    </div>
                    <div className="flex items-center space-x-2.5 pt-1">
                      <button
                        onClick={() => handleEditClick(link)}
                        title="Editar link"
                        className="text-zinc-400 hover:text-[#00a884] transition-colors cursor-pointer"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id, link.codigo_curto)}
                        title="Excluir link"
                        className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">{link.cliques}</span>
                    <span className="text-zinc-500 text-xs block">Cliques</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs">
                    <span className="text-zinc-500 block font-semibold uppercase tracking-wider">Redireciona para</span>
                    <span className="text-zinc-300 font-mono text-sm break-all">{link.destino_numero}</span>
                  </div>
                  {link.mensagem_prefill && (
                    <div className="text-xs">
                      <span className="text-zinc-500 block font-semibold uppercase tracking-wider">Msg Pré-definida</span>
                      <p className="text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 mt-1 line-clamp-2 italic">
                        "{link.mensagem_prefill}"
                      </p>
                    </div>
                  )}
                </div>

                {/* UTMs Tags */}
                <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-1.5">
                  {link.utm_source && (
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-md">
                      src: {link.utm_source}
                    </span>
                  )}
                  {link.utm_medium && (
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-md">
                      med: {link.utm_medium}
                    </span>
                  )}
                  {link.utm_campaign && (
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-md">
                      cam: {link.utm_campaign}
                    </span>
                  )}
                </div>
              </div>

              {/* Copy & Redirect Buttons */}
              <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCopy(link.id, link.codigo_curto)}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                    copiedId === link.id
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  {copiedId === link.id ? (
                    <>
                      <Check size={14} />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
                <a
                  href={`${apiBase}/r/${link.codigo_curto}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition-all text-xs font-semibold"
                >
                  <ExternalLink size={14} />
                  <span>Testar 302</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-2">{editingLink ? 'Editar Link Rastreável' : 'Criar Link Rastreável'}</h2>
            <p className="text-zinc-500 text-sm mb-6">{editingLink ? 'Corrija os parâmetros de redirecionamento e as UTMs do link.' : 'Insira os parâmetros de redirecionamento e as UTMs do Meta/Google Ads.'}</p>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateLink} className="space-y-6">
              {/* Central Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Código Curto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: promo-junho"
                    value={codigoCurto}
                    onChange={(e) => setCodigoCurto(e.target.value.replace(/\s+/g, '-'))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-sm"
                  />
                  <p className="text-zinc-600 text-[10px] mt-1">Este termo formará o link final: `/r/termo`</p>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Número de Destino (WhatsApp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 5511999999999"
                    value={destinoNumero}
                    onChange={(e) => setDestinoNumero(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-sm"
                  />
                  <p className="text-zinc-600 text-[10px] mt-1">Insira com DDI (55) + DDD + número.</p>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Mensagem Pré-definida do WhatsApp (Opcional)
                </label>
                <textarea
                  placeholder="ex: Olá! Vi seu anúncio e gostaria de mais informações..."
                  value={mensagemPrefill}
                  onChange={(e) => setMensagemPrefill(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-sm resize-none"
                />
              </div>

              {/* UTM Campaign Section */}
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-bold text-white mb-4">Parâmetros UTM (Rastreamento)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                      utm_source
                    </label>
                    <input
                      type="text"
                      placeholder="ex: facebook, google"
                      value={utmSource}
                      onChange={(e) => setUtmSource(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                      utm_medium
                    </label>
                    <input
                      type="text"
                      placeholder="ex: cpc, story, bio"
                      value={utmMedium}
                      onChange={(e) => setUtmMedium(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                      utm_campaign
                    </label>
                    <input
                      type="text"
                      placeholder="ex: blackfriday-2026"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                      utm_content (Criativo)
                    </label>
                    <input
                      type="text"
                      placeholder="ex: video1-depoimento"
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-2">
                    <label className="block text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                      utm_term (Palavra-chave/Público)
                    </label>
                    <input
                      type="text"
                      placeholder="ex: empreendedores-30a50"
                      value={utmTerm}
                      onChange={(e) => setUtmTerm(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white placeholder-zinc-700 focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
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
                    <span>{editingLink ? 'Salvar Alterações' : 'Salvar Link'}</span>
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
