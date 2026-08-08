import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export default function BigliettiScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={[styles.placeholder, { color: theme.textSecondary }]}>
        Biglietti — in arrivo nella Fase 4
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
  },
});
