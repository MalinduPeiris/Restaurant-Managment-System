import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listTables, getAvailableTables } from "../../services/tableService";
import { LinearGradient } from "expo-linear-gradient";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];
const HERO_GRADIENT = ["#FFF8EA", "#FFF0D1", "#FDE6BD"];
const DEFAULT_TIME_SLOT = "8:30 AM";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TablesScreen({ navigation }) {
  const [tables, setTables] = useState([]);
  const [summary, setSummary] = useState({ totalTables: 0, freeTables: 0, tablesWithBookings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  const fetchTables = useCallback(async () => {
    try {
      const [tableRes, availableRes] = await Promise.all([
        listTables(),
        getAvailableTables(todayKey, DEFAULT_TIME_SLOT),
      ]);

      const allTables = tableRes.data || [];
      const availableList = availableRes.data || [];
      const availableIds = new Set(availableList.map((table) => table._id));

      const visibleTables = allTables
        .filter((table) => table.isAvailable !== false)
        .map((table) => ({
          ...table,
          reservations: [],
          reservationCount: availableIds.has(table._id) ? 0 : 1,
          isFreeNow: availableIds.has(table._id),
        }));

      setTables(visibleTables);
      setSummary({
        totalTables: visibleTables.length,
        freeTables: visibleTables.filter((table) => table.isFreeNow).length,
        tablesWithBookings: visibleTables.filter((table) => !table.isFreeNow).length,
      });
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayKey]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTables();
    }, [fetchTables])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const getSeatIcons = (seats) => Array(seats || 2).fill(null);

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="restaurant-outline" size={18} color={COLORS.primary} />
            <Text style={styles.heroBadgeText}>Table Reservations</Text>
          </View>
          <View style={styles.heroCountPill}>
            <Text style={styles.heroCountText}>{summary.totalTables || 0} tables</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Dining Tables</Text>
        <Text style={styles.heroSubtitle}>
          Reserve the right seating area for your visit with live table availability for today.
        </Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{summary.totalTables || 0}</Text>
            <Text style={styles.summaryLabel}>Total Tables</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: COLORS.success }]}>{summary.freeTables || 0}</Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: COLORS.accent }]}>{summary.tablesWithBookings || 0}</Text>
            <Text style={styles.summaryLabel}>Reserved</Text>
          </View>
        </View>
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.viewBookingsWrap}
        onPress={() => navigation.navigate("MyReservations")}
      >
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.viewBookingsBtn}
        >
          <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
          <Text style={styles.viewBookingsText}>View Your Bookings</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderTable = ({ item }) => {
    const isFree = item.isFreeNow;
    const available = item.isAvailable !== false;

    return (
      <View style={[styles.tableCard, isFree ? styles.tableCardFree : styles.tableCardBooked]}>
        <View style={styles.tableTopRow}>
          <View style={styles.tableInfo}>
            <Text style={styles.tableNo} numberOfLines={1}>Table {item.tableNo}</Text>
            <Text style={styles.tableSubtitle}>{item.location === "outdoor" ? "Outdoor dining" : "Indoor dining"}</Text>
          </View>
          <View style={[styles.statusBadge, isFree ? styles.statusFree : styles.statusBooked]}>
            <View style={[styles.statusDot, { backgroundColor: isFree ? COLORS.success : COLORS.accent }]} />
            <Text style={[styles.statusText, { color: isFree ? COLORS.success : COLORS.accent }]}>
              {isFree ? "Available" : "Reserved"}
            </Text>
          </View>
        </View>

        <View style={styles.metaPanel}>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={15} color={COLORS.primary} />
            <Text style={styles.metaText}>{item.seats} seats</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons
              name={item.location === "outdoor" ? "sunny-outline" : "home-outline"}
              size={15}
              color={COLORS.primary}
            />
            <Text style={styles.metaText}>{item.location === "outdoor" ? "Outdoor" : "Indoor"}</Text>
          </View>
        </View>

        <View style={styles.seatVisualRow}>
          {getSeatIcons(item.seats).map((_, index) => (
            <View key={index} style={styles.seatIconWrap}>
              <Ionicons name="person" size={12} color={COLORS.primary} />
            </View>
          ))}
        </View>

        {isFree ? (
          <View style={styles.freeInfoBox}>
            <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
            <Text style={styles.freeInfoText}>Available for reservation. Choose your preferred time to confirm.</Text>
          </View>
        ) : (
          <View style={styles.busyInfoBox}>
            <Ionicons name="time-outline" size={15} color={COLORS.accent} />
            <Text style={styles.busyInfoText}>This table may already be reserved for the default check time. Choose your time to confirm availability.</Text>
          </View>
        )}

        {available && (
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.82}
            onPress={() => navigation.navigate("MakeReservation", { preselectedTable: item })}
          >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtnGradient}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.white} />
              <Text style={styles.bookBtnText}>Book This Table</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={tables}
        keyExtractor={(item) => item._id}
        renderItem={renderTable}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={<EmptyState message="No tables available." />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 28 },
  heroCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(218,165,32,0.16)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  heroCountPill: {
    backgroundColor: "rgba(34,34,34,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroCountText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    lineHeight: 22,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  summaryNum: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.black,
  },
  summaryLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: "center",
  },
  viewBookingsWrap: {
    marginBottom: 16,
    borderRadius: 18,
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  viewBookingsBtn: {
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewBookingsText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
  tableCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1.5,
  },
  tableCardFree: {
    borderColor: COLORS.success + "35",
  },
  tableCardBooked: {
    borderColor: COLORS.accent + "30",
  },
  tableTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  tableInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  tableNo: {
    flexShrink: 1,
    fontFamily: FONTS.heading,
    fontSize: 24,
    lineHeight: 28,
    includeFontPadding: false,
    textAlignVertical: "center",
    color: COLORS.black,
  },
  tableSubtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusFree: {
    backgroundColor: COLORS.success + "12",
  },
  statusBooked: {
    backgroundColor: COLORS.accent + "12",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.heading,
    fontSize: 11,
  },
  metaPanel: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.charcoal,
  },
  seatVisualRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  seatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + "12",
    justifyContent: "center",
    alignItems: "center",
  },
  freeInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.success + "10",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  freeInfoText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.success,
  },
  busyInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent + "12",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  busyInfoText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.caption,
    color: COLORS.accent,
  },
  bookBtn: {
    marginTop: 2,
  },
  bookBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 14,
  },
  bookBtnText: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.white,
  },
});




