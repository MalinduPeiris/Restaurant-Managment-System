import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";
import { useCart } from "../context/CartContext";
import MenuScreen from "../screens/dishes/MenuScreen";
import CartScreen from "../screens/orders/CartScreen";
import MyOrdersScreen from "../screens/orders/MyOrdersScreen";
import RoomsScreen from "../screens/rooms/RoomsScreen";
import TablesScreen from "../screens/tables/TablesScreen";
import MakeReservationScreen from "../screens/reservations/MakeReservationScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator();

// Cart icon with badge
function CartIcon({ color, size }) {
  const { cartItemCount } = useCart();
  return (
    <View>
      <Ionicons name="cart" size={size} color={color} />
      {cartItemCount > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>
            {cartItemCount > 9 ? "9+" : cartItemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute", top: -4, right: -8,
    backgroundColor: "#C62828", borderRadius: 9,
    minWidth: 18, height: 18,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff", fontSize: 10,
    fontFamily: FONTS.bold,
  },
});

export default function CustomerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#DAA520",
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          height: 64 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: FONTS.medium, fontSize: 11, marginBottom: 2 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          tabBarLabel: "Menu",
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: "Cart",
          tabBarIcon: ({ color, size }) => <CartIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomsScreen}
        options={{
          tabBarLabel: "Rooms",
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tables"
        component={TablesScreen}
        options={{
          tabBarLabel: "Tables",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
