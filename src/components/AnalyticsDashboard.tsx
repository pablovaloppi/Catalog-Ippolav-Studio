import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  fetchDailyAnalytics, 
  fetchRecentEvents, 
  DailyAnalyticsData, 
  AnalyticsEventItem 
} from '../services/analyticsService';
import { 
  Users, 
  Instagram, 
  MessageCircle, 
  Search, 
  Smartphone, 
  Monitor, 
  TrendingUp, 
  Flame, 
  Clock, 
  RefreshCw, 
  Eye, 
  Calendar, 
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Product } from '../types';

interface AnalyticsDashboardProps {
  allFigures?: Product[];
  onSelectFigure?: (figure: Product) => void;
}

export function AnalyticsDashboard({ allFigures = [], onSelectFigure }: AnalyticsDashboardProps) {
  const [daysRange, setDaysRange] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyAnalyticsData[]>([]);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEventItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const [analytics, events] = await Promise.all([
        fetchDailyAnalytics(days),
        fetchRecentEvents(25)
      ]);
      setDailyData(analytics);
      setRecentEvents(events);
    } catch (err) {
      console.warn("Error cargando analíticas:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(daysRange);
  }, [daysRange, loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(daysRange);
  };

  // Métricas agregadas del período seleccionado
  const aggregated = useMemo(() => {
    let totalViews = 0;
    let instagramViews = 0;
    let whatsappViews = 0;
    let directViews = 0;
    let otherViews = 0;
    let mobileViews = 0;
    let desktopViews = 0;
    let totalWhatsAppClicks = 0;

    const figureViewsMap = new Map<string, { id: string; title: string; count: number }>();
    const figureWhatsAppMap = new Map<string, { id: string; title: string; count: number }>();
    const searchTermsMap = new Map<string, { term: string; count: number }>();

    dailyData.forEach((day) => {
      totalViews += day.viewsTotal || 0;
      instagramViews += day.viewsFromInstagram || 0;
      whatsappViews += day.viewsFromWhatsApp || 0;
      directViews += day.viewsFromDirect || 0;
      otherViews += day.viewsFromOther || 0;
      mobileViews += day.deviceMobile || 0;
      desktopViews += day.deviceDesktop || 0;
      totalWhatsAppClicks += day.whatsappTotalClicks || 0;

      if (day.figureViews) {
        Object.entries(day.figureViews).forEach(([_, rawItem]) => {
          const item = rawItem as { id: string; title: string; count: number };
          if (!item || !item.id) return;
          const current = figureViewsMap.get(item.id) || { id: item.id, title: item.title || item.id, count: 0 };
          current.count += item.count || 0;
          figureViewsMap.set(item.id, current);
        });
      }

      if (day.whatsappClicks) {
        Object.entries(day.whatsappClicks).forEach(([_, rawItem]) => {
          const item = rawItem as { id: string; title: string; count: number };
          if (!item || !item.id) return;
          const current = figureWhatsAppMap.get(item.id) || { id: item.id, title: item.title || item.id, count: 0 };
          current.count += item.count || 0;
          figureWhatsAppMap.set(item.id, current);
        });
      }

      if (day.searchTerms) {
        Object.entries(day.searchTerms).forEach(([_, rawItem]) => {
          const item = rawItem as { term: string; count: number };
          if (!item || !item.term) return;
          const current = searchTermsMap.get(item.term) || { term: item.term, count: 0 };
          current.count += item.count || 0;
          searchTermsMap.set(item.term, current);
        });
      }
    });

    // Ranking de figuras más vistas
    const topViewedFigures = Array.from(figureViewsMap.values()).sort((a, b) => b.count - a.count);
    
    // Ranking de figuras más consultadas por WhatsApp
    const topWhatsAppFigures = Array.from(figureWhatsAppMap.values()).sort((a, b) => b.count - a.count);

    // Ranking de términos más buscados
    const topSearches = Array.from(searchTermsMap.values()).sort((a, b) => b.count - a.count);

    const instagramPercentage = totalViews > 0 ? Math.round((instagramViews / totalViews) * 100) : 0;
    const conversionRate = totalViews > 0 ? ((totalWhatsAppClicks / totalViews) * 100).toFixed(1) : '0.0';

    return {
      totalViews,
      instagramViews,
      whatsappViews,
      directViews,
      otherViews,
      mobileViews,
      desktopViews,
      totalWhatsAppClicks,
      topViewedFigures,
      topWhatsAppFigures,
      topSearches,
      instagramPercentage,
      conversionRate
    };
  }, [dailyData]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera y Selector de Período */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-serif font-bold text-on-surface">Métricas & Tráfico</h2>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Conoce el origen de tus visitantes, el impacto de Instagram y las figuras que más interés generan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-surface-container rounded-lg p-1 border border-outline-variant/30 text-xs">
            <button
              onClick={() => setDaysRange(1)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                daysRange === 1 ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDaysRange(7)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                daysRange === 7 ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setDaysRange(14)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                daysRange === 14 ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              14 Días
            </button>
            <button
              onClick={() => setDaysRange(30)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                daysRange === 30 ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              30 Días
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Actualizar datos"
            className="p-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 rounded-lg text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-on-surface-variant uppercase font-semibold tracking-wider">Cargando métricas...</span>
        </div>
      ) : (
        <>
          {/* Tarjetas KPI Superiores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Visitas */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 relative overflow-hidden group hover:border-primary/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total de Visitas</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-on-surface">{aggregated.totalViews}</span>
                <span className="text-xs text-on-surface-variant font-medium">visitas</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" /> Móvil: {aggregated.mobileViews}
                </span>
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-sky-400" /> PC: {aggregated.desktopViews}
                </span>
              </div>
            </div>

            {/* Tráfico desde Instagram */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Desde Instagram</span>
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <Instagram className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-pink-400">{aggregated.instagramViews}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {aggregated.instagramPercentage}% del total
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/20 text-[11px] text-on-surface-variant flex items-center justify-between">
                <span>Stories, Bio & DMs</span>
                <span className="text-pink-400 font-semibold">Fuente Principal</span>
              </div>
            </div>

            {/* Consultas a WhatsApp */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Clics a WhatsApp</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-emerald-400">{aggregated.totalWhatsAppClicks}</span>
                <span className="text-xs text-on-surface-variant font-medium">consultas</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/20 text-[11px] text-on-surface-variant flex items-center justify-between">
                <span>Interés en compra</span>
                <span className="text-emerald-400 font-semibold">{aggregated.conversionRate}% conversión</span>
              </div>
            </div>

            {/* Búsquedas de Usuarios */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Términos Buscados</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-amber-400">{aggregated.topSearches.reduce((acc, s) => acc + s.count, 0)}</span>
                <span className="text-xs text-on-surface-variant font-medium">búsquedas</span>
              </div>
              <div className="mt-3 pt-3 border-t border-outline-variant/20 text-[11px] text-on-surface-variant flex items-center justify-between">
                <span>{aggregated.topSearches.length} palabras clave</span>
                <span className="text-amber-400 font-semibold">Demanda activa</span>
              </div>
            </div>
          </div>

          {/* Panel de Estado de Integraciones: Firebase Analytics & Meta Pixel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Meta Pixel */}
            <div className="bg-surface-container-low border border-pink-500/20 rounded-xl p-5 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-on-surface">Meta Pixel (Instagram & Facebook)</h4>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20">1649607870067319</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">Construcción de audiencias & retargeting</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">PageView</span>
                  <span className="text-xs font-bold text-on-surface">Automático</span>
                </div>
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">ViewContent</span>
                  <span className="text-xs font-bold text-pink-400">Por Figura</span>
                </div>
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">Lead / WhatsApp</span>
                  <span className="text-xs font-bold text-emerald-400">Conversión</span>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-on-surface-variant/90 leading-relaxed">
                El Píxel de Meta rastrea a todos los visitantes que vienen de tu Instagram, acumulando la audiencia para tus campañas y midiendo la efectividad de tus publicaciones.
              </p>
            </div>

            {/* Tarjeta Firebase Analytics & GA4 */}
            <div className="bg-surface-container-low border border-amber-500/20 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-on-surface">Firebase & Google Analytics 4</h4>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">G-T3T6T4LR95</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">Métricas globales y flujo de navegación</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Activo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">view_item</span>
                  <span className="text-xs font-bold text-on-surface">Catálogo</span>
                </div>
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">generate_lead</span>
                  <span className="text-xs font-bold text-emerald-400">WhatsApp</span>
                </div>
                <div className="p-2 rounded bg-surface-container border border-outline-variant/20">
                  <span className="block text-[10px] text-outline">search</span>
                  <span className="text-xs font-bold text-amber-400">Búsquedas</span>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-on-surface-variant/90 leading-relaxed">
                Firebase Analytics registra las sesiones, orígenes de tráfico y retención, sincronizándose de forma nativa con Google Analytics 4 en la nube de Google.
              </p>
            </div>
          </div>

          {/* Gráfico y Desglose de Fuentes de Tráfico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canales de Tráfico */}
            <div className="lg:col-span-1 bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-on-surface flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  Origen de tus Visitas
                </h3>
              </div>

              {aggregated.totalViews === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  Aún no hay visitas registradas en este período.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Instagram */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-pink-400">
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </span>
                      <span className="text-on-surface font-mono">
                        {aggregated.instagramViews} ({aggregated.totalViews > 0 ? Math.round((aggregated.instagramViews / aggregated.totalViews) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: `${aggregated.totalViews > 0 ? (aggregated.instagramViews / aggregated.totalViews) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </span>
                      <span className="text-on-surface font-mono">
                        {aggregated.whatsappViews} ({aggregated.totalViews > 0 ? Math.round((aggregated.whatsappViews / aggregated.totalViews) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${aggregated.totalViews > 0 ? (aggregated.whatsappViews / aggregated.totalViews) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Enlaces directos */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-primary">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Enlaces Directos
                      </span>
                      <span className="text-on-surface font-mono">
                        {aggregated.directViews} ({aggregated.totalViews > 0 ? Math.round((aggregated.directViews / aggregated.totalViews) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${aggregated.totalViews > 0 ? (aggregated.directViews / aggregated.totalViews) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Otros */}
                  {aggregated.otherViews > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-on-surface-variant">
                          <Layers className="w-3.5 h-3.5" /> Otros sitios
                        </span>
                        <span className="text-on-surface font-mono">
                          {aggregated.otherViews} ({aggregated.totalViews > 0 ? Math.round((aggregated.otherViews / aggregated.totalViews) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                        <div 
                          className="h-full bg-outline rounded-full transition-all duration-500" 
                          style={{ width: `${(aggregated.otherViews / aggregated.totalViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Distribución por Dispositivo */}
                  <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-around text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-on-surface-variant mb-1">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span>Celulares</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-on-surface">
                        {aggregated.totalViews > 0 ? Math.round((aggregated.mobileViews / (aggregated.mobileViews + aggregated.desktopViews || 1)) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-8 w-px bg-outline-variant/30"></div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-on-surface-variant mb-1">
                        <Monitor className="w-4 h-4 text-sky-400" />
                        <span>Computadoras</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-on-surface">
                        {aggregated.totalViews > 0 ? Math.round((aggregated.desktopViews / (aggregated.mobileViews + aggregated.desktopViews || 1)) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Figuras Más Vistas (Lo que más llama la atención) */}
            <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-on-surface flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Figuras Más Vistas
                </h3>
                <span className="text-xs text-on-surface-variant font-medium">Mayor atención</span>
              </div>

              {aggregated.topViewedFigures.length === 0 ? (
                <div className="py-10 text-center text-xs text-on-surface-variant">
                  No hay datos de visualizaciones registradas todavía en este rango.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {aggregated.topViewedFigures.slice(0, 7).map((fig, idx) => {
                    const matchedFigure = allFigures.find(f => f.id === fig.id);
                    const maxCount = aggregated.topViewedFigures[0]?.count || 1;
                    const percent = Math.round((fig.count / maxCount) * 100);

                    return (
                      <div 
                        key={fig.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-bold font-mono w-5 text-on-surface-variant text-center">
                            #{idx + 1}
                          </span>
                          {matchedFigure?.imageUrls?.[0] ? (
                            <img 
                              src={matchedFigure.imageUrls[0]} 
                              alt={fig.title} 
                              className="w-10 h-10 object-cover rounded bg-surface-container-lowest shrink-0 border border-outline-variant/30" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-surface-container-lowest flex items-center justify-center shrink-0 border border-outline-variant/30 text-on-surface-variant text-xs">
                              🏆
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-on-surface truncate">{fig.title}</h4>
                            <div className="w-full bg-surface-container-lowest h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline-variant/30 text-xs font-bold font-mono text-primary flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {fig.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Fila Inferior: Consultas a WhatsApp y Términos Más Buscados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Figuras Consultadas para Compra */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-on-surface flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  Figuras con Más Consultas a WhatsApp
                </h3>
                <span className="text-xs text-emerald-400 font-semibold">Intención de compra</span>
              </div>

              {aggregated.topWhatsAppFigures.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  Aún no se registraron clics a WhatsApp en este período.
                </div>
              ) : (
                <div className="space-y-2">
                  {aggregated.topWhatsAppFigures.slice(0, 5).map((fig, idx) => (
                    <div 
                      key={fig.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container border border-outline-variant/20 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold font-mono text-emerald-400">#{idx + 1}</span>
                        <span className="text-xs font-semibold text-on-surface truncate">{fig.title}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono shrink-0 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {fig.count} contactos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Términos Más Buscados */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-on-surface flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  Lo que la Gente Busca
                </h3>
                <span className="text-xs text-on-surface-variant font-medium">Buscador del catálogo</span>
              </div>

              {aggregated.topSearches.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">
                  No hay términos de búsqueda registrados todavía.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {aggregated.topSearches.slice(0, 15).map((s, idx) => (
                    <span 
                      key={s.term}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface hover:border-amber-500/50 transition-colors"
                    >
                      <span className="font-semibold">{s.term}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px]">
                        {s.count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feed de Actividad en Vivo */}
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-on-surface flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Feed de Actividad en Tiempo Real
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                En Vivo
              </span>
            </div>

            {recentEvents.length === 0 ? (
              <div className="py-8 text-center text-xs text-on-surface-variant">
                Las interacciones recientes aparecerán aquí a medida que los usuarios visiten tu tienda.
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/20 max-h-80 overflow-y-auto pr-1">
                {recentEvents.map((evt) => {
                  let icon = <Users className="w-3.5 h-3.5 text-primary" />;
                  let text = "Nueva visita a la tienda";

                  if (evt.type === 'figure_view') {
                    icon = <Eye className="w-3.5 h-3.5 text-sky-400" />;
                    text = `Vio la figura "${evt.figureTitle || 'Detalle'}"`;
                  } else if (evt.type === 'whatsapp_click') {
                    icon = <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
                    text = `Consultó por WhatsApp por "${evt.figureTitle || 'Figura'}"`;
                  } else if (evt.type === 'search') {
                    icon = <Search className="w-3.5 h-3.5 text-amber-400" />;
                    text = `Buscó "${evt.searchTerm}"`;
                  }

                  let sourceBadge = 'Enlace directo';
                  let sourceClass = 'bg-surface-container text-on-surface-variant border-outline-variant/30';
                  if (evt.source === 'instagram') {
                    sourceBadge = 'Instagram';
                    sourceClass = 'bg-pink-950/50 text-pink-300 border-pink-500/40';
                  } else if (evt.source === 'whatsapp') {
                    sourceBadge = 'WhatsApp';
                    sourceClass = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40';
                  }

                  return (
                    <div key={evt.id || Math.random().toString()} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant/20">
                          {icon}
                        </div>
                        <span className="font-medium text-on-surface truncate">{text}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sourceClass}`}>
                          {sourceBadge}
                        </span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1 font-mono">
                          {evt.device === 'mobile' ? <Smartphone className="w-3 h-3 text-emerald-400" /> : <Monitor className="w-3 h-3 text-sky-400" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
