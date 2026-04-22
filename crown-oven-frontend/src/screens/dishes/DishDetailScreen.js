import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getDishById } from "../../services/dishService";
import { getMyOrders } from "../../services/orderService";
import { getMyReviews } from "../../services/reviewService";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const HERO_GRADIENT = ["rgba(0,0,0,0)", "rgba(20,20,20,0.15)", "rgba(20,20,20,0.75)"];
const CART_GREEN = "#2D6A43";
const CART_GREEN_DARK = "#1E4E31";

function renderStars(value) {
  const rounded = Math.round(value || 0);
  return Array.from({ length: 5 }, (_, index) => index < rounded);
}

function matchesDishId(value, dishId) {
  if (!value) return false;
  if (typeof value === "string") return value === dishId;
  if (typeof value === "object") return String(value._id || value.id || value) === dishId;
  return String(value) === dishId;
}

export default function DishDetailScreen({ route, navigation }) {
  const { dishId } = route.params;
  const { addToCart, getQuantity } = useCart();
  const { user } = useAuth();
  const [dish, setDish] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [reviewEligibilityLoaded, setReviewEligibilityLoaded] = useState(false);

  const fetchDish = useCallback(async () => {
    try {
      const dishRes = await getDishById(dishId);
      setDish(dishRes.data);

      if (user?.role === "customer") {
        const [ordersResult, reviewsResult] = await Promise.allSettled([getMyOrders(), getMyReviews()]);
        const ordersLoaded = ordersResult.status === "fulfilled" && Array.isArray(ordersResult.value?.data);
        const reviewsLoaded = reviewsResult.status === "fulfilled" && Array.isArray(reviewsResult.value?.data);
        const orders = ordersLoaded ? ordersResult.value.data : [];
        const reviews = reviewsLoaded ? reviewsResult.value.data : [];

        const hasCompletedOrder = orders.some((order) =>
          ["Delivered", "Collected"].includes(order.status) &&
          Array.isArray(order.items) &&
          order.items.some((item) => matchesDishId(item.dishId, dishId))
        );

        const hasReviewed = reviews.some((review) => matchesDishId(review.dishId, dishId));
        setCanWriteReview(ordersLoaded && reviewsLoaded && hasCompletedOrder && !hasReviewed);
        setReviewEligibilityLoaded(ordersLoaded && reviewsLoaded);
      } else {
        setCanWriteReview(false);
        setReviewEligibilityLoaded(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dishId, user?.role]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDish();
    }, [fetchDish])
  );

  if (loading) return <LoadingSpinner />;
  if (!dish) return <View style={styles.safe}><Text>Dish not found</Text></View>;

  const quantityInCart = getQuantity(dish._id);
  const averageRating = Number(dish.averageRating || 0);
  const ratingCount = Number(dish.ratingCount || 0);
  const showWriteReview = user?.role === "customer" && reviewEligibilityLoaded && canWriteReview;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {dish.imageUrl ? (
            <Image source={{ uri: dish.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.imageInitial}>{dish.name?.[0]}</Text>
            </View>
          )}

          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroOverlay}
          >
            <View style={styles.heroTopBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={18} color={COLORS.white} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>

              {quantityInCart > 0 && (
                <View style={styles.cartPill}>
                  <Ionicons name="bag-handle-outline" size={14} color={COLORS.white} />
                  <Text style={styles.cartPillText}>{quantityInCart} in cart</Text>
                </View>
              )}
            </View>

            <View style={styles.heroContent}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{dish.category}</Text>
              </View>
              <Text style={styles.heroName}>{dish.name}</Text>
              <Text style={styles.heroTagline}>Crafted with bold flavor and Crown Oven style.</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.contentCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Dish Price</Text>
              <Text style={styles.price}>Rs. {dish.price?.toFixed(2)}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeValue}>{averageRating.toFixed(1)}</Text>
              <Text style={styles.ratingBadgeText}>Guest rating</Text>
            </View>
          </View>

          <View style={styles.reviewRow}>
            <View style={styles.starStrip}>
              {renderStars(averageRating).map((filled, index) => (
                <Ionicons
                  key={index}
                  name={filled ? "star" : "star-outline"}
                  size={16}
                  color={COLORS.primary}
                />
              ))}
            </View>
            <Text style={styles.reviewMeta}>
              {averageRating.toFixed(1)} ({ratingCount} review{ratingCount === 1 ? "" : "s"})
            </Text>
          </View>

          {dish.description ? (
            <View style={styles.storyCard}>
              <Text style={styles.storyLabel}>About This Dish</Text>
              <Text style={styles.description}>{dish.description}</Text>
            </View>
          ) : null}

          <View style={styles.highlightRow}>
            <View style={styles.highlightCard}>
              <Ionicons name="flame-outline" size={18} color={COLORS.primary} />
              <Text style={styles.highlightTitle}>Chef Pick</Text>
              <Text style={styles.highlightText}>Popular among guests looking for a rich and satisfying meal.</Text>
            </View>
            <View style={styles.highlightCard}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
              <Text style={styles.highlightTitle}>Freshly Made</Text>
              <Text style={styles.highlightText}>Prepared with restaurant-style flavor and plated for a premium feel.</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title={quantityInCart > 0 ? `Add More (${quantityInCart} in cart)` : "Add to Cart"}
              colors={[CART_GREEN, CART_GREEN_DARK]}
              onPress={() => {
                addToCart(dish);
                Alert.alert("Added!", `${dish.name} added to cart.`, [
                  { text: "View Cart", onPress: () => navigation.navigate("CustomerHome", { screen: "Cart" }) },
                  { text: "Continue", style: "cancel" },
                ]);
              }}
              style={styles.addToCartButton}
            />

            <View style={styles.secondaryRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate("DishReviews", { dishId: dish._id, dishName: dish.name })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>View Reviews</Text>
              </TouchableOpacity>
              {showWriteReview ? (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate("WriteReview", { dishId: dish._id, dishName: dish.name })}
                >
                  <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.secondaryBtnText}>Write Review</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {user?.role === "customer" && !showWriteReview ? (
              <Text style={styles.reviewHint}>
                {reviewEligibilityLoaded
                  ? "Reviews can be added only after a completed order, and only once per dish."
                  : "Review eligibility could not be checked right now."}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 36 },
  heroWrap: {
    height: 420,
    position: "relative",
    marginBottom: -28,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    backgroundColor: COLORS.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  imageInitial: {
    fontFamily: FONTS.bold,
    fontSize: 72,
    color: COLORS.primary,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  heroTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(24,24,24,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  cartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(24,24,24,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  cartPillText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.white,
  },
  heroContent: {
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,247,230,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  categoryText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.primary,
  },
  heroName: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.white,
    lineHeight: 40,
  },
  heroTagline: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 21,
    maxWidth: "85%",
  },
  contentCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 16,
  },
  priceLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginBottom: 4,
  },
  price: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: COLORS.primary,
  },
  ratingBadge: {
    minWidth: 92,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF8E8",
    alignItems: "center",
  },
  ratingBadgeValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h1,
    color: COLORS.charcoal,
  },
  ratingBadgeText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 10,
  },
  starStrip: {
    flexDirection: "row",
    gap: 3,
  },
  reviewMeta: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.gray,
  },
  storyCard: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  storyLabel: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.primary,
    marginBottom: 8,
  },
  description: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
    lineHeight: 24,
  },
  highlightRow: {
    gap: 12,
    marginBottom: 18,
  },
  highlightCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: 16,
    backgroundColor: COLORS.white,
  },
  highlightTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.black,
    marginTop: 10,
    marginBottom: 6,
  },
  highlightText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    lineHeight: 20,
  },
  actions: {
    marginTop: 4,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  secondaryBtnText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  reviewHint: {
    marginTop: 12,
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    lineHeight: 18,
  },
});
