import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { calculateDailyUserLogs, getPeriodTitle } from '../utils/logUtils';

const UserLogsModal = ({
  visible,
  person,
  logs = [],
  period = 'last15',
  onClose,
}) => {
  if (!person || !visible) return null;

  const { dailySummaries, totalHoursFormatted } = calculateDailyUserLogs(
    person,
    logs,
    period
  );

  const renderLogRow = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.colCell, styles.colDate]}>{item.formattedDate}</Text>
      <Text style={[styles.colCell, styles.colTime, styles.textIn]}>{item.logIn}</Text>
      <Text style={[styles.colCell, styles.colTime, styles.textOut]}>{item.logOut}</Text>
      <Text
        style={[
          styles.colCell,
          styles.colHours,
          item.isHighlighted && styles.highlightedText,
        ]}
      >
        {item.totalHours}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>📊 {getPeriodTitle(period)}</Text>
              <Text style={styles.subtitle}>{person.name}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Period Summary Bar */}
          <View style={styles.summaryBar}>
            <Text style={styles.summaryLabel}>TOTAL WORKED HOURS ({getPeriodTitle(period)}):</Text>
            <Text style={styles.summaryValue}>{totalHoursFormatted}</Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
            <Text style={[styles.headerCell, styles.colTime]}>Log In</Text>
            <Text style={[styles.headerCell, styles.colTime]}>Log Out</Text>
            <Text style={[styles.headerCell, styles.colHours]}>Total Hours</Text>
          </View>

          {/* Log List */}
          <FlatList
            data={dailySummaries}
            keyExtractor={(item) => item.dateKey}
            renderItem={renderLogRow}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No logs found</Text>
                <Text style={styles.emptyDesc}>
                  No attendance activity recorded for {person.name} during this period.
                </Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: '5%', // 5% Top Padding
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  summaryBar: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#34D399',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colCell: {
    fontSize: 13,
  },
  colDate: {
    flex: 2.2,
    fontWeight: '700',
    color: '#1E293B',
  },
  colTime: {
    flex: 1.8,
    fontWeight: '600',
  },
  colHours: {
    flex: 1.8,
    fontWeight: '700',
    color: '#2563EB',
    textAlign: 'right',
  },
  highlightedText: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  textIn: {
    color: '#16A34A',
  },
  textOut: {
    color: '#DC2626',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
});

export default UserLogsModal;
