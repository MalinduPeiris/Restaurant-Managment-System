/**
 * ManageOrdersScreen.js
 *
 * Admin screen - displays ALL orders across all customers.
 *
 * Features:
 *  - Filter chips by status (All, Pending, Preparing, Ready, etc.)
 *  - Each card shows order number, customer name, type, status, total, date
 *  - Payment status badge shown on each order
 *  - "Next Status" button blocked if payment not accepted (Pending -> Preparing)
 *  - Delete button shown only for cancelled orders
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
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllOrders, updateOrderStatus, deleteOrder } from "../../services/orderService";
import { LinearGradient } from "expo-linear-gradient";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";
import { formatOrderNumber } from "../../utils/orderNumber";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const STATUS_COLORS = {
  Pending: COLORS.gray,
  Preparing: COLORS.accent,
  Ready: COLORS.primary,
  Delivered: COLORS.success,
  Collected: COLORS.success,
  Cancelled: COLORS.error,
};

function getAdminOrderStatusLabel(order) {
  if (order.orderType === "delivery" && order.status === "Ready") {
    return "Waiting for delivery";
  }

  return order.status;
}

const NEXT_STATUS = {
  delivery: { Pending: "Preparing", Preparing: "Ready" },
  pickup: { Pending: "Preparing", Preparing: "Ready", Ready: "Collected" },
};

const FILTERS = ["All", "Pending", "Preparing", "Ready", "Delivered", "Collected", "Cancelled"];

export default function ManageOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchOrders = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const res = await listAllOrders(params);
      const list = res.data?.orders || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(list);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleNextStatus = async (order) => {
    const nextMap = NEXT_STATUS[order.orderType] || NEXT_STATUS.pickup;
    const next = nextMap[order.status];
    if (!next) return;

    Alert.alert("Update Status", `Move order #${formatOrderNumber(order.orderNumber)} to "${next}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updateOrderStatus(order._id, next);
            fetchOrders();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Status update failed.");
          }
        },
      },
    ]);
  };

  const handleDeleteOrder = (order) => {
    Alert.alert(
      "Delete Cancelled Order",
      `Permanently delete order #${formatOrderNumber(order.orderNumber)}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(order._id);
              fetchOrders();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Delete failed.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrder = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const nextMap = NEXT_STATUS[item.orderType] || NEXT_STATUS.pickup;
    const nextStatus = nextMap[item.status];
    const isPaid = item.paymentStatus === "paid";
    const isPaymentBlocked = item.status === "Pending" && nextStatus === "Preparing" && !isPaid;
    const isCancelled = item.status === "Cancelled";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("OrderDetail", { orderId: item._id })}
      >
        <Card style={styles.orderCard}>
          <View style={styles.topRow}>
            <Text style={styles.orderNumber}>#{formatOrderNumber(item.orderNumber)}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.orderType === "pickup" ? "Takeaway" : item.orderType?.charAt(0).toUpperCase() + item.orderType?.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={styles.customerName}>{item.customerName || "Customer"}</Text>

          <View style={styles.badgesRow}>
            <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
              <Text style={[styles.statusText, { color: badgeColor }]}>{getAdminOrderStatusLabel(item)}</Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: isPaid ? COLORS.success + "1A" : COLORS.error + "1A" }]}>
              <Ionicons
                name={isPaid ? "checkmark-circle" : "close-circle"}
                size={14}
                color={isPaid ? COLORS.success : COLORS.error}
              />
              <Text style={[styles.paymentBadgeText, { color: isPaid ? COLORS.success : COLORS.error }]}>
                {isPaid ? "Paid" : "Unpaid"}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.totalText}>Rs. {item.totalAmount?.toFixed(2)}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          {nextStatus && !isPaymentBlocked && (
            <TouchableOpacity onPress={() => handleNextStatus(item)} activeOpacity={0.7}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
                <Text style={styles.nextBtnText}>Move to {nextStatus}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isPaymentBlocked && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={16} color={COLORS.error} />
              <Text style={styles.warningText}>
                Payment must be accepted before preparing this order
              </Text>
            </View>
          )}

          {isCancelled && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteOrder(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.white} />
              <Text style={styles.deleteBtnText}>Delete Cancelled Order</Text>
            </TouchableOpacity>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroWrap}>
        <AdminHeroCard
          icon="receipt-outline"
          badge="Order Control"
          title="Order Dashboard"
          subtitle="Track every kitchen queue, monitor payment readiness, and move orders forward without losing pace."
          colors={["#FFF6E8", "#F7DEC2", "#FBF3E8"]}
          borderColor="#EFD3A9"
          shadowColor="#A96D1F"
          onActionPress={onRefresh}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={<EmptyState message="No orders found." />}
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

  orderCard: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  typeBadge: { backgroundColor: COLORS.charcoal, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.white },
  customerName: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, marginBottom: 8 },

  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentBadgeText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalText: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },

  nextBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  nextBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.white },

  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.error + "10",
    borderWidth: 1,
    borderColor: COLORS.error + "30",
  },
  warningText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.error, flex: 1 },

  deleteBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.white },
});
