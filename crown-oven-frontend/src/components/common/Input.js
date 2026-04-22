import { View, Text, TextInput, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

export default function Input({ label, error, style, inputStyle, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, props.multiline && styles.multilineInput, inputStyle, error && styles.inputError]}
        placeholderTextColor={COLORS.gray}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.black, marginBottom: 6 },
  input: {
    height: 48, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 12,
    paddingHorizontal: 14, fontFamily: FONTS.body, fontSize: SIZES.body,
    color: COLORS.black, backgroundColor: COLORS.white,
  },
  multilineInput: { height: 120, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  inputError: { borderColor: COLORS.error },
  error: { fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.error, marginTop: 4 },
});

