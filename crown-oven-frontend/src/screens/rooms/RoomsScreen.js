import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listRooms } from "../../services/roomService";
import { getAmenityIcon, getAmenityKey, getAmenityLabel } from "../../utils/roomAmenities";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];
const HERO_GRADIENT = ["#FFF8EA", "#FFF0D1", "#FDE6BD"];

const TYPE_COLORS = {
  private: "#1565C0",
  vip: "#DAA520",
  party: "#E8732A",
};

const TYPE_DESCRIPTIONS = {
  private: "Quiet, intimate spaces for focused gatherings.",
  vip: "Premium room styling for elevated celebrations.",
  party: "Larger layouts for energetic group events.",
};

export default function RoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await listRooms();
      const list = res.data?.rooms || res.data || [];
      setRooms(list.filter((room) => room.isAvailable !== false));
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchRooms();
    }, [fetchRooms])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="business-outline" size={18} color={COLORS.primary} />
            <Text style={styles.heroBadgeText}>Room Booking</Text>
          </View>
          <View style={styles.heroCountPill}>
            <Text style={styles.heroCountText}>{rooms.length} spaces</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Private Rooms</Text>
        <Text style={styles.heroSubtitle}>
          Reserve the right private space for dining, meetings, and celebration bookings.
        </Text>
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.viewBookingsWrap}
        onPress={() => navigation.navigate("MyRoomBookings")}
      >
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.viewBookingsBtn}
        >
          <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
          <Text style={styles.viewBookingsText}>View Your Bookings</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderRoom = ({ item }) => {
    const typeColor = TYPE_COLORS[item.type] || COLORS.gray;
    const visibleAmenities = (item.amenities || []).slice(0, 3);

    return (
      <Card style={styles.roomCard}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => navigation.navigate("RoomDetail", { roomId: item._id, room: item })}
        >
          <View style={styles.imageWrap}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.roomImage} />
            ) : (
              <View style={styles.roomImagePlaceholder}>
                <Ionicons name="business-outline" size={40} color={COLORS.gray} />
              </View>
            )}
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(22,22,22,0.55)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.imageOverlay}
            >
              <View style={[styles.typeBadge, { backgroundColor: "rgba(255,248,232,0.94)" }]}>
                <Text style={[styles.typeText, { color: typeColor }]}>
                  {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.roomContent}>
            <View style={styles.nameRow}>
              <Text style={styles.roomName}>{item.name}</Text>
              <Text style={styles.price}>Rs. {item.pricePerHour}/hr</Text>
            </View>

            <Text style={styles.roomDescription}>
              {TYPE_DESCRIPTIONS[item.type] || "Comfortable room layout for restaurant bookings."}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                <Text style={styles.metaText}>Up to {item.capacity} guests</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                <Text style={styles.metaText}>Hourly booking</Text>
              </View>
            </View>

            {visibleAmenities.length > 0 && (
              <View style={styles.amenityRow}>
                {visibleAmenities.map((amenity) => (
                  <View key={getAmenityKey(amenity)} style={styles.amenityTag}>
                    <Ionicons name={getAmenityIcon(amenity)} size={13} color={COLORS.primary} />
                    <Text style={styles.amenityText}>{getAmenityLabel(amenity)}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate("BookRoom", { room: item })}
              activeOpacity={0.8}
              style={styles.bookNowWrap}
            >
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookBtn}
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
                <Text style={styles.bookBtnText}>Book Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={<EmptyState message="No rooms available at the moment." />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 28 },
  heroCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(218,165,32,0.16)",
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
    gap: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  heroCountPill: {
    backgroundColor: "rgba(34,34,34,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroCountText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 16,
  },
  viewBookingsWrap: {
    marginBottom: 16,
    borderRadius: 18,
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  viewBookingsBtn: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewBookingsText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  roomCard: {
    marginBottom: 16,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
  },
  roomImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.lightGray,
  },
  roomImagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 14,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  typeText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
  },
  roomContent: {
    paddingTop: 16,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  roomName: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 24,
    color: COLORS.black,
  },
  price: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    color: COLORS.primary,
  },
  roomDescription: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  amenityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  amenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary + "12",
  },
  amenityText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  bookNowWrap: {
    marginTop: 2,
  },
  bookBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bookBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});

