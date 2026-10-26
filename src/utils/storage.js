import { NativeModules } from 'react-native';

const { LocalStorageModule } = NativeModules;

const inMemoryStore = new Map();

export async function setStorageItem(key, value) {
  try {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);
    if (LocalStorageModule && LocalStorageModule.setItem) {
      await LocalStorageModule.setItem(key, stringVal);
    } else {
      inMemoryStore.set(key, stringVal);
    }
  } catch (e) {
    console.warn('Storage set error:', e);
  }
}

export async function getStorageItem(key, defaultValue = null) {
  try {
    if (LocalStorageModule && LocalStorageModule.getItem) {
      const val = await LocalStorageModule.getItem(key);
      if (val !== null && val !== undefined) {
        return val;
      }
    } else if (inMemoryStore.has(key)) {
      return inMemoryStore.get(key);
    }
  } catch (e) {
    console.warn('Storage get error:', e);
  }
  return defaultValue;
}

export async function removeStorageItem(key) {
  try {
    if (LocalStorageModule && LocalStorageModule.removeItem) {
      await LocalStorageModule.removeItem(key);
    } else {
      inMemoryStore.delete(key);
    }
  } catch (e) {
    console.warn('Storage remove error:', e);
  }
}
