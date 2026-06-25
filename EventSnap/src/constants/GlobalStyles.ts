import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background, 
    padding: 24,
  },
  title: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8F6F5',
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#1E8C86',
    fontWeight: '800',
    fontSize: 18,
  }
});