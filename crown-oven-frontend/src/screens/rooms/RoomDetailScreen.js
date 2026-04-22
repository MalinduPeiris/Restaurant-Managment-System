import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getRoomById } from "../../services/roomService";
import { formatAmenityPrice, getAmenityIcon, getAmenityKey, getAmenityLabel } from "../../utils/roomAmenities";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const TYPE_COLORS = {
  private: "#1565C0",
  vip: "#DAA520",
  party: "#E8732A",
};

export default function RoomDetailScreen({ navigation, route }) {
  const { roomId, room: passedRoom } = route.params || {};
  const [room, setRoom] = useState(passedRoom || null);
  const [loading, setLoading] = useState(!passedRoom);

  useEffect(() => {
    if (!passedRoom && roomId) {
      (async () => {
        try {
          const res = await getRoomById(roomId);
          setRoom(res.data?.room || res.data);
        } catch (err) {
          Alert.alert("Error", "Failed to load room details.");
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [roomId, passedRoom]);

  if (loading || !room) return <LoadingSpinner />;

  const typeColor = TYPE_COLORS[room.type] || COLORS.gray;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>

        {room.image ? (
          <Image source={{ uri: room.image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="business-outline" size={60} color={COLORS.gray} />
          </View>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.roomName}>{room.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "1A" }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {room.type?.charAt(0).toUpperCase() + room.type?.slice(1)}
            </Text>
          </View>
        </View>

        {room.description ? (
          <Text style={styles.description}>{room.description}</Text>
        ) : null}

        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>Up to {room.capacity} guests</Text>
            </View>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            <View>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.detailValue}>Rs. {room.pricePerHour} / hour</Text>
            </View>
          </View>
        </View>

        {room.amenities?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Amenities</Text>
            {room.amenities.map((amenity) => (
              <View key={getAmenityKey(amenity)} style={styles.amenityRow}>
                <View style={styles.amenityIconWrap}>
                  <Ionicons name={getAmenityIcon(amenity)} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.amenityInfo}>
                  <Text style={styles.amenityLabel}>{getAmenityLabel(amenity)}</Text>
                  <Text style={styles.amenityHint}>
                    {amenity.isChargeable ? "Optional add-on" : "Included with room"}
                  </Text>
                </View>
                <Text style={styles.amenityCost}>{formatAmenityPrice(amenity)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceValue}>Rs. {room.pricePerHour}/hr</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("BookRoom", { room })}
          activeOpacity={0.7}
          style={{ flex: 1, marginLeft: 16 }}
        >
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtn}
          >
            <Text style={styles.bookBtnText}>Book This Room</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 240,
    backgroundColor: COLORS.lightGray,
  },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 8,
  },
  roomName: {
    fontFamily: FONTS.title,
    fontSize: SIZES.h1,
    color: COLORS.black,
    flex: 1,
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  typeText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  detailsCard: {
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  detailValue: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.black,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
    marginBottom: 12,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  amenityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  amenityInfo: { flex: 1 },
  amenityLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  amenityHint: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  amenityCost: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  priceLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  priceValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },
  bookBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.button,
    color: COLORS.white,
  },
});

