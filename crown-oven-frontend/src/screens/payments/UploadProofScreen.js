/**
 * UploadProofScreen.js
 * --------------------
 * Lets the customer pick a bank-slip image from their device gallery
 * and upload it as proof of payment.
 */

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { uploadProof } from "../../services/paymentService";

export default function UploadProofScreen({ route, navigation }) {
  const { paymentId } = route.params;

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need gallery access to upload your bank slip.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    setImage(result.assets[0]);
    setError("");
  };

  const handleUpload = async () => {
    if (!image) {
      setError("Please select an image first.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      const uri = image.uri;
      const filename = uri.split("/").pop();
      const ext = filename.split(".").pop().toLowerCase();
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";

      formData.append("proof", {
        uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
        name: filename,
        type: mimeType,
      });

      await uploadProof(paymentId, formData);

      Alert.alert("Success", "Bank slip uploaded successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#FFF8EB", "#F8E7C3", "#FBF4E7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.stepBadge}>
            <Ionicons name="receipt-outline" size={14} color={COLORS.charcoal} />
            <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
          </View>
          <Text style={styles.title}>Upload Bank Slip</Text>
          <Text style={styles.subtitle}>
            Add a clear image of your transfer receipt so the team can verify your payment quickly.
          </Text>
        </LinearGradient>

        <View style={styles.previewShell}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Receipt Preview</Text>
            <Text style={styles.previewHint}>{image ? "Ready to upload" : "Image required"}</Text>
          </View>

          <View style={styles.previewContainer}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={["#FFFDF8", "#F8F3E8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.placeholder}
              >
                <View style={styles.placeholderIconWrap}>
                  <Ionicons name="image-outline" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.placeholderTitle}>No receipt selected</Text>
                <Text style={styles.placeholderText}>
                  Choose a clear bank slip image with amount, account details, and date visible.
                </Text>
              </LinearGradient>
            )}
          </View>
        </View>

        <LinearGradient
          colors={["#FFF4E6", "#FDEBD5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipCard}
        >
          <Text style={styles.tipTitle}>Receipt tips</Text>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Keep the transfer amount clearly visible.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Avoid blurred, cropped, or dark screenshots.</Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.tipText}>Make sure the transfer date or reference can be read.</Text>
          </View>
        </LinearGradient>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity onPress={pickImage} activeOpacity={0.85} style={styles.secondaryButtonWrap}>
          <View style={styles.secondaryButton}>
            <Ionicons name={image ? "refresh-outline" : "images-outline"} size={18} color={COLORS.charcoal} />
            <Text style={styles.secondaryButtonText}>{image ? "Change Image" : "Select Image"}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUpload}
          disabled={!image || loading}
          activeOpacity={0.85}
          style={[styles.primaryButtonWrap, (!image || loading) && styles.primaryButtonDisabled]}
        >
          <LinearGradient
            colors={!image ? ["#D9D9D9", "#D9D9D9"] : ["#D6A11E", "#E3A72E", "#F28A3C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{loading ? "Uploading..." : "Upload Proof"}</Text>
            <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 22, paddingBottom: 34 },

  headerCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F2DEAE",
    shadowColor: "#A87C1D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  stepBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.charcoal,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 30,
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
    lineHeight: 22,
  },

  previewShell: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.08)",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  previewTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.black,
  },
  previewHint: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.accent,
  },
  previewContainer: {
    minHeight: 280,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EFE4CC",
    backgroundColor: "#FBF7EF",
  },
  previewImage: {
    width: "100%",
    height: 320,
  },
  placeholder: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  placeholderIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    marginBottom: 14,
  },
  placeholderTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.black,
    marginBottom: 8,
  },
  placeholderText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    lineHeight: 20,
    textAlign: "center",
    color: COLORS.gray,
  },

  tipCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(232,115,42,0.1)",
  },
  tipTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    lineHeight: 18,
    color: COLORS.charcoal,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FDECEA",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F6CBC6",
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.error,
  },

  secondaryButtonWrap: {
    marginTop: 4,
    marginBottom: 14,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(45,45,45,0.16)",
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryButtonText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.button,
    color: COLORS.charcoal,
  },

  primaryButtonWrap: {
    borderRadius: 18,
    shadowColor: "#D38E1C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  primaryButtonDisabled: { opacity: 0.72 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.button,
    color: COLORS.white,
  },
});
