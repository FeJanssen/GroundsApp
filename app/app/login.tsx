import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/state/AppContext';
import { colors, radius, spacing } from '../src/theme';

export default function Login() {
  const { signInEmail, registerEmail } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const notifySoon = () => {
    const msg = 'Apple/Google-Login kommt bald – nutze bis dahin E-Mail.';
    if (Platform.OS === 'web') window.alert(msg);
  };

  const go = async () => {
    setError('');
    if (!email || !password) return setError('Bitte E-Mail und Passwort angeben.');
    if (mode === 'register' && !name) return setError('Bitte deinen Namen angeben.');
    setBusy(true);
    try {
      if (mode === 'login') await signInEmail(email, password);
      else await registerEmail(name, email, password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setError(
        msg.includes('401') ? 'E-Mail oder Passwort falsch.'
        : msg.includes('bereits registriert') || msg.includes('400') ? 'Diese E-Mail ist bereits registriert.'
        : 'Fehler bei der Anmeldung. Versuche es erneut.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bg, '#141A20', colors.bg]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <View style={s.logoBadge}>
              <Ionicons name="tennisball" size={34} color={colors.bg} />
            </View>
            <Text style={s.logo}>JKB <Text style={{ color: colors.primary }}>GROUNDS</Text></Text>
            <Text style={s.tagline}>Buche Tennis, Padel, Friseur & mehr – in Sekunden.</Text>
          </View>

          <Pressable style={[s.oauthBtn, { backgroundColor: '#fff' }]} onPress={notifySoon}>
            <Ionicons name="logo-apple" size={20} color="#000" />
            <Text style={[s.oauthText, { color: '#000' }]}>Mit Apple fortfahren</Text>
          </Pressable>

          <Pressable style={[s.oauthBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={notifySoon}>
            <Ionicons name="logo-google" size={19} color="#fff" />
            <Text style={s.oauthText}>Mit Google fortfahren</Text>
          </Pressable>

          <View style={s.dividerRow}>
            <View style={s.divider} />
            <Text style={s.dividerText}>oder mit E-Mail</Text>
            <View style={s.divider} />
          </View>

          {mode === 'register' && (
            <TextInput
              style={s.input} placeholder="Name" placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName}
            />
          )}
          <TextInput
            style={s.input} placeholder="E-Mail" placeholderTextColor={colors.textMuted}
            autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
          />
          <TextInput
            style={s.input} placeholder="Passwort" placeholderTextColor={colors.textMuted}
            secureTextEntry value={password} onChangeText={setPassword}
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Pressable style={[s.primaryBtn, busy && { opacity: 0.6 }]} onPress={go} disabled={busy}>
            <Text style={s.primaryBtnText}>
              {busy ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </Text>
          </Pressable>

          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
            <Text style={s.switchText}>
              {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {mode === 'login' ? 'Jetzt registrieren' : 'Zum Login'}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, maxWidth: 440, width: '100%', alignSelf: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logo: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  tagline: { color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' },
  oauthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: radius.md, marginBottom: spacing.sm + 4 },
  oauthText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, marginHorizontal: spacing.sm, fontSize: 13 },
  input: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 52, paddingHorizontal: spacing.md, color: colors.text, marginBottom: spacing.sm + 4, fontSize: 16 },
  primaryBtn: { backgroundColor: colors.primary, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  primaryBtnText: { color: colors.bg, fontSize: 16, fontWeight: '800' },
  switchText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center', marginBottom: spacing.sm },
});
