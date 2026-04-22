# Role-Based Login Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate the single login screen into 3 role-specific login pages (Customer, Admin, Rider) with backend role validation.

**Architecture:** Add `expectedRole` to the backend login endpoint for server-side role enforcement. Create two new login screens (Admin, Rider) with distinct themes. Modify customer login to include navigation links to other portals.

**Tech Stack:** React Native (Expo), Express.js, Ionicons, existing Button/Input/Logo components.

---

### Task 1: Backend — Add Role Validation to Login Endpoint

**Files:**
- Modify: `crown-oven-backend/controllers/authController.js:90-122`

**Step 1: Add expectedRole validation to login function**

In `authController.js`, modify the `login` function. After the password check (line 109) and before building the token (line 112), add role validation:

```javascript
// POST /api/auth/login — Login for both customer and admin
export async function login(req, res) {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Contact admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Backend-enforced role validation
    if (expectedRole && user.role !== expectedRole) {
      const portalName = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      return res.status(403).json({
        message: `This is a ${portalName} account. Please use the ${portalName} Login.`,
      });
    }

    const payload = buildTokenPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({ message: "Login successful", token, user: payload });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
}
```

**Step 2: Test manually**

```bash
cd crown-oven-backend
npm start
```

Test with curl or Postman:
- Login with admin credentials + `expectedRole: "customer"` → should get 403
- Login with admin credentials + `expectedRole: "admin"` → should succeed
- Login without `expectedRole` → should succeed (backward compatible)

---

### Task 2: Frontend — Add Rider Red Color

**Files:**
- Modify: `crown-oven-frontend/src/constants/colors.js:1-14`

**Step 1: Add riderRed to COLORS**

```javascript
const COLORS = {
  primary: "#DAA520",
  black: "#1A1A1A",
  accent: "#E8732A",
  charcoal: "#2D2D2D",
  background: "#FAF8F5",
  white: "#FFFFFF",
  gray: "#9E9E9E",
  lightGray: "#F0F0F0",
  success: "#2E7D32",
  error: "#C62828",
  riderRed: "#C62828",
};

export default COLORS;
```

---

### Task 3: Frontend — Create AdminLoginScreen

**Files:**
- Create: `crown-oven-frontend/src/screens/auth/AdminLoginScreen.js`

**Step 1: Create the AdminLoginScreen**

```jsx
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import Input from "../../components/common/Input";

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Customer Login</Text>
          </TouchableOpacity>

          <View style={styles.iconArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={40} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.black} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Admin Login</Text>
            </View>
            <Text style={styles.subtitle}>Restaurant management portal</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Input label="Email" placeholder="Enter admin email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <View>
              <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.7} style={styles.loginBtn}>
              {loading ? (
                <Text style={styles.loginBtnText}>Logging in...</Text>
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.contactArea}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.gray} />
            <Text style={styles.contactText}>Contact admin to create an account</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  backBtn: { position: "absolute", top: 0, left: 0, padding: 4 },
  backText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black },
  iconArea: { alignItems: "center", marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.black, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderTopWidth: 3, borderTopColor: COLORS.black },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  subtitle: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, marginBottom: 20 },
  errorText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, backgroundColor: "#FDECEA", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  eyeBtn: { position: "absolute", right: 14, top: 38, padding: 6 },
  eyeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.black },
  loginBtn: { height: 50, borderRadius: 12, backgroundColor: COLORS.black, justifyContent: "center", alignItems: "center", marginTop: 8 },
  loginBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: COLORS.white },
  contactArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24, gap: 6 },
  contactText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
});
```

---

### Task 4: Frontend — Create RiderLoginScreen

**Files:**
- Create: `crown-oven-frontend/src/screens/auth/RiderLoginScreen.js`

**Step 1: Create the RiderLoginScreen**

```jsx
import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import Input from "../../components/common/Input";

export default function RiderLoginScreen({ navigation }) {
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
      const res = await loginUser({ email, password, expectedRole: "rider" });
      await login(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Customer Login</Text>
          </TouchableOpacity>

          <View style={styles.iconArea}>
            <View style={styles.iconCircle}>
              <Ionicons name="bicycle" size={40} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Ionicons name="bicycle" size={24} color={COLORS.riderRed} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Rider Login</Text>
            </View>
            <Text style={styles.subtitle}>Delivery rider portal</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Input label="Email" placeholder="Enter rider email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <View>
              <Input label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.7} style={styles.loginBtn}>
              {loading ? (
                <Text style={styles.loginBtnText}>Logging in...</Text>
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.contactArea}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.gray} />
            <Text style={styles.contactText}>Contact admin to create an account</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  backBtn: { position: "absolute", top: 0, left: 0, padding: 4 },
  backText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.riderRed },
  iconArea: { alignItems: "center", marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.riderRed, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderTopWidth: 3, borderTopColor: COLORS.riderRed },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  subtitle: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, marginBottom: 20 },
  errorText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, backgroundColor: "#FDECEA", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  eyeBtn: { position: "absolute", right: 14, top: 38, padding: 6 },
  eyeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.riderRed },
  loginBtn: { height: 50, borderRadius: 12, backgroundColor: COLORS.riderRed, justifyContent: "center", alignItems: "center", marginTop: 8 },
  loginBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: COLORS.white },
  contactArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24, gap: 6 },
  contactText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
});
```

---

### Task 5: Frontend — Modify Customer LoginScreen

**Files:**
- Modify: `crown-oven-frontend/src/screens/auth/LoginScreen.js`

**Step 1: Add expectedRole to login call and "Other Portals" section**

Changes:
1. Add `Ionicons` import
2. Change login call to include `expectedRole: "customer"`
3. Add "Other Portals" section below the Register link

Updated `handleLogin`:
```javascript
const res = await loginUser({ email, password, expectedRole: "customer" });
```

Add after the existing `TouchableOpacity` (Register link) at line 63-65, add:

```jsx
{/* Other Portals */}
<View style={styles.dividerRow}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>Other Portals</Text>
  <View style={styles.dividerLine} />
</View>

<View style={styles.portalRow}>
  <TouchableOpacity onPress={() => navigation.navigate("AdminLogin")} style={styles.portalBtn}>
    <Ionicons name="shield-checkmark" size={18} color={COLORS.black} />
    <Text style={[styles.portalText, { color: COLORS.black }]}>Admin Login</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate("RiderLogin")} style={styles.portalBtn}>
    <Ionicons name="bicycle" size={18} color="#C62828" />
    <Text style={[styles.portalText, { color: "#C62828" }]}>Rider Login</Text>
  </TouchableOpacity>
</View>
```

Add these new styles:
```javascript
dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lightGray },
dividerText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.gray, marginHorizontal: 12 },
portalRow: { flexDirection: "row", justifyContent: "center", gap: 32, marginTop: 16 },
portalBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
portalText: { fontFamily: FONTS.heading, fontSize: SIZES.body },
```

---

### Task 6: Frontend — Update AppNavigator

**Files:**
- Modify: `crown-oven-frontend/src/navigation/AppNavigator.js`

**Step 1: Import new screens and add to auth stack**

Add imports:
```javascript
import AdminLoginScreen from "../screens/auth/AdminLoginScreen";
import RiderLoginScreen from "../screens/auth/RiderLoginScreen";
```

Add inside the `{!user ? (` block, after the Register screen (line 37):
```jsx
<Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
<Stack.Screen name="RiderLogin" component={RiderLoginScreen} />
```

---

### Task 7: Manual End-to-End Testing

**Step 1: Start backend and frontend**
```bash
cd crown-oven-backend && npm start
cd crown-oven-frontend && npx expo start
```

**Step 2: Test scenarios**

| Scenario | Expected Result |
|----------|----------------|
| Customer login with customer account | Success → CustomerTabs |
| Customer login with admin account | Error: "This is an Admin account. Please use the Admin Login." |
| Admin Login link on customer page | Navigates to Admin Login screen (dark theme, shield icon) |
| Admin login with admin account | Success → AdminDrawer |
| Admin login with customer account | Error: "This is a Customer account. Please use the Customer Login." |
| Rider Login link on customer page | Navigates to Rider Login screen (red theme, bike icon) |
| Rider login with rider account | Success → RiderTabs |
| Back to Customer Login button | Navigates back to customer login |
| "Contact admin" text on admin/rider pages | Displayed, no register link |
