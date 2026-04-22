/**
 * CreateOrderScreen.js
 *
 * Allows a customer to build and place a new order.
 *
 * Flow:
 *   Step 1 – Choose order type (Delivery / Pickup).
 *   Step 2 – Browse the menu and add items to cart with +/- controls.
 *   Step 3 – Fill in delivery address (if delivery).
 *   Step 4 – Review estimated total and submit the order.
 *
 * If the screen receives `route.params.dishId` (e.g. from DishDetail),
 * that dish is automatically added to the cart with quantity 1.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { useAuth } from "../../context/AuthContext";
import { createOrder } from "../../services/orderService";
import { getPublicDishes } from "../../services/dishService";
import { getProfile } from "../../services/authService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// ── Supported order types ────────────────────────────────────────────
const ORDER_TYPES = [
  { key: "delivery", label: "Delivery" },
  { key: "pickup", label: "Takeaway" },
];

export default function CreateOrderScreen({ navigation, route }) {
  const { user } = useAuth();

  // ── Order type ────────────────────────────────────────────────────
  const [orderType, setOrderType] = useState("delivery");

  // ── Menu data & cart ──────────────────────────────────────────────
  const [dishes, setDishes] = useState([]);
  const [cart, setCart] = useState({});
  const [loadingDishes, setLoadingDishes] = useState(true);

  // ── Delivery specific field ───────────────────────────────────────
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // ── Submit state ──────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch dishes and user profile on mount ──────────────────────
  useEffect(() => {
    fetchDishes();
    // Pre-fill delivery address from user profile
    const fetchAddress = async () => {
      try {
        const res = await getProfile();
        const profile = res.data?.user || res.data;
        if (profile?.address) {
          setDeliveryAddress(profile.address);
        }
      } catch {
        // User can still type address manually
      }
    };
    fetchAddress();
  }, []);

  const fetchDishes = async () => {
    try {
      const res = await getPublicDishes();
      const list = res.data?.dishes || res.data || [];
      setDishes(list);

      // If a specific dish was passed via navigation, pre-select it
      const preSelectedId = route?.params?.dishId;
      if (preSelectedId) {
        setCart((prev) => ({ ...prev, [preSelectedId]: 1 }));
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load menu items.");
    } finally {
      setLoadingDishes(false);
    }
  };

  // ── Cart helpers ──────────────────────────────────────────────────
  const addToCart = (dishId) => {
    setCart((prev) => ({ ...prev, [dishId]: (prev[dishId] || 0) + 1 }));
  };

  const removeFromCart = (dishId) => {
    setCart((prev) => {
      const updated = { ...prev };
      if (updated[dishId] > 1) {
        updated[dishId] -= 1;
      } else {
        delete updated[dishId];
      }
      return updated;
    });
  };

  // ── Display-only subtotal estimate (backend recalculates) ─────────
  const subtotal = dishes.reduce((sum, dish) => {
    const qty = cart[dish._id] || 0;
    return sum + dish.price * qty;
  }, 0);

  const cartItemCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // ── Submit the order ──────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (cartItemCount === 0) {
      Alert.alert("Empty Cart", "Please add at least one item to your order.");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      Alert.alert("Missing Info", "Please enter a delivery address.");
      return;
    }

    const items = Object.entries(cart).map(([dishId, quantity]) => ({
      dishId,
      quantity,
    }));

    const payload = { orderType, items };
    if (orderType === "delivery") {
      payload.deliveryAddress = deliveryAddress;
    }

    setSubmitting(true);
    try {
      const res = await createOrder(payload);
      const newOrder = res.data?.order || res.data;
      Alert.alert("Success", "Your order has been placed!", [
        {
          text: "View Order",
          onPress: () =>
            navigation.navigate("OrderDetail", { orderId: newOrder._id }),
        },
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

  // ── Render a single dish row ──────────────────────────────────────
  const renderDishItem = (item) => {
    const qty = cart[item._id] || 0;

    return (
      <Card style={styles.dishCard} key={item._id}>
        <View style={styles.dishRow}>
          <View style={styles.dishInfo}>
            <Text style={styles.dishName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.dishPrice}>R {item.price?.toFixed(2)}</Text>
          </View>

          <View style={styles.qtyRow}>
            {qty > 0 && (
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => removeFromCart(item._id)}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
            )}
            {qty > 0 && <Text style={styles.qtyText}>{qty}</Text>}
            <TouchableOpacity
              style={[styles.qtyBtn, styles.qtyBtnAdd]}
              onPress={() => addToCart(item._id)}
            >
              <Text style={[styles.qtyBtnText, styles.qtyBtnAddText]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (loadingDishes) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Create Order</Text>

          {/* ── Step 1: Order Type ───────────────────────────────── */}
          <Text style={styles.sectionTitle}>Order Type</Text>
          <View style={styles.chipRow}>
            {ORDER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.chip, orderType === type.key && styles.chipActive]}
                onPress={() => setOrderType(type.key)}
              >
                <Text
                  style={[styles.chipText, orderType === type.key && styles.chipTextActive]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Step 2: Menu / Cart ──────────────────────────────── */}
          <Text style={styles.sectionTitle}>Select Items</Text>
          {dishes.length === 0 ? (
            <Text style={styles.emptyText}>No dishes available.</Text>
          ) : (
            dishes.map((dish) => renderDishItem(dish))
          )}

          {/* ── Step 3: Delivery Address ─────────────────────────── */}
          {orderType === "delivery" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>
              <Input
                label="Delivery Address"
                placeholder="Enter your delivery address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
            </View>
          )}

          {/* ── Step 4: Summary & Submit ─────────────────────────── */}
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cartItemCount})</Text>
              <Text style={styles.summaryValue}>R {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Est. Total</Text>
              <Text style={styles.totalValue}>R {subtotal.toFixed(2)}</Text>
            </View>
            <Text style={styles.estNote}>Final total calculated by server</Text>
          </Card>

          <Button
            title="Place Order"
            onPress={handlePlaceOrder}
            loading={submitting}
            disabled={cartItemCount === 0}
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

  pageTitle: { fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black, marginBottom: 20 },

  sectionTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black,
    marginBottom: 12, marginTop: 8,
  },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    borderWidth: 1.5, borderColor: COLORS.gray, marginRight: 10, marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.charcoal, borderColor: COLORS.charcoal },
  chipText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.heading },

  // Dish cards
  dishCard: { marginBottom: 8, padding: 12 },
  dishRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dishInfo: { flex: 1, marginRight: 12 },
  dishName: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black },
  dishPrice: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.accent, marginTop: 2 },

  // Quantity controls
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.lightGray,
    justifyContent: "center", alignItems: "center",
  },
  qtyBtnAdd: { backgroundColor: COLORS.primary },
  qtyBtnText: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.charcoal },
  qtyBtnAddText: { color: COLORS.black },
  qtyText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black, marginHorizontal: 10 },

  // Section
  section: { marginTop: 8 },

  // Summary
  summaryCard: { marginTop: 20, padding: 20 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  summaryLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  summaryValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  divider: { height: 1, backgroundColor: COLORS.lightGray, marginVertical: 10 },
  totalLabel: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  totalValue: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },

  emptyText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, marginBottom: 12 },
  estNote: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, textAlign: "center", marginTop: 6 },
});
