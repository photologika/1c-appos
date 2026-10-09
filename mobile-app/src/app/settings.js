import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { saveConfig, getConfig } from '../api/apiClient';

export default function SettingsScreen() {
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const config = await getConfig();
      if (config.url) setUrl(config.url);
      if (config.username) setUsername(config.username);
      if (config.password) setPassword(config.password);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!url || !username || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    
    // Simple URL cleanup
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    
    try {
      await saveConfig(cleanUrl, username.trim(), password.trim());
      Alert.alert('Успех', 'Настройки сохранены');
      router.back();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>URL базы 1С (HTTP сервис):</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="http://192.168.1.50/ka2/hs/inventory_api"
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Пользователь 1С:</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder="Логин"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Пароль:</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Пароль"
        secureTextEntry
      />

      <View style={styles.buttonContainer}>
        <Button title="Сохранить" onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 30,
  }
});
