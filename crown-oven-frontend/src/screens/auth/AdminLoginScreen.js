import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import AuthPortalShell from "../../components/common/AuthPortalShell";

export default function AdminLoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser({ email, password, expectedRole: "admin" });
      await login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPortalShell
      accentColor={COLORS.charcoal}
      backLabel="Back to Customer Login"
      onBack={() => navigation.navigate("Login")}
      roleIcon="shield-checkmark"
      roleLabel="Admin Portal"
      title="Admin Login"
      subtitle="Access restaurant operations, staff management, reports, and order oversight from one secure portal."
      footer={(
        <View style={styles.contactArea}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.gray} />
          <Text style={styles.contactText}>Contact admin to create an account</Text>
        </View>
      )}
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Input label="Email" placeholder="Enter admin email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <View>
        <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} style={{ marginTop: 8 }} />
    </AuthPortalShell>
  );
}

const styles = StyleSheet.create({
  errorText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, backgroundColor: "#FDECEA", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  eyeBtn: { position: "absolute", right: 14, top: 38, padding: 6 },
  eyeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  contactArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4, gap: 6 },
  contactText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
});
