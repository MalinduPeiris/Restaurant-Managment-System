import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import ManageDishesScreen from "../screens/dishes/ManageDishesScreen";
import ManageOrdersScreen from "../screens/orders/ManageOrdersScreen";
import ManagePaymentsScreen from "../screens/payments/ManagePaymentsScreen";
import ManageTablesScreen from "../screens/tables/ManageTablesScreen";
import ManageReviewsScreen from "../screens/reviews/ManageReviewsScreen";
import ManageReservationsScreen from "../screens/reservations/ManageReservationsScreen";
import ManageDeliveriesScreen from "../screens/deliveries/ManageDeliveriesScreen";
import ManageRidersScreen from "../screens/deliveries/ManageRidersScreen";
import ManageRoomsScreen from "../screens/rooms/ManageRoomsScreen";
import ManageRoomBookingsScreen from "../screens/rooms/ManageRoomBookingsScreen";
import ManageUsersScreen from "../screens/auth/ManageUsersScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerActiveTintColor: "#DAA520",
        drawerInactiveTintColor: COLORS.white,
        drawerStyle: { backgroundColor: COLORS.black, width: 260 },
        drawerLabelStyle: { fontFamily: FONTS.medium, fontSize: 14 },
        headerStyle: { backgroundColor: COLORS.black, elevation: 4, shadowOpacity: 0.3 },
        headerTintColor: "#DAA520",
        headerTitleStyle: { fontFamily: FONTS.heading },
      }}
    >
      <Drawer.Screen name="Dashboard" component={AdminDashboardScreen}
        options={{ title: "Dashboard", headerShown: false, drawerIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageOrders" component={ManageOrdersScreen}
        options={{ title: "Orders", drawerIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageDishes" component={ManageDishesScreen}
        options={{ title: "Dishes", drawerIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManagePayments" component={ManagePaymentsScreen}
        options={{ title: "Payments", drawerIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageTables" component={ManageTablesScreen}
        options={{ title: "Tables", drawerIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageReviews" component={ManageReviewsScreen}
        options={{ title: "Reviews", drawerIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageReservations" component={ManageReservationsScreen}
        options={{ title: "Reservations", drawerIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageDeliveries" component={ManageDeliveriesScreen}
        options={{ title: "Deliveries", drawerIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageRiders" component={ManageRidersScreen}
        options={{ title: "Riders", drawerIcon: ({ color, size }) => <Ionicons name="people-circle" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageRooms" component={ManageRoomsScreen}
        options={{ title: "Rooms", drawerIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageRoomBookings" component={ManageRoomBookingsScreen}
        options={{ title: "Room Bookings", drawerIcon: ({ color, size }) => <Ionicons name="calendar-number" size={size} color={color} /> }}
      />
      <Drawer.Screen name="ManageUsers" component={ManageUsersScreen}
        options={{ title: "Users", drawerIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }}
      />
      <Drawer.Screen name="AdminProfile" component={ProfileScreen}
        options={{ title: "Profile", drawerIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> }}
      />
    </Drawer.Navigator>
  );
}
