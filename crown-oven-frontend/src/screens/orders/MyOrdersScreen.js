/**
 * MyOrdersScreen.js
 *
 * Displays a list of the currently logged-in customer's orders.
 *
 * Key behaviours:
 *  - Fetches orders on mount AND every time the screen regains focus
 *    (useFocusEffect) so the list is always up-to-date.
 *  - Orders are sorted newest-first.
 *  - Each card shows the order number, type, status badge, total, and date.
 *  - Tapping a card navigates to OrderDetailScreen.
 *  - Pull-to-refresh is supported.
 *  - EmptyState is shown when the user has no orders.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getMyOrders } from "../../services/orderService";
import { getDeliveryByOrder } from "../../services/deliveryService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { getCustomerOrderDisplayStatus } from "../../utils/orderStatus";
import { formatOrderNumber } from "../../utils/orderNumber";

function formatDeliveryDuration(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getMyOrders();
      const list = res.data?.orders || res.data || [];

      const withDelivery = await Promise.all(
        list.map(async (order) => {
          if (order.orderType !== "delivery" || !["Ready", "Delivered"].includes(order.status)) {
            return { ...order, delivery: null };
          }

          try {
            const deliveryRes = await getDeliveryByOrder(order._id);
            return { ...order, delivery: deliveryRes.data };
          } catch {
            return { ...order, delivery: null };
          }
        })
      );

      withDelivery.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(withDelivery);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrder = ({ item }) => {
    const displayStatus = getCustomerOrderDisplayStatus(item, item.delivery);
    const isUnpaid = item.paymentStatus === "unpaid";
    const isPending = item.status === "Pending";
    const hasPayment = item.hasPayment;
    const paymentRecordStatus = item.paymentRecordStatus;
    const paymentRefundStatus = item.paymentRefundStatus;
    const canRetryPayment = isPending && isUnpaid && paymentRecordStatus === "rejected";
    const isAwaitingVerification =
      isPending &&
      isUnpaid &&
      (paymentRecordStatus === "pending" || paymentRecordStatus === "submitted");
    const refundApproved = isUnpaid && paymentRefundStatus === "approved";
    const deliveryDuration = formatDeliveryDuration(item.delivery?.deliveryDurationMinutes);

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

          <View style={[styles.statusBadge, { backgroundColor: displayStatus.color + "1A" }]}>
            <Text style={[styles.statusText, { color: displayStatus.color }]}>
              {displayStatus.label}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.totalText}>R {item.totalAmount?.toFixed(2)}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          {deliveryDuration ? (
            <View style={styles.deliveryTimeRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.deliveryTimeText}>Delivered in {deliveryDuration}</Text>
            </View>
          ) : null}

          {isPending && isUnpaid && !hasPayment && (
            <View style={styles.paymentWarning}>
              <Ionicons name="warning" size={16} color={COLORS.error} />
              <Text style={styles.paymentWarningText}>
                Please complete payment to process your order
              </Text>
            </View>
          )}
          {isAwaitingVerification && (
            <View style={[styles.paymentWarning, { backgroundColor: "#DAA52010", borderColor: "#DAA52030" }]}>
              <Ionicons name="time" size={16} color="#DAA520" />
              <Text style={[styles.paymentWarningText, { color: "#DAA520" }]}>
                Payment awaiting verification
              </Text>
            </View>
          )}
          {canRetryPayment && (
            <View style={[styles.paymentWarning, { backgroundColor: "#FDECEA", borderColor: "#F6CBC6" }]}>
              <Ionicons name="refresh" size={16} color={COLORS.error} />
              <Text style={styles.paymentWarningText}>
                Previous payment was rejected. Open the order to retry.
              </Text>
            </View>
          )}
          {refundApproved && (
            <View style={[styles.paymentWarning, { backgroundColor: "#FFF3D6", borderColor: "#F6E4B0" }]}>
              <Ionicons name="return-down-back" size={16} color="#A87C1D" />
              <Text style={[styles.paymentWarningText, { color: "#A87C1D" }]}>
                Refund approved. Payment is no longer active for this order.
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>My Orders</Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={<EmptyState message="You haven't placed any orders yet." />}
      />
    </SafeAreaView>
  );
}

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

  orderCard: { padding: 16 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderNumber: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },

  typeBadge: {
    backgroundColor: COLORS.charcoal,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.white,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.primary,
  },
  dateText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },

  deliveryTimeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  deliveryTimeText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },

  paymentWarning: {
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
  paymentWarningText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.error,
    flex: 1,
  },
});





