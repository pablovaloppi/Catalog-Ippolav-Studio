import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebaseAuth';

export const EXCLUDED_IPS_DOC = 'analytics_exclusions';
export const EXCLUDED_IPS_CACHE_KEY = 'ippolav_excluded_ips_cache';
export const CLIENT_IP_CACHE_KEY = 'ippolav_client_ip_cache';

let cachedClientIp: string | null = null;
let cachedExcludedIps: string[] = [];
let cachedIpLabels: Record<string, string> = {};
let isListenerActive = false;

// Intentar cargar caché local de inmediato
if (typeof window !== 'undefined') {
  try {
    const storedIp = sessionStorage.getItem(CLIENT_IP_CACHE_KEY) || localStorage.getItem(CLIENT_IP_CACHE_KEY);
    if (storedIp) cachedClientIp = storedIp;

    const storedList = localStorage.getItem(EXCLUDED_IPS_CACHE_KEY);
    if (storedList) cachedExcludedIps = JSON.parse(storedList);
  } catch {}
}

/**
 * Obtiene la dirección IP pública del cliente actual de forma segura y rápida con múltiples fallbacks.
 */
export async function getClientIp(): Promise<string | null> {
  if (cachedClientIp) return cachedClientIp;

  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(CLIENT_IP_CACHE_KEY);
    if (stored) {
      cachedClientIp = stored;
      return stored;
    }
  } catch {}

  const endpoints = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ipapi.co/json/'
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const ip = (data.ip || data.query || '').trim();
        if (ip && /^([0-9a-fA-F:.]+)$/.test(ip)) {
          cachedClientIp = ip;
          try {
            sessionStorage.setItem(CLIENT_IP_CACHE_KEY, ip);
            localStorage.setItem(CLIENT_IP_CACHE_KEY, ip);
          } catch {}
          return ip;
        }
      }
    } catch {}
  }

  return cachedClientIp;
}

/**
 * Inicia la sincronización en tiempo real de la lista de IPs excluidas desde Firestore.
 */
export function initIpExclusionsListener(onUpdate?: (ips: string[], labels: Record<string, string>) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Obtener la IP del cliente en segundo plano
  getClientIp().catch(() => {});

  const docRef = doc(db, 'config', EXCLUDED_IPS_DOC);
  
  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      cachedExcludedIps = Array.isArray(data.excludedIps) ? data.excludedIps : [];
      cachedIpLabels = (data.ipLabels && typeof data.ipLabels === 'object') ? data.ipLabels : {};
    } else {
      cachedExcludedIps = [];
      cachedIpLabels = {};
    }

    try {
      localStorage.setItem(EXCLUDED_IPS_CACHE_KEY, JSON.stringify(cachedExcludedIps));
    } catch {}

    if (onUpdate) {
      onUpdate(cachedExcludedIps, cachedIpLabels);
    }
  }, (err) => {
    console.warn('Error escuchando exclusión de IPs:', err);
  });

  isListenerActive = true;
  return unsubscribe;
}

/**
 * Obtiene directamente la lista de IPs excluidas desde Firestore.
 */
export async function fetchExcludedIps(): Promise<{ excludedIps: string[]; ipLabels: Record<string, string> }> {
  try {
    const docRef = doc(db, 'config', EXCLUDED_IPS_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const ips = Array.isArray(data.excludedIps) ? data.excludedIps : [];
      const labels = (data.ipLabels && typeof data.ipLabels === 'object') ? data.ipLabels : {};
      cachedExcludedIps = ips;
      cachedIpLabels = labels;
      try {
        localStorage.setItem(EXCLUDED_IPS_CACHE_KEY, JSON.stringify(ips));
      } catch {}
      return { excludedIps: ips, ipLabels: labels };
    }
  } catch (err) {
    console.warn('Error cargando lista de IPs excluidas:', err);
  }
  return { excludedIps: cachedExcludedIps, ipLabels: cachedIpLabels };
}

/**
 * Agrega una IP a la lista de exclusión en Firestore.
 */
export async function addExcludedIp(ip: string, label: string = 'Dispositivo Administrador'): Promise<boolean> {
  const cleanIp = ip.trim();
  if (!cleanIp) return false;

  try {
    const current = await fetchExcludedIps();
    const newIps = Array.from(new Set([...current.excludedIps, cleanIp]));
    const newLabels = { ...current.ipLabels, [cleanIp]: label || 'Dispositivo Administrador' };

    const docRef = doc(db, 'config', EXCLUDED_IPS_DOC);
    await setDoc(docRef, {
      excludedIps: newIps,
      ipLabels: newLabels,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    cachedExcludedIps = newIps;
    cachedIpLabels = newLabels;
    try {
      localStorage.setItem(EXCLUDED_IPS_CACHE_KEY, JSON.stringify(newIps));
    } catch {}
    return true;
  } catch (err) {
    console.error('Error agregando IP a exclusión:', err);
    throw err;
  }
}

/**
 * Elimina una IP de la lista de exclusión en Firestore.
 */
export async function removeExcludedIp(ip: string): Promise<boolean> {
  const cleanIp = ip.trim();
  if (!cleanIp) return false;

  try {
    const current = await fetchExcludedIps();
    const newIps = current.excludedIps.filter((item) => item !== cleanIp);
    const newLabels = { ...current.ipLabels };
    delete newLabels[cleanIp];

    const docRef = doc(db, 'config', EXCLUDED_IPS_DOC);
    await setDoc(docRef, {
      excludedIps: newIps,
      ipLabels: newLabels,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    cachedExcludedIps = newIps;
    cachedIpLabels = newLabels;
    try {
      localStorage.setItem(EXCLUDED_IPS_CACHE_KEY, JSON.stringify(newIps));
    } catch {}
    return true;
  } catch (err) {
    console.error('Error eliminando IP de exclusión:', err);
    throw err;
  }
}

/**
 * Verifica de forma síncrona/rápida si el cliente actual debe ser ignorado por IP o Auth.
 */
export function isClientIpOrAuthExcluded(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Si el administrador está autenticado actualmente con Firebase Auth
  try {
    const currentUser = auth.currentUser;
    if (currentUser?.email && currentUser.email.toLowerCase() === 'pablovaloppi@gmail.com') {
      return true;
    }
  } catch {}

  // 2. Si la IP del cliente coincide con alguna IP en la lista de exclusión
  if (cachedClientIp && cachedExcludedIps.length > 0) {
    if (cachedExcludedIps.includes(cachedClientIp)) {
      return true;
    }
  }

  // 3. Revisar caché en sessionStorage
  try {
    const currentIp = sessionStorage.getItem(CLIENT_IP_CACHE_KEY);
    if (currentIp && cachedExcludedIps.includes(currentIp)) {
      return true;
    }
  } catch {}

  return false;
}
