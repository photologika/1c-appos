import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const KEYS = {
  URL: '1C_API_URL',
  USERNAME: '1C_USERNAME',
  PASSWORD: '1C_PASSWORD',
};

export const saveConfig = async (url, username, password) => {
  await SecureStore.setItemAsync(KEYS.URL, url);
  await SecureStore.setItemAsync(KEYS.USERNAME, username);
  await SecureStore.setItemAsync(KEYS.PASSWORD, password);
};

export const getConfig = async () => {
  const url = await SecureStore.getItemAsync(KEYS.URL);
  const username = await SecureStore.getItemAsync(KEYS.USERNAME);
  const password = await SecureStore.getItemAsync(KEYS.PASSWORD);
  return { url, username, password };
};

export const createApiClient = async () => {
  const config = await getConfig();
  
  if (!config.url || !config.username || !config.password) {
    throw new Error('Настройки подключения не заданы');
  }

  return axios.create({
    baseURL: config.url,
    auth: {
      username: config.username,
      password: config.password
    },
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000,
  });
};

export const api = {
  searchOS: async (query) => {
    const client = await createApiClient();
    const response = await client.get(`/os/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
  
  getInventoryList: async () => {
    const client = await createApiClient();
    const response = await client.get('/inventory/list');
    return response.data;
  },
  
  syncInventory: async (documentId, scannedItems) => {
    const client = await createApiClient();
    const response = await client.post('/inventory/sync', {
      documentId,
      scannedItems
    });
    return response.data;
  }
};
