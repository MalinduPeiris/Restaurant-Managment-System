/**
 * Logo.js — Crown Oven brand logo with gold-to-orange gradient
 *
 * Props:
 *  - size: "small" | "large" (default "small")
 *  - showTagline: boolean (default false)
 */

import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import COLORS from "../../constants/colors";
import { FONTS } from "../../constants/fonts";

// Gradient colors: gold → orange
const GRADIENT = ["#DAA520", "#F0A830", "#FA9141"];

export default function Logo({ size = "small", showTagline = false }) {
  const isLarge = size === "large";
  const iconSize = isLarge ? 52 : 36;
  const fontSize = isLarge ? 42 : 30;

  return (
    <View style={styles.container}>
      {/* Crown icon with gradient */}
      <MaskedView
        maskElement={
          <View style={{ alignItems: "center" }}>
            <MaterialCommunityIcons name="crown" size={iconSize} color="black" />
          </View>
        }
      >
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <MaterialCommunityIcons name="crown" size={iconSize} style={{ opacity: 0 }} />
        </LinearGradient>
      </MaskedView>

      {/* Brand name with gradient */}
      <MaskedView
        maskElement={
          <Text style={[styles.brand, { fontSize }]}>Crown Oven</Text>
        }
      >
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={[styles.brand, { fontSize, opacity: 0 }]}>Crown Oven</Text>
        </LinearGradient>
      </MaskedView>

      {/* Gradient decorative line */}
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.line, isLarge && styles.lineLarge]}
      />

      {showTagline && <Text style={[styles.tagline, isLarge && styles.taglineLarge]}>Reign of Flavor</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  brand: { fontFamily: FONTS.title, fontSize: 30, color: "black", marginTop: -2, textAlign: "center" },
  line: { width: 60, height: 2, borderRadius: 1, marginTop: 4 },
  lineLarge: { width: 90, height: 3, marginTop: 6 },
  tagline: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, marginTop: 6, letterSpacing: 2, textTransform: "uppercase" },
  taglineLarge: { fontSize: 14, marginTop: 8 },
});
