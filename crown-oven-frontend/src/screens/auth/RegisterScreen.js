import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { registerUser } from "../../services/authService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "", address: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sanitizeName = (value) => value.replace(/[0-9]/g, "");
  const sanitizePhone = (value) => value.replace(/\D/g, "");
  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    setError("");
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("First name, last name, email, and password are required");
      return;
    }
    if (/\d/.test(form.firstName) || /\d/.test(form.lastName)) {
      setError("First name and last name can contain letters only");
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser(form);
      await login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Crown Oven today</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.row}>
            <Input label="First Name" placeholder="First name" value={form.firstName} onChangeText={(v) => update("firstName", sanitizeName(v))} style={{ flex: 1, marginRight: 8 }} />
            <Input label="Last Name" placeholder="Last name" value={form.lastName} onChangeText={(v) => update("lastName", sanitizeName(v))} style={{ flex: 1 }} />
          </View>

          <Input label="Email" placeholder="Enter your email" value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" autoCapitalize="none" />

          <View>
            <Input label="Password" placeholder="Min 8 chars, uppercase, number, special" value={form.password} onChangeText={(v) => update("password", v)} secureTextEntry={!showPassword} />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          <Input label="Phone" placeholder="10 digit phone number" value={form.phone} onChangeText={(v) => update("phone", sanitizePhone(v))} keyboardType="phone-pad" maxLength={10} />

          <Input label="Address" placeholder="Your delivery address" value={form.address} onChangeText={(v) => update("address", v)} multiline numberOfLines={2} />

          <Button title="Register" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 12 },
  backBtn: { marginBottom: 16, padding: 4 },
  backText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.primary },
  title: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  subtitle: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, marginBottom: 20 },
  errorText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, backgroundColor: "#FDECEA", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  row: { flexDirection: "row" },
  eyeBtn: { position: "absolute", right: 14, top: 38, padding: 6 },
  eyeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.primary },
});


