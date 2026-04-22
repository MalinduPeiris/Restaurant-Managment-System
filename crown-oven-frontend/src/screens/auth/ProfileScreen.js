/**
 * ProfileScreen.js
 *
 * Premium profile screen with gradient avatar, icon-based info rows,
 * sectioned layout, and modern mobile profile design.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { getProfile, updateProfile, changePassword } from "../../services/authService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", address: "" });
  const [showChangePass, setShowChangePass] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "" });
  const [changingPass, setChangingPass] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await getProfile();
      setProfile(res.data);
      setForm({
        firstName: res.data.firstName || "",
        lastName: res.data.lastName || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
    } catch (err) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile(form);
      setProfile(res.data.user);
      await updateUser({ ...user, firstName: form.firstName, lastName: form.lastName });
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passForm.currentPassword || !passForm.newPassword) {
      Alert.alert("Error", "Both fields are required");
      return;
    }
    if (passForm.newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    setChangingPass(true);
    try {
      await changePassword(passForm);
      Alert.alert("Success", "Password changed successfully");
      setPassForm({ currentPassword: "", newPassword: "" });
      setShowChangePass(false);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) return <LoadingSpinner />;

  const initials = `${form.firstName?.[0] || ""}${form.lastName?.[0] || ""}`.toUpperCase();
  const fullName = `${form.firstName} ${form.lastName}`.trim() || "User";
  const roleName = user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || "Customer";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Hero Header with Gradient ─────────────────────────────── */}
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.heroName}>{fullName}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.white} />
            <Text style={styles.roleBadgeText}>{roleName}</Text>
          </View>
          <Text style={styles.heroEmail}>{profile?.email || ""}</Text>
        </LinearGradient>

        {/* ── Quick Info Row ────────────────────────────────────────── */}
        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoItem}>
            <View style={styles.quickInfoIcon}>
              <Ionicons name="call" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.quickInfoLabel}>Phone</Text>
            <Text style={styles.quickInfoValue} numberOfLines={1}>
              {form.phone || "Not set"}
            </Text>
          </View>
          <View style={styles.quickInfoDivider} />
          <View style={styles.quickInfoItem}>
            <View style={styles.quickInfoIcon}>
              <Ionicons name="location" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.quickInfoLabel}>Address</Text>
            <Text style={styles.quickInfoValue} numberOfLines={1}>
              {form.address || "Not set"}
            </Text>
          </View>
        </View>

        {/* ── Personal Information Section ──────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            <TouchableOpacity
              style={styles.editToggle}
              onPress={() => setEditing(!editing)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={editing ? "close-circle" : "create"}
                size={20}
                color={editing ? COLORS.error : COLORS.primary}
              />
              <Text style={[styles.editToggleText, editing && { color: COLORS.error }]}>
                {editing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <View style={styles.formRow}>
                <Input
                  label="First Name"
                  value={form.firstName}
                  onChangeText={(v) => setForm({ ...form, firstName: v })}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Last Name"
                  value={form.lastName}
                  onChangeText={(v) => setForm({ ...form, lastName: v })}
                  style={{ flex: 1 }}
                />
              </View>
              <Input
                label="Phone"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Input
                label="Address"
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                multiline
                numberOfLines={2}
              />
              <Button title="Save Changes" onPress={handleSave} loading={saving} />
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoRow icon="person-outline" label="First Name" value={form.firstName || "—"} />
              <InfoRow icon="person-outline" label="Last Name" value={form.lastName || "—"} />
              <InfoRow icon="mail-outline" label="Email" value={profile?.email || "—"} />
              <InfoRow icon="call-outline" label="Phone" value={form.phone || "—"} />
              <InfoRow icon="location-outline" label="Address" value={form.address || "—"} last />
            </View>
          )}
        </View>

        {/* ── Security Section ──────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowChangePass(!showChangePass)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            <Ionicons
              name={showChangePass ? "chevron-up" : "chevron-down"}
              size={20}
              color={COLORS.gray}
            />
          </TouchableOpacity>

          {showChangePass && (
            <View style={styles.editForm}>
              <Input
                label="Current Password"
                value={passForm.currentPassword}
                onChangeText={(v) => setPassForm({ ...passForm, currentPassword: v })}
                secureTextEntry
              />
              <Input
                label="New Password"
                value={passForm.newPassword}
                onChangeText={(v) => setPassForm({ ...passForm, newPassword: v })}
                secureTextEntry
              />
              <Button
                title="Update Password"
                onPress={handleChangePassword}
                loading={changingPass}
                variant="secondary"
              />
            </View>
          )}
        </View>

        {/* ── Menu Actions ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="settings" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.menuIconCircle, { backgroundColor: COLORS.error + "15" }]}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            </View>
            <Text style={[styles.menuItemText, { color: COLORS.error }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Crown Oven v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reusable Info Row Component ──────────────────────────────────────────
function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={18} color={COLORS.gray} style={styles.infoIcon} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 40 },

  // ── Hero gradient header ───────────────────────────────────────────
  heroGradient: {
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarContainer: { marginBottom: 16 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: COLORS.white,
  },
  heroName: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h1,
    color: COLORS.white,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.white,
  },
  heroEmail: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: "rgba(255,255,255,0.8)",
  },

  // ── Quick info row ─────────────────────────────────────────────────
  quickInfoRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  quickInfoItem: { flex: 1, alignItems: "center" },
  quickInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickInfoLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 2,
  },
  quickInfoValue: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.black,
    textAlign: "center",
  },
  quickInfoDivider: {
    width: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 4,
  },

  // ── Section cards ──────────────────────────────────────────────────
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },

  // ── Edit toggle ────────────────────────────────────────────────────
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editToggleText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.primary,
  },

  // ── Info rows (read-only view) ─────────────────────────────────────
  infoList: { marginTop: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoIcon: { marginRight: 10 },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  infoValue: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.black,
    maxWidth: "50%",
    textAlign: "right",
  },

  // ── Edit form ──────────────────────────────────────────────────────
  editForm: { marginTop: 16 },
  formRow: { flexDirection: "row" },

  // ── Menu action items ──────────────────────────────────────────────
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.black,
    flex: 1,
  },

  // ── Footer ─────────────────────────────────────────────────────────
  versionText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "center",
    marginTop: 24,
  },
});
