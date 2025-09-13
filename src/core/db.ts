import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'BlackWireDB';
const DB_VERSION = 1;
const CHUNK_STORE_NAME = 'file-chunks';

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
      db.createObjectStore(CHUNK_STORE_NAME);
    },
  });
  return dbPromise;
};

export const addChunk = async (fileName: string, chunkIndex: number, data: ArrayBuffer) => {
  const db = await getDb();
  const key = `${fileName}-${chunkIndex}`;
  await db.put(CHUNK_STORE_NAME, data, key);
};

export const getChunk = async (fileName: string, chunkIndex: number): Promise<ArrayBuffer | undefined> => {
    const db = await getDb();
    const key = `${fileName}-${chunkIndex}`;
    return db.get(CHUNK_STORE_NAME, key);
};


export const getReceivedChunkIndexes = async (fileName: string): Promise<number[]> => {
  const db = await getDb();
  const allKeys = await db.getAllKeys(CHUNK_STORE_NAME);
  
  const relevantKeys = allKeys.filter(key => key.startsWith(`${fileName}-`));
  
  const indexes = relevantKeys.map(key => parseInt(key.split('-').pop() || 'NaN')).filter(index => !isNaN(index));
  
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

  const keys = await store.getAllKeys();
  const fileKeys = keys.filter(key => key.startsWith(`${fileName}-`));

  await Promise.all(fileKeys.map(key => store.delete(key)));
  
  await transaction.done;
  console.log(`Cleared all chunks for ${fileName}`);
};
