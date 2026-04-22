import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import Logo from "./Logo";

export default function AuthPortalShell({
  accentColor = COLORS.primary,
  backLabel,
  onBack,
  roleIcon,
  roleLabel,
  title,
  subtitle,
  children,
  footer,
  bottomSlot,
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.backgroundLayer} pointerEvents="none">
            <View style={[styles.orbLarge, { backgroundColor: accentColor + "14" }]} />
            <View style={[styles.orbSmall, { backgroundColor: accentColor + "10" }]} />
          </View>

          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={16} color={accentColor} />
              <Text style={[styles.backText, { color: accentColor }]}>{backLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.logoArea}>
            <Logo size="large" showTagline />
          </View>

          <View style={styles.heroArea}>
            <View style={[styles.roleBadge, { backgroundColor: accentColor + "14" }]}>
              <View style={[styles.roleIconWrap, { backgroundColor: accentColor }]}>
                <Ionicons name={roleIcon} size={16} color={COLORS.white} />
              </View>
              <Text style={[styles.roleText, { color: accentColor }]}>{roleLabel}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.card}>{children}</View>

          {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
          {bottomSlot ? <View style={styles.bottomWrap}>{bottomSlot}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  orbLarge: {
    position: "absolute",
    top: 70,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  orbSmall: {
    position: "absolute",
    top: 245,
    left: -20,
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  backText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 22,
  },
  heroArea: {
    alignItems: "center",
    marginBottom: 22,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 14,
  },
  roleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  roleText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    color: COLORS.black,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(45,45,45,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  footerWrap: {
    marginTop: 18,
  },
  bottomWrap: {
    marginTop: 22,
  },
});
