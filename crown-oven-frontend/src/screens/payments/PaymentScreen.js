/**
 * PaymentScreen.js
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { createPayment, getPaymentByOrder } from "../../services/paymentService";

const METHODS = [
  {
    key: "cash",
    label: "Cash Payment",
    deliveryLabel: "Cash on Delivery",
    icon: "cash-outline",
    description: "Settle at the counter when collecting your takeaway order.",
    deliveryDescription: "Pay the rider when your delivery arrives.",
    eyebrow: "Simple checkout",
    helper: "Best for quick takeaway settlement.",
    deliveryHelper: "Best if you want to pay when the order reaches you.",
    colors: ["#F7E6B5", "#F2C866"],
  },
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    icon: "business-outline",
    description: "Transfer now and upload your receipt as proof for admin verification.",
    eyebrow: "Verified payment",
    helper: "Ideal if you want to pay before arrival or dispatch.",
    colors: ["#F7D9C5", "#E89E61"],
  },
];

export default function PaymentScreen({ route, navigation }) {
  const { orderId, totalAmount, orderType } = route.params;
  const normalizedOrderType = orderType === "pickup" ? "pickup" : "delivery";

  const [method, setMethod] = useState(normalizedOrderType === "delivery" ? "bank_transfer" : "cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [existingPayment, setExistingPayment] = useState(null);

  const availableMethods = METHODS
    .filter((item) => normalizedOrderType === "delivery" || item.key === "cash")
    .map((item) => (
      item.key === "cash" && normalizedOrderType === "delivery"
        ? {
            ...item,
            label: item.deliveryLabel,
            description: item.deliveryDescription,
            helper: item.deliveryHelper,
          }
        : item
    ));

  useEffect(() => {
    const defaultMethod = availableMethods[0]?.key;
    if (defaultMethod && !availableMethods.some((item) => item.key === method)) {
      setMethod(defaultMethod);
    }
  }, [availableMethods, method]);

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await getPaymentByOrder(orderId);
        if (res.data) setExistingPayment(res.data);
        setLookupError("");
      } catch (err) {
        if (err.response?.status === 404) {
          setExistingPayment(null);
          setLookupError("");
        } else {
          setLookupError("Could not verify payment status. Please try again.");
        }
      }
    };

    checkExisting();
  }, [orderId]);

  const handleConfirm = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await createPayment({ orderId, paymentMethod: method });
      const paymentId = res.data?._id || res.data?.payment?._id;
      const payment = res.data?.payment || res.data;
      setExistingPayment(payment || null);

      if (method === "bank_transfer") {
        navigation.replace("UploadProof", { paymentId });
      } else {
        Alert.alert(
          "Success",
          existingPayment?.status === "rejected"
            ? normalizedOrderType === "delivery"
              ? "Payment restarted. Please pay the rider on delivery."
              : "Payment restarted. Please pay cash when collecting your takeaway order."
            : normalizedOrderType === "delivery"
              ? "Cash on delivery recorded. Please pay the rider when your order arrives."
              : "Cash payment recorded. Please pay cash when collecting your takeaway order."
        );
        navigation.goBack();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedMethod = availableMethods.find((item) => item.key === method) || availableMethods[0];
  const existingStatus = existingPayment?.status;
  const canRetryRejected = existingStatus === "rejected";
  const hasBlockingPayment = !!existingPayment && !canRetryRejected;
  const canSubmitPayment = !lookupError && !hasBlockingPayment;

  const existingBannerText = existingStatus === "verified"
    ? "Payment already verified for this order."
    : existingStatus === "rejected"
      ? "Previous payment was rejected. Choose a method and submit again."
      : existingStatus === "submitted"
        ? "Payment already submitted. Awaiting admin verification."
        : existingStatus === "pending"
          ? "Payment created. Complete the next step or wait for verification."
          : "Payment already exists for this order.";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#FFF7E4", "#F7E7C3", "#F9F4EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>Secure Payment Step</Text>
              <Text style={styles.heroTitle}>Complete Your Order</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={COLORS.charcoal} />
              <Text style={styles.heroBadgeText}>Crown Oven</Text>
            </View>
          </View>

          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>Order Total</Text>
            <Text style={styles.totalAmount}>Rs. {Number(totalAmount).toFixed(2)}</Text>
            <Text style={styles.totalNote}>
              {normalizedOrderType === "delivery"
                ? "Choose between bank deposit or cash on delivery for this order."
                : "Takeaway orders are paid by cash at collection."}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.sectionSubtext}>
            {normalizedOrderType === "delivery"
              ? "Pick the option that best suits your delivery checkout."
              : "Takeaway orders currently support cash only."}
          </Text>
        </View>

        {availableMethods.map((item) => {
          const isSelected = method === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.methodCard, isSelected && styles.methodCardActive]}
              onPress={() => setMethod(item.key)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isSelected ? item.colors : ["#FFFFFF", "#FFFDFC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.methodGradient}
              >
                <View style={styles.methodTopRow}>
                  <View style={[styles.methodIconWrap, isSelected && styles.methodIconWrapActive]}>
                    <Ionicons name={item.icon} size={24} color={isSelected ? COLORS.charcoal : COLORS.primary} />
                  </View>

                  <View style={styles.methodTextWrap}>
                    <Text style={styles.methodEyebrow}>{item.eyebrow}</Text>
                    <Text style={styles.methodTitle}>{item.label}</Text>
                    <Text style={styles.methodDescription}>{item.description}</Text>
                  </View>

                  <View style={[styles.selector, isSelected && styles.selectorActive]}>
                    {isSelected ? <Ionicons name="checkmark" size={15} color={COLORS.white} /> : null}
                  </View>
                </View>

                <View style={styles.methodFooterRow}>
                  <Text style={styles.methodHelper}>{item.helper}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        <LinearGradient
          colors={method === "bank_transfer" ? ["#FFF2E6", "#FBE7D7"] : ["#FFF8EA", "#F7EED8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.guidanceCard}
        >
          <View style={styles.guidanceIconWrap}>
            <Ionicons
              name={method === "bank_transfer" ? "receipt-outline" : "storefront-outline"}
              size={18}
              color={COLORS.charcoal}
            />
          </View>
          <View style={styles.guidanceTextWrap}>
            <Text style={styles.guidanceTitle}>
              {method === "bank_transfer" ? "Bank transfer guidance" : "Cash payment guidance"}
            </Text>
            <Text style={styles.guidanceText}>
              {method === "bank_transfer"
                ? "After confirming payment, you will move to the receipt upload step to submit your bank slip for admin verification."
                : normalizedOrderType === "delivery"
                  ? "After confirming payment, your cash on delivery selection will be recorded and you can settle with the rider when the order arrives."
                  : "After confirming payment, your cash selection will be recorded and you can settle at the counter when collecting your takeaway order."}
            </Text>
          </View>
        </LinearGradient>

        {lookupError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{lookupError}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {existingPayment ? (
          <LinearGradient
            colors={canRetryRejected ? ["#FDECEA", "#F8D4CF"] : ["#FFF3D6", "#F6E4B0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.existingBanner}
          >
            <Ionicons name={canRetryRejected ? "refresh-outline" : "time-outline"} size={18} color={COLORS.charcoal} />
            <Text style={styles.existingText}>{existingBannerText}</Text>
          </LinearGradient>
        ) : null}

        {canSubmitPayment ? (
          <TouchableOpacity
            style={[styles.ctaShadow, loading && styles.ctaDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#D6A11E", "#E3A72E", "#F28A3C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>
                {loading ? "Confirming..." : `${canRetryRejected ? "Retry" : "Confirm"} ${selectedMethod.label}`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 22, paddingBottom: 32 },
  heroCard: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F2DEAE",
    shadowColor: "#A87C1D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  heroEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.accent,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: FONTS.title,
    fontSize: 30,
    color: COLORS.black,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.08)",
  },
  heroBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
    color: COLORS.charcoal,
  },
  totalWrap: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  totalLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
    marginBottom: 6,
  },
  totalAmount: {
    fontFamily: FONTS.bold,
    fontSize: 38,
    color: COLORS.primary,
    marginBottom: 8,
  },
  totalNote: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    lineHeight: 18,
    color: COLORS.gray,
  },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: COLORS.black,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  methodCard: {
    borderRadius: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.08)",
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  methodCardActive: {
    borderColor: "#E1B54B",
    shadowColor: "#D6A11E",
    shadowOpacity: 0.14,
  },
  methodGradient: { borderRadius: 22, padding: 18 },
  methodTopRow: { flexDirection: "row", alignItems: "flex-start" },
  methodIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF5DD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  methodIconWrapActive: { backgroundColor: "rgba(255,255,255,0.72)" },
  methodTextWrap: { flex: 1, paddingRight: 10 },
  methodEyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: COLORS.accent,
    marginBottom: 3,
  },
  methodTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: COLORS.black,
    marginBottom: 4,
  },
  methodDescription: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    lineHeight: 18,
    color: COLORS.charcoal,
  },
  selector: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "rgba(45,45,45,0.2)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  selectorActive: { backgroundColor: COLORS.charcoal, borderColor: COLORS.charcoal },
  methodFooterRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(45,45,45,0.08)",
  },
  methodHelper: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  guidanceCard: {
    borderRadius: 20,
    padding: 18,
    marginTop: 6,
    marginBottom: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(232,115,42,0.1)",
  },
  guidanceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    marginRight: 12,
  },
  guidanceTextWrap: { flex: 1 },
  guidanceTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginBottom: 4,
  },
  guidanceText: {
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
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.error,
  },
  existingBanner: {
    marginTop: 8,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(218,165,32,0.2)",
  },
  existingText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  ctaShadow: {
    marginTop: 14,
    borderRadius: 18,
    shadowColor: "#D38E1C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaButton: {
    borderRadius: 18,
    minHeight: 58,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.button,
    color: COLORS.white,
  },
});
