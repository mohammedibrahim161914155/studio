import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'BlackWireDB';
const DB_VERSION = 1;
const CHUNK_STORE_NAME = 'file-chunks';
const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

interface BlackWireDB extends DBSchema {
  [CHUNK_STORE_NAME]: {
    key: string; // Composite key: `${fileName}-${chunkIndex}`
    value: ArrayBuffer;
  };
}

let dbPromise: Promise<IDBPDatabase<BlackWireDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<BlackWireDB>> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<BlackWireDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CHUNK_STORE_NAME)) {
        db.createObjectStore(CHUNK_STORE_NAME);
      }
    },
  });
  return dbPromise;
};

export const addChunk = async (fileName: string, chunkIndex: number, data: ArrayBuffer) => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const db = await getDb();
      const key = `${fileName}-${chunkIndex}`;
      await db.put(CHUNK_STORE_NAME, data, key);
      return; // Success
    } catch (error) {
      console.error(`Attempt ${i + 1} to add chunk ${chunkIndex} for ${fileName} failed.`, error);
      if (i === MAX_RETRIES - 1) {
        throw new Error(`Failed to add chunk ${chunkIndex} for ${fileName} after ${MAX_RETRIES} attempts.`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
};


export const getChunk = async (fileName: string, chunkIndex: number): Promise<ArrayBuffer | undefined> => {
    const db = await getDb();
    const key = `${fileName}-${chunkIndex}`;
    return db.get(CHUNK_STORE_NAME, key);
};


export const getReceivedChunkIndexes = async (fileName: string): Promise<number[]> => {
  const db = await getDb();
  const allKeys = await db.getAllKeys(CHUNK_STORE_NAME);
  
  const relevantKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith(`${fileName}-`));
  
  const indexes = relevantKeys.map(key => parseInt((key as string).split('-').pop() || 'NaN')).filter(index => !isNaN(index));
  
  return indexes.sort((a, b) => a - b);
};

export const getFileChunks = async (fileName: string, totalChunks: number): Promise<(ArrayBuffer | undefined)[]> => {
    const db = await getDb();
    const transaction = db.transaction(CHUNK_STORE_NAME, 'readonly');
    const store = transaction.objectStore(CHUNK_STORE_NAME);
    const chunks: (ArrayBuffer | undefined)[] = new Array(totalChunks);

    const keys = Array.from({ length: totalChunks }, (_, i) => `${fileName}-${i}`);
    
    await Promise.all(keys.map(async (key, index) => {
        chunks[index] = await store.get(key);
    }));

    await transaction.done;
    return chunks;
}


export const clearFileChunks = async (fileName: string) => {
  const db = await getDb();
  const transaction = db.transaction(CHUNK_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(CHUNK_STORE_NAME);

  let cursor = await store.openCursor();
  while(cursor) {
    if ((cursor.key as string).startsWith(`${fileName}-`)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  
  await transaction.done;
  console.log(`Cleared all chunks for ${fileName}`);
};
