/**
 * MyReservationsScreen.js
 *
 * Displays a list of the currently logged-in customer's reservations.
 *
 * Key behaviours:
 *  - Fetches reservations on mount AND every time the screen regains focus
 *    (useFocusEffect) so the list is always up-to-date.
 *  - Reservations are sorted newest-first.
 *  - Each card shows date, time, table, seats, status badge, special requests.
 *  - Cancel button on Pending/Confirmed reservations.
 *  - Pull-to-refresh is supported.
 *  - EmptyState is shown when the user has no reservations.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getMyReservations, cancelReservation } from "../../services/reservationService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

// ── Status colour mapping ────────────────────────────────────────────
const STATUS_COLORS = {
  Pending: "#DAA520",     // gold
  Confirmed: "#2E7D32",   // green
  Completed: "#9E9E9E",   // gray
  Cancelled: "#C62828",   // red
  "No-show": "#E8732A",   // orange
};

export default function MyReservationsScreen({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch reservations ───────────────────────────────────────────────
  const fetchReservations = useCallback(async () => {
    try {
      const res = await getMyReservations();
      const list = res.data?.reservations || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReservations(list);
    } catch (err) {
      console.error("Failed to fetch reservations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch whenever the screen gains focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations();
    }, [fetchReservations])
  );

  // ── Pull-to-refresh handler ─────────────────────────────────────────
  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  // ── Cancel a reservation ────────────────────────────────────────────
  const handleCancel = (id) => {
    Alert.alert("Cancel Reservation", "Are you sure you want to cancel this reservation?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelReservation(id);
            fetchReservations();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to cancel reservation.");
          }
        },
      },
    ]);
  };

  // ── Format a date string for display ────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ── Render a single reservation card ────────────────────────────────
  const renderReservation = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const canCancel = item.status === "Pending" || item.status === "Confirmed";

    return (
      <Card style={styles.reservationCard}>
        {/* Top row: date + status badge */}
        <View style={styles.topRow}>
          <Text style={styles.dateTitle}>{formatDate(item.date)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{item.timeSlot}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Table</Text>
          <Text style={styles.detailValue}>
            {item.tableId?.tableNo || item.table?.tableNo || item.tableNo ? `Table ${item.tableId?.tableNo || item.table?.tableNo || item.tableNo}` : "Table -"}
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

        {/* Cancel button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>My Reservations</Text>

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
        ListEmptyComponent={<EmptyState message="You haven't made any reservations yet." />}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // ── Reservation card ──────────────────────────────────────────────────
  reservationCard: { padding: 16 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },

  // ── Status badge ──────────────────────────────────────────────────────
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  // ── Detail rows ───────────────────────────────────────────────────────
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

  // ── Special requests ──────────────────────────────────────────────────
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

  // ── Cancel button ─────────────────────────────────────────────────────
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.error,
  },
});

