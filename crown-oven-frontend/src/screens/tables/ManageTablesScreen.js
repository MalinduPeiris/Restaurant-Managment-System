/**
 * ManageTablesScreen.js
 *
 * Admin screen - Table management + live status dashboard.
 *
 * Features:
 *  - Summary stats (total, booked, free tables today)
 *  - Each table card shows today's reservations with times & customer names
 *  - Color-coded: green = free, orange = has bookings
 *  - CRUD: Add / Edit / Delete tables via modal
 *  - Pull-to-refresh and auto-refetch on focus
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getTableDashboard, addTable, updateTable, deleteTable } from "../../services/tableService";
import { LinearGradient } from "expo-linear-gradient";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];
const SEAT_OPTIONS = [2, 4, 6, 8];
const LOCATION_OPTIONS = ["indoor", "outdoor"];

function sanitizeTableNumber(value = "") {
  return value.replace(/\D+/g, "");
}

export default function ManageTablesScreen() {
  const [tables, setTables] = useState([]);
  const [summary, setSummary] = useState({ totalTables: 0, tablesWithBookings: 0, freeTables: 0, totalReservations: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ tableNo: "", seats: 2, location: "indoor" });
  const [saving, setSaving] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getTableDashboard();
      const data = res.data;
      setTables(data.tables || []);
      setSummary(data.summary || {});
    } catch (err) {
      console.error("Failed to fetch table dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ tableNo: "", seats: 2, location: "indoor" });
    setModalVisible(true);
  };

  const openEdit = (table) => {
    setEditing(table);
    setForm({ tableNo: String(table.tableNo), seats: table.seats || 2, location: table.location || "indoor" });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmedTableNo = form.tableNo.trim();

    if (!trimmedTableNo) {
      Alert.alert("Validation", "Please enter a table number.");
      return;
    }
    if (!/^\d+$/.test(trimmedTableNo)) {
      Alert.alert("Validation", "Table number must contain numbers only.");
      return;
    }

    setSaving(true);
    try {
      const payload = { tableNo: Number(trimmedTableNo), seats: form.seats, location: form.location };
      if (editing) {
        await updateTable(editing._id, payload);
      } else {
        await addTable(payload);
      }
      setModalVisible(false);
      fetchDashboard();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save table.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (table) => {
    Alert.alert("Delete Table", `Delete Table ${table.tableNo}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTable(table._id);
            fetchDashboard();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Cannot delete table.");
          }
        },
      },
    ]);
  };

  const getStatusLabel = (resv) => {
    const statusColors = { Pending: COLORS.gray, Confirmed: COLORS.success, Completed: COLORS.charcoal, "No-show": COLORS.error };
    return { color: statusColors[resv.status] || COLORS.gray, label: resv.status };
  };

  const renderStatCard = ({ icon, label, value, tint, softTint }) => (
    <View style={[styles.statCard, { backgroundColor: softTint }]}> 
      <View style={[styles.statIconWrap, { backgroundColor: tint + "18" }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderTable = ({ item }) => {
    const hasBookings = item.reservationCount > 0;
    const accent = hasBookings ? COLORS.accent : COLORS.success;

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => openEdit(item)}>
        <Card style={styles.tableCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.tableIdentityWrap}>
              <LinearGradient colors={hasBookings ? ["#FFF1E7", "#FCE7D6"] : ["#EDF9EF", "#E4F5E7"]} style={styles.tableBadge}>
                <Text style={[styles.tableBadgeText, { color: accent }]}>T{item.tableNo}</Text>
              </LinearGradient>
              <View>
                <Text style={styles.tableTitle}>Table {item.tableNo}</Text>
                <Text style={styles.tableSubtext}>Ready for today's floor management</Text>
              </View>
            </View>

            <View style={[styles.statusPill, { backgroundColor: accent + "14" }]}>
              <View style={[styles.statusDot, { backgroundColor: accent }]} />
              <Text style={[styles.statusPillText, { color: accent }]}>
                {hasBookings ? `${item.reservationCount} booking${item.reservationCount > 1 ? "s" : ""}` : "Free"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={COLORS.primary} />
              <Text style={styles.metaChipText}>{item.seats} seats</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name={item.location === "outdoor" ? "sunny-outline" : "home-outline"} size={14} color={COLORS.primary} />
              <Text style={styles.metaChipText}>{item.location === "outdoor" ? "Outdoor" : "Indoor"}</Text>
            </View>
          </View>

          {hasBookings ? (
            <View style={styles.reservationPanel}>
              <View style={styles.reservationPanelHeader}>
                <Text style={styles.reservationPanelTitle}>Today's Reservations</Text>
                <Text style={styles.reservationPanelCaption}>{item.reservationCount} scheduled</Text>
              </View>

              {item.reservations.map((resv) => {
                const st = getStatusLabel(resv);
                const customerName = resv.customerId
                  ? `${resv.customerId.firstName} ${resv.customerId.lastName}`
                  : resv.customerName || "Customer";

                return (
                  <View key={resv._id} style={styles.reservationRow}>
                    <View style={styles.reservationTimeWrap}>
                      <Ionicons name="time-outline" size={13} color={COLORS.gray} />
                      <Text style={styles.reservationTime}>{resv.timeSlot}</Text>
                    </View>
                    <Text style={styles.reservationName} numberOfLines={1}>{customerName}</Text>
                    <Text style={styles.reservationSeats}>{resv.seatCount}p</Text>
                    <View style={[styles.reservationStatus, { backgroundColor: st.color + "18" }]}>
                      <Text style={[styles.reservationStatusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyReservationPanel}>
              <Ionicons name="sparkles-outline" size={16} color={COLORS.success} />
              <Text style={styles.emptyReservationText}>No reservations scheduled today</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit Table</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={tables}
        keyExtractor={(item) => item._id}
        renderItem={renderTable}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View>
            <AdminHeroCard
              icon="restaurant-outline"
              badge="Table Operations"
              title="Table Dashboard"
              subtitle="Manage dining capacity, spot today's reservations quickly, and keep the floor organized."
              colors={["#FFF8EB", "#F7E5C4", "#FBF5EA"]}
              borderColor="#F1DEB1"
              shadowColor="#A87C1D"
              onActionPress={onRefresh}
            />

            <View style={styles.statsGrid}>
              {renderStatCard({ icon: "grid-outline", label: "Total Tables", value: summary.totalTables, tint: COLORS.black, softTint: COLORS.white })}
              {renderStatCard({ icon: "checkmark-circle-outline", label: "Free Today", value: summary.freeTables, tint: COLORS.success, softTint: "#EEF8F0" })}
              {renderStatCard({ icon: "calendar-outline", label: "Booked", value: summary.tablesWithBookings, tint: COLORS.accent, softTint: "#FFF2E8" })}
              {renderStatCard({ icon: "receipt-outline", label: "Reservations", value: summary.totalReservations, tint: COLORS.primary, softTint: "#FFF7E7" })}
            </View>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No tables yet. Tap + to add one." />}
      />

      <TouchableOpacity onPress={openAdd} activeOpacity={0.86} style={styles.fabWrap}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={28} color={COLORS.black} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <LinearGradient colors={["#FFF7E9", "#FBF1DD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{editing ? "Update Setup" : "New Table"}</Text>
                <Text style={styles.modalTitle}>{editing ? `Edit Table ${editing.tableNo}` : "Add Dining Table"}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={COLORS.charcoal} />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <Input label="Table Number" placeholder="e.g. 7" value={form.tableNo} onChangeText={(v) => setForm({ ...form, tableNo: sanitizeTableNumber(v) })} keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>Seats</Text>
              <View style={styles.chipRow}>
                {SEAT_OPTIONS.map((s) => (
                  <TouchableOpacity key={s} style={[styles.chip, form.seats === s && styles.chipActive]} onPress={() => setForm({ ...form, seats: s })} activeOpacity={0.8}>
                    <Text style={[styles.chipText, form.seats === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Location</Text>
              <View style={styles.chipRow}>
                {LOCATION_OPTIONS.map((loc) => (
                  <TouchableOpacity key={loc} style={[styles.chip, form.location === loc && styles.chipActive]} onPress={() => setForm({ ...form, location: loc })} activeOpacity={0.8}>
                    <Text style={[styles.chipText, form.location === loc && styles.chipTextActive]}>
                      {loc.charAt(0).toUpperCase() + loc.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1, marginRight: 8 }} />
                <Button title={editing ? "Update" : "Add"} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 },

  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1DEB1",
    shadowColor: "#A87C1D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.charcoal,
  },
  heroRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.black,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    lineHeight: 20,
    color: COLORS.charcoal,
    maxWidth: 280,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  statCard: {
    width: "48.5%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.gray,
  },

  tableCard: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.06)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  tableIdentityWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  tableBadge: {
    minWidth: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tableBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 24,
  },
  tableTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.black,
    marginBottom: 2,
  },
  tableSubtext: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusPillText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBF6EA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  metaChipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.charcoal,
  },

  reservationPanel: {
    backgroundColor: "#FCFBF8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EFE8D8",
    marginBottom: 12,
  },
  reservationPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reservationPanelTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  reservationPanelCaption: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  reservationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(45,45,45,0.05)",
  },
  reservationTimeWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 82,
    gap: 4,
  },
  reservationTime: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.charcoal,
  },
  reservationName: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.charcoal,
    paddingHorizontal: 8,
  },
  reservationSeats: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.gray,
    marginRight: 8,
  },
  reservationStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reservationStatusText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
  },
  emptyReservationPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  emptyReservationText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.success,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
  },

  fabWrap: {
    position: "absolute",
    right: 24,
    bottom: 24,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(19,19,19,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "85%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(45,45,45,0.06)",
  },
  modalEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.accent,
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: COLORS.black,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  modalBody: {
    padding: 24,
    paddingBottom: 36,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  chip: {
    minWidth: 62,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  chipTextActive: {
    color: COLORS.black,
    fontFamily: FONTS.heading,
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 10,
  },
});



