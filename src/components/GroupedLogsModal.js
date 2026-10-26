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

const GroupedLogsModal = ({ visible, people = [], logs = [], period = 'last15', onClose }) => {
  if (!visible) return null;

  // Compute reports for all users
  const userReports = people.map((person) => {
    const { dailySummaries, totalMinutes, totalHoursFormatted, grandTotalRate, latestLogTime } =
      calculateDailyUserLogs(person, logs, period);
    return {
      person,
      dailySummaries,
      totalMinutes,
      totalHoursFormatted,
      grandTotalRate,
      latestLogTime,
    };
  });

  // Sort users descending by newest dateKey or latestLogTime
  userReports.sort((a, b) => {
    if (a.dailySummaries.length > 0 && b.dailySummaries.length > 0) {
      return b.dailySummaries[0].dateKey.localeCompare(a.dailySummaries[0].dateKey);
    }
    return b.latestLogTime - a.latestLogTime;
  });

  // Calculate overall total minutes and rates across all users
  const overallMinutes = userReports.reduce((acc, curr) => acc + curr.totalMinutes, 0);
  const overallHours = Math.floor(overallMinutes / 60);
  const overallMins = overallMinutes % 60;
  const overallHoursFormatted = `${overallHours}h ${overallMins}m`;

  const overallRate = userReports.reduce((acc, curr) => acc + curr.grandTotalRate, 0);

  const getRoleLabel = (role) => {
    const r = Number(role);
    if (r === 1) return 'Admin';
    if (r === 2) return 'Super Crew';
    if (r === 3) return 'Crew';
    return `Role ${role}`;
  };

  const renderUserCard = ({ item }) => {
    const { person, dailySummaries, totalHoursFormatted, grandTotalRate } = item;

    return (
      <View style={styles.userCard}>
        {/* User Card Header */}
        <View style={styles.userCardHeader}>
          <View style={styles.userHeaderLeft}>
            <Text style={styles.userName}>{person.name}</Text>
            <Text style={styles.userRole}>{getRoleLabel(person.role)}</Text>
          </View>
          <View style={styles.totalBadgeGroup}>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeLabel}>TOTAL HOURS</Text>
              <Text style={styles.totalBadgeValue}>{totalHoursFormatted}</Text>
            </View>
            <View style={[styles.totalBadge, styles.rateBadge]}>
              <Text style={styles.totalBadgeLabel}>TOTAL RATE</Text>
              <Text style={styles.rateBadgeValue}>{grandTotalRate}</Text>
            </View>
          </View>
        </View>

        {/* Daily Summaries Table */}
        {dailySummaries.length > 0 ? (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
              <Text style={[styles.headerCell, styles.colTime]}>Log In</Text>
              <Text style={[styles.headerCell, styles.colTime]}>Log Out</Text>
              <Text style={[styles.headerCell, styles.colHours]}>Total</Text>
              <Text style={[styles.headerCell, styles.colRate]}>Rate</Text>
            </View>

            {dailySummaries.map((day) => (
              <View key={day.dateKey} style={styles.tableDataRow}>
                <Text style={[styles.dataCell, styles.colDate]}>{day.formattedDate}</Text>
                <Text style={[styles.dataCell, styles.colTime, styles.textIn]}>{day.logIn}</Text>
                <Text style={[styles.dataCell, styles.colTime, styles.textOut]}>{day.logOut}</Text>
                <Text
                  style={[
                    styles.dataCell,
                    styles.colHours,
                    day.isHighlighted && styles.highlightedText,
                  ]}
                >
                  {day.totalHours}
                </Text>
                <Text
                  style={[
                    styles.dataCell,
                    styles.colRate,
                    day.isDarkRed ? styles.rateDarkRed : styles.rateNormal,
                    day.isHighlighted && styles.highlightedText,
                  ]}
                >
                  {day.rateVal}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataBox}>
            <Text style={styles.noDataText}>No activity recorded for this period.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.topHeader}>
            <View>
              <Text style={styles.title}>📊 {getPeriodTitle(period)}</Text>
              <Text style={styles.subtitle}>Directory Grouped Attendance & Rate Summary</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Grand Total Summary Bar */}
          <View style={styles.grandTotalBar}>
            <View>
              <Text style={styles.grandTotalLabel}>TOTAL COMBINED HOURS</Text>
              <Text style={styles.grandTotalValue}>{overallHoursFormatted}</Text>
            </View>
            <View style={styles.grandTotalRight}>
              <Text style={styles.grandTotalLabel}>TOTAL COMBINED RATE</Text>
              <Text style={styles.grandTotalRateValue}>{overallRate}</Text>
            </View>
          </View>

          {/* User Cards List */}
          <FlatList
            data={userReports}
            keyExtractor={(item) => String(item.person.id)}
            renderItem={renderUserCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No directory users found</Text>
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
  topHeader: {
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
  grandTotalBar: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#60A5FA',
    marginTop: 2,
  },
  grandTotalRight: {
    alignItems: 'flex-end',
  },
  grandTotalRateValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#34D399',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  userHeaderLeft: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  totalBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalBadge: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  rateBadge: {
    marginLeft: 14,
  },
  totalBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  totalBadgeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 1,
  },
  rateBadgeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  tableContainer: {
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dataCell: {
    fontSize: 12,
  },
  colDate: {
    flex: 2,
    fontWeight: '700',
    color: '#1E293B',
  },
  colTime: {
    flex: 1.6,
    fontWeight: '600',
  },
  colHours: {
    flex: 1.4,
    fontWeight: '700',
    color: '#2563EB',
  },
  colRate: {
    flex: 1.2,
    fontWeight: '700',
    textAlign: 'right',
  },
  textIn: {
    color: '#16A34A',
  },
  textOut: {
    color: '#DC2626',
  },
  rateNormal: {
    color: '#059669',
  },
  rateDarkRed: {
    color: '#991B1B', // Dark Red font color for < 4 hours
    fontWeight: '800',
  },
  highlightedText: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  noDataBox: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default GroupedLogsModal;
