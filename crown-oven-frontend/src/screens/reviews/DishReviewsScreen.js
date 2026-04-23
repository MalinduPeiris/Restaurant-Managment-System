/**
 * DishReviewsScreen.js
 *
 * Displays all reviews for a specific dish.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getDishReviews } from "../../services/reviewService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

export default function DishReviewsScreen({ route, navigation }) {
  const { dishId, dishName } = route.params;

  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState("0.0");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      setLoadError("");
      const res = await getDishReviews(dishId);
      const data = res.data;

      if (data?.reviews) {
        setReviews(data.reviews);
        setAvgRating(Number(data.averageRating || 0).toFixed(1));
      } else {
        const list = Array.isArray(data) ? data : [];
        setReviews(list);
        setAvgRating("0.0");
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setReviews([]);
      setAvgRating("0.0");
      setLoadError(err.response?.data?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dishId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReviews();
    }, [fetchReviews])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const buildStars = (rating) => {
    const filled = Math.round(rating);
    return "\u2605".repeat(filled) + "\u2606".repeat(5 - filled);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const renderReview = ({ item }) => (
    <Card style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.customerName?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.reviewStars}>{buildStars(item.rating)}</Text>
      {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}

      {/* Admin reply */}
      {item.adminReply ? (
        <View style={styles.adminReplyBox}>
          <Text style={styles.adminReplyLabel}>Response from the restaurant</Text>
          <Text style={styles.adminReplyText}>{item.adminReply}</Text>
        </View>
      ) : null}
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.dishName}>{dishName}</Text>
        <View style={styles.avgRow}>
          <Text style={styles.avgStars}>{buildStars(Number(avgRating))}</Text>
          <Text style={styles.avgText}>{avgRating} ({reviews.length} reviews)</Text>
        </View>
      </View>

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderReview}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={<EmptyState message={loadError ? "Could not load reviews." : "No reviews yet. Be the first!"} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  backBtn: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.primary },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  dishName: { fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black, marginBottom: 4 },
  avgRow: { flexDirection: "row", alignItems: "center" },
  avgStars: { color: COLORS.primary, fontSize: 20, marginRight: 8 },
  avgText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  errorText: {
    paddingHorizontal: 20,
    marginBottom: 8,
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.error,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  reviewCard: { padding: 16 },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + "20",
    justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.primary },
  reviewInfo: { flex: 1 },
  customerName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  reviewDate: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  reviewStars: { color: COLORS.primary, fontSize: 16, marginBottom: 6 },
  reviewComment: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, lineHeight: 20 },
  adminReplyBox: {
    marginTop: 10, padding: 10,
    backgroundColor: "#DAA52015", borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: "#DAA520",
  },
  adminReplyLabel: {
    fontFamily: FONTS.heading, fontSize: SIZES.caption,
    color: "#DAA520", marginBottom: 4,
  },
  adminReplyText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal },
});


