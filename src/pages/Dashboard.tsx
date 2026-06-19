import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { 
  AnalyticsResumo, 
  AnalyticsFunil, 
  AnalyticsDispositivos, 
  AnalyticsLocalizacao, 
  AnalyticsPorCriativoArray 
} from '../types';
import { 
  Users, 
  MousePointerClick, 
  DollarSign, 
  Briefcase, 
  Loader2, 
  TrendingUp, 
  Award,
  AlertCircle,
  Globe,
  Monitor,
  Calendar,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [dias, setDias] = useState<number>(30);
  const [resumo, setResumo] = useState<AnalyticsResumo | null>(null);
  const [funil, setFunil] = useState<AnalyticsFunil | null>(null);
  const [dispositivos, setDispositivos] = useState<AnalyticsDispositivos | null>(null);
  const [localizacao, setLocalizacao] = useState<AnalyticsLocalizacao | null>(null);
  const [porCriativo, setPorCriativo] = useState<AnalyticsPorCriativoArray>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (filterDays: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const [resumoRes, funilRes, dispRes, locRes, criativoRes] = await Promise.all([
        apiClient.get<AnalyticsResumo>(`/analytics/resumo?dias=${filterDays}`),
        apiClient.get<AnalyticsFunil>('/analytics/funil'),
        apiClient.get<AnalyticsDispositivos>('/analytics/dispositivos'),
        apiClient.get<AnalyticsLocalizacao>('/analytics/localizacao'),
        apiClient.get<AnalyticsPorCriativoArray>('/analytics/por-criativo'),
      ]);

      setResumo(resumoRes.data);
      setFunil(funilRes.data);
      setDispositivos(dispRes.data);
      setLocalizacao(locRes.data);
      setPorCriativo(criativoRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar métricas analíticas. Certifique-se de que o backend está ativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(dias);
  }, [dias]);

  if (loading && !resumo) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={36} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center space-x-3">
        <AlertCircle size={24} />
        <span>{error}</span>
      </div>
    );
  }

  // Format Funnel Data
  const funnelChartData = funil ? [
    { name: 'Novo', 'Negócios': funil.novo, fill: '#6b7280' },
    { name: 'Atendimento', 'Negócios': funil.em_atendimento, fill: '#3b82f6' },
    { name: 'Qualificado', 'Negócios': funil.qualificado, fill: '#8b5cf6' },
    { name: 'Negociação', 'Negócios': funil.negociacao, fill: '#f59e0b' },
    { name: 'Ganho', 'Negócios': funil.ganho, fill: '#10b981' },
    { name: 'Perdido', 'Negócios': funil.perdido, fill: '#ef4444' }
  ] : [];

  // Format Devices Data
  const devicePieData = dispositivos ? [
    { name: 'Celular', value: dispositivos.device.mobile || 0, fill: '#a78bfa' },
    { name: 'Desktop', value: dispositivos.device.desktop || 0, fill: '#60a5fa' },
    { name: 'Tablet', value: dispositivos.device.tablet || 0, fill: '#34d399' }
  ].filter(d => d.value > 0) : [];

  // Format OS Data
  const osPieData = dispositivos ? Object.entries(dispositivos.os)
    .map(([name, value], i) => ({
      name,
      value,
      fill: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'][i % 5]
    }))
    .filter(d => d.value > 0) : [];

  // Format Browsers Data
  const navPieData = dispositivos ? Object.entries(dispositivos.navegador)
    .map(([name, value], i) => ({
      name,
      value,
      fill: ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'][i % 5]
    }))
    .filter(d => d.value > 0) : [];

  // Format Location Data
  const paisesBarData = localizacao?.paises ? Object.entries(localizacao.paises)
    .map(([name, value]) => ({ 
      name: name === '?' ? 'Desconhecido' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) : [];

  const estadosBarData = localizacao?.estados ? Object.entries(localizacao.estados)
    .map(([name, value]) => ({ 
      name: name === '?' ? 'Desconhecido' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) : [];

  const cidadesBarData = localizacao?.cidades ? Object.entries(localizacao.cidades)
    .map(([name, value]) => ({ 
      name: name === '?' ? 'Desconhecido' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) : [];

  const totalPaisCliques = paisesBarData.reduce((acc, curr) => acc + curr.value, 0);
  const maxPaisCliques = paisesBarData.length > 0 ? Math.max(...paisesBarData.map(d => d.value)) : 1;

  const totalEstadoCliques = estadosBarData.reduce((acc, curr) => acc + curr.value, 0);
  const maxEstadoCliques = estadosBarData.length > 0 ? Math.max(...estadosBarData.map(d => d.value)) : 1;

  const totalCidadeCliques = cidadesBarData.reduce((acc, curr) => acc + curr.value, 0);
  const maxCidadeCliques = cidadesBarData.length > 0 ? Math.max(...cidadesBarData.map(d => d.value)) : 1;

  return (
    <div className="space-y-10">
      {/* Header and period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Painel Analytics</h1>
          <p className="text-zinc-500">Métricas ricas de cliques, conversões, ROAS e audiência em tempo real.</p>
        </div>
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5 self-start sm:self-auto">
          <Calendar size={16} className="text-zinc-500 ml-2" />
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="bg-transparent border-none text-zinc-300 font-semibold focus:outline-none text-sm pr-6 cursor-pointer"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      {resumo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Clicks */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 font-medium text-sm">Cliques nos Links</span>
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                <MousePointerClick size={20} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-white tracking-tight">{resumo.cliques}</h3>
              <p className="text-zinc-500 text-xs flex items-center space-x-1">
                <span>Total no período</span>
              </p>
            </div>
          </div>

          {/* Leads */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 font-medium text-sm">Leads Gerados</span>
              <div className="p-3 bg-violet-600/10 rounded-2xl text-violet-400">
                <Users size={20} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-white tracking-tight">{resumo.leads}</h3>
              <p className="text-zinc-500 text-xs flex items-center space-x-1">
                <Percent size={12} className="text-violet-400" />
                <span className="text-violet-400 font-semibold">
                  {resumo.cliques > 0 ? ((resumo.leads / resumo.cliques) * 100).toFixed(1) : 0}%
                </span>
                <span>conversão clique → lead</span>
              </p>
            </div>
          </div>

          {/* Faturamento */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 font-medium text-sm">Vendas Faturadas (CAPI)</span>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {resumo.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-zinc-500 text-xs flex items-center space-x-1">
                <Award size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">{resumo.vendas} vendas</span>
                <span>fechadas</span>
              </p>
            </div>
          </div>

          {/* ROAS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-zinc-500 font-medium text-sm">ROAS Real</span>
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {resumo.roas.toFixed(2)}x
              </h3>
              <p className="text-zinc-500 text-xs flex items-center space-x-1">
                <span>Gasto:</span>
                <span className="text-zinc-400 font-semibold">
                  {resumo.gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </p>
            </div>
          </div>

          {/* Secondary Indicators */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-3xl">
            <div className="p-3 text-center">
              <span className="text-zinc-500 text-xs font-medium block">CPL (Custo por Lead)</span>
              <span className="text-lg font-bold text-zinc-200 mt-1 block">
                {resumo.cpl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="p-3 text-center border-l border-zinc-800/50">
              <span className="text-zinc-500 text-xs font-medium block">Qualificados (Taxa)</span>
              <span className="text-lg font-bold text-zinc-200 mt-1 block">
                {resumo.qualificados} <span className="text-xs text-zinc-500">({(resumo.taxa_qualificacao * 100).toFixed(1)}%)</span>
              </span>
            </div>
            <div className="p-3 text-center border-l border-zinc-800/50">
              <span className="text-zinc-500 text-xs font-medium block">Taxa de Conversão Venda</span>
              <span className="text-lg font-bold text-zinc-200 mt-1 block">
                {(resumo.taxa_fechamento * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 text-center border-l border-zinc-800/50">
              <span className="text-zinc-500 text-xs font-medium block">Ticket Médio</span>
              <span className="text-lg font-bold text-zinc-200 mt-1 block">
                {resumo.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Funnel Column */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-white">Funil de Vendas do CRM</h4>
              <p className="text-sm text-zinc-500">Métricas acumuladas de negócios em andamento por etapa.</p>
            </div>
            <Briefcase size={20} className="text-zinc-500" />
          </div>
          <div className="h-80 w-full">
            {funnelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Negócios" radius={[6, 6, 0, 0]} barSize={35}>
                    {funnelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">Sem dados de negócios.</div>
            )}
          </div>
        </div>

        {/* Device breakdown pie charts */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-white">Dispositivos & SO</h4>
              <p className="text-sm text-zinc-500">Distribuição do tráfego capturado.</p>
            </div>
            <Monitor size={20} className="text-zinc-500" />
          </div>
          
          <div className="h-64 w-full flex items-center justify-center">
            {devicePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {devicePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-600 text-xs">Sem tráfego registrado</div>
            )}
          </div>
        </div>

        {/* Operating Systems & Browsers list grids */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Sistemas Operacionais (Top)</h4>
            <div className="space-y-3">
              {osPieData.length > 0 ? (
                osPieData.map((os) => (
                  <div key={os.name} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-300">{os.name}</span>
                    <span className="font-mono text-zinc-400">{os.value} cliques</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs">Nenhum dado</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Navegadores de Acesso</h4>
            <div className="space-y-3">
              {navPieData.length > 0 ? (
                navPieData.map((nav) => (
                  <div key={nav.name} className="flex justify-between items-center bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-300 truncate max-w-[150px]">{nav.name}</span>
                    <span className="font-mono text-zinc-400">{nav.value} cliques</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs">Nenhum dado</div>
              )}
            </div>
          </div>
        </div>

        {/* Geographical Origin Section - Side by Side (3 columns!) */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">Origem Geográfica</h4>
              <p className="text-sm text-zinc-500">Distribuição do tráfego capturado por país, estado e cidade.</p>
            </div>
            <Globe size={20} className="text-zinc-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Países */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2 flex justify-between">
                <span>Países</span>
                <span className="text-zinc-500 font-mono text-[10px]">{paisesBarData.length} registros</span>
              </h5>
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {paisesBarData.length > 0 ? (
                  paisesBarData.map((item) => {
                    const pct = totalPaisCliques > 0 ? (item.value / totalPaisCliques) * 100 : 0;
                    const barWidth = maxPaisCliques > 0 ? (item.value / maxPaisCliques) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-zinc-300 truncate pr-2" title={item.name}>{item.name}</span>
                          <span className="font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                            <span className="text-violet-600 font-bold mr-1">{item.value}</span> 
                            clique{item.value !== 1 ? 's' : ''} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-violet-600 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-zinc-500 text-xs text-center py-6">Sem dados de países</div>
                )}
              </div>
            </div>

            {/* Estados */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2 flex justify-between">
                <span>Estados</span>
                <span className="text-zinc-500 font-mono text-[10px]">{estadosBarData.length} registros</span>
              </h5>
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {estadosBarData.length > 0 ? (
                  estadosBarData.map((item) => {
                    const pct = totalEstadoCliques > 0 ? (item.value / totalEstadoCliques) * 100 : 0;
                    const barWidth = maxEstadoCliques > 0 ? (item.value / maxEstadoCliques) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-zinc-300 truncate pr-2" title={item.name}>{item.name}</span>
                          <span className="font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                            <span className="text-violet-600 font-bold mr-1">{item.value}</span> 
                            clique{item.value !== 1 ? 's' : ''} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-violet-600 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-zinc-500 text-xs text-center py-6">Sem dados de estados</div>
                )}
              </div>
            </div>

            {/* Cidades */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2 flex justify-between">
                <span>Cidades</span>
                <span className="text-zinc-500 font-mono text-[10px]">{cidadesBarData.length} registros</span>
              </h5>
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {cidadesBarData.length > 0 ? (
                  cidadesBarData.map((item) => {
                    const pct = totalCidadeCliques > 0 ? (item.value / totalCidadeCliques) * 100 : 0;
                    const barWidth = maxCidadeCliques > 0 ? (item.value / maxCidadeCliques) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-zinc-300 truncate pr-2" title={item.name}>{item.name}</span>
                          <span className="font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                            <span className="text-violet-600 font-bold mr-1">{item.value}</span> 
                            clique{item.value !== 1 ? 's' : ''} ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-violet-600 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-zinc-500 text-xs text-center py-6">Sem dados de cidades</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cities and Campaign Performance table */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-8">

          {/* Performance por Criativo Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Desempenho por Criativo (Meta Ads)</h4>
              <p className="text-sm text-zinc-500 mb-6">Mapeamento de cliques, geração de leads e faturamento por criativo.</p>
            </div>
            
            <div className="overflow-x-auto">
              {porCriativo.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">
                      <th className="pb-3">Criativo / ID</th>
                      <th className="pb-3">Cliques</th>
                      <th className="pb-3">Leads</th>
                      <th className="pb-3">Conv %</th>
                      <th className="pb-3">Vendas</th>
                      <th className="pb-3 text-right">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-xs text-zinc-300">
                    {porCriativo
                      .sort((a, b) => b.valor - a.valor) // order by faturamento
                      .map((criativo) => {
                        const conv = criativo.cliques > 0 ? ((criativo.leads / criativo.cliques) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={criativo.criativo} className="hover:bg-zinc-800/20">
                            <td className="py-3 font-semibold text-white max-w-[150px] truncate">{criativo.criativo || 'Desconhecido / Orgânico'}</td>
                            <td className="py-3 font-mono">{criativo.cliques}</td>
                            <td className="py-3 font-mono">{criativo.leads}</td>
                            <td className="py-3 font-mono text-violet-400 font-medium">{conv}%</td>
                            <td className="py-3 font-mono">{criativo.vendas}</td>
                            <td className="py-3 font-mono text-emerald-400 font-semibold text-right">
                              {criativo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center text-zinc-600 text-xs py-8">Nenhum criativo registrou cliques ou faturamento no período.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
