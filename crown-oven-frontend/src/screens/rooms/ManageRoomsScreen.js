import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  listAmenities,
  createAmenity,
  updateAmenity,
} from "../../services/roomService";
import { formatAmenityPrice, getAmenityIcon, getAmenityKey, getAmenityLabel } from "../../utils/roomAmenities";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];
const ROOM_TYPES = ["private", "vip", "party"];

const TYPE_COLORS = {
  private: "#1565C0",
  vip: "#DAA520",
  party: "#E8732A",
};

function sanitizeRoomName(value = "") {
  return value.replace(/\d+/g, "");
}

function sanitizeInteger(value = "") {
  return value.replace(/\D+/g, "");
}

function sanitizePrice(value = "") {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  if (decimals.length === 0) {
    return whole;
  }
  return `${whole}.${decimals.join("")}`;
}

const defaultRoomForm = {
  name: "",
  type: "",
  capacity: "",
  pricePerHour: "",
  description: "",
  amenities: [],
};

const defaultAmenityForm = {
  name: "",
  price: "",
  isChargeable: false,
  isActive: true,
};

export default function ManageRoomsScreen() {
  const [rooms, setRooms] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [amenityModalVisible, setAmenityModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAmenity, setSavingAmenity] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [form, setForm] = useState(defaultRoomForm);
  const [amenityForm, setAmenityForm] = useState(defaultAmenityForm);
  const [selectedImage, setSelectedImage] = useState(null);

  const activeAmenities = useMemo(
    () => amenities.filter((amenity) => amenity.isActive !== false),
    [amenities]
  );

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, amenitiesRes] = await Promise.all([listRooms(), listAmenities()]);
      setRooms(roomsRes.data?.rooms || roomsRes.data || []);
      setAmenities(amenitiesRes.data?.amenities || amenitiesRes.data || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load room data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingRoom(null);
    setForm(defaultRoomForm);
    setSelectedImage(null);
    setModalVisible(true);
  };

  const openEdit = (room) => {
    setEditingRoom(room);
    setForm({
      name: room.name || "",
      type: room.type || "",
      capacity: String(room.capacity || ""),
      pricePerHour: String(room.pricePerHour || ""),
      description: room.description || "",
      amenities: (room.amenities || []).map((amenity) => getAmenityKey(amenity)),
    });
    setSelectedImage(room.image ? { uri: room.image } : null);
    setModalVisible(true);
  };

  const openAmenityCreate = () => {
    setEditingAmenity(null);
    setAmenityForm(defaultAmenityForm);
    setAmenityModalVisible(true);
  };

  const openAmenityEdit = (amenity) => {
    setEditingAmenity(amenity);
    setAmenityForm({
      name: amenity.name || "",
      price: String(amenity.price || 0),
      isChargeable: !!amenity.isChargeable,
      isActive: amenity.isActive !== false,
    });
    setAmenityModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `room_${Date.now()}.jpg`,
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
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `room_${Date.now()}.jpg`,
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

  const toggleRoomAmenity = (amenityId) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const handleSaveRoom = async () => {
    const trimmedName = form.name.trim();
    const trimmedCapacity = form.capacity.trim();
    const trimmedPricePerHour = form.pricePerHour.trim();

    if (!trimmedName || !form.type || !trimmedCapacity || !trimmedPricePerHour) {
      Alert.alert("Error", "Name, type, capacity, and price are required.");
      return;
    }
    if (/\d/.test(trimmedName)) {
      Alert.alert("Error", "Room name cannot contain numbers.");
      return;
    }
    if (!/^\d+$/.test(trimmedCapacity)) {
      Alert.alert("Error", "Capacity must contain numbers only.");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(trimmedPricePerHour)) {
      Alert.alert("Error", "Price per hour must contain numbers only.");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", trimmedName);
      data.append("type", form.type);
      data.append("capacity", trimmedCapacity);
      data.append("pricePerHour", trimmedPricePerHour);
      data.append("description", form.description);
      data.append("amenities", JSON.stringify(form.amenities));

      if (editingRoom?.image && !selectedImage?.uri) {
        data.append("removeImage", "true");
      }

      if (selectedImage?.isNew) {
        data.append("image", {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName,
        });
      }

      if (editingRoom) {
        await updateRoom(editingRoom._id, data);
      } else {
        await createRoom(data);
      }

      setModalVisible(false);
      setForm(defaultRoomForm);
      setSelectedImage(null);
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAmenity = async () => {
    const trimmedAmenityName = amenityForm.name.trim();
    const trimmedAmenityPrice = String(amenityForm.price || "").trim();

    if (!trimmedAmenityName) {
      Alert.alert("Error", "Amenity name is required.");
      return;
    }
    if (amenityForm.isChargeable && !/^\d+(\.\d+)?$/.test(trimmedAmenityPrice)) {
      Alert.alert("Error", "Amenity price must contain numbers only.");
      return;
    }

    setSavingAmenity(true);
    try {
      const payload = {
        name: trimmedAmenityName,
        price: amenityForm.isChargeable ? Number(trimmedAmenityPrice || 0) : 0,
        isChargeable: amenityForm.isChargeable,
        isActive: amenityForm.isActive,
      };

      if (editingAmenity) {
        await updateAmenity(editingAmenity._id, payload);
      } else {
        await createAmenity(payload);
      }

      setAmenityModalVisible(false);
      setAmenityForm(defaultAmenityForm);
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Amenity save failed");
    } finally {
      setSavingAmenity(false);
    }
  };

  const handleDelete = (room) => {
    Alert.alert("Delete Room", `Delete \"${room.name}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoom(room._id);
            fetchData();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Delete failed");
          }
        },
      },
    ]);
  };

  const handleToggleAvailable = async (room) => {
    try {
      const data = new FormData();
      data.append("isAvailable", String(!room.isAvailable));
      await updateRoom(room._id, data);
      fetchData();
    } catch (err) {
      Alert.alert("Error", "Update failed");
    }
  };

  const renderAmenityCatalog = () => (
    <Card style={styles.catalogCard}>
      <View style={styles.catalogHeader}>
        <Text style={styles.catalogTitle}>Amenity Catalog</Text>
        <Text style={styles.catalogSubtitle}>
          Manage chargeable room add-ons and included features.
        </Text>
        <TouchableOpacity style={styles.catalogAddBtn} onPress={openAmenityCreate}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={styles.catalogAddText}>Add</Text>
        </TouchableOpacity>
      </View>

      {amenities.length === 0 ? (
        <Text style={styles.emptyCatalogText}>No amenities yet. Add your first amenity to assign it to rooms.</Text>
      ) : (
        <View style={styles.catalogGrid}>
          {amenities.map((amenity) => (
            <TouchableOpacity
              key={amenity._id}
              activeOpacity={0.85}
              style={[styles.amenityCard, amenity.isActive === false && styles.amenityCardInactive]}
              onPress={() => openAmenityEdit(amenity)}
            >
              <View style={styles.amenityCardTop}>
                <View style={styles.amenityIconWrap}>
                  <Ionicons name={getAmenityIcon(amenity)} size={14} color={COLORS.primary} />
                </View>
                <View style={[styles.statusPill, amenity.isActive === false && styles.statusPillMuted]}>
                  <Text style={[styles.statusPillText, amenity.isActive === false && styles.statusPillTextMuted]}>
                    {amenity.isActive === false ? "Inactive" : amenity.isChargeable ? "Paid" : "Included"}
                  </Text>
                </View>
              </View>
              <Text style={styles.amenityCardTitle}>{getAmenityLabel(amenity)}</Text>
              <Text style={styles.amenityCardPrice}>{formatAmenityPrice(amenity)}</Text>
              <Text style={styles.amenityCardAction}>Tap to edit</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );

  const renderRoom = ({ item }) => {
    const typeColor = TYPE_COLORS[item.type] || COLORS.gray;
    const visibleAmenities = (item.amenities || []).slice(0, 3);

    return (
      <Card style={styles.roomCard}>
        <View style={styles.roomRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.roomThumb} />
          ) : (
            <View style={styles.roomThumbPlaceholder}>
              <Ionicons name="business-outline" size={22} color={COLORS.gray} />
            </View>
          )}
          <View style={styles.roomInfo}>
            <Text style={styles.roomName}>{item.name}</Text>
            <View style={styles.metaLine}>
              <View style={[styles.typeBadgeSmall, { backgroundColor: typeColor + "1A" }]}>
                <Text style={[styles.typeTextSmall, { color: typeColor }]}>
                  {item.type?.charAt(0).toUpperCase() + item.type?.slice(1)}
                </Text>
              </View>
              <Text style={styles.roomMeta}>{item.capacity} guests | Rs. {item.pricePerHour}/hr</Text>
            </View>
            <Text style={[styles.roomStatus, { color: item.isAvailable ? COLORS.success : COLORS.error }]}>
              {item.isAvailable ? "Available" : "Unavailable"}
            </Text>
          </View>
        </View>

        {visibleAmenities.length > 0 && (
          <View style={styles.roomAmenityRow}>
            {visibleAmenities.map((amenity) => (
              <View key={getAmenityKey(amenity)} style={styles.roomAmenityTag}>
                <Text style={styles.roomAmenityTagText}>{getAmenityLabel(amenity)}</Text>
              </View>
            ))}
          </View>
        )}

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
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item._id}
        renderItem={renderRoom}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={() => (
          <View>
            <AdminHeroCard
              icon="business-outline"
              badge="Room Portfolio"
              title="Room Dashboard"
              subtitle="Manage private spaces, pricing, and amenity packages with a cleaner premium control panel."
              colors={["#F6F0EA", "#E4D4C5", "#FCF8F4"]}
              borderColor="#D9C4B2"
              shadowColor="#7F6251"
              onActionPress={onRefresh}
            />
            {renderAmenityCatalog()}
          </View>
        )}
        ListEmptyComponent={<EmptyState message="No rooms yet" />}
      />

      <TouchableOpacity onPress={openAdd} activeOpacity={0.8}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fab}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.fabText}>Add Room</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingRoom ? "Edit Room" : "Add New Room"}</Text>

              <Text style={styles.fieldLabel}>Room Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.7}>
                {selectedImage?.uri ? (
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.gray} />
                    <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                  </View>
                )}
                {selectedImage?.uri && (
                  <View style={styles.imageEditOverlay}>
                    <Ionicons name="camera" size={18} color={COLORS.white} />
                    <Text style={styles.imageEditText}>Change</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Input
                label="Room Name"
                value={form.name}
                onChangeText={(value) => setForm({ ...form, name: sanitizeRoomName(value) })}
                placeholder="e.g. Royal Suite"
              />

              <Text style={styles.fieldLabel}>Room Type</Text>
              <View style={styles.chipRow}>
                {ROOM_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, form.type === type && styles.chipActive]}
                    onPress={() => setForm({ ...form, type })}
                  >
                    <Text style={[styles.chipText, form.type === type && styles.chipTextActive]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Capacity"
                value={form.capacity}
                onChangeText={(value) => setForm({ ...form, capacity: sanitizeInteger(value) })}
                placeholder="Max guests"
                keyboardType="numeric"
              />

              <Input
                label="Price Per Hour (Rs.)"
                value={form.pricePerHour}
                onChangeText={(value) => setForm({ ...form, pricePerHour: sanitizePrice(value) })}
                placeholder="0.00"
                keyboardType="numeric"
              />

              <View style={styles.fieldHeaderRow}>
                <Text style={styles.fieldLabel}>Amenities</Text>
                <TouchableOpacity onPress={openAmenityCreate}>
                  <Text style={styles.inlineAction}>Manage catalog</Text>
                </TouchableOpacity>
              </View>
              {activeAmenities.length === 0 ? (
                <Text style={styles.emptyFieldText}>No active amenities yet. Add them from the catalog first.</Text>
              ) : (
                <View style={styles.amenitySelectList}>
                  {activeAmenities.map((amenity) => {
                    const amenityId = amenity._id;
                    const isSelected = form.amenities.includes(amenityId);
                    return (
                      <TouchableOpacity
                        key={amenityId}
                        style={[styles.amenitySelectCard, isSelected && styles.amenitySelectCardActive]}
                        onPress={() => toggleRoomAmenity(amenityId)}
                      >
                        <View style={styles.amenitySelectInfo}>
                          <Ionicons
                            name={getAmenityIcon(amenity)}
                            size={18}
                            color={isSelected ? COLORS.charcoal : COLORS.primary}
                          />
                          <View>
                            <Text style={[styles.amenitySelectTitle, isSelected && styles.amenitySelectTextActive]}>
                              {getAmenityLabel(amenity)}
                            </Text>
                            <Text style={[styles.amenitySelectSubtitle, isSelected && styles.amenitySelectTextActive]}>
                              {formatAmenityPrice(amenity)}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={isSelected ? COLORS.charcoal : COLORS.gray}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Input
                label="Description"
                value={form.description}
                onChangeText={(value) => setForm({ ...form, description: value })}
                placeholder="Room description"
                multiline
              />

              <Button title={editingRoom ? "Update" : "Add Room"} onPress={handleSaveRoom} loading={saving} />
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

      <Modal visible={amenityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingAmenity ? "Edit Amenity" : "Add Amenity"}</Text>

              <Input
                label="Amenity Name"
                value={amenityForm.name}
                onChangeText={(value) => setAmenityForm({ ...amenityForm, name: value })}
                placeholder="e.g. Smart TV"
              />

              <Text style={styles.fieldLabel}>Pricing Type</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !amenityForm.isChargeable && styles.chipActive]}
                  onPress={() => setAmenityForm({ ...amenityForm, isChargeable: false, price: "0" })}
                >
                  <Text style={[styles.chipText, !amenityForm.isChargeable && styles.chipTextActive]}>Included</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, amenityForm.isChargeable && styles.chipActive]}
                  onPress={() => setAmenityForm({ ...amenityForm, isChargeable: true, price: amenityForm.isChargeable ? amenityForm.price : "" })}
                >
                  <Text style={[styles.chipText, amenityForm.isChargeable && styles.chipTextActive]}>Chargeable</Text>
                </TouchableOpacity>
              </View>

              {amenityForm.isChargeable ? (
                <Input
                  label="Price (Rs.)"
                  value={amenityForm.price}
                  onChangeText={(value) => setAmenityForm({ ...amenityForm, price: sanitizePrice(value) })}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              ) : null}

              <Text style={styles.fieldLabel}>Visibility</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, amenityForm.isActive && styles.chipActive]}
                  onPress={() => setAmenityForm({ ...amenityForm, isActive: true })}
                >
                  <Text style={[styles.chipText, amenityForm.isActive && styles.chipTextActive]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, !amenityForm.isActive && styles.chipActive]}
                  onPress={() => setAmenityForm({ ...amenityForm, isActive: false })}
                >
                  <Text style={[styles.chipText, !amenityForm.isActive && styles.chipTextActive]}>Inactive</Text>
                </TouchableOpacity>
              </View>

              <Button
                title={editingAmenity ? "Update Amenity" : "Add Amenity"}
                onPress={handleSaveAmenity}
                loading={savingAmenity}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setAmenityModalVisible(false)}
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
  list: { padding: 16, paddingBottom: 96 },
  catalogCard: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  catalogHeader: {
    marginBottom: 14,
  },
  catalogTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.h1,
    color: COLORS.black,
  },
  catalogSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  catalogAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#F6F1E7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  catalogAddText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  emptyCatalogText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
  },
  catalogGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  amenityCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.background,
  },
  amenityCardInactive: {
    opacity: 0.7,
  },
  amenityCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  amenityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + "15",
  },
  statusPill: {
    backgroundColor: COLORS.success + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillMuted: {
    backgroundColor: COLORS.gray + "20",
  },
  statusPillText: {
    fontFamily: FONTS.heading,
    fontSize: 10,
    color: COLORS.success,
  },
  statusPillTextMuted: {
    color: COLORS.gray,
  },
  amenityCardTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: COLORS.black,
    marginTop: 4,
  },
  amenityCardPrice: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  amenityCardAction: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  roomCard: { marginBottom: 14 },
  roomRow: { flexDirection: "row", alignItems: "center" },
  roomThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
  },
  roomThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  roomInfo: { flex: 1 },
  roomName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  roomMeta: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  roomStatus: { fontFamily: FONTS.medium, fontSize: SIZES.caption, marginTop: 3 },
  typeBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeTextSmall: {
    fontFamily: FONTS.heading,
    fontSize: 10,
  },
  roomAmenityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  roomAmenityTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.primary + "12",
  },
  roomAmenityTagText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.primary,
  },
  actionRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  editBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: COLORS.primary + "15",
    borderRadius: 8,
  },
  editText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.primary },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: COLORS.accent + "15",
    borderRadius: 8,
  },
  toggleText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.accent },
  delBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: COLORS.error + "15",
    borderRadius: 8,
  },
  delText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.error },
  fab: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: { fontFamily: FONTS.heading, fontSize: SIZES.button, color: COLORS.white },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "88%",
  },
  smallModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.h1,
    color: COLORS.black,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.black,
    marginBottom: 8,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inlineAction: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.primary,
  },
  emptyFieldText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginBottom: 16,
  },
  imagePicker: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderStyle: "dashed",
  },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightGray + "80",
  },
  imagePlaceholderText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 8,
  },
  imageEditOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    gap: 6,
  },
  imageEditText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: "#F6F1E7",
    borderColor: "#E6D7B8",
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  chipTextActive: {
    color: COLORS.charcoal,
    fontFamily: FONTS.heading,
  },
  amenitySelectList: {
    gap: 8,
    marginBottom: 16,
  },
  amenitySelectCard: {
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amenitySelectCardActive: {
    backgroundColor: "#F6F1E7",
    borderColor: "#E6D7B8",
  },
  amenitySelectInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amenitySelectTitle: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.black,
  },
  amenitySelectSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  amenitySelectTextActive: {
    color: COLORS.charcoal,
  },
});














