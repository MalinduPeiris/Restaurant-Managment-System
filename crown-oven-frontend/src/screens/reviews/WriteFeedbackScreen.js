import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { formatOrderNumber } from "../../utils/orderNumber";
import { FONTS, SIZES } from "../../constants/fonts";
import { submitFeedback } from "../../services/feedbackService";
import Button from "../../components/common/Button";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function WriteFeedbackScreen({ navigation, route }) {
  const { orderId, orderNumber } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [apiError, setApiError] = useState("");

  const handleSubmit = async () => {
    let hasError = false;
    setRatingError("");
    setCommentError("");
    setApiError("");

    if (rating === 0) {
      setRatingError("Please add a star rating.");
      hasError = true;
    }
    if (!comment.trim()) {
      setCommentError("Please add a comment.");
      hasError = true;
    }
    if (hasError) {
      Alert.alert(
        "Missing Information",
        rating === 0 && !comment.trim()
          ? "Please add a star rating and a comment before submitting."
          : rating === 0
          ? "Please add a star rating before submitting."
          : "Please add a comment before submitting."
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({ orderId, rating, comment: comment.trim() });
      Alert.alert("Thank You!", "Your feedback has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setApiError(err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.title}>Rate Experience</Text>
          </View>

          <Text style={styles.orderLabel}>Order #{formatOrderNumber(orderNumber)}</Text>

          {/* Star Rating */}
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => { setRating(star); setRatingError(""); }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={44}
                  color={star <= rating ? "#DAA520" : ratingError ? "#e53935" : COLORS.lightGray}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 0 ? "Tap a star to rate" :
              rating === 1 ? "Poor" :
                rating === 2 ? "Fair" :
                  rating === 3 ? "Good" :
                    rating === 4 ? "Very Good" : "Excellent"}
          </Text>
          {ratingError ? (
            <Text style={styles.fieldError}>{ratingError}</Text>
          ) : null}

          {/* Comment */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Comments <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.commentInput, commentError ? styles.commentInputError : null]}
            placeholder="Tell us about your experience..."
            placeholderTextColor={COLORS.gray}
            value={comment}
            onChangeText={(text) => { setComment(text); if (text.trim()) setCommentError(""); }}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          {commentError ? (
            <Text style={styles.fieldError}>{commentError}</Text>
          ) : null}
          <Text style={styles.charCount}>{comment.length}/300</Text>

          {apiError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#e53935" />
              <Text style={styles.errorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20, paddingBottom: 32 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black },

  orderLabel: {
    fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.gray,
    marginBottom: 24,
  },

  sectionTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black,
    marginBottom: 12,
  },

  starsRow: { flexDirection: "row", justifyContent: "center", marginBottom: 8 },
  star: { marginHorizontal: 6 },

  ratingLabel: {
    fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.primary,
    textAlign: "center", marginBottom: 24,
  },

  commentInput: {
    height: 120, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, fontFamily: FONTS.body, fontSize: SIZES.body,
    backgroundColor: COLORS.white,
  },
  commentInputError: {
    borderColor: "#e53935",
    backgroundColor: "#fff8f8",
  },
  charCount: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray,
    textAlign: "right", marginTop: 4, marginBottom: 16,
  },
  fieldError: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: "#e53935",
    marginTop: 4, marginBottom: 8,
  },

  submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: "#fff" },
  required: { color: "#e53935", fontFamily: FONTS.heading },
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
    color: "#e53935",
  },
});
