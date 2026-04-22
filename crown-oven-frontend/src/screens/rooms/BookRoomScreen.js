import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../../constants/colors";
import { FONTS, SIZES } from "../../constants/fonts";
import { createRoomBooking } from "../../services/roomService";
import { formatAmenityPrice, getAmenityIcon, getAmenityKey, getAmenityLabel, getAmenityPrice } from "../../utils/roomAmenities";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import TimePicker from "../../components/common/TimePicker";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_BOOKING_MONTHS = 2;

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function buildCalendar(referenceDate, minDate, maxDate) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ key: `blank-${i}`, isBlank: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
    current.setHours(0, 0, 0, 0);
    const disabled = current < minDate || current > maxDate;
    cells.push({
      key: formatDateKey(current),
      isBlank: false,
      day,
      dateKey: formatDateKey(current),
      disabled,
      isToday: isSameDate(current, minDate),
    });
  }

  return {
    monthLabel: `${MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`,
    cells,
  };
}

function sanitizeInteger(value) {
  return String(value || "").replace(/\D/g, "");
}

function parseTimeToDecimal(time12) {
  if (!time12) return null;
  const match = time12.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  return hour + minute / 60;
}

function getCurrentDecimalTime() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function to24Hour(time12) {
  if (!time12) return "";
  const match = time12.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return "";
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

export default function BookRoomScreen({ navigation, route }) {
  const { room } = route.params;
  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const [date, setDate] = useState("");
  const todayKey = formatDateKey(today);
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableAmenities = useMemo(
    () => (room.amenities || []).filter((amenity) => amenity?.isActive !== false),
    [room.amenities]
  );

  const lastAllowedDate = useMemo(() => {
    const last = addMonths(today, MAX_BOOKING_MONTHS);
    last.setHours(0, 0, 0, 0);
    return last;
  }, [today]);

  const calendar = useMemo(
    () => buildCalendar(calendarMonth, today, lastAllowedDate),
    [calendarMonth, today, lastAllowedDate]
  );

  const normalizedStartTime = to24Hour(startTime);
  const normalizedEndTime = to24Hour(endTime);
  const minimumStartTime = date === todayKey ? getCurrentDecimalTime() : null;
  const startTimeDecimal = parseTimeToDecimal(startTime);
  const minimumEndTime = startTimeDecimal !== null ? startTimeDecimal + (5 / 60) : minimumStartTime;

  const toggleAmenity = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const calcHours = () => {
    if (!normalizedStartTime || !normalizedEndTime) return 0;
    const [sh, sm] = normalizedStartTime.split(":").map(Number);
    const [eh, em] = normalizedEndTime.split(":").map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
    const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const hours = calcHours();
  const roomCost = hours * (room.pricePerHour || 0);
  const amenityCosts = availableAmenities
    .filter((amenity) => selectedAmenities.includes(amenity._id))
    .map((amenity) => ({
      key: getAmenityKey(amenity),
      label: getAmenityLabel(amenity),
      cost: getAmenityPrice(amenity),
    }));
  const amenityTotal = amenityCosts.reduce((sum, amenity) => sum + amenity.cost, 0);
  const totalAmount = roomCost + amenityTotal;

  const validateForm = () => {
    if (!date) {
      Alert.alert("Invalid Date", "Please select a booking date from the calendar.");
      return false;
    }
    if (!normalizedStartTime || !normalizedEndTime) {
      Alert.alert("Invalid Time", "Please select both start time and end time.");
      return false;
    }
    if (date === todayKey && startTimeDecimal !== null && startTimeDecimal <= getCurrentDecimalTime()) {
      Alert.alert("Invalid Time", "For today, please choose a start time later than the current time.");
      return false;
    }
    if (hours <= 0) {
      Alert.alert("Invalid Time", "End time must be after start time.");
      return false;
    }
    const guests = parseInt(guestCount, 10);
    if (!guests || guests < 1) {
      Alert.alert("Invalid Guest Count", "Please enter a valid number of guests.");
      return false;
    }
    if (guests > room.capacity) {
      Alert.alert("Too Many Guests", `This room supports up to ${room.capacity} guests.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        roomId: room._id,
        date,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        guestCount: parseInt(guestCount, 10),
        selectedAmenities,
      };
      if (specialRequests.trim()) {
        payload.specialRequests = specialRequests.trim();
      }

      await createRoomBooking(payload);
      Alert.alert("Success", "Your room booking has been submitted!", [
        {
          text: "View Bookings",
          onPress: () => navigation.navigate("MyRoomBookings"),
        },
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Booking Failed", err.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToPreviousMonth = () => {
    const previous = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    if (previous < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setCalendarMonth(previous);
  };

  const goToNextMonth = () => {
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    if (next > new Date(lastAllowedDate.getFullYear(), lastAllowedDate.getMonth(), 1)) return;
    setCalendarMonth(next);
  };

  const canGoPrev = calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = calendarMonth < new Date(lastAllowedDate.getFullYear(), lastAllowedDate.getMonth(), 1);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Book {room.name}</Text>

          <Text style={styles.sectionTitle}>Date</Text>
          <Card style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={goToPreviousMonth}
                disabled={!canGoPrev}
                style={[styles.calendarNavBtn, !canGoPrev && styles.calendarNavBtnDisabled]}
              >
                <Ionicons name="chevron-back" size={18} color={canGoPrev ? COLORS.charcoal : COLORS.gray} />
              </TouchableOpacity>
              <View style={styles.calendarMonthWrap}>
                <Text style={styles.calendarMonth}>{calendar.monthLabel}</Text>
                <Text style={styles.calendarHint}>Bookings available up to 2 months ahead</Text>
              </View>
              <TouchableOpacity
                onPress={goToNextMonth}
                disabled={!canGoNext}
                style={[styles.calendarNavBtn, !canGoNext && styles.calendarNavBtnDisabled]}
              >
                <Ionicons name="chevron-forward" size={18} color={canGoNext ? COLORS.charcoal : COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {DAYS_OF_WEEK.map((day) => (
                <Text key={day} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendar.cells.map((cell) => {
                if (cell.isBlank) {
                  return <View key={cell.key} style={styles.calendarCell} />;
                }

                const isSelected = date === cell.dateKey;
                return (
                  <TouchableOpacity
                    key={cell.key}
                    disabled={cell.disabled}
                    onPress={() => setDate(cell.dateKey)}
                    activeOpacity={0.8}
                    style={[
                      styles.calendarCell,
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      cell.disabled && styles.dayCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                        cell.disabled && styles.dayNumberDisabled,
                      ]}
                    >
                      {cell.day}
                    </Text>
                    <Text
                      style={[
                        styles.dayMeta,
                        isSelected && styles.dayMetaSelected,
                        cell.disabled && styles.dayMetaDisabled,
                      ]}
                    >
                      {cell.isToday ? "Today" : MONTHS[calendarMonth.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <TimePicker
            label="Start Time"
            value={startTime}
            onChange={setStartTime}
            minimumTime={minimumStartTime}
          />

          <TimePicker
            label="End Time"
            value={endTime}
            onChange={setEndTime}
            minimumTime={minimumEndTime}
          />

          <Input
            label={`Number of Guests (max ${room.capacity})`}
            placeholder="e.g. 10"
            value={guestCount}
            onChangeText={(value) => setGuestCount(sanitizeInteger(value))}
            keyboardType="numeric"
          />

          {availableAmenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Select Amenities</Text>
              {availableAmenities.map((amenity) => {
                const amenityId = amenity._id;
                const isSelected = selectedAmenities.includes(amenityId);
                return (
                  <TouchableOpacity
                    key={amenityId}
                    style={[styles.amenityChip, isSelected && styles.amenityChipActive]}
                    onPress={() => toggleAmenity(amenityId)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={getAmenityIcon(amenity)}
                      size={18}
                      color={isSelected ? COLORS.charcoal : COLORS.primary}
                    />
                    <View style={styles.amenityTextWrap}>
                      <Text style={[styles.amenityChipText, isSelected && styles.amenityChipTextActive]}>
                        {getAmenityLabel(amenity)}
                      </Text>
                      <Text style={[styles.amenityChipSubtext, isSelected && styles.amenityChipTextActive]}>
                        {amenity.isChargeable ? "Paid add-on" : "Included amenity"}
                      </Text>
                    </View>
                    <Text style={[styles.amenityChipCost, isSelected && styles.amenityChipTextActive]}>
                      {formatAmenityPrice(amenity)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <Input
            label="Special Requests (optional)"
            placeholder="Any special requirements..."
            value={specialRequests}
            onChangeText={(text) => setSpecialRequests(text.slice(0, 300))}
            multiline
            style={{ marginTop: 8 }}
          />
          <Text style={styles.charCount}>{specialRequests.length}/300</Text>

          {hours > 0 && (
            <Card style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Price Breakdown</Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Room ({hours} hr{hours !== 1 ? "s" : ""} x Rs. {room.pricePerHour}/hr)
                </Text>
                <Text style={styles.breakdownValue}>Rs. {roomCost.toFixed(2)}</Text>
              </View>

              {amenityCosts.map((amenity) => (
                <View key={amenity.key} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{amenity.label}</Text>
                  <Text style={styles.breakdownValue}>Rs. {amenity.cost.toFixed(2)}</Text>
                </View>
              ))}

              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs. {totalAmount.toFixed(2)}</Text>
              </View>
            </Card>
          )}

          <Button
            title="Confirm Booking"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!date || !startTime || !endTime || !guestCount}
            style={{ marginTop: 8, marginBottom: 32 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.black,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
    marginBottom: 12,
    marginTop: 8,
  },
  calendarCard: {
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarNavBtnDisabled: {
    opacity: 0.45,
  },
  calendarMonthWrap: {
    flex: 1,
    alignItems: "center",
  },
  calendarMonth: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },
  calendarHint: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.gray,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.2857%",
    padding: 4,
  },
  dayCell: {
    borderRadius: 14,
    minHeight: 62,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  dayCellSelected: {
    backgroundColor: "#F6F1E7",
    borderColor: "#E6D7B8",
  },
  dayCellDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.background,
  },
  dayNumber: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  dayNumberSelected: {
    color: COLORS.charcoal,
  },
  dayNumberDisabled: {
    color: COLORS.gray,
  },
  dayMeta: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 3,
  },
  dayMetaSelected: {
    color: COLORS.charcoal,
  },
  dayMetaDisabled: {
    color: COLORS.gray,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "40",
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  amenityChipActive: {
    backgroundColor: "#F6F1E7",
    borderColor: "#E6D7B8",
  },
  amenityTextWrap: { flex: 1 },
  amenityChipText: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  amenityChipSubtext: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 2,
  },
  amenityChipCost: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  amenityChipTextActive: {
    color: COLORS.charcoal,
  },
  charCount: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 8,
  },
  breakdownCard: { marginTop: 12, padding: 20 },
  breakdownTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  breakdownLabel: {
    fontFamily: FONTS.body,
    fontSize: SIZES.body,
    color: COLORS.gray,
    flex: 1,
    marginRight: 12,
  },
  breakdownValue: {
    fontFamily: FONTS.medium,
    fontSize: SIZES.body,
    color: COLORS.charcoal,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  totalLabel: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.black,
  },
  totalValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    color: COLORS.primary,
  },
});





