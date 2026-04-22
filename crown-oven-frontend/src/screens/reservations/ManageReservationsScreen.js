/**
 * ManageReservationsScreen.js
 *
 * Admin screen — displays ALL reservations across all customers.
 *
 * Features:
 *  - Filter chips by status (All, Pending, Confirmed, Completed, Cancelled, No-show)
 *  - Each card shows customer name, date, time, table, seats, status
 *  - Confirm/Reject buttons on Pending reservations
 *  - Complete/No-show buttons on Confirmed reservations
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
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllReservations, updateReservationStatus } from "../../services/reservationService";
import { LinearGradient } from "expo-linear-gradient";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

// ── Status colour mapping ────────────────────────────────────────────
const STATUS_COLORS = {
  Pending: "#DAA520",     // gold
  Confirmed: "#2E7D32",   // green
  Completed: "#9E9E9E",   // gray
  Cancelled: "#C62828",   // red
  "No-show": "#E8732A",   // orange
};

// ── Filter chip labels ───────────────────────────────────────────────
const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Cancelled", "No-show"];

function formatTableNumber(reservation) {
  const rawTableNo = reservation.tableId?.tableNo || reservation.table?.tableNo || reservation.tableNo;
  if (!rawTableNo) return "T-";

  const normalizedTableNo = String(rawTableNo).trim();
  return normalizedTableNo.toUpperCase().startsWith("T") ? normalizedTableNo : `T${normalizedTableNo}`;
}

export default function ManageReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // ── Fetch all reservations ────────────────────────────────────────────
  const fetchReservations = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const res = await listAllReservations(params);
      const list = res.data?.reservations || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReservations(list);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  // Re-fetch on focus and when filter changes
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations();
    }, [fetchReservations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  // ── Update reservation status ─────────────────────────────────────────
  const handleStatusUpdate = (reservation, newStatus) => {
    const customerName = reservation.customerName || reservation.customer?.name || "Customer";
    Alert.alert(
      "Update Status",
      `Mark ${customerName}'s reservation as "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateReservationStatus(reservation._id, newStatus);
              fetchReservations();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Status update failed.");
            }
          },
        },
      ]
    );
  };

  // ── Format date ───────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ── Render a single reservation card ──────────────────────────────────
  const renderReservation = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const isPending = item.status === "Pending";
    const isConfirmed = item.status === "Confirmed";

    return (
      <Card style={styles.reservationCard}>
        {/* Top row: customer name + status badge */}
        <View style={styles.topRow}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName || item.customer?.name || "Customer"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{item.timeSlot}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Table</Text>
          <Text style={styles.detailValue}>
            {formatTableNumber(item)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Seats</Text>
          <Text style={styles.detailValue}>{item.seatCount}</Text>
        </View>

        {/* Special requests */}
        {item.specialRequests ? (
          <View style={styles.requestsBox}>
            <Text style={styles.requestsLabel}>Special Requests</Text>
            <Text style={styles.requestsText}>{item.specialRequests}</Text>
          </View>
        ) : null}

        {/* Action buttons for Pending reservations */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleStatusUpdate(item, "Confirmed")}
              activeOpacity={0.7}
              style={{ flex: 1, marginRight: 8 }}
            >
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { flex: 1 }]}
              onPress={() => handleStatusUpdate(item, "Cancelled")}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons for Confirmed reservations */}
        {isConfirmed && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleStatusUpdate(item, "Completed")}
              activeOpacity={0.7}
              style={{ flex: 1, marginRight: 8 }}
            >
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>Complete</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { flex: 1 }]}
              onPress={() => handleStatusUpdate(item, "No-show")}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectBtnText}>No-show</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
            <View style={styles.heroWrap}>
      <AdminHeroCard
        icon="calendar-outline"
        badge="Floor Bookings"
        title="Reservation Dashboard"
        subtitle="Confirm seatings, catch exceptions early, and keep the dining schedule balanced throughout the day."
        colors={["#FFF8E8", "#F4E0B4", "#FCF6E7"]}
        borderColor="#EAD493"
        shadowColor="#9E7A1D"
        onActionPress={onRefresh}
      />
    </View>

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={reservations}
        keyExtractor={(item) => item._id}
        renderItem={renderReservation}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={<EmptyState message="No reservations found." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Filter chips
  filterContainer: { paddingLeft: 20, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  filterTextActive: { color: COLORS.black },

  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // Reservation card
  reservationCard: { padding: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  customerName: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  detailLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  detailValue: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },

  // Special requests
  requestsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  requestsLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginBottom: 4,
  },
  requestsText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  actionBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  rejectBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  rejectBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.error,
  },
});







