import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listAllDeliveries, assignRider, listRiders } from "../../services/deliveryService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";
import { formatOrderNumber } from "../../utils/orderNumber";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

const STATUS_COLORS = {
  PENDING: COLORS.gray,
  ASSIGNED: "#E8732A",
  ON_THE_WAY: "#DAA520",
  DELIVERED: "#2E7D32",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ON_THE_WAY: "On the Way",
  DELIVERED: "Delivered",
};

const FILTERS = ["All", "PENDING", "ASSIGNED", "ON_THE_WAY", "DELIVERED"];
const FILTER_LABELS = { All: "All", PENDING: "Pending", ASSIGNED: "Assigned", ON_THE_WAY: "On the Way", DELIVERED: "Delivered" };

export default function ManageDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  // Rider picker modal
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = activeFilter !== "All" ? { status: activeFilter } : {};
      const [delRes, riderRes] = await Promise.all([
        listAllDeliveries(params),
        listRiders(),
      ]);
      setDeliveries(delRes.data || []);
      setRiders(riderRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openRiderPicker = (delivery) => {
    setSelectedDelivery(delivery);
    setShowRiderModal(true);
  };

  const handleAssignRider = async (riderId) => {
    setShowRiderModal(false);
    try {
      await assignRider(selectedDelivery._id, riderId);
      Alert.alert("Success", "Rider assigned successfully");
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to assign rider.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  };

  const renderDelivery = ({ item }) => {
    const badgeColor = STATUS_COLORS[item.status] || COLORS.gray;
    const order = item.orderId;
    const rider = item.riderId;

    return (
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.orderNumber}>#{formatOrderNumber(order?.orderNumber)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor + "1A" }]}>
            <Text style={[styles.statusText, { color: badgeColor }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color={COLORS.gray} />
          <Text style={styles.infoText}>{item.deliveryAddress}</Text>
        </View>
        {item.customerPhone ? (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color={COLORS.gray} />
            <Text style={styles.infoText}>{item.customerPhone}</Text>
          </View>
        ) : null}

        {rider && (
          <View style={styles.riderRow}>
            <Ionicons name="bicycle" size={16} color={COLORS.primary} />
            <Text style={styles.riderText}>
              {rider.firstName} {rider.lastName} {rider.phone ? `(${rider.phone})` : ""}
            </Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.totalText}>Rs. {order?.totalAmount?.toFixed(2) || "0.00"}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Assign rider button — only for PENDING deliveries */}
        {item.status === "PENDING" && (
          <TouchableOpacity onPress={() => openRiderPicker(item)} activeOpacity={0.7}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.assignBtn}>
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.assignBtnText}>Assign Rider</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
            <View style={styles.heroWrap}>
      <AdminHeroCard
        icon="bicycle-outline"
        badge="Dispatch Desk"
        title="Delivery Dashboard"
        subtitle="Watch the delivery queue, assign riders quickly, and keep addresses and handoffs under control."
        colors={["#EEF8FF", "#D8ECFB", "#F7FBFF"]}
        borderColor="#C9DDEE"
        shadowColor="#4D7FA4"
        onActionPress={onRefresh}
      />
    </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item._id}
        renderItem={renderDelivery}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={<EmptyState message="No deliveries found." />}
      />

      {/* Rider Picker Modal */}
      <Modal visible={showRiderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Rider</Text>
              <TouchableOpacity onPress={() => setShowRiderModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.charcoal} />
              </TouchableOpacity>
            </View>

            {riders.length === 0 ? (
              <Text style={styles.noRiders}>No riders available. Create a rider first.</Text>
            ) : (
              <FlatList
                data={riders.filter((r) => !r.isBlocked)}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.riderOption}
                    onPress={() => handleAssignRider(item._id)}
                  >
                    <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.riderName}>{item.firstName} {item.lastName}</Text>
                      <Text style={styles.riderEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  filterContainer: { paddingLeft: 20, marginBottom: 8 },
  filterScroll: { gap: 8, paddingRight: 20 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.lightGray,
  },
  filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.charcoal },
  filterTextActive: { color: COLORS.black },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },

  card: { padding: 16 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumber: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontFamily: FONTS.heading, fontSize: SIZES.caption },

  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  infoText: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8, flex: 1 },

  riderRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#DAA520" + "15", padding: 8, borderRadius: 8, marginTop: 4, marginBottom: 4,
  },
  riderText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal, marginLeft: 8 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  totalText: { fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.primary },
  dateText: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },

  assignBtn: {
    marginTop: 12, borderRadius: 10, paddingVertical: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  assignBtnText: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "60%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  modalTitle: { fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black },
  noRiders: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray, padding: 20, textAlign: "center" },
  riderOption: {
    flexDirection: "row", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  riderName: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black },
  riderEmail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
});





