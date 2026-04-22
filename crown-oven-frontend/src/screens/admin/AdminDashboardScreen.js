import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, StatusBar, Platform,
} from "react-native";
import { useFocusEffect, DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import API from "../../constants/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AdminHeroCard from "../../components/common/AdminHeroCard";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function AdminDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await API.get("/dashboard/admin");
      setData(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  if (loading || !data) return <LoadingSpinner />;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#DAA520" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        <AdminHeroCard
          icon="speedometer-outline"
          badge="Control Center"
          title="Admin Dashboard"
          subtitle="Watch revenue, kitchen flow, deliveries, and guest activity from one high-level operations view."
          colors={["#FFF7E8", "#EED8AF", "#FCF8EE"]}
          borderColor="#E9D2A2"
          shadowColor="#9E7A1D"
          onActionPress={onRefresh}
        />

        {/* Revenue Card */}
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.revenueCard}>
          <View style={styles.revenueRow}>
            <View>
              <Text style={styles.revenueLabel}>Total Revenue</Text>
              <Text style={styles.revenueAmount}>Rs. {data.revenue.total.toLocaleString()}</Text>
            </View>
            <View style={styles.revenueDivider} />
            <View>
              <Text style={styles.revenueLabel}>Today</Text>
              <Text style={styles.revenueAmount}>Rs. {data.revenue.today.toLocaleString()}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Orders Section */}
        <Text style={styles.sectionTitle}>Orders</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="receipt" label="Total" value={data.orders.total} color="#1A1A1A" onPress={() => navigation.navigate("ManageOrders")} />
          <StatCard icon="time" label="Pending" value={data.orders.pending} color="#E8732A" />
          <StatCard icon="flame" label="Preparing" value={data.orders.preparing} color="#DAA520" />
          <StatCard icon="checkmark-circle" label="Ready" value={data.orders.ready} color="#2E7D32" />
        </View>
        <View style={styles.todayRow}>
          <Ionicons name="today" size={16} color={COLORS.primary} />
          <Text style={styles.todayText}>Today's Orders: {data.orders.today}</Text>
        </View>

        {/* Deliveries Section */}
        <Text style={styles.sectionTitle}>Deliveries</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="hourglass" label="Pending" value={data.deliveries.pending} color="#E8732A" onPress={() => navigation.navigate("ManageDeliveries")} />
          <StatCard icon="bicycle" label="Active" value={data.deliveries.active} color="#DAA520" />
          <StatCard icon="checkmark-done" label="Completed" value={data.deliveries.completed} color="#2E7D32" />
        </View>

        {/* Payments Section */}
        <Text style={styles.sectionTitle}>Payments</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="alert-circle" label="Pending" value={data.payments.pending} color="#E8732A" onPress={() => navigation.navigate("ManagePayments")} />
          <StatCard icon="checkmark-circle" label="Verified" value={data.payments.verified} color="#2E7D32" />
        </View>

        {/* Menu & Tables Row */}
        <Text style={styles.sectionTitle}>Menu & Tables</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="restaurant" label="Total Dishes" value={data.dishes.total} color="#1A1A1A" onPress={() => navigation.navigate("ManageDishes")} />
          <StatCard icon="eye" label="Available" value={data.dishes.available} color="#2E7D32" />
          <StatCard icon="eye-off" label="Unavailable" value={data.dishes.unavailable} color="#C62828" />
          <StatCard icon="grid" label="Tables" value={data.tables.total} color="#1A1A1A" onPress={() => navigation.navigate("ManageTables")} />
        </View>

        {/* Reservations */}
        <Text style={styles.sectionTitle}>Reservations</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="calendar" label="Today" value={data.reservations.today} color="#DAA520" onPress={() => navigation.navigate("ManageReservations")} />
          <StatCard icon="time" label="Pending" value={data.reservations.pending} color="#E8732A" />
        </View>

        {/* Users */}
        <Text style={styles.sectionTitle}>Users</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people" label="Customers" value={data.users.customers} color="#1A1A1A" onPress={() => navigation.navigate("ManageUsers")} />
          <StatCard icon="bicycle" label="Riders" value={data.users.riders} color="#DAA520" onPress={() => navigation.navigate("ManageRiders")} />
        </View>

        {/* Reviews & Feedback */}
        <Text style={styles.sectionTitle}>Reviews & Feedback</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="star" label="Dish Reviews" value={data.reviews.total} color="#DAA520" onPress={() => navigation.navigate("ManageReviews")} />
          <StatCard icon="chatbubble" label="Feedback" value={data.feedback.total} color="#1A1A1A" />
          <StatCard icon="star-half" label="Avg Service" value={data.feedback.avgRating > 0 ? `${data.feedback.avgRating}/5` : "N/A"} color="#2E7D32" />
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// Reusable stat card component
function StatCard({ icon, label, value, color, onPress }) {
  const content = (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconRow}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.statCardWrapper}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.statCardWrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.black,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 50,
    paddingBottom: 12, paddingHorizontal: 12,
  },
  menuBtn: { padding: 8 },
  headerTitle: {
    fontFamily: FONTS.heading, fontSize: 18, color: "#DAA520",
  },
  scroll: { padding: 20 },

  pageTitle: {
    fontFamily: FONTS.title, fontSize: SIZES.title, color: COLORS.black,
  },
  subtitle: {
    fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray,
    marginBottom: 16,
  },

  // Revenue card
  revenueCard: {
    borderRadius: 16, padding: 20, marginBottom: 20,
  },
  revenueRow: {
    flexDirection: "row", justifyContent: "space-around", alignItems: "center",
  },
  revenueLabel: {
    fontFamily: FONTS.medium, fontSize: SIZES.caption, color: "#fff",
    opacity: 0.9, marginBottom: 4,
  },
  revenueAmount: {
    fontFamily: FONTS.heading, fontSize: SIZES.h1, color: "#fff",
  },
  revenueDivider: {
    width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Section
  sectionTitle: {
    fontFamily: FONTS.heading, fontSize: SIZES.h2, color: COLORS.black,
    marginTop: 8, marginBottom: 10,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8,
  },
  statCardWrapper: {
    width: "47%", flexGrow: 1,
  },
  statCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2,
  },
  statIconRow: { marginBottom: 8 },
  statValue: {
    fontFamily: FONTS.heading, fontSize: SIZES.h1, color: COLORS.black,
  },
  statLabel: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray,
    marginTop: 2,
  },

  // Today row
  todayRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.primary + "15", padding: 10, borderRadius: 8,
    marginBottom: 8,
  },
  todayText: {
    fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal,
    marginLeft: 8,
  },
});


