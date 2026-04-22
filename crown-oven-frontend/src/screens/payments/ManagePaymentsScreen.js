/**
 * ManagePaymentsScreen.js
 *
 * Admin screen - displays all payments across all customers.
 *
 * Features:
 *  - Filter by payment status (All, Pending, Submitted, Verified, Rejected)
 *  - View proof image for submitted bank transfers
 *  - Verify or reject submitted payments
 *  - Approve or reject refund requests
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
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllPayments, verifyPayment, reviewRefund } from "../../services/paymentService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";
import { formatOrderNumber } from "../../utils/orderNumber";

const STATUS_COLORS = {
  pending: COLORS.gray,
  submitted: COLORS.accent,
  verified: COLORS.success,
  rejected: COLORS.error,
};

const FILTERS = ["All", "pending", "submitted", "verified", "rejected"];

export default function ManagePaymentsScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedProofImage, setSelectedProofImage] = useState("");

  const fetchPayments = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const res = await listAllPayments(params);
      const list = res.data?.payments || res.data || [];
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPayments(list);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPayments();
    }, [fetchPayments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handleVerify = (paymentId, action) => {
    const actionLabel = action === "verify" ? "Verify" : "Reject";
    Alert.alert(`${actionLabel} Payment`, `Are you sure you want to ${action} this payment?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: actionLabel,
        style: action === "reject" ? "destructive" : "default",
        onPress: async () => {
          try {
            await verifyPayment(paymentId, action);
            fetchPayments();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Action failed.");
          }
        },
      },
    ]);
  };

  const handleRefund = (paymentId, action) => {
    const actionLabel = action === "approve" ? "Approve" : "Reject";
    Alert.alert(`${actionLabel} Refund`, `Are you sure you want to ${action} this refund?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: actionLabel,
        style: action === "reject" ? "destructive" : "default",
        onPress: async () => {
          try {
            await reviewRefund(paymentId, action);
            fetchPayments();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Action failed.");
          }
        },
      },
    ]);
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

  const renderPayment = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const orderNumber = item.orderId?.orderNumber ? formatOrderNumber(item.orderId.orderNumber) : "N/A";

    return (
      <Card style={styles.paymentCard}>
        <View style={styles.topRow}>
          <Text style={styles.paymentId}>{item.paymentId || item._id?.slice(-8)}</Text>
          <View style={[styles.methodBadge, item.paymentMethod === "bank_transfer" && styles.bankBadge]}>
            <Text style={styles.methodText}>
              {item.paymentMethod === "bank_transfer" ? "Bank Transfer" : "Cash"}
            </Text>
          </View>
        </View>

        <Text style={styles.amount}>Rs. {item.amount?.toFixed(2)}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Order ID</Text>
          <Text style={styles.metaValue}>#{orderNumber}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
          <Text style={[styles.statusText, { color: badgeColor }]}>
            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
          </Text>
        </View>

        {item.refundStatus && item.refundStatus !== "none" && (
          <View style={[styles.statusBadge, { backgroundColor: COLORS.accent + "1A" }]}>
            <Text style={[styles.statusText, { color: COLORS.accent }]}>Refund: {item.refundStatus}</Text>
          </View>
        )}

        {item.proofImageUrl && (
          <View style={styles.proofWrap}>
            <Image source={{ uri: item.proofImageUrl }} style={styles.proofImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setSelectedProofImage(item.proofImageUrl)}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

        {["pending", "submitted"].includes(item.status) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.verifyBtn]}
              onPress={() => handleVerify(item._id, "verify")}
            >
              <Text style={styles.actionBtnText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleVerify(item._id, "reject")}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.refundStatus === "requested" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.verifyBtn]}
              onPress={() => handleRefund(item._id, "approve")}
            >
              <Text style={styles.actionBtnText}>Approve Refund</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRefund(item._id, "reject")}
            >
              <Text style={styles.actionBtnText}>Reject Refund</Text>
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
          icon="card-outline"
          badge="Payment Review"
          title="Payment Dashboard"
          subtitle="Verify transfers, review refund requests, and keep settlement status clear for every order."
          colors={["#ECFBF2", "#D8F0DE", "#F6FCF7"]}
          borderColor="#C8E6CF"
          shadowColor="#4A8F63"
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
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        renderItem={renderPayment}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={<EmptyState message="No payments found." />}
      />

      <Modal
        visible={!!selectedProofImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProofImage("")}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedProofImage("")}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.modalImageCard}>
            {selectedProofImage ? (
              <Image source={{ uri: selectedProofImage }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
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

  paymentCard: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  paymentId: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  methodBadge: { backgroundColor: COLORS.charcoal, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  bankBadge: { backgroundColor: COLORS.accent },
  methodText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.white },
  amount: { fontFamily: FONTS.bold, fontSize: SIZES.h1, color: COLORS.primary, marginBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  metaLabel: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  metaValue: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.charcoal },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, marginBottom: 8 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },
  proofWrap: { position: "relative", marginBottom: 10 },
  proofImage: { width: "100%", height: 160, borderRadius: 10, backgroundColor: COLORS.lightGray },
  eyeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45,45,45,0.78)",
  },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray, marginBottom: 4 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  verifyBtn: { backgroundColor: "#4CAF50" },
  rejectBtn: { backgroundColor: "#EF5350" },
  actionBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.white },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  modalCloseButton: {
    position: "absolute",
    top: 42,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    zIndex: 2,
  },
  modalImageCard: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
});
