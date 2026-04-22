import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function AdminHeroCard({
  icon,
  badge,
  title,
  subtitle,
  colors = ["#FFF8EB", "#F7E5C4", "#FBF5EA"],
  borderColor = "#F1DEB1",
  shadowColor = "#A87C1D",
  actionIcon = "refresh-outline",
  onActionPress,
  actionLabel = "Refresh",
  style,
}) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor, shadowColor }, style]}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={15} color={COLORS.charcoal} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, !onActionPress && styles.actionButtonDisabled]}
          onPress={onActionPress}
          activeOpacity={0.8}
          disabled={!onActionPress}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Ionicons name={actionIcon} size={16} color={COLORS.charcoal} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    color: COLORS.charcoal,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 34,
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    lineHeight: 20,
    color: COLORS.charcoal,
    maxWidth: 290,
  },
});
