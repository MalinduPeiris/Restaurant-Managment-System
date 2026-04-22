import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

// Gold -> Orange gradient used across the app
const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function Button({ title, onPress, variant = "primary", loading = false, disabled = false, style, colors = GRADIENT }) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  // Primary button uses gradient background
  if (isPrimary) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.7} style={[style]}>
        <LinearGradient
          colors={disabled || loading ? ["#ccc", "#bbb"] : colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, (disabled || loading) && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.text, styles.primaryText]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "secondary" && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isDanger ? COLORS.white : COLORS.black} />
      ) : (
        <Text style={[
          styles.text,
          variant === "secondary" && styles.secondaryText,
          isDanger && styles.dangerText,
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { height: 50, borderRadius: 12, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  secondary: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.black },
  danger: { backgroundColor: COLORS.error },
  disabled: { opacity: 0.5 },
  text: { fontFamily: FONTS.heading, fontSize: SIZES.button },
  primaryText: { color: COLORS.white },
  secondaryText: { color: COLORS.black },
  dangerText: { color: COLORS.white },
});
