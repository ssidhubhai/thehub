import { mockDb } from './mock/mockDb';
import { db } from './config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Connection } from '@/types/common';
import { ProjectInterest } from '@/types/project';

export interface DbService {
  get<T extends { id: string }>(collName: string, id: string): Promise<T | null>;
  list<T>(collName: string, filterFn?: (item: T) => boolean): Promise<T[]>;
  set<T extends { id: string }>(collName: string, id: string, data: T): Promise<void>;
  create<T extends Record<string, any> = Record<string, any>>(
    collName: string,
    data: Partial<T> | Record<string, any>
  ): Promise<T & { id: string }>;
  update<T extends { id: string }>(collName: string, id: string, partial: Partial<T>): Promise<void>;
  delete(collName: string, id: string): Promise<void>;
  subscribe(collName: string, callback: () => void): () => void;
  resetDatabase(): void;

  // Dedicated action mock handlers supporting POST requests
  connect(senderId: string, recipientId: string): Promise<Connection>;
  acceptConnection(connectionId: string, recipientId?: string): Promise<Connection>;
  declineConnection(connectionId: string, recipientId?: string): Promise<void>;
  pitchProject(projectId: string, userId: string, message?: string): Promise<ProjectInterest>;
  expressInterest(projectId: string, userId: string, message?: string): Promise<ProjectInterest>;
}

class UnifiedDbService implements DbService {
  async get<T extends { id: string }>(collName: string, id: string): Promise<T | null> {
    if (db) {
      try {
        const docRef = doc(db, collName, id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() } as T;
        }
      } catch (err) {
        console.warn(`[Firestore get ${collName}/${id}] fallback:`, err);
      }
    }
    return mockDb.get<T>(collName, id);
  }

  async list<T>(collName: string, filterFn?: (item: T) => boolean): Promise<T[]> {
    if (db) {
      try {
        const colRef = collection(db, collName);
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
          return filterFn ? items.filter(filterFn) : items;
        }
      } catch (err) {
        console.warn(`[Firestore list ${collName}] fallback:`, err);
      }
    }
    return mockDb.list<T>(collName, filterFn);
  }

  async set<T extends { id: string }>(collName: string, id: string, data: T): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, collName, id);
        await setDoc(docRef, data, { merge: true });
      } catch (err) {
        console.warn(`[Firestore set ${collName}/${id}] fallback:`, err);
      }
    }
    await mockDb.set<T>(collName, id, data);
  }

  async create<T extends Record<string, any> = Record<string, any>>(
    collName: string,
    data: Partial<T> | Record<string, any>
  ): Promise<T & { id: string }> {
    const id = data.id || `${collName.slice(0, 4)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullData = { ...data, id } as T & { id: string };

    if (db) {
      try {
        const docRef = doc(db, collName, id);
        await setDoc(docRef, fullData);
      } catch (err) {
        console.warn(`[Firestore create ${collName}] fallback:`, err);
      }
    }
    return mockDb.create<T>(collName, fullData);
  }

  async update<T extends { id: string }>(collName: string, id: string, partial: Partial<T>): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, collName, id);
        await updateDoc(docRef, partial as Record<string, any>);
      } catch (err) {
        console.warn(`[Firestore update ${collName}/${id}] fallback:`, err);
      }
    }
    await mockDb.update<T>(collName, id, partial);
  }

  async delete(collName: string, id: string): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, collName, id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn(`[Firestore delete ${collName}/${id}] fallback:`, err);
      }
    }
    await mockDb.delete(collName, id);
  }

  subscribe(collName: string, callback: () => void): () => void {
    if (db) {
      try {
        const colRef = collection(db, collName);
        const unsubscribe = onSnapshot(
          colRef,
          () => {
            callback();
          },
          (err) => {
            console.warn(`[Firestore subscribe ${collName}] error:`, err);
          }
        );
        return unsubscribe;
      } catch (err) {
        console.warn(`[Firestore subscribe ${collName}] fallback:`, err);
      }
    }
    return mockDb.subscribe(collName, callback);
  }

  resetDatabase(): void {
    mockDb.resetToSeed();
  }

  async connect(senderId: string, recipientId: string): Promise<Connection> {
    return mockDb.connect(senderId, recipientId);
  }

  async acceptConnection(connectionId: string, recipientId?: string): Promise<Connection> {
    return mockDb.acceptConnection(connectionId, recipientId);
  }

  async declineConnection(connectionId: string, recipientId?: string): Promise<void> {
    return mockDb.declineConnection(connectionId, recipientId);
  }

  async pitchProject(projectId: string, userId: string, message?: string): Promise<ProjectInterest> {
    return mockDb.pitchProject(projectId, userId, message);
  }

  async expressInterest(projectId: string, userId: string, message?: string): Promise<ProjectInterest> {
    return mockDb.expressInterest(projectId, userId, message);
  }
}

export const dbService = new UnifiedDbService();
