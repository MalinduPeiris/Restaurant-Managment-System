import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getMyDeliveries, updateDeliveryStatus } from "../../services/deliveryService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { formatOrderNumber } from "../../utils/orderNumber";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];




const STATUS_COLORS = {
  PENDING: COLORS.gray,
  ASSIGNED: "#E8732A",
  ON_THE_WAY: "#DAA520",
  DELIVERED: "#2E7D32",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};

const FILTERS = ["All", "ASSIGNED", "ON_THE_WAY", "DELIVERED"];
const FILTER_LABELS = { All: "All", ASSIGNED: "Assigned", ON_THE_WAY: "On the Way", DELIVERED: "Delivered" };

export default function RiderDeliveriesScreen() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await getMyDeliveries();
      let list = res.data || [];
      if (activeFilter !== "All") {
        list = list.filter((d) => d.status === activeFilter);
      }
      setDeliveries(list);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDeliveries();
    }, [fetchDeliveries])
  );

  const onRefresh = () => { setRefreshing(true); fetchDeliveries(); };

  const handleStatusUpdate = (delivery, newStatus) => {
    const label = newStatus === "ON_THE_WAY" ? "On the Way" : "Delivered";
    Alert.alert("Update Status", `Mark this delivery as "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateDeliveryStatus(delivery._id, newStatus);
            fetchDeliveries();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Update failed.");
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const renderDelivery = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const order = item.orderId;

    return (
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.orderNumber}>#{formatOrderNumber(order?.orderNumber)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.deliveryAddress}</Text>
        </View>
        {item.customerPhone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={COLORS.gray} />
            <Text style={styles.infoText}>{item.customerPhone}</Text>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={styles.totalText}>
            Rs. {order?.totalAmount?.toFixed(2) || "0.00"}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Items list */}
        {order?.items && order.items.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>Order Items</Text>
            {order.items.map((orderItem, index) => (
              <View key={orderItem._id || index} style={styles.itemRow}>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemQty}>x{orderItem.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons — status transitions enforced by backend */}
        {item.status === "ASSIGNED" && (
          <TouchableOpacity onPress={() => handleStatusUpdate(item, "ON_THE_WAY")} activeOpacity={0.7}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
              <Ionicons name="bicycle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Pick Up & Start Delivery</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {item.status === "ON_THE_WAY" && (
          <TouchableOpacity onPress={() => handleStatusUpdate(item, "DELIVERED")} activeOpacity={0.7}>
            <LinearGradient colors={["#2E7D32", "#43A047"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtn}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Mark as Delivered</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>My Deliveries</Text>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No deliveries found." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  filterContainer: { paddingLeft: 20, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  filterTextActive: { color: COLORS.black },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8, flex: 1 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  totalText: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },

  itemsContainer: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.lightGray,
  },
  itemsTitle: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: COLORS.charcoal, marginBottom: 6 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  itemName: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.charcoal, flex: 1 },
  itemQty: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.gray },

  actionBtn: {
    marginTop: 12, borderRadius: 10, paddingVertical: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  actionBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: "#fff" },
});
