/**
 * CartScreen.js
 *
 * Shows all items the customer has added to their cart.
 * From here they can:
 *  - Adjust quantities (+/-)
 *  - Remove items
 *  - Choose order type (Delivery / Pickup)
 *  - Enter delivery address (if delivery)
 *  - See estimated total (backend recalculates)
 *  - Place the order
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { createOrder } from "../../services/orderService";
import { getProfile } from "../../services/authService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";

const ORDER_TYPES = [
  { key: "delivery", label: "Delivery" },
  { key: "pickup", label: "Takeaway" },
];

export default function CartScreen({ navigation }) {
  const { user } = useAuth();
  const { cartItems, cartItemCount, cartTotal, addToCart, removeFromCart, clearCart } = useCart();

  const [orderType, setOrderType] = useState("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch user profile to pre-fill delivery address
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const res = await getProfile();
        const profile = res.data?.user || res.data;
        if (profile?.address) {
          setDeliveryAddress(profile.address);
        }
      } catch {
        // Silently fail — user can still type address manually
      }
    };
    fetchAddress();
  }, []);

  // ── Place Order ────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (cartItemCount === 0) {
      Alert.alert("Empty Cart", "Please add at least one item to your order.");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      Alert.alert("Missing Info", "Please enter a delivery address.");
      return;
    }

    const items = cartItems.map((item) => ({
      dishId: item.dish._id,
      quantity: item.quantity,
    }));

    const payload = { orderType, items };
    if (orderType === "delivery") {
      payload.deliveryAddress = deliveryAddress;
    }

    setSubmitting(true);
    try {
      const res = await createOrder(payload);
      const newOrder = res.data?.order || res.data;
      clearCart();
      Alert.alert("Success", "Your order has been placed!", [
        {
          text: "View Order",
          onPress: () => navigation.navigate("OrderDetail", { orderId: newOrder._id }),
        },
        { text: "OK" },
      ]);
    } catch (err) {
      Alert.alert(
        "Order Failed",
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Empty cart ──────────────────────────────────────────────────────
  if (cartItemCount === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.pageTitle}>My Cart</Text>
        <View style={styles.emptyContainer}>
          {/* Cart illustration circle */}
          <View style={styles.emptyCircle}>
            <View style={styles.emptyCircleInner}>
              <Ionicons name="cart-outline" size={56} color={COLORS.primary} />
            </View>
          </View>

          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Looks like you haven't added anything yet.{"\n"}Explore our menu and find something delicious!
          </Text>

          <TouchableOpacity
            style={styles.browseBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Menu")}
          >
            <Ionicons name="restaurant-outline" size={18} color={COLORS.white} />
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>My Cart</Text>

          {/* ── Cart Items ──────────────────────────────────────── */}
          {cartItems.map((item) => (
            <Card style={styles.itemCard} key={item.dish._id}>
              <View style={styles.itemRow}>
                {item.dish.imageUrl ? (
                  <Image source={{ uri: item.dish.imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemPlaceholder]}>
                    <Text style={styles.itemInitial}>{item.dish.name?.[0]}</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.dish.name}</Text>
                  <Text style={styles.itemPrice}>Rs. {item.dish.price?.toFixed(2)}</Text>
                </View>

                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => removeFromCart(item.dish._id)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, styles.qtyBtnAdd]}
                    onPress={() => addToCart(item.dish)}
                  >
                    <Text style={[styles.qtyBtnText, styles.qtyBtnAddText]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.lineTotal}>
                Rs. {(item.dish.price * item.quantity).toFixed(2)}
              </Text>
            </Card>
          ))}

          {/* ── Order Type ──────────────────────────────────────── */}
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.chipRow}>
            {ORDER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.chip, orderType === type.key && styles.chipActive]}
                onPress={() => setOrderType(type.key)}
              >
                <Text style={[styles.chipText, orderType === type.key && styles.chipTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Delivery Address ─────────────────────────────────── */}
          {orderType === "delivery" && (
            <View style={styles.section}>
              <Input
                label="Delivery Address"
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
            </View>
          )}

          {/* ── Summary ─────────────────────────────────────────── */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cartItemCount})</Text>
              <Text style={styles.summaryValue}>Rs. {cartTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Est. Total</Text>
              <Text style={styles.totalValue}>Rs. {cartTotal.toFixed(2)}</Text>
            </View>
            <Text style={styles.estNote}>Final total calculated by server</Text>
          </Card>

          <Button
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={submitting}
            style={{ marginTop: 8, marginBottom: 32 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20 },

  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
  },

  // ── Item card ──────────────────────────────────────────────────────
  itemCard: { marginBottom: 10, padding: 12 },
  itemRow: { flexDirection: "row", alignItems: "center" },
  itemImage: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  itemPlaceholder: { backgroundColor: COLORS.primary + "20", justifyContent: "center", alignItems: "center" },
  itemInitial: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  itemInfo: { flex: 1, marginRight: 8 },
  itemName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  itemPrice: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.accent, marginTop: 2 },
  lineTotal: {
    fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal,
    textAlign: "right", marginTop: 6,
  },

  // ── Qty controls ──────────────────────────────────────────────────
  qtyControls: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.lightGray,
    justifyContent: "center", alignItems: "center",
  },
  qtyBtnAdd: { backgroundColor: COLORS.primary },
  qtyBtnText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.charcoal },
  qtyBtnAddText: { color: COLORS.black },
  qtyText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black, marginHorizontal: 10 },

  // ── Section ───────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black,
    marginBottom: 12, marginTop: 16,
  },
  section: { marginTop: 4 },

  // ── Chips ─────────────────────────────────────────────────────────
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    borderWidth: 1.5, borderColor: COLORS.gray, marginRight: 10, marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.charcoal, borderColor: COLORS.charcoal },
  chipText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.heading },

  // ── Summary ───────────────────────────────────────────────────────
  summaryCard: { marginTop: 16, padding: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  summaryLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  summaryValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 10 },
  totalLabel: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  totalValue: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  estNote: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, textAlign: "center", marginTop: 6 },

  // ── Empty cart ─────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 40, paddingBottom: 60,
  },
  emptyCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: COLORS.primary + "12",
    justifyContent: "center", alignItems: "center",
    marginBottom: 28,
  },
  emptyCircleInner: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primary + "20",
    justifyContent: "center", alignItems: "center",
  },
  emptyTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h1,
    color: COLORS.black, marginBottom: 10, textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FONTS.body, fontSize: SIZES.body,
    color: COLORS.gray, textAlign: "center", lineHeight: 22,
    marginBottom: 28,
  },
  browseBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.charcoal, paddingHorizontal: 28,
    paddingVertical: 14, borderRadius: 14,
  },
  browseBtnText: {
    fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.white,
  },
});
