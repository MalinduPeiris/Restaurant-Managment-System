import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { listUsers, updateUser, deleteUser } from "../../services/authService";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import AdminHeroCard from "../../components/common/AdminHeroCard";

export default function ManageUsersScreen() {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await listUsers();
      setUsers(res.data);
      setFiltered(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (search) {
      setFiltered(users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())));
    } else {
      setFiltered(users);
    }
  }, [search, users]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchUsers(); }, []);

  const handleToggleBlock = async (user) => {
    try {
      await updateUser(user._id, { isBlocked: !user.isBlocked });
      fetchUsers();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update user");
    }
  };

  const handleDelete = (user) => {
    Alert.alert("Delete User", `Are you sure you want to delete ${user.firstName} ${user.lastName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteUser(user._id);
          fetchUsers();
        } catch (err) {
          Alert.alert("Error", err.response?.data?.message || "Failed to delete user");
        }
      }},
    ]);
  };

  const renderUser = ({ item }) => (
    <Card>
      <View style={styles.userRow}>
        <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{(item.firstName?.[0] || "")}{(item.lastName?.[0] || "")}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, item.role === "admin" ? styles.tagAdmin : styles.tagCustomer]}>
              <Text style={styles.tagText}>{item.role}</Text>
            </View>
            {item.isBlocked && <View style={[styles.tag, styles.tagBlocked]}><Text style={styles.tagText}>Blocked</Text></View>}
          </View>
        </View>
      </View>
      {item.role !== "admin" && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, item.isBlocked ? styles.unblockBtn : styles.blockBtn]} onPress={() => handleToggleBlock(item)}>
            <Text style={[styles.actionText, item.isBlocked ? styles.unblockText : styles.blockText]}>{item.isBlocked ? "Unblock" : "Block"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.heroWrap}>
      <AdminHeroCard
        icon="people-outline"
        badge="Account Desk"
        title="User Dashboard"
        subtitle="Search customers, monitor account status, and handle admin-side access control without leaving the list."
        colors={["#F2F4F7", "#DCE2E8", "#FBFCFD"]}
        borderColor="#CCD4DC"
        shadowColor="#607080"
        onActionPress={onRefresh}
      />
    </View>

      <View style={styles.searchBar}>
        <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor={COLORS.gray} value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<EmptyState message="No users found" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heroWrap: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: { padding: 16, paddingBottom: 8 },
  searchInput: { height: 44, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12, paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: SIZES.body, backgroundColor: COLORS.white, color: COLORS.black },
  list: { padding: 16, paddingTop: 0 },
  userRow: { flexDirection: "row", alignItems: "center" },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + "20", justifyContent: "center", alignItems: "center" },
  userAvatarText: { fontFamily: FONTS.heading, fontSize: 14, color: COLORS.primary },
  userName: { fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black },
  userEmail: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray },
  tagRow: { flexDirection: "row", marginTop: 4, gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagAdmin: { backgroundColor: COLORS.primary + "20" },
  tagCustomer: { backgroundColor: COLORS.lightGray },
  tagBlocked: { backgroundColor: COLORS.error + "20" },
  tagText: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.charcoal, textTransform: "uppercase" },
  actionRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  blockBtn: { backgroundColor: COLORS.accent + "15" },
  unblockBtn: { backgroundColor: COLORS.success + "15" },
  deleteBtn: { backgroundColor: COLORS.error + "15" },
  actionText: { fontFamily: FONTS.medium, fontSize: SIZES.caption },
  blockText: { color: COLORS.accent },
  unblockText: { color: COLORS.success },
  deleteText: { fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.error },
});





