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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllRoomBookings, updateRoomBookingStatus } from "../../services/roomService";
import { formatAmenityPrice, getAmenityIcon, getAmenityKey, getAmenityLabel } from "../../utils/roomAmenities";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

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

const FILTERS = ["All", "Pending", "Confirmed", "Completed", "Rejected", "Cancelled"];

export default function ManageRoomBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchBookings = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const res = await listAllRoomBookings(params);
      const list = res.data?.bookings || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBookings(list);
    } catch (err) {
      console.error("Failed to fetch room bookings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

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

  const handleStatusUpdate = (booking, newStatus) => {
    const customerName = booking.customerName || booking.customer?.name || "Customer";
    Alert.alert("Update Status", `Mark ${customerName}'s booking as \"${newStatus}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateRoomBookingStatus(booking._id, newStatus);
            fetchBookings();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Status update failed.");
          }
        },
      },
    ]);
  };

  const renderBooking = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const typeColor = TYPE_COLORS[item.room?.type || item.roomType] || COLORS.gray;
    const isPending = item.status === "Pending";
    const isConfirmed = item.status === "Confirmed";
    const amenities = item.amenities || [];

    return (
      <Card style={styles.bookingCard}>
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

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer</Text>
          <Text style={styles.detailValue}>
            {item.customerName || item.customer?.name || "—"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>
            {item.customerPhone || item.customer?.phone || "—"}
          </Text>
        </View>
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

        {amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            <Text style={styles.detailLabel}>Amenities</Text>
            <View style={styles.amenityTags}>
              {amenities.map((amenity) => (
                <View key={getAmenityKey(amenity)} style={styles.amenityTag}>
                  <Ionicons name={getAmenityIcon(amenity)} size={12} color={COLORS.primary} />
                  <Text style={styles.amenityTagText}>
                    {getAmenityLabel(amenity)} · {formatAmenityPrice(amenity)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {item.specialRequests ? (
          <View style={styles.requestsBox}>
            <Text style={styles.requestsLabel}>Special Requests</Text>
            <Text style={styles.requestsText}>{item.specialRequests}</Text>
          </View>
        ) : null}

        <View style={[styles.detailRow, { marginTop: 8 }]}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={[styles.detailValue, { color: COLORS.primary, fontFamily: FONTS.bold }]}>
            Rs. {item.totalAmount?.toFixed(2) || "—"}
          </Text>
        </View>

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
              onPress={() => handleStatusUpdate(item, "Rejected")}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {isConfirmed && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleStatusUpdate(item, "Completed")}
              activeOpacity={0.7}
              style={{ flex: 1 }}
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
          </View>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.heroWrap}>
      <AdminHeroCard
        icon="calendar-number-outline"
        badge="Suite Bookings"
        title="Room Booking Dashboard"
        subtitle="Confirm room reservations, review guest requests, and keep booking status changes visible in one place."
        colors={["#FFF3F1", "#EFD2CB", "#FFF9F8"]}
        borderColor="#E5BEB6"
        shadowColor="#9C635A"
        onActionPress={onRefresh}
      />
    </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.filterActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  filterContainer: { paddingLeft: 20, paddingTop: 12, marginBottom: 8 },
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
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  detailLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  detailValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  amenitiesRow: { marginVertical: 6 },
  amenityTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  amenityTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "15",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  amenityTagText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.primary,
  },
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





