import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { createRider, listRiders } from "../../services/deliveryService";
import { updateUser, deleteUser } from "../../services/authService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const VEHICLE_OPTIONS = [
  { label: "Motorcycle", value: "motorcycle", icon: "bicycle" },
  { label: "Three-Wheeler", value: "three-wheeler", icon: "car" },
];

const VEHICLE_LABELS = {
  motorcycle: "Motorcycle",
  bicycle: "Bicycle",
  "three-wheeler": "Three-Wheeler",
};

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", password: "",
  phone: "", nic: "", vehicleType: "", vehicleNumber: "",
  address: "", emergencyContact: "",
};

export default function ManageRidersScreen() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  const fetchRiders = useCallback(async () => {
    try {
      const res = await listRiders();
      setRiders(res.data || []);
    } catch (err) {
      console.error("Failed to fetch riders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRiders();
    }, [fetchRiders])
  );

  const onRefresh = () => { setRefreshing(true); fetchRiders(); };

  // Validation helpers
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPhone = (phone) => /^\d{10}$/.test(phone);
  const isStrongPassword = (pw) =>
    pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);

  const validateForm = (data, isCreate) => {
    if (!data.firstName.trim()) return "First name is required.";
    if (!data.lastName.trim()) return "Last name is required.";
    if (!data.email.trim()) return "Email is required.";
    if (!isValidEmail(data.email)) return "Invalid email format.";
    if (isCreate) {
      if (!data.password) return "Password is required.";
      if (!isStrongPassword(data.password))
        return "Password must be at least 8 characters with uppercase, lowercase, number, and special character.";
    }
    if (data.phone && !isValidPhone(data.phone)) return "Phone must be exactly 10 digits.";
    if (data.nic) {
      const nic = data.nic.trim();
      const isOldNic = /^\d{9}[VvXx]$/.test(nic);
      const isNewNic = /^\d{12}$/.test(nic);
      if (!isOldNic && !isNewNic) return "Invalid NIC. Use old format (9 digits + V/X) or new format (12 digits).";
    }
    if (data.vehicleType && !data.vehicleNumber.trim()) return "Vehicle number is required when vehicle type is selected.";
    return null;
  };

  // Create
  const handleCreateRider = async () => {
    const error = validateForm(form, true);
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }
    setCreating(true);
    try {
      const payload = { ...form };
      if (!payload.vehicleType) delete payload.vehicleType;
      await createRider(payload);
      Alert.alert("Success", "Rider account created.");
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      fetchRiders();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create rider.");
    } finally {
      setCreating(false);
    }
  };

  // Edit
  const openEditModal = (rider) => {
    setEditingRider(rider);
    setEditForm({
      firstName: rider.firstName || "",
      lastName: rider.lastName || "",
      email: rider.email || "",
      phone: rider.phone || "",
      nic: rider.nic || "",
      vehicleType: rider.vehicleType || "",
      vehicleNumber: rider.vehicleNumber || "",
      address: rider.address || "",
      emergencyContact: rider.emergencyContact || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateRider = async () => {
    const error = validateForm(editForm, false);
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }
    setUpdating(true);
    try {
      const payload = { ...editForm };
      if (!payload.vehicleType) delete payload.vehicleType;
      await updateUser(editingRider._id, payload);
      Alert.alert("Success", "Rider updated successfully.");
      setShowEditModal(false);
      setEditingRider(null);
      fetchRiders();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update rider.");
    } finally {
      setUpdating(false);
    }
  };

  // Delete
  const handleDeleteRider = (rider) => {
    Alert.alert(
      "Delete Rider",
      `Are you sure you want to delete ${rider.firstName} ${rider.lastName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUser(rider._id);
              Alert.alert("Success", "Rider deleted.");
              fetchRiders();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to delete rider.");
            }
          },
        },
      ]
    );
  };

  // Block/Unblock
  const handleToggleBlock = (rider) => {
    const action = rider.isBlocked ? "unblock" : "block";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Rider`,
      `Are you sure you want to ${action} ${rider.firstName} ${rider.lastName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await updateUser(rider._id, { isBlocked: !rider.isBlocked });
              fetchRiders();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Update failed.");
            }
          },
        },
      ]
    );
  };

  // Vehicle type picker
  const renderVehiclePicker = (value, onChange) => (
    <View style={styles.vehicleRow}>
      {VEHICLE_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.vehicleChip, value === opt.value && styles.vehicleChipActive]}
          onPress={() => onChange(value === opt.value ? "" : opt.value)}
        >
          <Ionicons
            name={opt.icon}
            size={16}
            color={value === opt.value ? "#fff" : COLORS.charcoal}
          />
          <Text style={[styles.vehicleChipText, value === opt.value && styles.vehicleChipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Form fields component
  const renderFormFields = (data, setData, isCreate) => (
    <View>
      <Text style={styles.sectionLabel}>Personal Info</Text>
      <TextInput
        style={styles.input}
        placeholder="First Name *"
        value={data.firstName}
        onChangeText={(v) => setData({ ...data, firstName: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name *"
        value={data.lastName}
        onChangeText={(v) => setData({ ...data, lastName: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="NIC (e.g. 941234567V or 200012345678)"
        value={data.nic}
        onChangeText={(v) => {
          const filtered = v.replace(/[^0-9VvXx]/g, "").slice(0, 12);
          setData({ ...data, nic: filtered.toUpperCase() });
        }}
        autoCapitalize="characters"
        maxLength={12}
      />

      <Text style={styles.sectionLabel}>Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={data.email}
        onChangeText={(v) => setData({ ...data, email: v })}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {isCreate && (
        <TextInput
          style={styles.input}
          placeholder="Password *"
          value={data.password}
          onChangeText={(v) => setData({ ...data, password: v })}
          secureTextEntry
        />
      )}

      <Text style={styles.sectionLabel}>Contact</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone (10 digits)"
        value={data.phone}
        onChangeText={(v) => setData({ ...data, phone: v.replace(/[^0-9]/g, "") })}
        keyboardType="number-pad"
        maxLength={10}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={data.address}
        onChangeText={(v) => setData({ ...data, address: v })}
        multiline
        numberOfLines={2}
      />

      <Text style={styles.sectionLabel}>Vehicle</Text>
      {renderVehiclePicker(data.vehicleType, (v) => setData({ ...data, vehicleType: v }))}
      <TextInput
        style={styles.input}
        placeholder="Vehicle Number (e.g. ABC-1234)"
        value={data.vehicleNumber}
        onChangeText={(v) => setData({ ...data, vehicleNumber: v })}
        autoCapitalize="characters"
      />
    </View>
  );

  const renderRider = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.riderInfo}>
          <View style={styles.riderIcon}>
            <Ionicons name="bicycle" size={22} color={COLORS.primary} />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.riderName}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.riderEmail}>{item.email}</Text>
            {item.phone ? <Text style={styles.riderDetail}>{item.phone}</Text> : null}
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.isBlocked ? COLORS.error : COLORS.success }]} />
      </View>

      {/* Extra details */}
      <View style={styles.detailsContainer}>
        {item.nic ? (
          <View style={styles.detailChip}>
            <Ionicons name="card-outline" size={13} color={COLORS.charcoal} />
            <Text style={styles.detailChipText}>{item.nic}</Text>
          </View>
        ) : null}
        {item.vehicleType ? (
          <View style={styles.detailChip}>
            <Ionicons name="speedometer-outline" size={13} color={COLORS.charcoal} />
            <Text style={styles.detailChipText}>{VEHICLE_LABELS[item.vehicleType]}</Text>
          </View>
        ) : null}
        {item.vehicleNumber ? (
          <View style={styles.detailChip}>
            <Ionicons name="pricetag-outline" size={13} color={COLORS.charcoal} />
            <Text style={styles.detailChipText}>{item.vehicleNumber}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: item.isBlocked ? COLORS.error : COLORS.success }]}>
          {item.isBlocked ? "Blocked" : "Active"}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: COLORS.primary }]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={16} color={COLORS.primary} />
          <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: item.isBlocked ? COLORS.success : COLORS.error }]}
          onPress={() => handleToggleBlock(item)}
        >
          <Ionicons name={item.isBlocked ? "lock-open-outline" : "lock-closed-outline"} size={16} color={item.isBlocked ? COLORS.success : COLORS.error} />
          <Text style={[styles.actionBtnText, { color: item.isBlocked ? COLORS.success : COLORS.error }]}>
            {item.isBlocked ? "Unblock" : "Block"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: COLORS.error }]}
          onPress={() => handleDeleteRider(item)}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>

            <View style={styles.heroWrap}>
      <AdminHeroCard
        icon="people-circle-outline"
        badge="Rider Ops"
        title="Rider Dashboard"
        subtitle="Manage courier profiles, vehicle details, and account access from one clean dispatch view."
        colors={["#ECFAF8", "#D1EEE7", "#F5FCFA"]}
        borderColor="#BFE1D9"
        shadowColor="#3E7F73"
        onActionPress={onRefresh}
      />
    </View>

      <FlatList data={riders}
        keyExtractor={(item) => item._id}
        renderItem={renderRider}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No riders yet. Tap + to create one!" />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <LinearGradient colors={GRADIENT} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Rider Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Rider</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm({ ...EMPTY_FORM }); }}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {renderFormFields(form, setForm, true)}
            </ScrollView>
            <View style={styles.formFooter}>
              <TouchableOpacity onPress={handleCreateRider} disabled={creating} activeOpacity={0.7}>
                <LinearGradient
                  colors={GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submitBtn, creating && { opacity: 0.6 }]}
                >
                  <Text style={styles.submitBtnText}>{creating ? "Creating..." : "Create Rider"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Rider Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Rider</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingRider(null); }}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {renderFormFields(editForm, setEditForm, false)}
            </ScrollView>
            <View style={styles.formFooter}>
              <TouchableOpacity onPress={handleUpdateRider} disabled={updating} activeOpacity={0.7}>
                <LinearGradient
                  colors={GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submitBtn, updating && { opacity: 0.6 }]}
                >
                  <Text style={styles.submitBtnText}>{updating ? "Updating..." : "Update Rider"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  riderInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  riderIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#DAA520" + "15",
    justifyContent: "center", alignItems: "center",
  },
  riderName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  riderEmail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  riderDetail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.charcoal, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },

  detailsContainer: {
    flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10,
  },
  detailChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.lightGray + "80", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  detailChipText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.charcoal },

  statusRow: { marginTop: 8 },
  statusLabel: { fontFamily: FONTS.medium, fontSize: SIZES.caption },

  actionRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 4,
  },
  actionBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  fab: { position: "absolute", bottom: 24, right: 24 },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    elevation: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },

  formScroll: { flexGrow: 0 },
  formScrollContent: { padding: 20, paddingBottom: 10 },
  formFooter: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.lightGray },
  sectionLabel: {
    fontFamily: FONTS.heading, fontSize: SIZES.caption, color: COLORS.primary,
    marginBottom: 8, marginTop: 4, textTransform: "uppercase", letterSpacing: 1,
  },
  input: {
    height: 48, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: SIZES.body,
    marginBottom: 12, backgroundColor: COLORS.white,
  },
  vehicleRow: {
    flexDirection: "row", gap: 8, marginBottom: 12,
  },
  vehicleChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.lightGray, backgroundColor: COLORS.white,
  },
  vehicleChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  vehicleChipText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.charcoal },
  vehicleChipTextActive: { color: "#fff" },

  submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  submitBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: "#fff" },
});






