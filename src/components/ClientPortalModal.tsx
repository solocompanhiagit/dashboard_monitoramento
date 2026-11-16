import React from 'react';
import {
  Building2,
  CheckCircle2,
  Droplets,
  KeyRound,
  Layers,
  Leaf,
  Lock,
  MapPin,
  ShieldCheck,
  Sprout,
  Users,
  X,
} from 'lucide-react';
import { ClientTenant } from '../types/schema';

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientTenant[];
  activeClientId: string;
  onSelectClient: (clientId: string) => void;
  isDark: boolean;
}

export const ClientPortalModal: React.FC<ClientPortalModalProps> = ({
  isOpen,
  onClose,
  clients,
  activeClientId,
  onSelectClient,
  isDark,
}) => {
  if (!isOpen) return null;

  const totalLaudosAll = clients.reduce((sum, c) => sum + c.totalLaudos, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border shadow-2xl ${
          isDark
            ? 'bg-[#0b131e] border-[#1e293b] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1e293b] flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Controle de Acesso & Isolamento por Cliente (Multi-Tenant)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cada cliente visualiza <strong>exclusivamente</strong> suas propriedades, talhões
                e resultados laboratoriais. O modo Administrador é restrito à equipe do Laboratório
                Solo & Companhia.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition cursor-pointer"
            aria-label="Fechar portal de acesso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client Cards Scroll Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Client Accounts Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Acessos Individuais de Clientes / Produtores ({clients.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Clique em um cliente para entrar em sua visão isolada
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clients.map((client) => {
                const isActive = activeClientId === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client.id);
                      onClose();
                    }}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                        : isDark
                        ? 'bg-[#111827]/80 border-[#1e293b] hover:border-emerald-500/40 hover:bg-[#111827]'
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-500/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg border ${
                            isActive
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800/70 border-slate-700 text-slate-300'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm leading-tight">{client.nome}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              {client.municipioBase}
                            </span>
                            <span>•</span>
                            <code className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {client.codigoAcesso}
                            </code>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                          <CheckCircle2 className="w-3 h-3" />
                          Conectado
                        </span>
                      )}
                    </div>

                    {/* Linked properties */}
                    <div className="mt-2.5 text-[11px] text-slate-400 truncate">
                      <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        Propriedades ({client.propriedades.length}):
                      </strong>{' '}
                      {client.propriedades.join(' • ')}
                    </div>

                    {/* Counts by Analysis Type */}
                    <div className="mt-3 pt-2.5 border-t border-[#1e293b]/60 flex flex-wrap items-center gap-1.5 tabular-nums">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                          client.countsByType['PECÍOLO'] > 0
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <Sprout className="w-3 h-3" /> Pecíolo: {client.countsByType['PECÍOLO']}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                          client.countsByType.FOLHA > 0
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <Leaf className="w-3 h-3" /> Folha: {client.countsByType.FOLHA}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                          client.countsByType.SOLO > 0
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-slate-800/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <Layers className="w-3 h-3" /> Solo: {client.countsByType.SOLO}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                          client.countsByType['SOLUÇÃO'] > 0
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-slate-800/40 text-slate-500 border-slate-800'
                        }`}
                      >
                        <Droplets className="w-3 h-3" /> Solução: {client.countsByType['SOLUÇÃO']}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lab Administrator Option */}
          <div className="pt-3 border-t border-[#1e293b]">
            <button
              onClick={() => {
                onSelectClient('ADMIN_ALL');
                onClose();
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                activeClientId === 'ADMIN_ALL'
                  ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-500/40'
                  : isDark
                  ? 'bg-[#111827]/60 border-[#1e293b] hover:border-cyan-500/40'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>Visão Administrador do Laboratório (Todos os Clientes)</span>
                    {activeClientId === 'ADMIN_ALL' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-bold">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Acesso interno da equipe técnica do Laboratório Solo & Companhia para auditoria
                    consolidada da safra ({totalLaudosAll} laudos totais).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 shrink-0">
                <Users className="w-4 h-4" />
                <span>Acessar Visão Global</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
