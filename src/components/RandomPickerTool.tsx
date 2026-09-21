import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Category, Designer } from '../types';
import { getOriginalCloudinaryUrl, downloadImageAsFile } from '../cloudinaryUtils';
import { getAllDescendantCategoryIds, getCategoryBreadcrumb, getCategoryHierarchyLabel } from '../categoryUtils';
import { 
  Dices, 
  Sparkles, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Layers, 
  Check, 
  History, 
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Image as ImageIcon,
  Flame,
  Undo2,
  ZoomIn,
  Maximize2
} from 'lucide-react';
import { ProductModal } from './ProductModal';

interface RandomPickerToolProps {
  categories: Category[];
  designers: Designer[];
}

export function RandomPickerTool({ categories, designers }: RandomPickerToolProps) {
  const [allFigures, setAllFigures] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDrawing, setIsDrawing] = useState(false);
  const [shufflingFigure, setShufflingFigure] = useState<Product | null>(null);
  const [selectedFigure, setSelectedFigure] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [previewModalOptions, setPreviewModalOptions] = useState<{
    figure: Product;
    fullScreen: boolean;
    imageIndex: number;
  } | null>(null);

  // Selected history tab/view
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isResettingAll, setIsResettingAll] = useState(false);

  // Real-time listener for figures to keep selected/unselected state synchronized
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'figures'),
      (snapshot) => {
        const figuresList: Product[] = [];
        snapshot.forEach((docSnap) => {
          figuresList.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        setAllFigures(figuresList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error al escuchar figuras para el sorteador:", err);
        setError("Error al cargar las figuras de la base de datos.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter pool based on selected category (if any)
  const poolFigures = useMemo(() => {
    if (categoryFilter === 'all') return allFigures;
    const descendantIds = getAllDescendantCategoryIds(categoryFilter, categories);
    const validIds = new Set([categoryFilter, ...descendantIds]);
    return allFigures.filter(f => validIds.has(f.franchiseId));
  }, [allFigures, categoryFilter, categories]);

  // Figures available for draw (NOT yet selected)
  const availableFigures = useMemo(() => {
    return poolFigures.filter(f => !f.selectedInRandomDraw);
  }, [poolFigures]);

  // Figures already selected
  const alreadySelectedFigures = useMemo(() => {
    return allFigures
      .filter(f => f.selectedInRandomDraw)
      .sort((a, b) => {
        const timeA = a.selectedInRandomDrawAt?.toMillis ? a.selectedInRandomDrawAt.toMillis() : (a.selectedInRandomDrawAt?.seconds ? a.selectedInRandomDrawAt.seconds * 1000 : 0);
        const timeB = b.selectedInRandomDrawAt?.toMillis ? b.selectedInRandomDrawAt.toMillis() : (b.selectedInRandomDrawAt?.seconds ? b.selectedInRandomDrawAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
  }, [allFigures]);

  // Handle the random draw action
  const handleDrawRandomFigure = async () => {
    if (availableFigures.length === 0 || isDrawing) return;

    setIsDrawing(true);
    setSelectedFigure(null);
    setSelectedImageIndex(0);
    setDownloadSuccess(false);

    // Exciting suspense shuffle animation
    const totalSteps = 16;
    let step = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * availableFigures.length);
      setShufflingFigure(availableFigures[randomIdx]);
      step++;

      if (step >= totalSteps) {
        clearInterval(interval);
        // Final pick
        const finalIdx = Math.floor(Math.random() * availableFigures.length);
        const chosen = availableFigures[finalIdx];
        
        // Mark in Firestore
        finalizePick(chosen);
      }
    }, 75);
  };

  const finalizePick = async (chosen: Product) => {
    try {
      const docRef = doc(db, 'figures', chosen.id);
      await updateDoc(docRef, {
        selectedInRandomDraw: true,
        selectedInRandomDrawAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSelectedFigure({
        ...chosen,
        selectedInRandomDraw: true,
        selectedInRandomDrawAt: new Date()
      });
    } catch (err) {
      console.error("Error al marcar la figura seleccionada en Firebase:", err);
      // Even if Firestore update errors out, display to user
      setSelectedFigure(chosen);
    } finally {
      setIsDrawing(false);
      setShufflingFigure(null);
    }
  };

  // Download high-resolution image
  const handleDownloadImage = async (url: string, index: number = 0) => {
    if (!url) return;
    setDownloadingImage(url);
    setDownloadSuccess(false);

    const safeTitle = (selectedFigure?.title || 'figura')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 40);
    const numId = selectedFigure?.numericId ? selectedFigure.numericId.replace(/[^a-z0-9#]/gi, '') : 'fig';
    const filename = `${numId}_${safeTitle}_original_hd_${index + 1}.jpg`;

    const success = await downloadImageAsFile(url, filename);
    setDownloadingImage(null);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  // Unmark a specific figure (return it to the draw pool)
  const handleUnmarkFigure = async (figureId: string) => {
    try {
      const docRef = doc(db, 'figures', figureId);
      await updateDoc(docRef, {
        selectedInRandomDraw: false,
        selectedInRandomDrawAt: null,
        updatedAt: serverTimestamp()
      });

      if (selectedFigure?.id === figureId) {
        setSelectedFigure(prev => prev ? { ...prev, selectedInRandomDraw: false } : null);
      }
    } catch (err) {
      console.error("Error al desmarcar figura:", err);
      alert("No se pudo desmarcar la figura.");
    }
  };

  // Reset all marked figures (sets selectedInRandomDraw to false for all)
  const handleResetAllSelected = async () => {
    const figuresToReset = allFigures.filter(f => f.selectedInRandomDraw);
    if (figuresToReset.length === 0) {
      alert("No hay figuras marcadas actualmente. Todas las figuras ya tienen 'selectedInRandomDraw' en false.");
      return;
    }

    const confirmReset = window.confirm(
      `¿Deseas reiniciar todas las figuras seleccionadas?\n\nSe restablecerá 'selectedInRandomDraw' a 'false' en las ${figuresToReset.length} figuras para que todas vuelvan a estar disponibles en el sorteo.`
    );
    if (!confirmReset) return;

    setIsResettingAll(true);
    try {
      const batchSize = 100;
      for (let i = 0; i < figuresToReset.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = figuresToReset.slice(i, i + batchSize);
        chunk.forEach(fig => {
          const docRef = doc(db, 'figures', fig.id);
          batch.update(docRef, {
            selectedInRandomDraw: false,
            selectedInRandomDrawAt: null,
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
      }
      setSelectedFigure(null);
      setShufflingFigure(null);
      alert(`¡Sorteo reiniciado con éxito! Se restablecieron ${figuresToReset.length} figuras a 'false'.`);
    } catch (err) {
      console.error("Error al reiniciar todas las figuras:", err);
      alert("Ocurrió un error al reiniciar el sorteo.");
    } finally {
      setIsResettingAll(false);
    }
  };

  // Sorted categories for filter selector
  const sortedCategories = useMemo(() => {
    return categories
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        label: getCategoryHierarchyLabel(cat, categories),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [categories]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return alreadySelectedFigures;
    const q = historySearch.toLowerCase();
    return alreadySelectedFigures.filter(f => 
      f.title.toLowerCase().includes(q) || 
      (f.numericId && f.numericId.toLowerCase().includes(q))
    );
  }, [alreadySelectedFigures, historySearch]);

  const activeCategoryObj = categories.find(c => c.id === (selectedFigure?.franchiseId || shufflingFigure?.franchiseId));
  const activeDesignerObj = designers.find(d => d.id === (selectedFigure?.designerId || shufflingFigure?.designerId));

  const currentDisplayFigure = isDrawing ? shufflingFigure : selectedFigure;
  const currentImageUrl = currentDisplayFigure?.imageUrls?.[selectedImageIndex] || currentDisplayFigure?.imageUrls?.[0] || '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-primary">
            <Dices className="w-7 h-7" />
            <h2 className="text-2xl font-serif font-bold text-on-surface">Sorteo Aleatorio de Figuras</h2>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1 max-w-2xl">
            Obtén una figura aleatoria de toda la base de datos. Cada figura seleccionada queda automáticamente marcada para no repetirse en futuros sorteos y podrás descargar su imagen en la máxima calidad original disponible.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleResetAllSelected}
            disabled={isResettingAll || isDrawing || alreadySelectedFigures.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              alreadySelectedFigures.length > 0
                ? 'border-error/40 text-error hover:bg-error/15 hover:border-error/60 shadow-sm cursor-pointer'
                : 'border-outline-variant/30 text-outline cursor-not-allowed opacity-50'
            }`}
            title="Restablecer todas las figuras a selectedInRandomDraw: false"
          >
            <RotateCcw className={`w-4 h-4 ${isResettingAll ? 'animate-spin' : ''}`} />
            <span>
              {isResettingAll 
                ? 'Restableciendo a false...' 
                : alreadySelectedFigures.length > 0 
                ? `Reiniciar Sorteo (${alreadySelectedFigures.length} a false)` 
                : 'Reiniciar Sorteo (0 marcadas)'}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics & Scope Selector Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-surface-container border border-outline-variant/30 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-xs text-on-surface-variant font-medium">Total en Base de Datos</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-serif font-bold text-on-surface">{allFigures.length}</span>
            <span className="text-[11px] text-outline font-medium">figuras registradas</span>
          </div>
        </div>

        <div className="bg-surface-container border border-primary/30 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary font-bold">Disponibles para Sorteo</span>
            <Sparkles className="w-4 h-4 text-primary opacity-80" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-serif font-bold text-primary">{availableFigures.length}</span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              {poolFigures.length > 0 ? `${Math.round((availableFigures.length / poolFigures.length) * 100)}% restante` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant/30 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Ya Seleccionadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-80" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-serif font-bold text-on-surface">{alreadySelectedFigures.length}</span>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-[11px] text-primary hover:underline font-semibold"
            >
              {showHistory ? 'Ocultar historial' : 'Ver historial'}
            </button>
          </div>
        </div>

        {/* Category Scope Selector */}
        <div className="bg-surface-container border border-outline-variant/30 p-4 rounded-2xl flex flex-col justify-between">
          <label htmlFor="franchise-scope-select" className="text-xs text-on-surface-variant font-medium">Ámbito de Sorteo</label>
          <div className="mt-1.5 relative">
            <select
              id="franchise-scope-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSelectedFigure(null);
              }}
              disabled={isDrawing}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-1.5 text-xs text-on-surface font-medium outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="all">🌐 Toda la Base de Datos ({allFigures.length})</option>
              {sortedCategories.map(cat => {
                const count = allFigures.filter(f => f.franchiseId === cat.id).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Main Action Stage */}
      <div className="bg-surface-container border border-outline-variant/40 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -right-24 -top-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto flex flex-col items-center text-center space-y-6 relative z-10">
          {/* Action Button & Reset Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={handleDrawRandomFigure}
              disabled={availableFigures.length === 0 || isDrawing || loading}
              className={`group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-base md:text-lg shadow-2xl transition-all duration-300 active:scale-95 ${
                availableFigures.length === 0
                  ? 'bg-surface-container-high text-outline cursor-not-allowed border border-outline-variant/30'
                  : isDrawing
                  ? 'bg-primary/80 text-on-primary animate-pulse'
                  : 'bg-primary text-on-primary hover:brightness-110 hover:shadow-primary/25 hover:scale-[1.02]'
              }`}
            >
              <Dices className={`w-6 h-6 transition-transform duration-500 ${isDrawing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span>
                {loading 
                  ? 'Cargando figuras...' 
                  : isDrawing 
                  ? 'Sorteando figura aleatoria...' 
                  : availableFigures.length === 0 
                  ? 'Todas las figuras fueron seleccionadas' 
                  : `Obtener Figura Aleatoria (${availableFigures.length} disponibles)`}
              </span>
              <Sparkles className="w-5 h-5 text-amber-200" />
            </button>

            {alreadySelectedFigures.length > 0 && (
              <button
                onClick={handleResetAllSelected}
                disabled={isResettingAll || isDrawing}
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold text-sm bg-surface-container border border-error/30 text-error hover:bg-error/10 hover:border-error/50 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                title="Restablece selectedInRandomDraw a false para todas las figuras"
              >
                <RotateCcw className={`w-4 h-4 ${isResettingAll ? 'animate-spin' : ''}`} />
                <span>
                  {isResettingAll ? 'Reiniciando...' : `Reiniciar (${alreadySelectedFigures.length} a false)`}
                </span>
              </button>
            )}
          </div>

          {availableFigures.length === 0 && !loading && (
            <div className="bg-surface-container-low border border-amber-500/30 p-4 rounded-2xl max-w-lg text-left space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <Flame className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-on-surface">¡Todas las figuras de este grupo ya fueron seleccionadas!</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Has completado el sorteo de todas las figuras registradas ({poolFigures.length}). Puedes reiniciar el sorteo para que todas vuelvan a estar disponibles o desmarcar figuras específicas desde el historial.
                  </p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetAllSelected}
                  disabled={isResettingAll}
                  className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isResettingAll ? 'Reiniciando...' : 'Reiniciar y Habilitar Todas'}
                </button>
              </div>
            </div>
          )}

          {/* Figure Display Area */}
          {(currentDisplayFigure || isDrawing) && (
            <div className="w-full mt-4 text-left border border-outline-variant/40 bg-surface-container-lowest rounded-3xl p-5 md:p-8 shadow-2xl space-y-6 transition-all animate-in fade-in duration-300">
              {/* Badge & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/40">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isDrawing ? 'Sorteando...' : '¡Figura Seleccionada!'}
                  </span>
                  {currentDisplayFigure?.numericId && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-surface-container-high text-on-surface border border-outline-variant/40">
                      {currentDisplayFigure.numericId}
                    </span>
                  )}
                </div>

                {!isDrawing && selectedFigure && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewModalOptions({ figure: selectedFigure, fullScreen: false, imageIndex: selectedImageIndex })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 transition-colors"
                      title="Ver información y detalles de la figura"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      Ver Detalle
                    </button>
                    <button
                      onClick={() => handleUnmarkFigure(selectedFigure.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-error hover:bg-error/10 border border-outline-variant/30 transition-colors"
                      title="Desmarcar esta figura para que pueda volver a salir"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Desmarcar
                    </button>
                  </div>
                )}
              </div>

              {/* Figure Layout: Image on Left/Top, Details on Right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Image Showcase Container */}
                <div className="md:col-span-6 space-y-3">
                  <div 
                    onClick={() => {
                      if (!isDrawing && selectedFigure) {
                        setPreviewModalOptions({
                          figure: selectedFigure,
                          fullScreen: true,
                          imageIndex: selectedImageIndex
                        });
                      }
                    }}
                    className={`relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-surface-container-low border border-outline-variant/30 flex items-center justify-center group shadow-inner transition-all ${
                      !isDrawing && selectedFigure 
                        ? 'cursor-pointer hover:border-primary/60 hover:shadow-primary/10 hover:shadow-lg' 
                        : ''
                    }`}
                    title={!isDrawing && selectedFigure ? "Toca para abrir en pantalla completa con zoom y paneo táctil" : undefined}
                  >
                    {currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        alt={currentDisplayFigure?.title || 'Figura seleccionada'}
                        className={`w-full h-full object-contain p-2 transition-transform duration-500 ${isDrawing ? 'scale-95 blur-[1px]' : 'group-hover:scale-105'}`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-outline gap-2 p-8 text-center">
                        <ImageIcon className="w-12 h-12 opacity-30" />
                        <span className="text-xs">Sin imagen disponible</span>
                      </div>
                    )}

                    {/* Quality watermark/tag */}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-300 border border-white/10 flex items-center gap-1 pointer-events-none">
                      <Sparkles className="w-3 h-3" />
                      Máxima Calidad HD
                    </div>

                    {/* Interactive Zoom pill overlay */}
                    {!isDrawing && selectedFigure && (
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-center pointer-events-none">
                        <div className="bg-surface-container-high/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-outline-variant/60 shadow-lg flex items-center gap-2 text-xs font-semibold text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-all">
                          <Maximize2 className="w-3.5 h-3.5 text-primary group-hover:text-on-primary" />
                          <span>Toca la imagen para Pantalla Completa & Zoom</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-image Thumbnails (if available) */}
                  {!isDrawing && selectedFigure && selectedFigure.imageUrls && selectedFigure.imageUrls.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                      {selectedFigure.imageUrls.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                            selectedImageIndex === idx
                              ? 'border-primary shadow-md scale-105'
                              : 'border-outline-variant/40 opacity-60 hover:opacity-100'
                          }`}
                          title={`Ver foto ${idx + 1}`}
                        >
                          <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details & Download Options */}
                <div className="md:col-span-6 space-y-5">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-on-surface">
                      {currentDisplayFigure?.title || 'Cargando título...'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-on-surface-variant">
                      {activeCategoryObj && (
                        <span className="bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/30">
                          {activeCategoryObj.name}
                        </span>
                      )}
                      {activeDesignerObj && (
                        <span className="bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/30">
                          Diseño: {activeDesignerObj.name}
                        </span>
                      )}
                      {currentDisplayFigure?.finish && (
                        <span className="bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/30">
                          {currentDisplayFigure.finish}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Technical specs */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
                    <div>
                      <span className="text-outline block">Estado:</span>
                      <span className="font-semibold text-on-surface capitalize">
                        {currentDisplayFigure?.status === 'disponible' ? 'En Stock' : currentDisplayFigure?.status === 'consultar' ? 'A Pedido' : 'Próximamente'}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block">Material:</span>
                      <span className="font-semibold text-on-surface">
                        {currentDisplayFigure?.material || 'Resina / Premium'}
                      </span>
                    </div>
                    {currentDisplayFigure?.scale && currentDisplayFigure.scale.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-outline block">Escala(s):</span>
                        <span className="font-semibold text-on-surface">
                          {currentDisplayFigure.scale.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Primary Download Button in Maximum Quality */}
                  {!isDrawing && selectedFigure && currentImageUrl && (
                    <div className="space-y-3 pt-2">
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-surface-container to-surface-container border border-primary/30 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-primary font-bold text-sm">
                            <Download className="w-4 h-4" />
                            <span>Descarga en Alta Resolución</span>
                          </div>
                          {downloadSuccess && (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                              <Check className="w-3.5 h-3.5" /> ¡Descarga iniciada!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Obtén el archivo original de la imagen sin pérdida de compresión para compartir en redes sociales, enviar a clientes o imprimir.
                        </p>

                        <button
                          onClick={() => handleDownloadImage(currentImageUrl, selectedImageIndex)}
                          disabled={!!downloadingImage}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Download className={`w-4 h-4 ${downloadingImage === currentImageUrl ? 'animate-bounce' : ''}`} />
                          <span>
                            {downloadingImage === currentImageUrl 
                              ? 'Procesando descarga HD...' 
                              : selectedFigure.imageUrls && selectedFigure.imageUrls.length > 1
                              ? `Descargar Foto Actual (${selectedImageIndex + 1}/${selectedFigure.imageUrls.length}) en Máxima Calidad`
                              : 'Descargar Imagen en Máxima Calidad (Original HD)'}
                          </span>
                        </button>
                      </div>

                      {/* Download all photos button if multiple */}
                      {selectedFigure.imageUrls && selectedFigure.imageUrls.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              if (!selectedFigure.imageUrls) return;
                              for (let i = 0; i < selectedFigure.imageUrls.length; i++) {
                                await handleDownloadImage(selectedFigure.imageUrls[i], i);
                                await new Promise(r => setTimeout(r, 400));
                              }
                            }}
                            className="w-full py-2 px-3 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center justify-center gap-2 transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            Descargar Todas las Fotos ({selectedFigure.imageUrls.length}) en HD
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Figures History Section */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-serif font-bold text-lg text-on-surface">
              Historial de Figuras Ya Seleccionadas ({alreadySelectedFigures.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Buscar en seleccionadas..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-1.5 text-xs text-on-surface placeholder:text-outline outline-none focus:border-primary w-full sm:w-48"
            />
            {alreadySelectedFigures.length > 0 && (
              <button
                onClick={handleResetAllSelected}
                disabled={isResettingAll || isDrawing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-error bg-error/10 hover:bg-error/20 border border-error/30 transition-colors disabled:opacity-50 cursor-pointer"
                title="Restablecer todas las figuras a selectedInRandomDraw: false"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingAll ? 'animate-spin' : ''}`} />
                <span>Restablecer todas a false</span>
              </button>
            )}
          </div>
        </div>

        {alreadySelectedFigures.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant space-y-2">
            <Dices className="w-10 h-10 mx-auto text-outline/40" />
            <p className="text-sm">Aún no se ha seleccionado ninguna figura.</p>
            <p className="text-xs text-outline">Presiona "Obtener Figura Aleatoria" arriba para iniciar el sorteo.</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant text-xs">
            No se encontraron figuras seleccionadas que coincidan con "{historySearch}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredHistory.map((fig) => {
              const coverImg = fig.imageUrls?.[0];
              const franchiseObj = categories.find(c => c.id === fig.franchiseId);
              const formattedDate = fig.selectedInRandomDrawAt?.toDate 
                ? fig.selectedInRandomDrawAt.toDate().toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })
                : 'Sorteada';

              return (
                <div
                  key={fig.id}
                  className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-3 flex items-center gap-3 hover:border-outline-variant/60 transition-all group"
                >
                  <div 
                    onClick={() => setPreviewModalOptions({ figure: fig, fullScreen: true, imageIndex: 0 })}
                    className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container-lowest flex-shrink-0 border border-outline-variant/20 relative cursor-pointer hover:border-primary/60 transition-colors"
                    title="Toca para ver en pantalla completa con zoom"
                  >
                    {coverImg ? (
                      <img src={coverImg} alt={fig.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline">
                        <ImageIcon className="w-5 h-5 opacity-40" />
                      </div>
                    )}
                  </div>

                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setPreviewModalOptions({ figure: fig, fullScreen: false, imageIndex: 0 })}
                    title="Ver detalle"
                  >
                    <div className="flex items-center gap-1.5">
                      {fig.numericId && (
                        <span className="text-[10px] font-mono font-bold text-primary">
                          {fig.numericId}
                        </span>
                      )}
                      <span className="text-[10px] text-outline truncate">
                        {franchiseObj?.name}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-on-surface truncate mt-0.5 group-hover:text-primary transition-colors" title={fig.title}>
                      {fig.title}
                    </h4>
                    <span className="text-[10px] text-outline block mt-0.5">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setPreviewModalOptions({ figure: fig, fullScreen: true, imageIndex: 0 })}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high hover:text-primary text-outline transition-colors"
                      title="Pantalla completa y zoom"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {coverImg && (
                      <button
                        onClick={() => handleDownloadImage(coverImg, 0)}
                        className="p-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-outline transition-colors"
                        title="Descargar imagen en calidad original HD"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleUnmarkFigure(fig.id)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-error/20 hover:text-error text-outline transition-colors"
                      title="Desmarcar figura (volver a incluir en el sorteo)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal and Full-screen Image Viewer with zoom/pan */}
      {previewModalOptions && (
        <ProductModal
          product={previewModalOptions.figure}
          categoryName={getCategoryBreadcrumb(previewModalOptions.figure.franchiseId, categories)}
          designerName={designers.find(d => d.id === previewModalOptions.figure.designerId)?.name}
          config={null}
          initialFullScreen={previewModalOptions.fullScreen}
          initialImageIndex={previewModalOptions.imageIndex}
          onClose={() => setPreviewModalOptions(null)}
        />
      )}
    </div>
  );
}
