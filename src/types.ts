export interface UsuarioOut {
  id: string;
  conta_id: string;
  nome: string;
  email: string;
  papel: string;
}

export interface UsuarioIn {
  nome: string;
  email: string;
  senha: string;
  papel?: string | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LinkOut {
  id: string;
  codigo_curto: string;
  destino_numero: string;
  mensagem_prefill: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  cliques: number;
}

export interface LinkIn {
  codigo_curto: string;
  destino_numero: string;
  mensagem_prefill?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

export interface LeadOut {
  id: string;
  nome: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  atendente_id: string | null;
  criado_em: string;
}

export interface LeadUpdateIn {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  cidade?: string | null;
  estado?: string | null;
  atendente_id?: string | null;
}

export interface OrigemDetalhada {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  ad_id: string | null;
  plataforma: string | null;
  device_tipo: 'mobile' | 'desktop' | 'tablet' | null;
  os: string | null;
  navegador: string | null;
  dispositivo: string | null;
  idioma: string | null;
  pais: string | null;
  estado_ip: string | null;
  cidade_ip: string | null;
  landing_url: string | null;
  referrer: string | null;
  ip: string | null;
  criado_em: string;
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
}

export interface TagIn {
  nome: string;
  cor?: string | null;
}

export interface Anotacao {
  id: string;
  texto: string;
  criado_em: string;
}

export interface AnotacaoIn {
  texto: string;
}

export interface LeadDetalhe {
  lead: LeadOut;
  origem: OrigemDetalhada | null;
  tags: Tag[];
  anotacoes: Anotacao[];
}

export interface NegocioOut {
  id: string;
  lead_id: string;
  etapa: string;
  status: string;
  valor: string | number | null;
  lead_nome?: string; // Hydrated on frontend
  lead_telefone?: string; // Hydrated on frontend
}

export interface NegocioIn {
  lead_id: string;
  valor?: number | string | null;
  etapa?: string | null;
}

export interface NegocioStatusIn {
  status?: string | null;
  etapa?: string | null;
  valor?: number | string | null;
}

export interface CanalOut {
  id: string;
  nome: string;
  phone_number_id: string;
  numero_exibicao: string | null;
  ativo: boolean;
  tipo?: 'oficial' | 'nao_oficial' | null;
  status?: string | null;
}

export interface CanalIn {
  nome: string;
  phone_number_id?: string | null;
  access_token?: string | null;
  waba_id?: string | null;
  numero_exibicao?: string | null;
  verify_token?: string | null;
  tipo?: 'oficial' | 'nao_oficial' | null;
}

export interface CanalUpdateIn {
  nome?: string | null;
  phone_number_id?: string | null;
  access_token?: string | null;
  waba_id?: string | null;
  numero_exibicao?: string | null;
  verify_token?: string | null;
  ativo?: boolean | null;
  tipo?: 'oficial' | 'nao_oficial' | null;
}


export interface ConversaOut {
  id: string;
  lead_id: string;
  lead_nome: string | null;
  lead_telefone: string | null;
  status_atendimento: string;
  atendente_id: string | null;
  ultima_mensagem_em: string | null;
  janela_24h_expira_em: string | null;
  canal_id?: string | null;
}

export interface MensagemOut {
  id: string;
  direcao: 'entrada' | 'saida';
  tipo: string;
  conteudo: string | null;
  criado_em: string;
}

export interface TemplateIn {
  template_name: string;
  lang?: string | null;
}

export interface MetaConfig {
  pixel_id: string | null;
  capi_access_token: string | null;
  ad_account_id: string | null;
  test_event_code: string | null;
}

export interface RespostaRapida {
  id: string;
  atalho: string;
  texto: string;
}

export interface RespostaRapidaIn {
  atalho: string;
  texto: string;
}

export interface Followup {
  id: string;
  lead_id: string;
  quando: string;
  nota: string | null;
  feito: boolean;
  lead_nome?: string; // Hydrated on frontend
  lead_telefone?: string; // Hydrated on frontend
}

export interface FollowupIn {
  quando: string;
  nota?: string | null;
}

export interface AnalyticsResumo {
  cliques: number;
  leads: number;
  qualificados: number;
  vendas: number;
  faturamento: number;
  gasto: number;
  cpl: number;
  roas: number;
  taxa_qualificacao: number;
  taxa_fechamento: number;
  ticket_medio: number;
}

export interface AnalyticsFunil {
  novo: number;
  em_atendimento: number;
  qualificado: number;
  negociacao: number;
  ganho: number;
  perdido: number;
}

export interface AnalyticsDispositivos {
  device: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  os: {
    [key: string]: number;
  };
  navegador: {
    [key: string]: number;
  };
}

export interface AnalyticsLocalizacao {
  paises: {
    [key: string]: number;
  };
  estados: {
    [key: string]: number;
  };
  cidades: {
    [key: string]: number;
  };
}

export interface AnalyticsPorCriativo {
  criativo: string;
  cliques: number;
  leads: number;
  vendas: number;
  valor: number;
}
export type AnalyticsPorCriativoArray = AnalyticsPorCriativo[];
