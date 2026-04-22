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

export default function LoginScreen({ navigation }) {
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
      const res = await loginUser({ email, password, expectedRole: "customer" });
      await login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPortalShell
      accentColor={COLORS.primary}
      roleIcon="person-outline"
      roleLabel="Customer Portal"
      title="Welcome Back"
      subtitle="Sign in to continue your Crown Oven journey with fast ordering, tracking, and dining access."
      footer={(
        <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.linkArea}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
        </TouchableOpacity>
      )}
      bottomSlot={(
        <View>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Other Portals</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.portalRow}>
            <TouchableOpacity onPress={() => navigation.navigate("AdminLogin")} style={styles.portalBtn} activeOpacity={0.8}>
              <View style={[styles.portalIconWrap, { backgroundColor: COLORS.black + "12" }]}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.black} />
              </View>
              <View>
                <Text style={styles.portalLabel}>Admin Login</Text>
                <Text style={styles.portalCaption}>Management access</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("RiderLogin")} style={styles.portalBtn} activeOpacity={0.8}>
              <View style={[styles.portalIconWrap, { backgroundColor: COLORS.riderRed + "12" }]}>
                <Ionicons name="bicycle" size={18} color={COLORS.riderRed} />
              </View>
              <View>
                <Text style={styles.portalLabel}>Rider Login</Text>
                <Text style={styles.portalCaption}>Staff delivery access</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Input label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <View>
        <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      <Button title="Login" onPress={handleLogin} loading={loading} style={{ marginTop: 8 }} />
    </AuthPortalShell>
  );
}

const styles = StyleSheet.create({
  errorText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, backgroundColor: "#FDECEA", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  eyeBtn: { position: "absolute", right: 14, top: 38, padding: 6 },
  eyeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.primary },
  linkArea: { alignItems: "center", padding: 8 },
  linkText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal },
  linkBold: { fontFamily: FONTS.heading, color: COLORS.primary },
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lightGray },
  dividerText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.gray, marginHorizontal: 12 },
  portalRow: { marginTop: 16, gap: 12 },
  portalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  portalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  portalLabel: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  portalCaption: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray, marginTop: 2 },
});
