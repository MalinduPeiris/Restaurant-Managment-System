import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function EmptyState({ message = "Nothing here yet" }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  text: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.gray },
});
