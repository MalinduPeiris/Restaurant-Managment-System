import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import AdminLoginScreen from "../screens/auth/AdminLoginScreen";
import RiderLoginScreen from "../screens/auth/RiderLoginScreen";
import CustomerTabs from "./CustomerTabs";
import AdminDrawer from "./AdminDrawer";
import RiderTabs from "./RiderTabs";
import DishDetailScreen from "../screens/dishes/DishDetailScreen";
import OrderDetailScreen from "../screens/orders/OrderDetailScreen";

import PaymentScreen from "../screens/payments/PaymentScreen";
import UploadProofScreen from "../screens/payments/UploadProofScreen";
import WriteReviewScreen from "../screens/reviews/WriteReviewScreen";
import DishReviewsScreen from "../screens/reviews/DishReviewsScreen";
import WriteFeedbackScreen from "../screens/reviews/WriteFeedbackScreen";
import MyReservationsScreen from "../screens/reservations/MyReservationsScreen";
import MakeReservationScreen from "../screens/reservations/MakeReservationScreen";
import RoomDetailScreen from "../screens/rooms/RoomDetailScreen";
import BookRoomScreen from "../screens/rooms/BookRoomScreen";
import MyRoomBookingsScreen from "../screens/rooms/MyRoomBookingsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
            <Stack.Screen name="RiderLogin" component={RiderLoginScreen} />
          </>
        ) : user.role === "admin" ? (
          <>
            <Stack.Screen name="AdminHome" component={AdminDrawer} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          </>
        ) : user.role === "rider" ? (
          <>
            <Stack.Screen name="RiderHome" component={RiderTabs} />
          </>
        ) : (
          <>
            <Stack.Screen name="CustomerHome" component={CustomerTabs} />
            <Stack.Screen name="DishDetail" component={DishDetailScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="UploadProof" component={UploadProofScreen} />
            <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
            <Stack.Screen name="DishReviews" component={DishReviewsScreen} />
            <Stack.Screen name="MyReservations" component={MyReservationsScreen} />
            <Stack.Screen name="MakeReservation" component={MakeReservationScreen} />
            <Stack.Screen name="WriteFeedback" component={WriteFeedbackScreen} />
            <Stack.Screen name="RoomDetail" component={RoomDetailScreen} />
            <Stack.Screen name="BookRoom" component={BookRoomScreen} />
            <Stack.Screen name="MyRoomBookings" component={MyRoomBookingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
