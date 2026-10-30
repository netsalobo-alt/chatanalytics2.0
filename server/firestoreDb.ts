import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { ChatwootConfig, InvestmentRecord, LeadRecord } from './types.ts';

try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if already set
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

export function getRemoteFirestore() {
  if (firestoreDb) return firestoreDb;
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      const existingApps = getApps();
      const app = existingApps.find(a => a.name === 'server-firestore') || initializeApp(config, 'server-firestore');
      firestoreDb = getFirestore(app, config.firestoreDatabaseId || '(default)');
      return firestoreDb;
    }
  } catch (err: any) {
    console.warn('[FirestorePersistence] Falha ao inicializar conexão Firestore:', err.message);
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export async function loadAppDataFromFirestore(): Promise<{
  config?: Partial<ChatwootConfig>;
  investments?: InvestmentRecord[];
  leads?: Record<string, LeadRecord>;
} | null> {
  const db = getRemoteFirestore();
  if (!db) return null;

  try {
    const fetchPromises = Promise.all([
      getDoc(doc(db, 'app_data', 'config')).catch(() => null),
      getDoc(doc(db, 'app_data', 'investments')).catch(() => null),
      getDoc(doc(db, 'app_data', 'leads')).catch(() => null)
    ]);

    const snaps = await withTimeout(fetchPromises, 4000, [null, null, null]);
    const [configSnap, investmentsSnap, leadsSnap] = snaps;

    const result: {
      config?: Partial<ChatwootConfig>;
      investments?: InvestmentRecord[];
      leads?: Record<string, LeadRecord>;
    } = {};

    let hasAnyData = false;

    if (configSnap && configSnap.exists()) {
      result.config = configSnap.data() as Partial<ChatwootConfig>;
      hasAnyData = true;
    }

    if (investmentsSnap && investmentsSnap.exists()) {
      const data = investmentsSnap.data();
      result.investments = Array.isArray(data?.items) ? data.items : [];
      hasAnyData = true;
    }

    if (leadsSnap && leadsSnap.exists()) {
      const data = leadsSnap.data();
      result.leads = data?.items && typeof data.items === 'object' ? data.items : {};
      hasAnyData = true;
    }

    if (hasAnyData) {
      console.log('[FirestorePersistence] Dados restaurados com sucesso do Firestore!');
      return result;
    }
  } catch (err: any) {
    console.warn('[FirestorePersistence] Erro ao carregar dados do Firestore:', err.message);
  }

  return null;
}

function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      clean[key] = typeof val === 'object' && val !== null ? cleanUndefined(val) : val;
    }
  }
  return clean as T;
}

export async function saveConfigToFirestore(config: ChatwootConfig): Promise<boolean> {
  const db = getRemoteFirestore();
  if (!db) return false;

  try {
    const cleanConfig = cleanUndefined(config);
    const savePromise = setDoc(doc(db, 'app_data', 'config'), {
      ...cleanConfig,
      _persisted_at: new Date().toISOString()
    }).then(() => true).catch(() => false);
    return await withTimeout(savePromise, 4000, false);
  } catch (err: any) {
    console.warn('[FirestorePersistence] Erro ao persistir config:', err.message);
    return false;
  }
}

export async function saveInvestmentsToFirestore(investments: InvestmentRecord[]): Promise<boolean> {
  const db = getRemoteFirestore();
  if (!db) return false;

  try {
    const cleanInvestments = cleanUndefined(investments || []);
    const savePromise = setDoc(doc(db, 'app_data', 'investments'), {
      items: cleanInvestments,
      _persisted_at: new Date().toISOString()
    }).then(() => true).catch(() => false);
    return await withTimeout(savePromise, 4000, false);
  } catch (err: any) {
    console.warn('[FirestorePersistence] Erro ao persistir investimentos:', err.message);
    return false;
  }
}

export async function saveLeadsToFirestore(leads: Record<string, LeadRecord>): Promise<boolean> {
  const db = getRemoteFirestore();
  if (!db) return false;

  try {
    const cleanLeads = cleanUndefined(leads || {});
    const savePromise = setDoc(doc(db, 'app_data', 'leads'), {
      items: cleanLeads,
      _count: Object.keys(cleanLeads).length,
      _persisted_at: new Date().toISOString()
    }).then(() => true).catch(() => false);
    return await withTimeout(savePromise, 4000, false);
  } catch (err: any) {
    console.warn('[FirestorePersistence] Erro ao persistir leads:', err.message);
    return false;
  }
}

export async function saveAllAppDataToFirestore(data: {
  config: ChatwootConfig;
  investments: InvestmentRecord[];
  leads: Record<string, LeadRecord>;
}): Promise<boolean> {
  try {
    const resConfig = await saveConfigToFirestore(data.config);
    const resInv = await saveInvestmentsToFirestore(data.investments);
    const resLeads = await saveLeadsToFirestore(data.leads);
    return resConfig && resInv && resLeads;
  } catch (err: any) {
    console.warn('[FirestorePersistence] Erro ao salvar tudo no Firestore:', err.message);
    return false;
  }
}
