import { Tabs, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/theme';

export default function TripLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="itinerario"
        options={{
          title: 'Itinerario',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="calendar" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Info',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="airplane" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mappa"
        options={{
          title: 'Mappa',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="map" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="biglietti"
        options={{
          title: 'Biglietti',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="ticket" size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
