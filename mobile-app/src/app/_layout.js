import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Главное меню' }} />
      <Stack.Screen name="settings" options={{ title: 'Настройки' }} />
      <Stack.Screen name="search" options={{ title: 'Поиск оборудования' }} />
      <Stack.Screen name="inventory-list" options={{ title: 'Документы инвентаризации' }} />
      <Stack.Screen name="inventory-scan" options={{ title: 'Сверка' }} />
    </Stack>
  );
}
