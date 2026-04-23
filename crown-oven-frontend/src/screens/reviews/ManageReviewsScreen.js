/**
 * ManageReviewsScreen.js
 *
 * Admin screen — two tabs: Dish Reviews and Service Feedback.
 *
 * Dish Reviews: list all dish reviews, reply / edit reply, delete
 * Service Feedback: list all order feedback, reply / edit reply, delete
 */

import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllReviews, adminDeleteReview, adminReplyReview } from "../../services/reviewService";
import { listAllFeedback, replyToFeedback, adminDeleteFeedback } from "../../services/feedbackService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";
import { formatOrderNumber } from "../../utils/orderNumber";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function ManageReviewsScreen() {
  const [activeTab, setActiveTab] = useState("reviews");
  const [reviews, setReviews] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unified reply modal state
  // replyTarget: { id, customerName, rating, comment, adminReply, mode }
  // mode: "review" | "feedback"
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // ── DATA FETCH ──
  const fetchData = useCallback(async () => {
    try {
      const [revRes, fbRes] = await Promise.all([
        listAllReviews(),
        listAllFeedback(),
      ]);
      const revList = revRes.data?.reviews || revRes.data || [];
      revList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReviews(revList);

      const fbList = fbRes.data || [];
      fbList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFeedbackList(fbList);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── HELPERS ──
  const buildStars = (rating) => {
    const filled = Math.round(rating || 0);
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  // ── MODAL HELPERS ──
  const openReplyModal = (item, mode) => {
    setReplyTarget({ ...item, mode });
    setReplyText(item.adminReply || "");
    setShowReplyModal(true);
  };

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setReplyText("");
    setReplyTarget(null);
  };

  const isEditing = !!replyTarget?.adminReply;

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      Alert.alert("Error", "Reply cannot be empty.");
      return;
    }
    setReplying(true);
    try {
      if (replyTarget.mode === "review") {
        await adminReplyReview(replyTarget._id, replyText.trim());
      } else {
        await replyToFeedback(replyTarget._id, replyText.trim());
      }
      closeReplyModal();
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to save reply.");
    } finally {
      setReplying(false);
    }
  };

  // ── REVIEW HANDLERS ──
  const handleDeleteReview = (review) => {
    Alert.alert("Delete Review", `Delete this review by ${review.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await adminDeleteReview(review._id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to delete.");
          }
        },
      },
    ]);
  };

  // ── FEEDBACK HANDLERS ──
  const handleDeleteFeedback = (fb) => {
    Alert.alert("Delete Feedback", `Delete feedback by ${fb.customerName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await adminDeleteFeedback(fb._id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed to delete.");
          }
        },
      },
    ]);
  };

  // ── RENDER REVIEW CARD ──
  const renderReview = ({ item }) => {
    const dishName = item.dishId?.name || "Unknown Dish";
    const hasReply = !!item.adminReply;
    return (
      <Card style={styles.card}>
        <Text style={styles.dishName}>{dishName}</Text>
        <View style={styles.reviewHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.customerName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.reviewInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.stars}>{buildStars(item.rating)}</Text>
        {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}

        {/* Admin reply display */}
        {hasReply ? (
          <View style={styles.replyBox}>
            <View style={styles.replyLabelRow}>
              <Text style={styles.replyLabel}>Your Reply</Text>
              {item.adminReplyUpdatedAt ? (
                <Text style={styles.replyEditedTag}>
                  edited {formatDate(item.adminReplyUpdatedAt)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.replyText}>{item.adminReply}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => openReplyModal(item, "review")}
            activeOpacity={0.7}
            style={{ flex: 1, marginRight: 8 }}
          >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.replyBtn}>
              <Ionicons name={hasReply ? "create" : "chatbubble"} size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.replyBtnText}>{hasReply ? "Edit Reply" : "Reply"}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn2} onPress={() => handleDeleteReview(item)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  // ── RENDER FEEDBACK CARD ──
  const renderFeedback = ({ item }) => {
    const orderNum = formatOrderNumber(item.orderId?.orderNumber);
    const hasReply = !!item.adminReply;
    return (
      <Card style={styles.card}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.orderNumber}>#{orderNum}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.reviewHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.customerName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.reviewInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <Text style={styles.stars}>{buildStars(item.rating)}</Text>
          </View>
        </View>
        {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}

        {/* Admin reply display */}
        {hasReply ? (
          <View style={styles.replyBox}>
            <View style={styles.replyLabelRow}>
              <Text style={styles.replyLabel}>Your Reply</Text>
              {item.adminReplyUpdatedAt ? (
                <Text style={styles.replyEditedTag}>
                  edited {formatDate(item.adminReplyUpdatedAt)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.replyText}>{item.adminReply}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => openReplyModal(item, "feedback")} activeOpacity={0.7} style={{ flex: 1, marginRight: 8 }}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.replyBtn}>
              <Ionicons name={hasReply ? "create" : "chatbubble"} size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.replyBtnText}>{hasReply ? "Edit Reply" : "Reply"}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn2} onPress={() => handleDeleteFeedback(item)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroWrap}>
        <AdminHeroCard
          icon="chatbubbles-outline"
          badge="Guest Voice"
          title="Reviews Dashboard"
          subtitle="Watch dish sentiment, reply to service feedback, and keep the guest experience visible to the team."
          colors={["#FFF4EC", "#F9D8C8", "#FFF8F2"]}
          borderColor="#F2C6B0"
          shadowColor="#B36B45"
          onActionPress={onRefresh}
        />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "reviews" && styles.tabActive]}
          onPress={() => setActiveTab("reviews")}
        >
          <Text style={[styles.tabText, activeTab === "reviews" && styles.tabTextActive]}>
            Dish Reviews ({reviews.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "feedback" && styles.tabActive]}
          onPress={() => setActiveTab("feedback")}
        >
          <Text style={[styles.tabText, activeTab === "feedback" && styles.tabTextActive]}>
            Service Feedback ({feedbackList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "reviews" ? (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item._id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={<EmptyState message="No dish reviews yet." />}
        />
      ) : (
        <FlatList
          data={feedbackList}
          keyExtractor={(item) => item._id}
          renderItem={renderFeedback}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
          ListEmptyComponent={<EmptyState message="No service feedback yet." />}
        />
      )}

      {/* ── Unified Reply / Edit-Reply Modal ── */}
      <Modal visible={showReplyModal} transparent animationType="slide" onRequestClose={closeReplyModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons
                  name={isEditing ? "create-outline" : "chatbubble-outline"}
                  size={20}
                  color={COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.modalTitle}>
                  {isEditing ? "Edit Reply" : "Reply to " + (replyTarget?.mode === "review" ? "Review" : "Feedback")}
                </Text>
              </View>
              <TouchableOpacity onPress={closeReplyModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            {replyTarget && (
              <View style={styles.modalBody}>
                {/* Customer context */}
                <View style={styles.modalContext}>
                  <View style={styles.modalAvatarSmall}>
                    <Text style={styles.modalAvatarText}>
                      {replyTarget.customerName?.charAt(0)?.toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalCustomer}>{replyTarget.customerName}</Text>
                    <Text style={styles.modalStars}>{buildStars(replyTarget.rating)}</Text>
                  </View>
                </View>
                {replyTarget.comment ? (
                  <Text style={styles.modalComment}>"{replyTarget.comment}"</Text>
                ) : null}

                {/* If editing, show current reply as reference */}
                {isEditing ? (
                  <View style={styles.currentReplyBox}>
                    <Text style={styles.currentReplyLabel}>Current reply</Text>
                    <Text style={styles.currentReplyText}>{replyTarget.adminReply}</Text>
                  </View>
                ) : null}

                <TextInput
                  style={styles.replyInput}
                  placeholder={isEditing ? "Update your reply..." : "Write your reply..."}
                  placeholderTextColor={COLORS.gray}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, replyText.length >= 280 && styles.charCountWarn]}>
                  {replyText.length}/300
                </Text>

                <TouchableOpacity onPress={handleSubmitReply} disabled={replying} activeOpacity={0.7}>
                  <LinearGradient
                    colors={GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.submitReplyBtn, replying && { opacity: 0.6 }]}
                  >
                    <Ionicons
                      name={isEditing ? "checkmark-circle" : "send"}
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.submitReplyText}>
                      {replying
                        ? (isEditing ? "Updating..." : "Sending...")
                        : (isEditing ? "Update Reply" : "Send Reply")}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },

  // Tabs
  tabRow: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: COLORS.lightGray,
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.heading },

  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  // Shared card styles
  card: { padding: 16 },
  dishName: {
    fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary,
    marginBottom: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + "20",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.primary },
  reviewInfo: { flex: 1 },
  customerName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  stars: { color: COLORS.primary, fontSize: 16, marginBottom: 6 },
  comment: {
    fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal,
    lineHeight: 20, marginBottom: 8,
  },

  // Feedback specific
  feedbackHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },

  // Admin reply bubble
  replyBox: {
    marginTop: 4, marginBottom: 8, padding: 10, backgroundColor: "#DAA520" + "15",
    borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#DAA520",
  },
  replyLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  replyLabel: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: "#DAA520" },
  replyEditedTag: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, fontStyle: "italic" },
  replyText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal },

  // Action buttons
  actionRow: { flexDirection: "row", marginTop: 8 },
  replyBtn: {
    borderRadius: 8, paddingVertical: 8,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  replyBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: "#fff" },
  deleteBtn2: {
    backgroundColor: COLORS.error, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, justifyContent: "center",
  },
  deleteBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: COLORS.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center" },
  modalTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  modalBody: { padding: 20 },
  modalContext: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  modalAvatarSmall: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + "20",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  modalAvatarText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.primary },
  modalCustomer: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  modalStars: { color: COLORS.primary, fontSize: 16 },
  modalComment: {
    fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal,
    fontStyle: "italic", marginBottom: 12,
  },

  // Current reply reference (edit mode)
  currentReplyBox: {
    backgroundColor: "#DAA520" + "10", borderRadius: 8, borderLeftWidth: 3,
    borderLeftColor: "#DAA520", padding: 10, marginBottom: 12,
  },
  currentReplyLabel: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: "#DAA520", marginBottom: 4 },
  currentReplyText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, fontStyle: "italic" },

  replyInput: {
    height: 100, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, fontFamily: FONTS.body, fontSize: SIZES.body,
    backgroundColor: COLORS.white,
  },
  charCount: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray,
    textAlign: "right", marginTop: 4, marginBottom: 16,
  },
  charCountWarn: { color: COLORS.error },
  submitReplyBtn: {
    borderRadius: 10, paddingVertical: 14,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  submitReplyText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: "#fff" },
});
