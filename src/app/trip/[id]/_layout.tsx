import { Tabs, router } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/theme';

export default function TripLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const backButton = (
    <Pressable onPress={() => router.back()} style={{ marginLeft: 8, padding: 4 }}>
      <SymbolView name="chevron.left" size={22} tintColor="#007AFF" />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarLabelStyle: { fontSize: 10 },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerLeft: () => backButton,
      }}
    >
      <Tabs.Screen
        name="itinerario"
        options={{
          title: 'Giorni',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="calendar" size={size} tintColor={color} />
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
        name="metro"
        options={{
          title: 'Metro',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="tram" size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="info"
        options={{
          title: 'Info',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name="info.circle" size={size} tintColor={color} />
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
