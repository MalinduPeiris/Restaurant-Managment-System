/**
 * OrderDetailScreen.js
 */

import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { getOrderById, cancelOrder } from "../../services/orderService";
import { getDeliveryByOrder } from "../../services/deliveryService";
import { getFeedbackByOrder } from "../../services/feedbackService";
import { getPaymentByOrder } from "../../services/paymentService";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { getCustomerOrderDisplayStatus } from "../../utils/orderStatus";
import { formatOrderNumber } from "../../utils/orderNumber";

function formatDeliveryDuration(minutes) {
  if (minutes === null || minutes === undefined) return "N/A";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

const DELIVERY_LABELS = {
  PENDING: "Waiting for delivery",
  ASSIGNED: "Rider assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};

export default function OrderDetailScreen({ navigation, route }) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";

  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [feedbackLoadError, setFeedbackLoadError] = useState("");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await getOrderById(orderId);
      const orderData = res.data?.order || res.data;
      setOrder(orderData);

      if (orderData.orderType === "delivery" && ["Ready", "Delivered"].includes(orderData.status)) {
        try {
          const delRes = await getDeliveryByOrder(orderId);
          setDelivery(delRes.data);
        } catch {
          setDelivery(null);
        }
      } else {
        setDelivery(null);
      }

      try {
        const payRes = await getPaymentByOrder(orderId);
        setPayment(payRes.data);
      } catch {
        setPayment(null);
      }

      if (["Delivered", "Collected"].includes(orderData.status)) {
        try {
          const fbRes = await getFeedbackByOrder(orderId);
          setFeedback(fbRes.data?.feedback || null);
          setFeedbackLoaded(true);
          setFeedbackLoadError("");
        } catch (err) {
          setFeedback(null);
          setFeedbackLoaded(false);
          setFeedbackLoadError(err.response?.data?.message || "Could not load feedback details.");
        }
      } else {
        setFeedback(null);
        setFeedbackLoaded(false);
        setFeedbackLoadError("");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrder();
    }, [fetchOrder])
  );

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrder(orderId);
              await fetchOrder();
              Alert.alert("Cancelled", "Your order has been cancelled.");
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Could not cancel the order.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <LoadingSpinner />;

  const displayStatus = getCustomerOrderDisplayStatus(order, delivery);
  const isPending = order.status === "Pending";
  const isUnpaid = order.paymentStatus === "unpaid";
  const paymentRecordStatus = payment?.status || null;
  const paymentRefundStatus = payment?.refundStatus || "none";
  const hasPayment = !!payment;
  const canRetryPayment = isPending && isUnpaid && paymentRecordStatus === "rejected";
  const isAwaitingVerification =
    isPending &&
    isUnpaid &&
    (paymentRecordStatus === "pending" || paymentRecordStatus === "submitted");
  const isCompleted = ["Delivered", "Collected"].includes(order.status);
  const canGiveFeedback = isCompleted && feedbackLoaded && !feedback;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.orderNumber}>#{formatOrderNumber(order.orderNumber)}</Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: displayStatus.color + "1A" }]}>
            <Text style={[styles.statusText, { color: displayStatus.color }]}>{displayStatus.label}</Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {order.orderType === "pickup" ? "Takeaway" : order.orderType?.charAt(0).toUpperCase() + order.orderType?.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <View
            style={[
              styles.paymentDot,
              {
                backgroundColor: !isUnpaid
                  ? COLORS.success
                  : canRetryPayment
                    ? COLORS.error
                    : isAwaitingVerification
                      ? "#DAA520"
                      : paymentRefundStatus === "approved"
                        ? "#A87C1D"
                        : COLORS.error,
              },
            ]}
          />
          <Text style={styles.paymentText}>
            {!isUnpaid
              ? "Paid"
              : canRetryPayment
                ? "Payment Rejected - Retry Required"
                : isAwaitingVerification
                  ? "Payment Awaiting Verification"
                  : paymentRefundStatus === "approved"
                    ? "Refund Approved"
                    : "Payment Pending"}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <Card>
          {order.items?.map((item, index) => (
            <View
              key={item._id || index}
              style={[styles.itemRow, index < order.items.length - 1 && styles.itemBorder]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.quantity} x R {item.price?.toFixed(2)}</Text>
              </View>
              <Text style={styles.itemTotal}>R {(item.quantity * item.price).toFixed(2)}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>R {order.totalAmount?.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R {order.totalAmount?.toFixed(2)}</Text>
          </View>
        </Card>

        {order.orderType === "delivery" && (
          <Card>
            <Text style={styles.detailTitle}>Delivery Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{order.deliveryAddress || "N/A"}</Text>
            </View>
          </Card>
        )}

        {(delivery || (order.orderType === "delivery" && order.status === "Ready")) && (
          <Card style={{ marginTop: 8 }}>
            <Text style={styles.detailTitle}>Delivery Status</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.deliveryBadge, { backgroundColor: displayStatus.color + "1A" }]}>
                <Text style={[styles.deliveryBadgeText, { color: displayStatus.color }]}>
                  {delivery ? (DELIVERY_LABELS[delivery.status] || displayStatus.label) : displayStatus.label}
                </Text>
              </View>
            </View>
            {delivery?.riderId && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rider</Text>
                  <Text style={styles.detailValue}>{delivery.riderId.firstName} {delivery.riderId.lastName}</Text>
                </View>
                {delivery.riderId.phone ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Rider Phone</Text>
                    <Text style={styles.detailValue}>{delivery.riderId.phone}</Text>
                  </View>
                ) : null}
                {delivery.deliveryStartTime ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Started</Text>
                    <Text style={styles.detailValue}>{formatDate(delivery.deliveryStartTime)}</Text>
                  </View>
                ) : null}
                {delivery.deliveryEndTime ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Delivered At</Text>
                    <Text style={styles.detailValue}>{formatDate(delivery.deliveryEndTime)}</Text>
                  </View>
                ) : null}
                {delivery.deliveryDurationMinutes !== null && delivery.deliveryDurationMinutes !== undefined ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Delivery Time</Text>
                    <Text style={styles.detailValue}>{formatDeliveryDuration(delivery.deliveryDurationMinutes)}</Text>
                  </View>
                ) : null}
              </>
            )}
          </Card>
        )}

        <Card>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Placed</Text>
            <Text style={styles.detailValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated</Text>
            <Text style={styles.detailValue}>{formatDate(order.updatedAt)}</Text>
          </View>
        </Card>

        {isCustomer && isPending && isUnpaid && (!hasPayment || canRetryPayment) && (
          <Button
            title={canRetryPayment ? "Retry Payment" : "Pay Now"}
            onPress={() => navigation.navigate("Payment", {
              orderId: order._id,
              totalAmount: order.totalAmount,
              orderType: order.orderType,
            })}
            style={{ marginTop: 16 }}
          />
        )}

        {isCustomer && isPending && (
          <Button
            title="Cancel Order"
            variant="danger"
            onPress={handleCancel}
            loading={cancelling}
            style={{ marginTop: 12, marginBottom: 32 }}
          />
        )}

        {isCustomer && canGiveFeedback && (
          <Button
            title="Rate Experience"
            onPress={() => navigation.navigate("WriteFeedback", { orderId: order._id, orderNumber: formatOrderNumber(order.orderNumber) })}
            style={{ marginTop: 16 }}
          />
        )}

        {feedbackLoadError ? <Text style={styles.feedbackErrorText}>{feedbackLoadError}</Text> : null}

        {feedback && (
          <Card style={{ marginTop: 12 }}>
            <Text style={styles.detailTitle}>Your Feedback</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rating</Text>
              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= feedback.rating ? "star" : "star-outline"}
                    size={16}
                    color={star <= feedback.rating ? COLORS.primary : COLORS.lightGray}
                    style={styles.ratingStarIcon}
                  />
                ))}
              </View>
            </View>
            {feedback.comment ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Comment</Text>
                <Text style={styles.detailValue}>{feedback.comment}</Text>
              </View>
            ) : null}
            {feedback.adminReply ? (
              <View style={styles.adminReplyBox}>
                <Text style={styles.adminReplyLabel}>Admin Reply</Text>
                <Text style={styles.adminReplyText}>{feedback.adminReply}</Text>
              </View>
            ) : null}
          </Card>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { marginRight: 12, padding: 4 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.title, lineHeight: SIZES.title + 4, includeFontPadding: false, color: COLORS.black },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginRight: 10 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },
  typeBadge: { backgroundColor: COLORS.charcoal, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.white },
  paymentRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  paymentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  paymentText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  sectionTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black, marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black },
  itemMeta: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray, marginTop: 2 },
  itemTotal: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.charcoal },
  summaryCard: { padding: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  summaryLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  summaryValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 10 },
  totalLabel: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  totalValue: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  detailTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black, marginBottom: 8 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  detailLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  ratingStarsRow: { flexDirection: "row", alignItems: "center", maxWidth: "60%" },
  ratingStarIcon: { marginLeft: 2 },
  detailValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal, maxWidth: "60%", textAlign: "right" },
  adminReplyBox: { marginTop: 8, padding: 10, backgroundColor: "#DAA52015", borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#DAA520" },
  adminReplyLabel: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: "#DAA520", marginBottom: 4 },
  adminReplyText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal },
  feedbackErrorText: { marginTop: 12, fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error },
  deliveryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  deliveryBadgeText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },
});







