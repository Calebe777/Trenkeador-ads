import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { CanalOut, CanalIn, MetaConfig, UsuarioOut, UsuarioIn, RespostaRapida, RespostaRapidaIn } from '../types';
import { 
  Save, 
  Plus, 
  Loader2, 
  Check, 
  Copy,
  Settings as SettingsIcon,
  MessageSquare,
  Database,
  Terminal,
  Users,
  Key,
  Zap,
  Globe,
  Lock,
  Trash2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [canais, setCanais] = useState<CanalOut[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOut[]>([]);
  const [quickReplies, setQuickReplies] = useState<RespostaRapida[]>([]);

  // Meta config states
  const [pixelId, setPixelId] = useState('');
  const [capiAccessToken, setCapiAccessToken] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [testEventCode, setTestEventCode] = useState('');

  const [loading, setLoading] = useState(true);
  const [submittingMeta, setSubmittingMeta] = useState(false);
  const [submittingCanal, setSubmittingCanal] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [submittingQuick, setSubmittingQuick] = useState(false);
  
  const [metaSuccess, setMetaSuccess] = useState(false);
  const [canalError, setCanalError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  
  // New channel state
  const [canalNome, setCanalNome] = useState('');
  const [canalPhoneId, setCanalPhoneId] = useState('');
  const [canalAccessToken, setCanalAccessToken] = useState('');
  const [canalWabaId, setCanalWabaId] = useState('');
  const [canalDisplayNumber, setCanalDisplayNumber] = useState('');
  const [canalVerifyToken, setCanalVerifyToken] = useState('leadtrack_verify_token_default');

  // Channel token renewal modal state
  const [renewingCanal, setRenewingCanal] = useState<CanalOut | null>(null);
  const [renewToken, setRenewToken] = useState('');
  const [submittingRenew, setSubmittingRenew] = useState(false);

  // New user state
  const [userNome, setUserNome] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSenha, setUserSenha] = useState('');
  const [userPapel, setUserPapel] = useState('atendente');

  // New quick reply state
  const [quickAtalho, setQuickAtalho] = useState('');
  const [quickTexto, setQuickTexto] = useState('');

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.criatividads.com.br';
  const webhookUrl = `${apiBase}/webhooks/whatsapp`;

  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const [canaisRes, usuariosRes, quickRes] = await Promise.all([
        apiClient.get<CanalOut[]>('/whatsapp/canais'),
        apiClient.get<UsuarioOut[]>('/usuarios'),
        apiClient.get<RespostaRapida[]>('/respostas-rapidas')
      ]);
      setCanais(canaisRes.data);
      setUsuarios(usuariosRes.data);
      setQuickReplies(quickRes.data);

      // Load Meta config
      try {
        const metaRes = await apiClient.get<MetaConfig>('/meta/config');
        if (metaRes.data) {
          setPixelId(metaRes.data.pixel_id || '');
          setCapiAccessToken(metaRes.data.capi_access_token || '');
          setAdAccountId(metaRes.data.ad_account_id || '');
          setTestEventCode(metaRes.data.test_event_code || '');
        }
      } catch (metaErr) {
        console.warn('Conversions API config not yet set or not readable:', metaErr);
      }
    } catch (err) {
      console.error('Failed to load settings configuration data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMeta(true);
    setMetaSuccess(false);

    const payload: MetaConfig = {
      pixel_id: pixelId.trim() || null,
      capi_access_token: capiAccessToken.trim() || null,
      ad_account_id: adAccountId.trim() || null,
      test_event_code: testEventCode.trim() || null
    };

    try {
      await apiClient.put('/meta/config', payload);
      setMetaSuccess(true);
      setTimeout(() => setMetaSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save Meta Config', err);
      alert('Erro ao salvar configurações do Meta.');
    } finally {
      setSubmittingMeta(false);
    }
  };

  const handleCreateCanal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCanal(true);
    setCanalError(null);

    const payload: CanalIn = {
      nome: canalNome.trim(),
      phone_number_id: canalPhoneId.trim(),
      access_token: canalAccessToken.trim(),
      waba_id: canalWabaId.trim() || null,
      numero_exibicao: canalDisplayNumber.trim() || null,
      verify_token: canalVerifyToken.trim() || null
    };

    try {
      await apiClient.post('/whatsapp/canais', payload);
      setCanalNome('');
      setCanalPhoneId('');
      setCanalAccessToken('');
      setCanalWabaId('');
      setCanalDisplayNumber('');
      setCanalVerifyToken('leadtrack_verify_token_default');
      
      const canaisRes = await apiClient.get<CanalOut[]>('/whatsapp/canais');
      setCanais(canaisRes.data);
    } catch (err: any) {
      console.error(err);
      setCanalError(err.response?.data?.detail || 'Erro ao registrar canal de WhatsApp.');
    } finally {
      setSubmittingCanal(false);
    }
  };

  const handleRenewToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingCanal || !renewToken.trim()) return;

    setSubmittingRenew(true);
    try {
      await apiClient.patch(`/whatsapp/canais/${renewingCanal.id}`, {
        access_token: renewToken.trim()
      });
      setRenewingCanal(null);
      setRenewToken('');
      alert('Token de acesso do canal atualizado com sucesso!');
      
      // Reload channels
      const canaisRes = await apiClient.get<CanalOut[]>('/whatsapp/canais');
      setCanais(canaisRes.data);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao atualizar o token do canal.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setUserError(null);

    const payload: UsuarioIn = {
      nome: userNome.trim(),
      email: userEmail.trim(),
      senha: userSenha,
      papel: userPapel
    };

    try {
      await apiClient.post('/usuarios', payload);
      setUserNome('');
      setUserEmail('');
      setUserSenha('');
      setUserPapel('atendente');
      
      // Refresh list
      const uRes = await apiClient.get<UsuarioOut[]>('/usuarios');
      setUsuarios(uRes.data);
    } catch (err: any) {
      console.error(err);
      setUserError(err.response?.data?.detail || 'Falha ao cadastrar atendente.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingQuick(true);
    setQuickError(null);

    const payload: RespostaRapidaIn = {
      atalho: quickAtalho.trim().replace(/\//g, ''), // Strip slashes
      texto: quickTexto.trim()
    };

    try {
      await apiClient.post('/respostas-rapidas', payload);
      setQuickAtalho('');
      setQuickTexto('');
      
      // Refresh list
      const qRes = await apiClient.get<RespostaRapida[]>('/respostas-rapidas');
      setQuickReplies(qRes.data);
    } catch (err: any) {
      console.error(err);
      setQuickError(err.response?.data?.detail || 'Falha ao criar resposta rápida.');
    } finally {
      setSubmittingQuick(false);
    }
  };

  const handleClearMeta = async () => {
    if (!confirm('Tem certeza que deseja limpar a configuração do Meta?')) return;
    setSubmittingMeta(true);
    try {
      await apiClient.delete('/meta/config');
      setPixelId('');
      setCapiAccessToken('');
      setAdAccountId('');
      setTestEventCode('');
      setMetaSuccess(true);
      setTimeout(() => setMetaSuccess(false), 3000);
      alert('Configuração do Meta limpa com sucesso!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao limpar configurações do Meta.');
    } finally {
      setSubmittingMeta(false);
    }
  };

  const handleDeleteCanal = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o canal de WhatsApp "${name}"?`)) return;
    try {
      await apiClient.delete(`/whatsapp/canais/${id}`);
      const canaisRes = await apiClient.get<CanalOut[]>('/whatsapp/canais');
      setCanais(canaisRes.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao excluir canal.');
    }
  };

  const handleDeleteQuickReply = async (id: string, shortcut: string) => {
    if (!confirm(`Tem certeza que deseja excluir a resposta rápida "/${shortcut}"?`)) return;
    try {
      await apiClient.delete(`/respostas-rapidas/${id}`);
      const qRes = await apiClient.get<RespostaRapida[]>('/respostas-rapidas');
      setQuickReplies(qRes.data);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao excluir resposta rápida.');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (loading && canais.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-10 relative">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Configurações Gerais</h1>
        <p className="text-zinc-500">Configure canais de WhatsApp, equipes de atendimento, respostas rápidas e chaves Meta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Config panels */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Meta Integrations */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
              <SettingsIcon size={20} className="text-violet-500" />
              <span>Configurações do Meta (Pixel & CAPI)</span>
            </h2>

            <form onSubmit={handleSaveMeta} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Facebook Pixel ID
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 88291039849201"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Ad Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="ex: act_109283948291"
                    value={adAccountId}
                    onChange={(e) => setAdAccountId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  CAPI Access Token
                </label>
                <textarea
                  placeholder="Token de acesso da Conversions API..."
                  value={capiAccessToken}
                  onChange={(e) => setCapiAccessToken(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Test Event Code (Meta Test Console)
                </label>
                <input
                  type="text"
                  placeholder="ex: TEST39201"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <span className="text-zinc-500 text-xs font-semibold">
                  {metaSuccess && (
                    <span className="text-emerald-400 flex items-center">
                      <Check size={14} className="mr-1" /> Meta atualizado!
                    </span>
                  )}
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleClearMeta}
                    disabled={submittingMeta}
                    className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors border border-red-500/20 hover:border-red-600 cursor-pointer"
                  >
                    Limpar Integração
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMeta}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer flex items-center space-x-2"
                  >
                    {submittingMeta ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Salvar Integração</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* WhatsApp Channels Registration */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
              <MessageSquare size={20} className="text-violet-500" />
              <span>Conectar Canal de WhatsApp</span>
            </h2>

            {canalError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {canalError}
              </div>
            )}

            <form onSubmit={handleCreateCanal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Nome do Canal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="WhatsApp Vendas"
                    value={canalNome}
                    onChange={(e) => setCanalNome(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ID do número na Meta"
                    value={canalPhoneId}
                    onChange={(e) => setCanalPhoneId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  System Access Token (Meta App Token) *
                </label>
                <textarea
                  required
                  placeholder="Cole o token de acesso de usuário do sistema da Meta Developer..."
                  value={canalAccessToken}
                  onChange={(e) => setCanalAccessToken(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    WABA ID (WhatsApp Business Account ID)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 9028394829"
                    value={canalWabaId}
                    onChange={(e) => setCanalWabaId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Número de Exibição
                  </label>
                  <input
                    type="text"
                    placeholder="ex: +5511999999999"
                    value={canalDisplayNumber}
                    onChange={(e) => setCanalDisplayNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Verify Token (Meta Webhook Handshake)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Livre escolha para verificação da Meta"
                  value={canalVerifyToken}
                  onChange={(e) => setCanalVerifyToken(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={submittingCanal}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {submittingCanal ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Conectar Canal</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Replies list & creation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
              <Zap size={20} className="text-violet-500" />
              <span>Gestão de Respostas Rápidas (Atalhos)</span>
            </h2>

            {quickError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {quickError}
              </div>
            )}

            <form onSubmit={handleCreateQuickReply} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Atalho (sem a barra `/`) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 font-bold font-mono">
                      /
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="ola"
                      value={quickAtalho}
                      onChange={(e) => setQuickAtalho(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-6 pr-3 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Texto da Resposta Rápida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Olá! Como posso ajudar você hoje?"
                    value={quickTexto}
                    onChange={(e) => setQuickTexto(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={submittingQuick || !quickAtalho.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {submittingQuick ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Criar Atalho</span>
                </button>
              </div>
            </form>

            {/* Quick replies table */}
            <div className="pt-4 border-t border-zinc-800/60 max-h-[30vh] overflow-y-auto">
              <h3 className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] mb-3">Atalhos Cadastrados ({quickReplies.length})</h3>
              {quickReplies.length === 0 ? (
                <p className="text-zinc-600 italic text-xs">Nenhum atalho registrado. Use o formulário para criar.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {quickReplies.map((qr) => (
                    <div key={qr.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                      <div className="min-w-0">
                        <span className="font-mono text-violet-400 font-semibold block">/{qr.atalho}</span>
                        <p className="text-zinc-400 truncate max-w-[160px] mt-0.5" title={qr.texto}>{qr.texto}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteQuickReply(qr.id, qr.atalho)}
                        title="Excluir Resposta Rápida"
                        className="text-zinc-500 hover:text-red-500 p-1.5 hover:bg-zinc-900 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Multi-atendente (Team Management) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2.5">
              <Users size={20} className="text-violet-500" />
              <span>Controle de Atendentes (Multi-atendente)</span>
            </h2>

            {userError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="João da Silva"
                    value={userNome}
                    onChange={(e) => setUserNome(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="joao@empresa.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Senha Provisória *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={userSenha}
                    onChange={(e) => setUserSenha(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Papel no CRM
                </label>
                <select
                  value={userPapel}
                  onChange={(e) => setUserPapel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                >
                  <option value="atendente">Atendente (atribuição de leads/atendimento)</option>
                  <option value="gestor">Gestor (acesso geral e edição parcial)</option>
                  <option value="admin">Administrador (acesso irrestrito e configurações)</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  {submittingUser ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Cadastrar Usuário</span>
                </button>
              </div>
            </form>

            {/* Users listing */}
            <div className="pt-4 border-t border-zinc-800/60 max-h-[30vh] overflow-y-auto">
              <h3 className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] mb-3">Time de Atendimento ({usuarios.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {usuarios.map((usr) => (
                  <div key={usr.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">{usr.nome}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{usr.email}</span>
                    </div>
                    <span className="text-[9px] font-semibold bg-violet-600/10 text-violet-400 py-0.5 px-2 rounded-full border border-violet-500/25 uppercase">
                      {usr.papel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Pane: WhatsApp Channels & Webhook setup */}
        <div className="space-y-8">
          
          {/* Active channels and Renew buttons */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Database size={18} className="text-zinc-400" />
              <span>Canais Configurados ({canais.length})</span>
            </h3>

            {canais.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhum canal ativo encontrado.</p>
            ) : (
              <div className="space-y-3">
                {canais.map((canal) => (
                  <div key={canal.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 space-y-3 relative group">
                    <div className="flex justify-between items-center pr-6">
                      <span className="font-bold text-white text-sm">{canal.nome}</span>
                      <span className={`text-[9px] font-semibold py-0.5 px-2 rounded-full border ${
                        canal.ativo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'
                      }`}>
                        {canal.ativo ? 'Conectado' : 'Offline'}
                      </span>
                    </div>
                    
                    <div className="text-[10px] space-y-1 text-zinc-500 font-mono leading-tight">
                      <div><span className="text-zinc-600">ID:</span> {canal.phone_number_id}</div>
                      {canal.numero_exibicao && (
                        <div><span className="text-zinc-600">Tel:</span> {canal.numero_exibicao}</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRenewingCanal(canal);
                          setRenewToken('');
                        }}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs transition-colors cursor-pointer flex justify-center items-center space-x-1.5"
                      >
                        <Key size={12} />
                        <span>Renovar Token Meta</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCanal(canal.id, canal.nome)}
                        title="Apagar Canal"
                        className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-xl border border-red-500/20 hover:border-red-600 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhook Meta integration details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Globe size={16} className="text-violet-400" />
              <span>Configuração Webhook Meta</span>
            </h3>
            <p className="text-zinc-500 leading-normal">
              Insira estes dados no painel da Meta Developers para ativar o recebimento de mensagens:
            </p>

            <div className="space-y-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] leading-tight">
              <div>
                <span className="text-[9px] text-zinc-600 block uppercase font-sans font-semibold mb-1">Callback URL</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400 break-all select-all">{webhookUrl}</span>
                  <button 
                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                    className="text-zinc-500 hover:text-white p-0.5"
                  >
                    {copiedText === 'webhook' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-2">
                <span className="text-[9px] text-zinc-600 block uppercase font-sans font-semibold mb-1">Verify Token</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400 select-all">{canalVerifyToken}</span>
                  <button 
                    onClick={() => copyToClipboard(canalVerifyToken, 'token')}
                    className="text-zinc-500 hover:text-white p-0.5"
                  >
                    {copiedText === 'token' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* VPS manual setup */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 text-xs">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Terminal size={16} className="text-amber-500" />
              <span>Backup: SQL Manual VPS</span>
            </h3>
            
            <p className="text-zinc-500 leading-normal text-[11px]">
              Se necessitar recarregar via Docker diretamente na VPS da Hostinger, o comando para injetar o token no banco é:
            </p>

            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[9px] text-zinc-400 leading-relaxed relative group select-all">
              <code className="break-all text-violet-400">
                docker exec -it leadtrack_postgres psql -U leadtrack -d leadtrack -c "UPDATE canais_whatsapp SET access_token='TOKEN_NOVO';"
              </code>
            </div>
          </div>

        </div>

      </div>

      {/* Renew Token Modal */}
      {renewingCanal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenewingCanal(null)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex items-center space-x-2.5 mb-3 text-violet-400">
              <Lock size={20} />
              <h2 className="text-xl font-bold text-white">Renovar Token do Canal</h2>
            </div>
            <p className="text-zinc-500 text-xs mb-6">
              Insira o novo token de acesso gerado na Meta para o canal <span className="font-semibold text-white">{renewingCanal.nome}</span>.
            </p>

            <form onSubmit={handleRenewToken} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Meta Access Token *
                </label>
                <textarea
                  required
                  placeholder="Cole o novo Access Token aqui..."
                  value={renewToken}
                  onChange={(e) => setRenewToken(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setRenewingCanal(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRenew || !renewToken.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  {submittingRenew ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>Atualizar Token</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
