import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import type { ConversaOut, MensagemOut, LeadDetalhe, RespostaRapida, TemplateIn } from '../types';
import { 
  Send, 
  Clock, 
  MapPin, 
  Layers, 
  Globe, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  User,
  Info,
  Zap,
  CornerDownLeft
} from 'lucide-react';

export const Inbox: React.FC = () => {
  const [conversas, setConversas] = useState<ConversaOut[]>([]);
  const [activeConversa, setActiveConversa] = useState<ConversaOut | null>(null);
  const [messages, setMessages] = useState<MensagemOut[]>([]);
  const [leadDetail, setLeadDetail] = useState<LeadDetalhe | null>(null);
  
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Quick replies state
  const [quickReplies, setQuickReplies] = useState<RespostaRapida[]>([]);
  const [showQuickPopover, setShowQuickPopover] = useState(false);
  const [filteredQuickReplies, setFilteredQuickReplies] = useState<RespostaRapida[]>([]);
  const [quickIndex, setQuickIndex] = useState(0);

  // Template Form state
  const [templateName, setTemplateName] = useState('');
  const [templateLang, setTemplateLang] = useState('pt_BR');
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const fetchConversas = async (silent = false) => {
    if (!silent) setLoadingChats(true);
    try {
      const response = await apiClient.get<ConversaOut[]>('/conversas');
      setConversas(response.data);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      if (!silent) setLoadingChats(false);
    }
  };

  const fetchMessages = async (conversaId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const response = await apiClient.get<MensagemOut[]>(`/conversas/${conversaId}/mensagens`);
      const sorted = response.data.sort((a, b) => 
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
      );
      setMessages(sorted);
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const fetchLeadInfo = async (leadId: string) => {
    try {
      const response = await apiClient.get<LeadDetalhe>(`/leads/${leadId}`);
      setLeadDetail(response.data);
    } catch (err) {
      console.error('Failed to load lead tracking info', err);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const response = await apiClient.get<RespostaRapida[]>('/respostas-rapidas');
      setQuickReplies(response.data);
    } catch (err) {
      console.error('Failed to load quick replies', err);
    }
  };

  // 1. Initial configuration & WebSocket setup
  useEffect(() => {
    fetchConversas();
    fetchQuickReplies();

    const connectWebSocket = () => {
      const token = localStorage.getItem('leadtrack_token');
      if (!token) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use wss://api.criatividads.com.br/ws
      const wsUrl = `${wsProtocol}//api.criatividads.com.br/ws?token=${token}`;

      console.log('Connecting to WebSocket...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established.');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket event received:', data);

          if (data.type === 'mensagem') {
            // Refresh conversation list silently
            fetchConversas(true);

            // If incoming message belongs to active chat, refresh messages silently
            if (activeConversa && data.conversa_id === activeConversa.id) {
              fetchMessages(activeConversa.id, true);
            }
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Retrying in 4 seconds...');
        setWsConnected(false);
        setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered an error', err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        // Remove close event handler to prevent infinite reconnection loop on unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [activeConversa?.id]); // Re-bind message hook logic if active chat changes

  // Load message logs when Active Chat changes
  useEffect(() => {
    if (activeConversa) {
      setMessages([]);
      setSendError(null);
      setReplyText('');
      setTemplateName('');
      fetchMessages(activeConversa.id);
      fetchLeadInfo(activeConversa.lead_id);
    } else {
      setMessages([]);
      setLeadDetail(null);
    }
  }, [activeConversa?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Quick Replies Popover Trigger
  useEffect(() => {
    if (replyText.includes('/')) {
      const parts = replyText.split('/');
      const query = parts[parts.length - 1].toLowerCase();
      
      const filtered = quickReplies.filter(qr => 
        qr.atalho.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        setFilteredQuickReplies(filtered);
        setShowQuickPopover(true);
        setQuickIndex(0);
      } else {
        setShowQuickPopover(false);
      }
    } else {
      setShowQuickPopover(false);
    }
  }, [replyText, quickReplies]);

  const selectQuickReply = (qr: RespostaRapida) => {
    const parts = replyText.split('/');
    parts.pop(); // Remove the typed query term
    const newText = parts.join('/') + qr.texto;
    setReplyText(newText);
    setShowQuickPopover(false);
    replyInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showQuickPopover) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickIndex(prev => (prev + 1) % filteredQuickReplies.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickIndex(prev => (prev - 1 + filteredQuickReplies.length) % filteredQuickReplies.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectQuickReply(filteredQuickReplies[quickIndex]);
      } else if (e.key === 'Escape') {
        setShowQuickPopover(false);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversa || !replyText.trim() || sending) return;

    setSending(true);
    setSendError(null);
    const textToSend = replyText.trim();

    try {
      // Optimistic message append
      const tempId = Math.random().toString();
      const optimisticMsg: MensagemOut = {
        id: tempId,
        direcao: 'saida',
        tipo: 'texto',
        conteudo: textToSend,
        criado_em: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setReplyText('');

      await apiClient.post(`/conversas/${activeConversa.id}/responder`, {
        texto: textToSend
      });

      fetchMessages(activeConversa.id, true);
    } catch (err: any) {
      console.error(err);
      const detailError = err.response?.data?.detail;
      setSendError(detailError || 'Falha ao enviar resposta de texto.');
      fetchMessages(activeConversa.id, true);
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversa || !templateName.trim() || sendingTemplate) return;

    setSendingTemplate(true);
    setSendError(null);

    const payload: TemplateIn = {
      template_name: templateName.trim(),
      lang: templateLang
    };

    try {
      await apiClient.post(`/conversas/${activeConversa.id}/template`, payload);
      setTemplateName('');
      // Force reload messages list
      fetchMessages(activeConversa.id);
      // Force reload chats list to verify 24h window reset
      fetchConversas();
    } catch (err: any) {
      console.error(err);
      setSendError(err.response?.data?.detail || 'Erro ao disparar template de mensagens.');
    } finally {
      setSendingTemplate(false);
    }
  };

  const is24hWindowExpired = (expiryStr: string | null) => {
    if (!expiryStr) return false;
    return new Date(expiryStr).getTime() < new Date().getTime();
  };

  return (
    <div className="h-[80vh] flex border border-zinc-800 rounded-3xl bg-zinc-900 overflow-hidden text-zinc-100 relative">
      {/* Left Column: Conversations List */}
      <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col h-full bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-white text-base">Inbox</h2>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} title={wsConnected ? "WebSocket Conectado" : "WS Desconectado"} />
          </div>
          <button 
            onClick={() => fetchConversas()} 
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Recarregar Inbox"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Chat List Scroll View */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
          {loadingChats && conversas.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : conversas.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              Nenhuma conversa em andamento.
            </div>
          ) : (
            conversas.map((chat) => {
              const active = activeConversa?.id === chat.id;
              const expired = is24hWindowExpired(chat.janela_24h_expira_em);

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveConversa(chat)}
                  className={`p-4 cursor-pointer transition-all flex flex-col justify-between hover:bg-zinc-800/40 ${
                    active ? 'bg-violet-600/10 border-l-4 border-violet-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-white text-sm truncate max-w-[180px]">
                      {chat.lead_nome || 'Lead s/ Nome'}
                    </span>
                    {chat.ultima_mensagem_em && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(chat.ultima_mensagem_em).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">
                      {chat.lead_telefone}
                    </span>
                    {expired ? (
                      <span className="text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 py-0.5 px-1.5 rounded-full flex items-center">
                        <Clock size={10} className="mr-0.5 text-amber-400" /> +24h
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-0.5 px-1.5 rounded-full flex items-center">
                        Janela Ativa
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Middle Column: Chat Window history */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/20 relative">
        {activeConversa ? (
          <>
            {/* Active Chat Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-white text-sm">{activeConversa.lead_nome || 'Lead Sem Nome'}</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{activeConversa.lead_telefone}</p>
              </div>

              {activeConversa.janela_24h_expira_em && (
                <div className="text-right text-xs">
                  <span className="text-zinc-500 block text-[10px]">Expira em:</span>
                  <span className="font-mono text-zinc-400">
                    {new Date(activeConversa.janela_24h_expira_em).toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {/* Error notifications banner */}
            {sendError && (
              <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-1.5">
                  <AlertTriangle size={14} />
                  <span className="font-semibold">{sendError}</span>
                </div>
                <button onClick={() => setSendError(null)} className="text-red-400 hover:text-white font-bold">X</button>
              </div>
            )}

            {/* Message Bubbles History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                </div>
              ) : (
                messages.map((msg) => {
                  const outgoing = msg.direcao === 'saida';
                  return (
                    <div key={msg.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3.5 text-sm shadow-md ${
                        outgoing 
                          ? 'bg-violet-600 text-white rounded-tr-none' 
                          : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50'
                      }`}>
                        <p className="leading-normal break-words whitespace-pre-wrap">{msg.conteudo}</p>
                        <div className={`text-[10px] text-right mt-1.5 ${
                          outgoing ? 'text-violet-200' : 'text-zinc-500'
                        }`}>
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies popover */}
            {showQuickPopover && (
              <div className="absolute bottom-20 left-4 right-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-10 space-y-1">
                <div className="text-[10px] text-zinc-500 px-3 py-1 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Respostas Rápidas</span>
                  <span className="flex items-center"><CornerDownLeft size={10} className="mr-0.5" /> Enter para inserir</span>
                </div>
                {filteredQuickReplies.map((qr, index) => (
                  <button
                    key={qr.id}
                    onClick={() => selectQuickReply(qr)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex justify-between items-center transition-colors ${
                      index === quickIndex ? 'bg-violet-600 text-white font-medium' : 'hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="font-mono font-semibold">/{qr.atalho}</span>
                    <span className="truncate max-w-[250px] opacity-80">{qr.texto}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Composer Box (Input or Template depending on 24h validation) */}
            {is24hWindowExpired(activeConversa.janela_24h_expira_em) ? (
              /* Template send form when 24h window has expired */
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 shrink-0 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                  <AlertTriangle size={16} />
                  <span>Janela de 24h Expirada. Envie um template para reiniciar.</span>
                </div>
                
                <form onSubmit={handleSendTemplate} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Nome do template cadastrado (ex: welcome_msg)..."
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs"
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <input
                      type="text"
                      required
                      placeholder="Idioma (pt_BR)"
                      value={templateLang}
                      onChange={(e) => setTemplateLang(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-violet-600 text-xs font-mono text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sendingTemplate || !templateName.trim()}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingTemplate ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>Enviar Template</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Standard chat response input */
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-900 flex space-x-3 shrink-0">
                <input
                  type="text"
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Responder no WhatsApp (use / para atalhos)..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-violet-600 text-sm"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <User size={36} className="text-zinc-700" />
            <p className="text-sm">Selecione uma conversa para iniciar o atendimento.</p>
          </div>
        )}
      </div>

      {/* Right Column: Lead Details & Rich Origin */}
      {activeConversa && (
        <div className="w-72 shrink-0 border-l border-zinc-800 bg-zinc-900/50 flex flex-col h-full overflow-y-auto p-4 space-y-6">
          <div className="border-b border-zinc-800 pb-3 flex items-center space-x-2">
            <Info size={16} className="text-violet-400" />
            <h4 className="font-bold text-white text-sm">Origem do Atendimento</h4>
          </div>

          {leadDetail ? (
            <div className="space-y-5 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Nome do Lead</span>
                <span className="text-white font-medium text-sm block mt-0.5">{leadDetail.lead.nome || 'Não fornecido'}</span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Localidade (IP)</span>
                {leadDetail.lead.cidade || leadDetail.lead.estado ? (
                  <div className="flex items-center space-x-1 mt-1 text-zinc-300">
                    <MapPin size={12} className="text-zinc-500" />
                    <span>{[leadDetail.lead.cidade, leadDetail.lead.estado].filter(Boolean).join(' - ')}</span>
                  </div>
                ) : (
                  <span className="text-zinc-600 block mt-0.5">Cidade não detectada</span>
                )}
              </div>

              {leadDetail.origem ? (
                <div className="space-y-4 pt-3 border-t border-zinc-800/60">
                  <div className="flex items-center space-x-1 text-zinc-400 font-semibold uppercase text-[10px]">
                    <Layers size={12} className="text-emerald-400" />
                    <span>Audiência Ads</span>
                  </div>

                  <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Origem (Source)</span>
                      <span className="text-zinc-300 font-medium">{leadDetail.origem.utm_source || 'Direto'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Campanha</span>
                      <span className="text-zinc-300 font-medium">{leadDetail.origem.utm_campaign || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Criativo (Content)</span>
                      <span className="text-zinc-300 font-medium truncate block max-w-[200px]">{leadDetail.origem.utm_content || '-'}</span>
                    </div>
                  </div>

                  {/* Device metadata icons and labels */}
                  <div className="border-t border-zinc-800/60 pt-3 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">Dispositivo</span>
                    <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px]">
                      <span>Tipo:</span>
                      <span className="text-white capitalize">{leadDetail.origem.device_tipo || 'Desconhecido'}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px]">
                      <span>Sistema:</span>
                      <span className="text-white">{leadDetail.origem.os || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px]">
                      <span>Navegador:</span>
                      <span className="text-white truncate max-w-[120px]" title={leadDetail.origem.navegador || ''}>
                        {leadDetail.origem.navegador || '-'}
                      </span>
                    </div>
                  </div>

                  {leadDetail.origem.fbclid && (
                    <div>
                      <span className="text-[9px] text-zinc-500 block">Meta fbclid</span>
                      <span className="text-[10px] font-mono text-zinc-400 break-all bg-zinc-950 p-1.5 rounded border border-zinc-900 block select-all">
                        {leadDetail.origem.fbclid}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-zinc-600 text-[10px] flex flex-col items-center space-y-1">
                  <Globe size={14} />
                  <span>Sem dados de UTM. Capturado sem link de redirecionamento.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center py-6">
              <Loader2 size={16} className="animate-spin text-zinc-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
