import { Redirect } from 'expo-router';
import { useApp } from '../src/state/AppContext';

export default function Index() {
  const { user } = useApp();
  return <Redirect href={user ? '/(tabs)/home' : '/login'} />;
}
