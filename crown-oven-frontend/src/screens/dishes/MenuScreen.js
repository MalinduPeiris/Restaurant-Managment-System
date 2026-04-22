import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { getPublicDishes } from "../../services/dishService";
import { useCart } from "../../context/CartContext";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Logo from "../../components/common/Logo";
import DISH_CATEGORIES from "../../constants/categories";

const CATEGORIES = ["All", ...DISH_CATEGORIES];
const CART_GREEN = "#2D6A43";
const CART_GREEN_DARK = "#1E4E31";

export default function MenuScreen({ navigation }) {
  const { addToCart, getQuantity } = useCart();
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [pickerVisible, setPickerVisible] = useState(false);

  const fetchDishes = useCallback(async () => {
    try {
      const params = {};
      if (activeCategory !== "All") params.category = activeCategory;
      if (search) params.search = search;
      const res = await getPublicDishes(params);
      setDishes(res.data);
    } catch (err) {
      console.error("Fetch dishes error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, search]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDishes();
    }, [fetchDishes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDishes();
  }, [fetchDishes]);

  const selectCategory = (cat) => {
    setActiveCategory(cat);
    setPickerVisible(false);
  };

  const renderDish = ({ item }) => {
    const qty = getQuantity(item._id);
    return (
      <TouchableOpacity style={styles.dishCard} onPress={() => navigation.navigate("DishDetail", { dishId: item._id })} activeOpacity={0.7}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.dishImage} />
        ) : (
          <View style={[styles.dishImage, styles.dishPlaceholder]}>
            <Text style={styles.dishInitial}>{item.name?.[0]}</Text>
          </View>
        )}
        <View style={styles.dishInfo}>
          <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.star}>{"\u2605"}</Text>
            <Text style={styles.ratingText}>{item.averageRating?.toFixed(1) || "0.0"} ({item.ratingCount || 0})</Text>
          </View>
          <Text style={styles.dishPrice}>Rs. {item.price?.toFixed(2)}</Text>

          <TouchableOpacity
            style={styles.addCartBtn}
            onPress={() => addToCart(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={14} color={COLORS.white} />
            <Text style={styles.addCartText}>
              {qty > 0 ? `In Cart (${qty})` : "Add to Cart"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Logo />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes..."
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={16} color={COLORS.charcoal} />
          <Text style={styles.dropdownLabel}>
            {activeCategory === "All" ? "All Categories" : activeCategory}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.gray} />
        </TouchableOpacity>

        {activeCategory !== "All" && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setActiveCategory("All")}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={styles.divider} />

            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.modalItem, isActive && styles.modalItemActive]}
                  onPress={() => selectCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                    {cat === "All" ? "All Categories" : cat}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={dishes}
        keyExtractor={(item) => item._id}
        renderItem={renderDish}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<EmptyState message="No dishes available" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, paddingBottom: 12, paddingTop: 12 },
  searchInput: {
    height: 44, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: SIZES.body,
    backgroundColor: COLORS.white, color: COLORS.black,
  },

  dropdownWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 8,
  },
  dropdown: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.white, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.lightGray,
    paddingHorizontal: 14, paddingVertical: 11, gap: 8,
  },
  dropdownLabel: {
    flex: 1, fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal,
  },
  clearBtn: { marginLeft: 10, padding: 4 },

  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  modalCard: {
    width: "100%", backgroundColor: COLORS.white,
    borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  modalTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h1,
    color: COLORS.black, textAlign: "center", marginBottom: 12,
  },
  divider: {
    height: 1, backgroundColor: COLORS.lightGray, marginBottom: 6,
  },
  modalItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12,
    marginVertical: 2,
  },
  modalItemActive: {
    backgroundColor: COLORS.primary + "15",
  },
  modalItemText: {
    fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal,
  },
  modalItemTextActive: {
    fontFamily: FONTS.heading, color: COLORS.primary,
  },

  grid: { padding: 12 },
  gridRow: { justifyContent: "space-between" },
  dishCard: {
    width: "48%", backgroundColor: COLORS.white, borderRadius: 12,
    marginBottom: 12, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  dishImage: { width: "100%", height: 120, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  dishPlaceholder: { backgroundColor: COLORS.primary + "20", justifyContent: "center", alignItems: "center" },
  dishInitial: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.primary },
  dishInfo: { padding: 10 },
  dishName: { fontFamily: FONTS.heading, fontSize: 13, color: COLORS.black },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  star: { color: COLORS.primary, fontSize: 12, marginRight: 2 },
  ratingText: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray },
  dishPrice: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.primary, marginTop: 4 },
  addCartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: CART_GREEN, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: CART_GREEN_DARK,
    shadowColor: CART_GREEN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 6, gap: 4,
  },
  addCartText: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.white },
});

