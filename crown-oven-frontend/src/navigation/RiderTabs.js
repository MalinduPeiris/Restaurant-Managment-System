import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { FONTS } from "../constants/fonts";
import RiderDeliveriesScreen from "../screens/deliveries/RiderDeliveriesScreen";
import ProfileScreen from "../screens/auth/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function RiderTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#DAA520",
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.lightGray,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontFamily: FONTS.medium, fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="RiderDeliveries"
        component={RiderDeliveriesScreen}
        options={{
          tabBarLabel: "Deliveries",
          tabBarIcon: ({ color, size }) => <Ionicons name="bicycle" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="RiderProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
