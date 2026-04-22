import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { createReview } from "../../services/reviewService";
import Button from "../../components/common/Button";

const MAX_COMMENT = 220;
const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const RATING_COPY = {
  0: "Tap a star to rate your dish",
  1: "Needs improvement",
  2: "Below expectations",
  3: "Good overall",
  4: "Really enjoyable",
  5: "Outstanding dish",
};

export default function WriteReviewScreen({ route, navigation }) {
  const { dishId, dishName } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (rating === 0) {
      setError("Please select a rating before submitting your review.");
      return;
    }
    setLoading(true);
    try {
      await createReview({ dishId, rating, comment: comment.trim() });
      Alert.alert("Thank You!", "Your review has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <LinearGradient
            colors={["#FFF7E6", "#FFF1D6", "#FDE7C2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>Dish Review</Text>
              </View>
            </View>
            <Text style={styles.pageTitle}>Write a Review</Text>
            <Text style={styles.heroSubtitle}>Share your dining experience for this dish.</Text>

            <View style={styles.dishCard}>
              <Text style={styles.dishLabel}>Reviewing</Text>
              <Text style={styles.dishName}>{dishName}</Text>
            </View>
          </LinearGradient>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <Text style={styles.sectionHint}>Select the stars that match your experience.</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= rating;
                return (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    activeOpacity={0.75}
                    style={[styles.starBtn, active && styles.starBtnActive]}
                  >
                    <Ionicons
                      name={active ? "star" : "star-outline"}
                      size={30}
                      color={active ? COLORS.primary : COLORS.lightGray}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.ratingSummary}>
              <Text style={styles.ratingValue}>{rating === 0 ? "Not rated yet" : `${rating} / 5`}</Text>
              <Text style={styles.ratingLabel}>{RATING_COPY[rating] || RATING_COPY[0]}</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Comment</Text>
            <Text style={styles.sectionHint}>Optional, but helpful for service improvement.</Text>

            <View style={styles.commentShell}>
              <TextInput
                placeholder="Tell us what you liked, what could improve, or how the dish tasted..."
                placeholderTextColor={COLORS.gray}
                value={comment}
                onChangeText={(text) => setComment(text.slice(0, MAX_COMMENT))}
                multiline
                textAlignVertical="top"
                style={styles.commentTextArea}
              />
            </View>

            <View style={styles.commentFooter}>
              <Text style={styles.commentTip}>Keep it short, honest, and specific.</Text>
              <Text style={styles.charCount}>{comment.length}/{MAX_COMMENT}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            title="Submit Review"
            onPress={handleSubmit}
            loading={loading}
            disabled={rating === 0}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(218,165,32,0.18)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  heroChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(34,34,34,0.08)",
  },
  heroChipText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.charcoal,
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 16,
  },
  dishCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
  },
  dishLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginBottom: 4,
  },
  dishName: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h1,
    color: COLORS.charcoal,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },
  sectionHint: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 4,
    marginBottom: 14,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  starBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  starBtnActive: {
    backgroundColor: "#FFF8E8",
    borderColor: "rgba(218,165,32,0.35)",
  },
  ratingSummary: {
    alignItems: "center",
  },
  ratingValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h1,
    color: COLORS.primary,
  },
  ratingLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    marginTop: 4,
  },
  commentShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 160,
  },
  commentTextArea: {
    minHeight: 120,
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.black,
    lineHeight: 22,
    padding: 0,
  },
  commentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  commentTip: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    flex: 1,
    marginRight: 10,
  },
  charCount: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.error,
  },
  submitBtn: {
    marginTop: 6,
  },
});
