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
import {
  createReservation,
  getAvailableTablesForReservation,
} from "../../services/reservationService";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import TimePicker from "../../components/common/TimePicker";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SEAT_OPTIONS = [2, 4, 6, 8];
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

function parseTimeSlot(timeSlot) {
  const timeSlotRegex = /^(1[0-2]|[1-9]):([0-5]\d)\s(AM|PM)$/i;
  const match = timeSlot.match(timeSlotRegex);
  if (!match) return null;

  let hour24 = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hour24 !== 12) hour24 += 12;
  if (period === "AM" && hour24 === 12) hour24 = 0;

  return hour24 + minutes / 60;
}

function getCurrentDecimalTime() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function buildReservationCalendar(referenceDate, minDate, maxDate) {
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

export default function MakeReservationScreen({ navigation, route }) {
  const preselectedTable = route?.params?.preselectedTable || null;
  const preselectedTimeSlot = route?.params?.preselectedTimeSlot || "";
  const today = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, []);

  const [selectedDate, setSelectedDate] = useState(null);
  const todayKey = formatDateKey(today);
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [timeSlot, setTimeSlot] = useState(preselectedTimeSlot);
  const [seatCount, setSeatCount] = useState(preselectedTable ? preselectedTable.seats : null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(preselectedTable?._id || null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tablesSearched, setTablesSearched] = useState(false);

  const isFixedTableFlow = !!preselectedTable;

  const lastAllowedDate = useMemo(() => {
    const last = addMonths(today, MAX_BOOKING_MONTHS);
    last.setHours(0, 0, 0, 0);
    return last;
  }, [today]);

  const calendar = useMemo(
    () => buildReservationCalendar(calendarMonth, today, lastAllowedDate),
    [calendarMonth, today, lastAllowedDate]
  );

  const fetchTables = async () => {
    if (!selectedDate) {
      Alert.alert("Date Required", "Please select a date first.");
      return;
    }
    if (!timeSlot.trim()) {
      Alert.alert("Time Required", "Please select a time slot first.");
      return;
    }
    if (!seatCount) {
      Alert.alert("Seats Required", "Please select the number of seats first.");
      return;
    }
    if (!validateSelectedTime()) {
      return;
    }
    setLoadingTables(true);
    setTablesSearched(false);
    try {
      const res = await getAvailableTablesForReservation(selectedDate, timeSlot, seatCount);
      const list = res.data?.tables || res.data || [];
      setTables(list);
      setSelectedTable(isFixedTableFlow ? preselectedTable?._id || null : null);
      setTablesSearched(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load available tables.");
    } finally {
      setLoadingTables(false);
    }
  };

  const handleBookReservation = async () => {
    if (!selectedDate) {
      Alert.alert("Missing Info", "Please select a date.");
      return;
    }
    if (!timeSlot.trim()) {
      Alert.alert("Missing Info", "Please select a time slot.");
      return;
    }
    if (!seatCount) {
      Alert.alert("Missing Info", "Please select the number of seats.");
      return;
    }
    if (!validateSelectedTime()) {
      return;
    }
    if (!selectedTable) {
      Alert.alert("Missing Info", "Please select a table.");
      return;
    }
    if (isFixedTableFlow && !tablesSearched) {
      Alert.alert("Check Availability", "Please check this table for the selected date and time first.");
      return;
    }
    if (isFixedTableFlow && !selectedTableInResults) {
      Alert.alert("Table Unavailable", "This table is not available for the selected date and time.");
      return;
    }

    const payload = {
      date: selectedDate,
      timeSlot,
      seatCount,
      tableId: selectedTable,
    };
    if (specialRequests.trim()) {
      payload.specialRequests = specialRequests.trim();
    }

    setSubmitting(true);
    try {
      await createReservation(payload);
      Alert.alert("Success", "Your reservation has been booked!", [
        {
          text: "View Reservations",
          onPress: () => navigation.navigate("MyReservations"),
        },
        { text: "OK" },
      ]);
      setSelectedDate(null);
      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      setTimeSlot("");
      setSeatCount(isFixedTableFlow ? preselectedTable.seats : null);
      setTables([]);
      setSelectedTable(isFixedTableFlow ? preselectedTable._id : null);
      setSpecialRequests("");
      setTablesSearched(false);
    } catch (err) {
      Alert.alert(
        "Booking Failed",
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetTableSelection = () => {
    setTables([]);
    setSelectedTable(isFixedTableFlow ? preselectedTable?._id || null : null);
    setTablesSearched(false);
  };

  const onDateSelect = (dateKey) => {
    setSelectedDate(dateKey);
    resetTableSelection();
  };

  const onTimeChange = (value) => {
    setTimeSlot(value);
    resetTableSelection();
  };

  const onSeatSelect = (seats) => {
    setSeatCount(seats);
    resetTableSelection();
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

  const minimumSelectableTime = selectedDate === todayKey ? getCurrentDecimalTime() : null;

  const validateSelectedTime = () => {
    const decimalTime = parseTimeSlot(timeSlot.trim());
    if (decimalTime === null) {
      Alert.alert("Time Required", "Please select a valid time slot first.");
      return false;
    }

    if (selectedDate === todayKey && decimalTime <= getCurrentDecimalTime()) {
      Alert.alert("Time Unavailable", "For today, please choose a time later than the current time.");
      return false;
    }

    return true;
  };

  const canGoPrev = calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = calendarMonth < new Date(lastAllowedDate.getFullYear(), lastAllowedDate.getMonth(), 1);
  const selectedTableInResults = tables.find((table) => table._id === selectedTable);
  const canSubmitReservation = !!selectedDate && !!timeSlot && !!seatCount && !!selectedTable && (!isFixedTableFlow || (tablesSearched && !!selectedTableInResults));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Reserve a Table</Text>

          <Text style={styles.sectionTitle}>Select Date</Text>
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

                const isSelected = selectedDate === cell.dateKey;
                return (
                  <TouchableOpacity
                    key={cell.key}
                    disabled={cell.disabled}
                    onPress={() => onDateSelect(cell.dateKey)}
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
            label="Select Time"
            value={timeSlot}
            onChange={onTimeChange}
            minimumTime={minimumSelectableTime}
          />

          {isFixedTableFlow ? (
            <Card style={styles.lockedSeatCard}>
              <View style={styles.lockedSeatTopRow}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} />
                <Text style={styles.lockedSeatTitle}>Selected Table</Text>
              </View>
              <Text style={styles.lockedSeatValue}>Table {preselectedTable.tableNo}</Text>
              <Text style={styles.lockedSeatHint}>{preselectedTable.seats} seats fixed from the selected table.</Text>
            </Card>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Number of Seats</Text>
              <View style={styles.chipRow}>
                {SEAT_OPTIONS.map((seats) => (
                  <TouchableOpacity
                    key={seats}
                    style={[styles.seatChip, seatCount === seats && styles.seatChipActive]}
                    onPress={() => onSeatSelect(seats)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.seatChipText, seatCount === seats && styles.seatChipTextActive]}>
                      {seats} Seats
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Button
            title={isFixedTableFlow ? "Check This Table" : "Find Available Tables"}
            variant="secondary"
            onPress={fetchTables}
            loading={loadingTables}
            disabled={!selectedDate || !timeSlot || !seatCount}
            style={{ marginBottom: 16 }}
          />

          {isFixedTableFlow && tablesSearched && !loadingTables && (
            <View style={[styles.infoBox, selectedTableInResults ? styles.infoBoxSuccess : styles.infoBoxWarning]}>
              <Ionicons
                name={selectedTableInResults ? "checkmark-circle-outline" : "alert-circle-outline"}
                size={16}
                color={selectedTableInResults ? COLORS.success : COLORS.accent}
              />
              <Text style={[styles.infoText, { color: selectedTableInResults ? COLORS.success : COLORS.accent }]}> 
                {selectedTableInResults
                  ? `Table ${preselectedTable.tableNo} is available for the selected date and time.`
                  : `Table ${preselectedTable.tableNo} is not available for the selected date and time.`}
              </Text>
            </View>
          )}

          {!isFixedTableFlow && tables.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Select a Table</Text>
              <View style={styles.chipRow}>
                {tables.map((table) => (
                  <TouchableOpacity
                    key={table._id}
                    style={[styles.chip, selectedTable === table._id && styles.chipActive]}
                    onPress={() => setSelectedTable(table._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selectedTable === table._id && styles.chipTextActive]}>
                      Table {table.tableNo} ({table.seats} seats)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {!isFixedTableFlow && tables.length === 0 && tablesSearched && !loadingTables && (
            <Text style={styles.noTablesText}>
              No tables available for {seatCount} seats at {timeSlot} on this date. Try a different time or seat count.
            </Text>
          )}

          <Input
            label="Special Requests (optional)"
            placeholder="Any dietary needs or preferences..."
            value={specialRequests}
            onChangeText={(text) => setSpecialRequests(text.slice(0, 300))}
            multiline
            style={{ marginTop: 8 }}
          />
          <Text style={styles.charCount}>{specialRequests.length}/300</Text>

          {(selectedDate && timeSlot && seatCount && selectedTable) && (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Reservation Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-ZA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time</Text>
                <Text style={styles.summaryValue}>{timeSlot}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Seats</Text>
                <Text style={styles.summaryValue}>{seatCount}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Table</Text>
                <Text style={styles.summaryValue}>
                  Table {isFixedTableFlow ? preselectedTable.tableNo : tables.find((table) => table._id === selectedTable)?.tableNo}
                </Text>
              </View>
            </Card>
          )}

          <Button
            title="Book Reservation"
            onPress={handleBookReservation}
            loading={submitting}
            disabled={!canSubmitReservation}
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
  pageTitle: {
    fontFamily: FONTS.title,
    fontSize: SIZES.title,
    color: COLORS.charcoal,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.charcoal,
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
    color: COLORS.charcoal,
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
    backgroundColor: COLORS.charcoal,
    borderColor: COLORS.charcoal,
  },
  dayCellDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.background,
  },
  dayNumber: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  dayNumberSelected: {
    color: COLORS.white,
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
    color: COLORS.white,
  },
  dayMetaDisabled: {
    color: COLORS.gray,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.gray,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.charcoal,
    borderColor: COLORS.charcoal,
  },
  chipText: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  chipTextActive: { color: COLORS.white, fontFamily: FONTS.heading },
  seatChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
    alignItems: "center",
    marginRight: 8,
  },
  seatChipActive: {
    backgroundColor: COLORS.charcoal,
    borderColor: COLORS.charcoal,
  },
  seatChipText: { fontFamily: FONTS.heading, fontSize: SIZES.caption, color: COLORS.charcoal },
  seatChipTextActive: { color: COLORS.white },
  lockedSeatCard: {
    padding: 18,
    marginBottom: 16,
    backgroundColor: "#FFFCF6",
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
    borderRadius: 18,
  },
  lockedSeatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  lockedSeatTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.body,
    color: COLORS.primary,
  },
  lockedSeatValue: {
    fontFamily: FONTS.bold,
    fontSize: SIZES.h2,
    color: COLORS.charcoal,
  },
  lockedSeatHint: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.gray,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  infoBoxSuccess: {
    backgroundColor: COLORS.success + "10",
  },
  infoBoxWarning: {
    backgroundColor: COLORS.accent + "12",
  },
  infoText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
  },
  summaryCard: { marginTop: 12, padding: 20 },
  summaryTitle: {
    fontFamily: FONTS.heading,
    fontSize: SIZES.h2,
    color: COLORS.charcoal,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryLabel: { fontFamily: FONTS.body, fontSize: SIZES.body, color: COLORS.gray },
  summaryValue: { fontFamily: FONTS.medium, fontSize: SIZES.body, color: COLORS.charcoal },
  noTablesText: {
    fontFamily: FONTS.body,
    fontSize: SIZES.caption,
    color: COLORS.accent,
    marginBottom: 12,
    textAlign: "center",
  },
  charCount: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: COLORS.gray,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 8,
  },
});








