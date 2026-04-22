import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import DISH_CATEGORIES from "../../constants/categories";
import { getAdminDishes, addDish, updateDish, deleteDish } from "../../services/dishService";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

function sanitizeDishName(value = "") {
  return value.replace(/\d+/g, "");
}

function sanitizePrice(value = "") {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  if (decimals.length === 0) {
    return whole;
  }
  return `${whole}.${decimals.join("")}`;
}

export default function ManageDishesScreen() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", description: "", price: "" });
  const [selectedImage, setSelectedImage] = useState(null); // { uri, type, fileName }

  const fetchDishes = async () => {
    try {
      const res = await getAdminDishes();
      setDishes(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to load dishes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDishes(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchDishes(); }, []);

  const openAdd = () => {
    setEditingDish(null);
    setForm({ name: "", category: "", description: "", price: "" });
    setSelectedImage(null);
    setModalVisible(true);
  };

  const openEdit = (dish) => {
    setEditingDish(dish);
    setForm({
      name: dish.name,
      category: dish.category,
      description: dish.description || "",
      price: String(dish.price),
    });
    setSelectedImage(dish.imageUrl ? { uri: dish.imageUrl } : null);
    setModalVisible(true);
  };

  // ── Image picker ────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `dish_${Date.now()}.jpg`,
        isNew: true,
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `dish_${Date.now()}.jpg`,
        isNew: true,
      });
    }
  };

  const showImageOptions = () => {
    Alert.alert("Add Image", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      ...(selectedImage ? [{ text: "Remove", style: "destructive", onPress: () => setSelectedImage(null) }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── Save dish ───────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimmedName = form.name.trim();
    const trimmedPrice = form.price.trim();

    if (!trimmedName || !form.category || !trimmedPrice) {
      Alert.alert("Error", "Name, category, and price are required");
      return;
    }
    if (/\d/.test(trimmedName)) {
      Alert.alert("Error", "Dish name cannot contain numbers");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(trimmedPrice)) {
      Alert.alert("Error", "Price must contain numbers only");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        category: form.category,
        description: form.description,
        price: trimmedPrice,
      };

      const hasNewImage = !!selectedImage?.isNew;
      const shouldRemoveImage = !!editingDish?.imageUrl && !selectedImage?.uri;

      if (hasNewImage || shouldRemoveImage) {
        const data = new FormData();
        data.append("name", trimmedName);
        data.append("category", form.category);
        data.append("description", form.description);
        data.append("price", trimmedPrice);

        if (shouldRemoveImage) {
          data.append("removeImage", "true");
        }

        if (hasNewImage) {
          data.append("image", {
            uri: selectedImage.uri,
            type: selectedImage.type,
            name: selectedImage.fileName,
          });
        }

        if (editingDish) {
          await updateDish(editingDish._id, data);
        } else {
          await addDish(data);
        }
      } else if (editingDish) {
        await updateDish(editingDish._id, payload);
      } else {
        await addDish(payload);
      }

      setModalVisible(false);
      fetchDishes();
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Save failed";
      Alert.alert("Error", message);
      console.error("Dish save failed:", err.response?.data || err.message || err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dish) => {
    Alert.alert("Delete Dish", `Delete "${dish.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteDish(dish._id); fetchDishes(); }
          catch (err) { Alert.alert("Error", "Delete failed"); }
        },
      },
    ]);
  };

  const handleToggleAvailable = async (dish) => {
    try {
      const data = new FormData();
      data.append("isAvailable", String(!dish.isAvailable));
      await updateDish(dish._id, data);
      fetchDishes();
    } catch (err) {
      Alert.alert("Error", "Update failed");
    }
  };

  // ── Render dish card ────────────────────────────────────────────────
  const renderDish = ({ item }) => (
    <Card>
      <View style={styles.dishRow}>
        {/* Dish image thumbnail */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.dishThumb} />
        ) : (
          <View style={styles.dishThumbPlaceholder}>
            <Ionicons name="restaurant-outline" size={22} color={COLORS.gray} />
          </View>
        )}
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.dishCat}>{item.category} · Rs. {item.price?.toFixed(2)}</Text>
          <Text
            style={[styles.dishStatus, { color: item.isAvailable ? COLORS.success : COLORS.error }]}
          >
            {item.isAvailable ? "Available" : "Unavailable"}
          </Text>
        </View>
        <Text style={styles.dishRating}>★ {item.averageRating?.toFixed(1)}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleBtn} onPress={() => handleToggleAvailable(item)}>
          <Text style={styles.toggleText}>{item.isAvailable ? "Disable" : "Enable"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.delText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <FlatList
        data={dishes}
        keyExtractor={(item) => item._id}
        renderItem={renderDish}
        ListHeaderComponent={(
          <AdminHeroCard
            icon="restaurant-outline"
            badge="Menu Studio"
            title="Dish Dashboard"
            subtitle="Shape the menu, manage availability, and keep every featured dish presentation-ready."
            colors={["#FFF2EA", "#F4D3BF", "#FFF9F4"]}
            borderColor="#EBC0A9"
            shadowColor="#AA6B49"
            onActionPress={onRefresh}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={<EmptyState message="No dishes yet" />}
      />

      {/* FAB */}
      <TouchableOpacity onPress={openAdd} activeOpacity={0.8}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fab}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.fabText}>Add Dish</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Add / Edit Modal ──────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingDish ? "Edit Dish" : "Add New Dish"}
              </Text>

              {/* ── Image Picker ──────────────────────────────────── */}
              <Text style={styles.fieldLabel}>Dish Image</Text>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={showImageOptions}
                activeOpacity={0.7}
              >
                {selectedImage?.uri ? (
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.gray} />
                    <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                  </View>
                )}
                {/* Edit overlay when image is present */}
                {selectedImage?.uri && (
                  <View style={styles.imageEditOverlay}>
                    <Ionicons name="camera" size={18} color={COLORS.white} />
                    <Text style={styles.imageEditText}>Change</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Input
                label="Name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: sanitizeDishName(v) })}
                placeholder="Dish name"
              />
              {/* ── Category Selector ─────────────────────────────── */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryChipRow}>
                {DISH_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      form.category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        form.category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input
                label="Price (Rs.)"
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: sanitizePrice(v) })}
                placeholder="0.00"
                keyboardType="numeric"
              />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Short description"
                multiline
              />
              <Button
                title={editingDish ? "Update" : "Add Dish"}
                onPress={handleSave}
                loading={saving}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setModalVisible(false)}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 80 },

  // Dish card
  dishRow: { flexDirection: "row", alignItems: "center" },
  dishThumb: {
    width: 52, height: 52, borderRadius: 10, marginRight: 12,
    backgroundColor: COLORS.lightGray,
  },
  dishThumbPlaceholder: {
    width: 52, height: 52, borderRadius: 10, marginRight: 12,
    backgroundColor: COLORS.lightGray, justifyContent: "center", alignItems: "center",
  },
  dishInfo: { flex: 1 },
  dishName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  dishCat: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray, marginTop: 2 },
  dishStatus: { fontFamily: FONTS.medium, fontSize: SIZES.caption, marginTop: 2 },
  dishRating: { fontFamily: FONTS.bold, fontSize: SIZES.body, color: COLORS.primary },

  // Action buttons
  actionRow: { flexDirection: "row", marginTop: 10, gap: 8 },
  editBtn: {
    flex: 1, paddingVertical: 8, alignItems: "center",
    backgroundColor: COLORS.primary + "15", borderRadius: 8,
  },
  editText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.primary },
  toggleBtn: {
    flex: 1, paddingVertical: 8, alignItems: "center",
    backgroundColor: COLORS.accent + "15", borderRadius: 8,
  },
  toggleText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.accent },
  delBtn: {
    flex: 1, paddingVertical: 8, alignItems: "center",
    backgroundColor: COLORS.error + "15", borderRadius: 8,
  },
  delText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.error },

  // FAB
  fab: {
    position: "absolute", bottom: 20, left: 20, right: 20,
    borderRadius: 12, paddingVertical: 14, flexDirection: "row",
    justifyContent: "center", alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  fabText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: COLORS.white },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: "85%",
  },
  modalTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black, marginBottom: 16,
  },

  // Image picker
  fieldLabel: {
    fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black, marginBottom: 8,
  },
  imagePicker: {
    width: "100%", height: 180, borderRadius: 16, overflow: "hidden",
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.lightGray,
    borderStyle: "dashed",
  },
  imagePreview: {
    width: "100%", height: "100%", resizeMode: "cover",
  },
  imagePlaceholder: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.lightGray + "80",
  },
  imagePlaceholderText: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray, marginTop: 8,
  },
  imageEditOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row",
    justifyContent: "center", alignItems: "center", paddingVertical: 8, gap: 6,
  },
  imageEditText: {
    fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.white,
  },

  // Category chips
  categoryChipRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.lightGray, backgroundColor: COLORS.white,
  },
  categoryChipActive: {
    backgroundColor: COLORS.charcoal, borderColor: COLORS.charcoal,
  },
  categoryChipText: {
    fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal,
  },
  categoryChipTextActive: {
    color: COLORS.white, fontFamily: FONTS.heading,
  },
});











