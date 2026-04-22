/**
 * MyRoomBookingsScreen.js
 *
 * Customer screen — list of their room bookings with status filters and cancel support.
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
import { getMyRoomBookings, cancelRoomBooking } from "../../services/roomService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

// ── Status colour mapping ────────────────────────────────────────────────
const STATUS_COLORS = {
  Pending: "#E8732A",
  Confirmed: "#2E7D32",
  Rejected: "#C62828",
  Cancelled: "#757575",
  Completed: "#1565C0",
};

const TYPE_COLORS = {
  private: "#1565C0",
  vip: "#DAA520",
  party: "#E8732A",
};


export default function MyRoomBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await getMyRoomBookings();
      const list = res.data?.bookings || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(list);
    } catch (err) {
      console.error("Failed to fetch room bookings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBookings();
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancel = (id) => {
    Alert.alert("Cancel Booking", "Are you sure you want to cancel this room booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelRoomBooking(id);
            fetchBookings();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to cancel booking.");
          }
        },
      },
    ]);
  };


  const renderBooking = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const typeColor = TYPE_COLORS[item.room?.type || item.roomType] || COLORS.gray;
    const canCancel = item.status === "Pending" || item.status === "Confirmed";

    return (
      <Card style={styles.bookingCard}>
        {/* Top row: room name + status */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.room?.name || item.roomName || "Room"}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + "1A" }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>
                {(item.room?.type || item.roomType || "")?.charAt(0).toUpperCase() +
                  (item.room?.type || item.roomType || "")?.slice(1)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>{item.status}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{item.startTime} - {item.endTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Guests</Text>
          <Text style={styles.detailValue}>{item.guestCount}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={[styles.detailValue, { color: COLORS.primary, fontFamily: FONTS.bold }]}>
            Rs. {item.totalAmount?.toFixed(2) || "—"}
          </Text>
        </View>

        {/* Cancel button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Back + Title */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.pageTitle}>My Room Bookings</Text>


      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBooking}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={<EmptyState message="No room bookings found." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  backBtn: { paddingHorizontal: 20, paddingTop: 12 },
  backText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.primary },

  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },


  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // Booking card
  bookingCard: { padding: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  roomName: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: { fontFamily: FONTS.heading, fontSize: 10 },
  statusBadge: {
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
  detailLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  detailValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },

  // Cancel button
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
