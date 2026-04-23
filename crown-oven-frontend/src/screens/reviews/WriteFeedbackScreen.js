import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
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

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating ");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ orderId, rating, comment: comment.trim() });
      Alert.alert("Thank You!", "Your feedback has been submitted.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
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
            <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={44}
                color={star <= rating ? "#DAA520" : COLORS.lightGray}
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

        {/* Comment */}
        <Text style={styles.sectionTitle}>Comments (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell us about your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={300}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{comment.length}/300</Text>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={rating === 0 ? [COLORS.gray, COLORS.gray] : GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20 },

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
  charCount: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray,
    textAlign: "right", marginTop: 4, marginBottom: 24,
  },

  submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: "#fff" },
});
