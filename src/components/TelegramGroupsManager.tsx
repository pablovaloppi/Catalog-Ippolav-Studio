import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { TelegramGroup } from '../types';
import { 
  Send, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Edit2, 
  Search, 
  Calendar, 
  Check, 
  Clock, 
  Users, 
  CalendarClock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export function TelegramGroupsManager() {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name-asc' | 'name-desc'>('recent');
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null);
  const [successGroupId, setSuccessGroupId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string } | null>(null);
  
  // Estado para modal de fecha personalizada
  const [customDateGroup, setCustomDateGroup] = useState<TelegramGroup | null>(null);
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // Suscripción en tiempo real a la colección de grupos de Telegram en Firestore
  useEffect(() => {
    const q = query(collection(db, 'telegram_groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: TelegramGroup[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as TelegramGroup);
      });
      setGroups(data);
      setLoading(false);
    }, (error) => {
      console.error("Error al escuchar grupos de Telegram:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Agregar nuevo grupo a Firestore
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed || addingGroup) return;

    setAddingGroup(true);
    try {
      await addDoc(collection(db, 'telegram_groups'), {
        name: trimmed,
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        order: groups.length + 1
      });
      setNewGroupName('');
    } catch (err: any) {
      console.error("Error al agregar grupo de Telegram:", err);
      alert("Error al agregar el grupo: " + (err.message || 'Error desconocido'));
    } finally {
      setAddingGroup(false);
    }
  };

  // Actualizar fecha del grupo al momento actual (serverTimestamp)
  const handleUpdateTimestamp = async (groupId: string) => {
    setUpdatingGroupId(groupId);
    try {
      const groupRef = doc(db, 'telegram_groups', groupId);
      await updateDoc(groupRef, {
        lastUpdatedAt: serverTimestamp()
      });
      setSuccessGroupId(groupId);
      setTimeout(() => {
        setSuccessGroupId(prev => prev === groupId ? null : prev);
      }, 2500);
    } catch (err: any) {
      console.error("Error al actualizar fecha del grupo:", err);
      alert("Error al actualizar la fecha: " + (err.message || 'Error'));
    } finally {
      setUpdatingGroupId(null);
    }
  };

  // Guardar fecha personalizada
  const handleSaveCustomDate = async () => {
    if (!customDateGroup || !customDateTime) return;
    setUpdatingGroupId(customDateGroup.id);
    try {
      const selectedDate = new Date(customDateTime);
      if (isNaN(selectedDate.getTime())) {
        alert("Fecha no válida");
        return;
      }
      const groupRef = doc(db, 'telegram_groups', customDateGroup.id);
      await updateDoc(groupRef, {
        lastUpdatedAt: Timestamp.fromDate(selectedDate)
      });
      setCustomDateGroup(null);
      setSuccessGroupId(customDateGroup.id);
      setTimeout(() => {
        setSuccessGroupId(prev => prev === customDateGroup.id ? null : prev);
      }, 2500);
    } catch (err: any) {
      console.error("Error al guardar fecha personalizada:", err);
      alert("Error al guardar la fecha");
    } finally {
      setUpdatingGroupId(null);
    }
  };

  // Guardar edición de nombre
  const handleSaveEdit = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return;
    try {
      const groupRef = doc(db, 'telegram_groups', editingGroup.id);
      await updateDoc(groupRef, {
        name: editingGroup.name.trim()
      });
      setEditingGroup(null);
    } catch (err) {
      console.error("Error al actualizar nombre del grupo:", err);
      alert("Error al actualizar el nombre");
    }
  };

  // Eliminar grupo
  const handleDeleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`¿Eliminar el grupo "${name}" de la lista de Telegram?`)) return;
    try {
      await deleteDoc(doc(db, 'telegram_groups', groupId));
    } catch (err) {
      console.error("Error al eliminar grupo:", err);
      alert("Error al eliminar el grupo");
    }
  };

  // Función para formatear fechas
  const formatGroupDate = (timestamp: any): { fullDate: string; timeStr: string; badge: string; badgeClass: string; isRecent: boolean } => {
    if (!timestamp) {
      return {
        fullDate: 'Sin actualizar',
        timeStr: '',
        badge: 'Nunca',
        badgeClass: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
        isRecent: false
      };
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) {
      return {
        fullDate: 'Fecha no válida',
        timeStr: '',
        badge: '-',
        badgeClass: 'bg-surface-container text-on-surface-variant',
        isRecent: false
      };
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');

    const fullDate = `${day}/${month}/${year}`;
    const timeStr = `${hours}:${mins} hs`;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const isToday = now.getDate() === date.getDate() && now.getMonth() === date.getMonth() && now.getFullYear() === date.getFullYear();
    const isYesterday = diffDays === 1;

    let badge = `${diffDays}d`;
    let badgeClass = 'bg-surface-container text-on-surface-variant border-outline-variant/30';
    let isRecent = false;

    if (isToday) {
      badge = 'Hoy';
      badgeClass = 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 font-bold';
      isRecent = true;
    } else if (isYesterday) {
      badge = 'Ayer';
      badgeClass = 'bg-sky-950/70 border-sky-500/40 text-sky-300 font-medium';
    } else if (diffDays <= 3) {
      badge = `Hace ${diffDays} días`;
      badgeClass = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
    } else if (diffDays <= 7) {
      badge = `Hace ${diffDays} días`;
      badgeClass = 'bg-surface-container-high border-outline-variant/40 text-on-surface-variant';
    } else {
      badge = `Hace ${diffDays} días`;
      badgeClass = 'bg-rose-950/40 border-rose-500/30 text-rose-300';
    }

    return { fullDate, timeStr, badge, badgeClass, isRecent };
  };

  // Filtrado y ordenamiento de grupos
  const filteredAndSortedGroups = useMemo(() => {
    let result = groups.filter(g => 
      g.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
      
      const timeA = a.lastUpdatedAt?.toMillis ? a.lastUpdatedAt.toMillis() : (a.lastUpdatedAt ? new Date(a.lastUpdatedAt).getTime() : 0);
      const timeB = b.lastUpdatedAt?.toMillis ? b.lastUpdatedAt.toMillis() : (b.lastUpdatedAt ? new Date(b.lastUpdatedAt).getTime() : 0);

      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      // 'recent' default
      return timeB - timeA;
    });

    return result;
  }, [groups, searchQuery, sortBy]);

  // Contadores de estadísticas
  const stats = useMemo(() => {
    const total = groups.length;
    let updatedToday = 0;
    let pendingOver3Days = 0;

    const now = new Date();
    groups.forEach(g => {
      if (!g.lastUpdatedAt) {
        pendingOver3Days++;
        return;
      }
      const d = g.lastUpdatedAt.toDate ? g.lastUpdatedAt.toDate() : new Date(g.lastUpdatedAt);
      if (isNaN(d.getTime())) return;

      const isToday = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
      if (isToday) {
        updatedToday++;
      } else {
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 3) {
          pendingOver3Days++;
        }
      }
    });

    return { total, updatedToday, pendingOver3Days };
  }, [groups]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9] shadow-sm">
              <Send className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-on-surface">Grupos de Telegram</h2>
              <p className="text-xs text-on-surface-variant">
                Control y registro de publicaciones y actualizaciones en tus canales y comunidades de Telegram.
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
            <Users className="w-4 h-4 text-primary" />
            <div>
              <span className="text-[10px] uppercase font-bold text-outline block leading-none">Total</span>
              <span className="text-sm font-bold font-mono text-on-surface">{stats.total}</span>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
            <Check className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400/90 block leading-none">Hoy</span>
              <span className="text-sm font-bold font-mono text-emerald-300">{stats.updatedToday}</span>
            </div>
          </div>

          {stats.pendingOver3Days > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400/90 block leading-none">+3 días</span>
                <span className="text-sm font-bold font-mono text-amber-300">{stats.pendingOver3Days}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Formulario para Agregar Nuevo Grupo */}
      <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <span>Agregar Grupo de Telegram</span>
        </h3>
        
        <form onSubmit={handleAddGroup} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input 
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Escribe solo el nombre del grupo (ej: Coleccionistas Dragon Ball, Resinas Latam...)"
              className="w-full bg-surface-container-high border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              disabled={addingGroup}
            />
          </div>

          <button
            type="submit"
            disabled={addingGroup || !newGroupName.trim()}
            className="px-6 py-3 bg-[#229ED9] hover:bg-[#1e8ec3] disabled:opacity-40 disabled:hover:bg-[#229ED9] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-[#229ED9]/20 cursor-pointer"
          >
            {addingGroup ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Agregar Grupo</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenamiento */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar grupo por nombre..."
            className="w-full bg-surface-container-high/70 border border-outline-variant/40 rounded-xl pl-9 pr-3 py-2 text-xs focus:border-primary outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant font-medium whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface-container-high border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface focus:border-primary outline-none"
          >
            <option value="recent">Última actualización (recientes)</option>
            <option value="oldest">Última actualización (antiguos)</option>
            <option value="name-asc">Nombre: A → Z</option>
            <option value="name-desc">Nombre: Z → A</option>
          </select>
        </div>
      </div>

      {/* Lista de Grupos */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-primary gap-3">
            <img src="/logo-ippolav.png" alt="Loading..." className="w-12 h-12 animate-scale-pulse object-contain" />
            <span className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase">
              Cargando grupos de Telegram...
            </span>
          </div>
        ) : filteredAndSortedGroups.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant border border-outline-variant/30">
              <Send className="w-6 h-6 -rotate-45 opacity-60" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-on-surface">
                {searchQuery ? 'No se encontraron grupos con esa búsqueda' : 'Aún no has agregado grupos de Telegram'}
              </h4>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                {searchQuery 
                  ? 'Prueba con otro término de búsqueda o limpia el filtro.' 
                  : 'Ingresa el nombre de tus canales o grupos de Telegram arriba para llevar el control de tus publicaciones.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {/* Cabecera de la tabla en pantallas medianas/grandes */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-surface-container/60 text-[11px] font-bold text-outline uppercase tracking-wider">
              <div className="col-span-5">Nombre del Grupo</div>
              <div className="col-span-4">Última Fecha Actualización</div>
              <div className="col-span-3 text-right">Acción</div>
            </div>

            {/* Filas de grupos */}
            {filteredAndSortedGroups.map((group, index) => {
              const { fullDate, timeStr, badge, badgeClass, isRecent } = formatGroupDate(group.lastUpdatedAt);
              const isUpdating = updatingGroupId === group.id;
              const isSuccess = successGroupId === group.id;
              const isEditing = editingGroup?.id === group.id;

              return (
                <div 
                  key={group.id}
                  className="p-4 sm:px-5 sm:py-3.5 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center hover:bg-surface-container/40 transition-colors"
                >
                  {/* Nombre del Grupo */}
                  <div className="w-full sm:col-span-5 flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-outline w-5 shrink-0">
                      #{index + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingGroup.name}
                          onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                          className="flex-1 bg-surface-container-high border border-primary px-2.5 py-1.5 rounded-lg text-xs text-on-surface outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingGroup(null);
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                          title="Guardar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingGroup(null)}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-semibold text-sm text-on-surface truncate" title={group.name}>
                          {group.name}
                        </span>
                        <button
                          onClick={() => setEditingGroup({ id: group.id, name: group.name })}
                          className="p-1 text-on-surface-variant/60 hover:text-primary rounded transition-colors"
                          title="Editar nombre"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Última Fecha de Actualización */}
                  <div className="w-full sm:col-span-4 flex items-center justify-between sm:justify-start gap-2.5">
                    <span className="text-xs text-on-surface-variant font-medium sm:hidden">
                      Última actualización:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-on-surface">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold">{fullDate}</span>
                        {timeStr && <span className="text-[11px] text-on-surface-variant">({timeStr})</span>}
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] border tracking-tight ${badgeClass}`}>
                        {badge}
                      </span>
                    </div>
                  </div>

                  {/* Botón Actualizar y Acciones */}
                  <div className="w-full sm:col-span-3 flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10">
                    {/* Botón Principal: Actualizar fecha */}
                    <button
                      type="button"
                      onClick={() => handleUpdateTimestamp(group.id)}
                      disabled={isUpdating}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                        isSuccess
                          ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                          : isRecent
                          ? 'bg-surface-container-high hover:bg-primary/20 text-primary border border-primary/30'
                          : 'bg-[#229ED9] hover:bg-[#1e8ec3] text-white shadow-[#229ED9]/20'
                      }`}
                      title="Actualizar fecha de publicación al momento actual"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Actualizando...</span>
                        </>
                      ) : isSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Actualizado!</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Actualizar</span>
                        </>
                      )}
                    </button>

                    {/* Botón secundario: Fijar fecha manual */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDateGroup(group);
                        const now = new Date();
                        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setCustomDateTime(localIso);
                      }}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg border border-outline-variant/20 transition-colors"
                      title="Fijar una fecha u hora específica"
                    >
                      <CalendarClock className="w-4 h-4" />
                    </button>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-2 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container rounded-lg border border-outline-variant/20 transition-colors"
                      title="Eliminar grupo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para establecer fecha personalizada */}
      {customDateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-on-surface flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                <span>Fijar Fecha de Actualización</span>
              </h3>
              <button
                onClick={() => setCustomDateGroup(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-on-surface-variant">
              Establece la fecha y hora exacta en la que se publicó en el grupo <strong className="text-on-surface">"{customDateGroup.name}"</strong>:
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-outline uppercase">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant/40 rounded-xl p-3 text-sm text-on-surface focus:border-primary outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setCustomDateGroup(null)}
                className="px-4 py-2 border border-outline-variant/40 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomDate}
                className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 active:scale-95 transition-all shadow-md"
              >
                Guardar Fecha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
