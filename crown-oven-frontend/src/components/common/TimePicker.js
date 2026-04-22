import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PERIODS = ["AM", "PM"];

// Shop hours: 8:30 AM - 11:30 PM
function to24(h, p) {
  if (p === "AM") return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function toDecimal(h, m, p) {
  return to24(h, p) + m / 60;
}

const OPEN_START = 8.5;
const OPEN_END = 23.5;

function isHourAvailable(h, p, minimumTime = null) {
  return MINUTES.some((m) => isMinuteAvailable(h, m, p, minimumTime));
}

function isMinuteAvailable(h, m, p, minimumTime = null) {
  const decimal = toDecimal(h, m, p);
  const earliestAllowed = Math.max(OPEN_START, minimumTime ?? OPEN_START);
  return decimal >= earliestAllowed && decimal <= OPEN_END;
}

function findFirstValidMinute(h, p, minimumTime = null) {
  return MINUTES.find((m) => isMinuteAvailable(h, m, p, minimumTime));
}

function findFirstValidTime(minimumTime = null) {
  for (const currentPeriod of PERIODS) {
    for (const currentHour of HOURS) {
      if (!isHourAvailable(currentHour, currentPeriod, minimumTime)) continue;
      const validMinute = findFirstValidMinute(currentHour, currentPeriod, minimumTime);
      if (validMinute !== undefined) {
        return { hour: currentHour, minute: validMinute, period: currentPeriod };
      }
    }
  }
  return null;
}

export default function TimePicker({ label = "Select Time", value, onChange, minimumTime = null }) {
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);

  useEffect(() => {
    if (!value) {
      setHour(null);
      setMinute(0);
      setPeriod("AM");
      return;
    }

    const nextParsed = parseTime(value);
    setHour(nextParsed.hour);
    setMinute(nextParsed.minute);
    setPeriod(nextParsed.period);
  }, [value]);

  useEffect(() => {
    if (hour === null) return;

    if (!isHourAvailable(hour, period, minimumTime)) {
      const nextValid = findFirstValidTime(minimumTime);
      if (!nextValid) {
        setHour(null);
        setMinute(0);
        setPeriod("AM");
        onChange("");
        return;
      }
      setHour(nextValid.hour);
      setMinute(nextValid.minute);
      setPeriod(nextValid.period);
      return;
    }

    if (!isMinuteAvailable(hour, minute, period, minimumTime)) {
      const validMinute = findFirstValidMinute(hour, period, minimumTime);
      if (validMinute !== undefined) {
        setMinute(validMinute);
        return;
      }

      const nextValid = findFirstValidTime(minimumTime);
      if (!nextValid) {
        setHour(null);
        setMinute(0);
        setPeriod("AM");
        onChange("");
        return;
      }
      setHour(nextValid.hour);
      setMinute(nextValid.minute);
      setPeriod(nextValid.period);
      return;
    }

    const pad = String(minute).padStart(2, "0");
    const nextValue = `${hour}:${pad} ${period}`;
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [hour, minute, period, minimumTime, onChange, value]);

  const displayHour = hour !== null ? String(hour).padStart(2, "0") : "--";
  const displayMinute = String(minute).padStart(2, "0");

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.shopHours}>Open 8:30 AM - 11:30 PM</Text>

      <View style={styles.row}>
        <View style={styles.timeBox}>
          <TouchableOpacity
            style={[styles.timeCell, showHourPicker && styles.timeCellActive]}
            onPress={() => { setShowHourPicker(!showHourPicker); setShowMinutePicker(false); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeDigit, showHourPicker && styles.timeDigitActive]}>{displayHour}</Text>
            <Text style={styles.timeSub}>hr</Text>
          </TouchableOpacity>

          <Text style={styles.colon}>:</Text>

          <TouchableOpacity
            style={[styles.timeCell, showMinutePicker && styles.timeCellActive]}
            onPress={() => { setShowMinutePicker(!showMinutePicker); setShowHourPicker(false); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.timeDigit, showMinutePicker && styles.timeDigitActive]}>{displayMinute}</Text>
            <Text style={styles.timeSub}>min</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.periodBox}>
          <TouchableOpacity
            style={[styles.periodBtn, period === "AM" && styles.periodBtnActive]}
            onPress={() => setPeriod("AM")}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodText, period === "AM" && styles.periodTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === "PM" && styles.periodBtnActive]}
            onPress={() => setPeriod("PM")}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodText, period === "PM" && styles.periodTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showHourPicker && (
        <View style={styles.pickerGrid}>
          {HOURS.map((h) => {
            const available = isHourAvailable(h, period, minimumTime);
            return (
              <TouchableOpacity
                key={h}
                style={[styles.gridItem, hour === h && styles.gridItemActive, !available && styles.gridItemDisabled]}
                onPress={() => { if (available) { setHour(h); setShowHourPicker(false); setShowMinutePicker(true); } }}
                activeOpacity={available ? 0.7 : 1}
              >
                <Text style={[styles.gridText, hour === h && styles.gridTextActive, !available && styles.gridTextDisabled]}>{h}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {showMinutePicker && (
        <View style={styles.pickerGrid}>
          {MINUTES.map((m) => {
            const available = hour !== null && isMinuteAvailable(hour, m, period, minimumTime);
            return (
              <TouchableOpacity
                key={m}
                style={[styles.gridItem, minute === m && styles.gridItemActive, !available && styles.gridItemDisabled]}
                onPress={() => { if (available) { setMinute(m); setShowMinutePicker(false); } }}
                activeOpacity={available ? 0.7 : 1}
              >
                <Text style={[styles.gridText, minute === m && styles.gridTextActive, !available && styles.gridTextDisabled]}>
                  {String(m).padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {hour !== null && (
        <View style={styles.selectedRow}>
          <View style={styles.selectedDot} />
          <Text style={styles.selectedText}>
            {displayHour}:{displayMinute} {period}
          </Text>
          <TouchableOpacity onPress={() => { setHour(null); setMinute(0); setPeriod("AM"); onChange(""); }} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function parseTime(str) {
  if (!str) return { hour: null, minute: 0, period: "AM" };
  const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: null, minute: 0, period: "AM" };
  return { hour: parseInt(match[1]), minute: parseInt(match[2]), period: match[3].toUpperCase() };
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.black,
    marginBottom: 2,
  },
  shopHours: {
    fontFamily: FONTS.body, fontSize: SIZES.caption, color: COLORS.gray,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  timeBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.white, borderRadius: 16, padding: 6,
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  timeCell: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12,
  },
  timeCellActive: {
    backgroundColor: COLORS.primary + "18",
  },
  timeDigit: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.charcoal,
  },
  timeDigitActive: { color: COLORS.primary },
  timeSub: {
    fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray, marginTop: 2,
  },
  colon: {
    fontFamily: FONTS.bold, fontSize: 28, color: COLORS.gray,
    marginHorizontal: 2,
  },
  periodBox: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  periodBtn: {
    paddingHorizontal: 18, paddingVertical: 14, alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: COLORS.charcoal,
  },
  periodText: {
    fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.gray,
  },
  periodTextActive: { color: COLORS.white },
  pickerGrid: {
    flexDirection: "row", flexWrap: "wrap",
    marginTop: 12, backgroundColor: COLORS.white, borderRadius: 16,
    padding: 8, borderWidth: 1.5, borderColor: COLORS.lightGray,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  gridItem: {
    width: "16.66%", aspectRatio: 1, borderRadius: 12,
    justifyContent: "center", alignItems: "center", margin: 0,
  },
  gridItemActive: {
    backgroundColor: COLORS.charcoal,
  },
  gridText: {
    fontFamily: FONTS.heading, fontSize: SIZES.button, color: COLORS.charcoal,
  },
  gridTextActive: { color: COLORS.white },
  gridItemDisabled: { opacity: 0.25 },
  gridTextDisabled: { color: COLORS.gray },
  selectedRow: {
    flexDirection: "row", alignItems: "center",
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: COLORS.primary + "12", borderRadius: 12,
  },
  selectedDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
    marginRight: 10,
  },
  selectedText: {
    flex: 1, fontFamily: FONTS.heading, fontSize: SIZES.body, color: COLORS.charcoal,
  },
  clearText: {
    fontFamily: FONTS.medium, fontSize: SIZES.caption, color: COLORS.gray,
  },
});
