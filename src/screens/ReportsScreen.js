import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import UserLogsModal from '../components/UserLogsModal';
import GroupedLogsModal from '../components/GroupedLogsModal';
import { calculateDailyUserLogs } from '../utils/logUtils';

const ReportsScreen = ({
  orders = [],
  itemsList = [],
  drawerHistory = [],
  people = [],
  logs = [],
  onBack,
  loggedInUser,
  rolePermissions = [],
  isDarkMode = false,
}) => {
  const userRole = loggedInUser ? Number(loggedInUser.role) : 3;
  const showFinancialsTab = userRole === 1; // Admin Role 1 ONLY
  const showStaffLogsTab = userRole === 1 || userRole === 2; // Admin and Super Crew ONLY

  const [activeReportTab, setActiveReportTab] = useState(showFinancialsTab ? 'sales' : 'drawer'); // 'sales' | 'drawer' | 'attendance'
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // 'today' | 'yesterday' | 'last15' | 'thisMonth' | 'lastMonth' | 'range'
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Daily Detail Modals State
  const [selectedDailySales, setSelectedDailySales] = useState(null);
  const [selectedDailyDrawer, setSelectedDailyDrawer] = useState(null);

  // Modal for individual staff log history
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [isGroupedModalVisible, setIsGroupedModalVisible] = useState(false);

  useEffect(() => {
    if (!showFinancialsTab && activeReportTab === 'sales') {
      setActiveReportTab('drawer');
    }
  }, [loggedInUser]);

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const getLocalDateKey = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatKeyToDisplayDate = (key) => {
    if (!key) return '';
    const parts = key.split('-');
    if (parts.length < 3) return key;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isMultiDayFilter = selectedPeriod !== 'today' && selectedPeriod !== 'yesterday';

  const getFilteredOrders = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return orders.filter((o) => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      if (isNaN(d.getTime())) return false;

      if (selectedPeriod === 'today') {
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      }
      if (selectedPeriod === 'yesterday') {
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);
        return (
          d.getFullYear() === yesterday.getFullYear() &&
          d.getMonth() === yesterday.getMonth() &&
          d.getDate() === yesterday.getDate()
        );
      }
      if (selectedPeriod === 'last15') {
        const fifteenDaysAgo = new Date(todayStart);
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return d >= fifteenDaysAgo;
      }
      if (selectedPeriod === 'thisMonth') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (selectedPeriod === 'lastMonth') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return d >= firstDayLastMonth && d <= lastDayLastMonth;
      }
      if (selectedPeriod === 'range') {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  const getFilteredDrawerHistory = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    return (drawerHistory || []).filter((d) => {
      if (!d.drawer_datetime) return false;
      const dDate = new Date(d.drawer_datetime);
      if (isNaN(dDate.getTime())) return false;

      if (selectedPeriod === 'today') {
        return (
          dDate.getFullYear() === now.getFullYear() &&
          dDate.getMonth() === now.getMonth() &&
          dDate.getDate() === now.getDate()
        );
      }
      if (selectedPeriod === 'yesterday') {
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);
        return (
          dDate.getFullYear() === yesterday.getFullYear() &&
          dDate.getMonth() === yesterday.getMonth() &&
          dDate.getDate() === yesterday.getDate()
        );
      }
      if (selectedPeriod === 'last15') {
        const fifteenDaysAgo = new Date(todayStart);
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return dDate >= fifteenDaysAgo;
      }
      if (selectedPeriod === 'thisMonth') {
        return (
          dDate.getFullYear() === now.getFullYear() &&
          dDate.getMonth() === now.getMonth()
        );
      }
      if (selectedPeriod === 'lastMonth') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return dDate >= firstDayLastMonth && dDate <= lastDayLastMonth;
      }
      if (selectedPeriod === 'range') {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return dDate >= start && dDate <= end;
      }
      return true;
    });
  };

  const filteredDrawerHistory = getFilteredDrawerHistory();

  // Compute Grand Financials & Dynamic Payment Method Breakdown
  const computeFinancialsForOrders = (ordersListToCompute) => {
    let totalSales = 0;
    let totalCost = 0;
    const methodMap = {};

    ordersListToCompute.forEach((order) => {
      const amt = Number(order.total_amount) || 0;
      const status = String(order.status || 'paid').toLowerCase();
      const methodRaw = String(order.payment_method || 'cash').trim();
      const methodDisplay = methodRaw.charAt(0).toUpperCase() + methodRaw.slice(1);

      if (status !== 'refunded' && status !== 'void') {
        totalSales += amt;

        if (!methodMap[methodDisplay]) {
          methodMap[methodDisplay] = 0;
        }
        methodMap[methodDisplay] += amt;

        let costVal = Number(order.cost_amount) || Number(order.cost_total) || 0;
        if (costVal === 0 && order.order_items) {
          order.order_items.forEach((li) => {
            const activeQty = Math.max(0, (Number(li.quantity) || 1) - (Number(li.quantity_cancelled) || 0));
            const foundProduct = itemsList.find(
              (i) => String(i.id) === String(li.item_id) || i.name === li.item_name
            );
            const unitCost = foundProduct ? Number(foundProduct.cost_amount || 0) : Number(li.unit_price) * 0.4;
            costVal += activeQty * unitCost;
          });
        }
        totalCost += costVal;
      }
    });

    const totalProfit = totalSales - totalCost;

    return {
      txCount: ordersListToCompute.length,
      totalSales,
      totalCost,
      totalProfit,
      methodMap,
    };
  };

  const grandFinStats = computeFinancialsForOrders(filteredOrders);

  // Group Financial Sales by Date for Multi-Day Filter
  const computeDailySalesList = () => {
    const dailyMap = {};

    filteredOrders.forEach((order) => {
      const dateKey = getLocalDateKey(order.created_at);
      if (!dateKey) return;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = [];
      }
      dailyMap[dateKey].push(order);
    });

    const sortedKeys = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const dayOrders = dailyMap[dateKey];
      const dayStats = computeFinancialsForOrders(dayOrders);
      return {
        dateKey,
        displayDate: formatKeyToDisplayDate(dateKey),
        orders: dayOrders,
        ...dayStats,
      };
    });
  };

  const dailySalesList = computeDailySalesList();

  // Compute Cash Drawer Summary Totals & Group by Date
  const computeDrawerTotals = (historyList) => {
    let totalAddedCash = 0;
    let totalExpenseCash = 0;

    (historyList || []).forEach((d) => {
      const actionType = String(d.type || d.drawer_action_type || '').toLowerCase();
      const amt = Number(d.amount) || 0;

      if (actionType === 'add') {
        totalAddedCash += amt;
      } else if (actionType === 'subtract') {
        totalExpenseCash += amt;
      }
    });

    return { totalAddedCash, totalExpenseCash };
  };

  const grandDrawerTotals = computeDrawerTotals(filteredDrawerHistory);

  // Group Cash Drawer History by Date for Multi-Day Filter
  const computeDailyDrawerList = () => {
    const dailyMap = {};

    filteredDrawerHistory.forEach((d) => {
      const dateKey = getLocalDateKey(d.drawer_datetime);
      if (!dateKey) return;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = [];
      }
      dailyMap[dateKey].push(d);
    });

    const sortedKeys = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const dayEntries = dailyMap[dateKey];
      const dayTotals = computeDrawerTotals(dayEntries);
      return {
        dateKey,
        displayDate: formatKeyToDisplayDate(dateKey),
        entries: dayEntries,
        ...dayTotals,
      };
    });
  };

  const dailyDrawerList = computeDailyDrawerList();

  const bgStyle = { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' };
  const cardBgStyle = {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderColor: isDarkMode ? '#334155' : '#E2E8F0',
  };
  const titleTextStyle = { color: isDarkMode ? '#F8FAFC' : '#0F172A' };
  const subTextStyle = { color: isDarkMode ? '#CBD5E1' : '#64748B' };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={styles.container}>
        {/* Tab Navigation (Role Access Filtered) */}
        <View style={[styles.tabNavContainer, cardBgStyle]}>
          {showFinancialsTab ? (
            <TouchableOpacity
              style={[styles.tabBtn, activeReportTab === 'sales' && styles.tabBtnActive]}
              onPress={() => setActiveReportTab('sales')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeReportTab === 'sales' && styles.tabBtnTextActive]}>
                💰 Financials
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.tabBtn, activeReportTab === 'drawer' && styles.tabBtnActive]}
            onPress={() => setActiveReportTab('drawer')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeReportTab === 'drawer' && styles.tabBtnTextActive]}>
              💵 Cash Drawer
            </Text>
          </TouchableOpacity>

          {showStaffLogsTab ? (
            <TouchableOpacity
              style={[styles.tabBtn, activeReportTab === 'attendance' && styles.tabBtnActive]}
              onPress={() => setActiveReportTab('attendance')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeReportTab === 'attendance' && styles.tabBtnTextActive]}>
                👥 Staff Logs
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Period Selector Chips (With Date Range option) */}
        <View style={[styles.periodBar, cardBgStyle]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last15', label: 'Last 15 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' },
              { id: 'range', label: 'Date Range' },
            ].map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.periodChip, selectedPeriod === p.id && styles.periodChipActive]}
                onPress={() => setSelectedPeriod(p.id)}
              >
                <Text style={[styles.periodChipText, selectedPeriod === p.id && styles.periodChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedPeriod === 'range' ? (
            <View style={styles.dateRangeRow}>
              <View style={styles.dateCol}>
                <Text style={[styles.dateLabel, subTextStyle]}>Start Date:</Text>
                <TextInput
                  style={[styles.dateInput, cardBgStyle, titleTextStyle]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={[styles.dateLabel, subTextStyle]}>End Date:</Text>
                <TextInput
                  style={[styles.dateInput, cardBgStyle, titleTextStyle]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* TAB 1: FINANCIAL SALES REPORT (Role 1 Admin Only) */}
        {activeReportTab === 'sales' && showFinancialsTab && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Grand Total Summary Box */}
            <View style={[styles.cardSection, cardBgStyle]}>
              <Text style={[styles.cardTitle, titleTextStyle]}>Sales & Profit Summary</Text>
              <Text style={[styles.cardSubtitle, subTextStyle]}>Key financial metrics for the selected period.</Text>

              <View style={styles.statGrid}>
                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Total Sales</Text>
                  <Text style={styles.statValBlue}>₱{grandFinStats.totalSales.toFixed(2)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Transactions</Text>
                  <Text style={[styles.statVal, titleTextStyle]}>{grandFinStats.txCount}</Text>
                </View>
              </View>

              <View style={styles.statGrid}>
                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Product Cost</Text>
                  <Text style={styles.statValRed}>₱{grandFinStats.totalCost.toFixed(2)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Net Profit</Text>
                  <Text style={styles.statValGreen}>₱{grandFinStats.totalProfit.toFixed(2)}</Text>
                </View>
              </View>

              <View style={[styles.methodBox, isDarkMode && styles.methodBoxDark]}>
                <Text style={[styles.methodBoxTitle, titleTextStyle]}>Payment Method Breakdown:</Text>
                {Object.keys(grandFinStats.methodMap).length > 0 ? (
                  Object.entries(grandFinStats.methodMap).map(([mName, mVal]) => (
                    <View key={mName} style={styles.methodRow}>
                      <Text style={[styles.methodLabel, subTextStyle]}>💳 {mName}:</Text>
                      <Text style={[styles.methodVal, titleTextStyle]}>₱{mVal.toFixed(2)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataSub}>No transactions in this period.</Text>
                )}
              </View>
            </View>

            {/* Daily Sales Breakdown for Multi-Day Filters */}
            {isMultiDayFilter && dailySalesList.length > 0 ? (
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>📅 Daily Sales Breakdown</Text>
                <Text style={[styles.cardSubtitle, subTextStyle]}>Tap a day to view full details and method breakdown.</Text>

                {dailySalesList.map((dayItem) => (
                  <TouchableOpacity
                    key={dayItem.dateKey}
                    style={[styles.dailySummaryRow, isDarkMode && styles.dailySummaryRowDark]}
                    onPress={() => setSelectedDailySales(dayItem)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dailyInfoCol}>
                      <Text style={[styles.dailyDateTitle, titleTextStyle]}>{dayItem.displayDate}</Text>
                      <Text style={[styles.dailyTxSub, subTextStyle]}>{dayItem.txCount} transactions</Text>
                    </View>
                    <View style={styles.dailyAmountCol}>
                      <Text style={styles.dailySalesVal}>₱{dayItem.totalSales.toFixed(2)}</Text>
                      <Text style={styles.dailyTapDetailText}>Tap details ›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* TAB 2: CASH DRAWER HISTORY REPORT */}
        {activeReportTab === 'drawer' && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Grand Cash Drawer Summary */}
            <View style={[styles.drawerSummaryCard, cardBgStyle]}>
              <Text style={[styles.cardTitle, titleTextStyle]}>💵 Cash Drawer Summary</Text>
              <View style={styles.statGrid}>
                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Total Added Cash</Text>
                  <Text style={styles.statValGreen}>+₱{grandDrawerTotals.totalAddedCash.toFixed(2)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Total Cash Expense</Text>
                  <Text style={styles.statValRed}>-₱{grandDrawerTotals.totalExpenseCash.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Daily Cash Drawer Breakdown for Multi-Day Filters */}
            {isMultiDayFilter && dailyDrawerList.length > 0 ? (
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>📅 Daily Cash Drawer Breakdown</Text>
                <Text style={[styles.cardSubtitle, subTextStyle]}>Tap a date to view per-entry drawer logs.</Text>

                {dailyDrawerList.map((dayItem) => (
                  <TouchableOpacity
                    key={dayItem.dateKey}
                    style={[styles.dailySummaryRow, isDarkMode && styles.dailySummaryRowDark]}
                    onPress={() => setSelectedDailyDrawer(dayItem)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dailyInfoCol}>
                      <Text style={[styles.dailyDateTitle, titleTextStyle]}>{dayItem.displayDate}</Text>
                      <Text style={[styles.dailyTxSub, subTextStyle]}>{dayItem.entries.length} drawer logs</Text>
                    </View>
                    <View style={styles.dailyAmountCol}>
                      <Text style={styles.dailyAddedText}>+₱{dayItem.totalAddedCash.toFixed(2)}</Text>
                      <Text style={styles.dailyExpenseText}>-₱{dayItem.totalExpenseCash.toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              /* Single-Day Flat List of Entries */
              filteredDrawerHistory.map((item) => {
                const typeUpper = String(item.type || item.drawer_action_type || 'ADD').toUpperCase();
                const isSet = typeUpper === 'SET';
                const isAdd = typeUpper === 'ADD';

                return (
                  <View key={item.id || Math.random()} style={[styles.drawerHistoryRow, cardBgStyle]}>
                    <View style={styles.drawerInfoCol}>
                      <View style={styles.typeBadgeRow}>
                        <View style={[styles.typePill, isSet ? styles.typePillBlue : isAdd ? styles.typePillGreen : styles.typePillRed]}>
                          <Text style={[styles.typePillText, isSet ? styles.typePillTextBlue : isAdd ? styles.typePillTextGreen : styles.typePillTextRed]}>
                            {typeUpper}
                          </Text>
                        </View>
                        <Text style={[styles.drawerDateText, subTextStyle]}>{formatDate(item.drawer_datetime)}</Text>
                      </View>
                      {item.reason || item.notes ? (
                        <Text style={[styles.reasonText, subTextStyle]}>Reason: {item.reason || item.notes}</Text>
                      ) : null}
                    </View>

                    <Text style={[styles.drawerAmtText, isAdd ? styles.colorGreen : isSet ? styles.colorBlue : styles.colorRed]}>
                      {isAdd ? '+' : isSet ? '' : '-'}₱{Number(item.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}

            {filteredDrawerHistory.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyTitle, subTextStyle]}>No cash drawer activity recorded for this period.</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {/* TAB 3: STAFF ATTENDANCE LOGS REPORT (Admin & Super Crew Only) */}
        {activeReportTab === 'attendance' && showStaffLogsTab && (
          <FlatList
            data={people}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.scrollContent}
            renderItem={({ item }) => {
              const { totalHoursFormatted, grandTotalRate } = calculateDailyUserLogs(
                item,
                logs,
                selectedPeriod
              );

              return (
                <TouchableOpacity
                  style={[styles.cardSection, cardBgStyle]}
                  onPress={() => {
                    setSelectedPerson(item);
                    setIsLogsModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.staffHeaderRow}>
                    <View>
                      <Text style={[styles.cardTitle, titleTextStyle]}>{item.name}</Text>
                      <Text style={[styles.cardSubtitle, subTextStyle]}>
                        Role: {Number(item.role) === 1 ? 'Admin' : 'Staff'} • Rate: ₱{item.rate || 0}/hr
                      </Text>
                    </View>
                    <View style={styles.staffBadgesCol}>
                      <View style={styles.hoursBadge}>
                        <Text style={styles.hoursBadgeLabel}>HOURS</Text>
                        <Text style={styles.hoursBadgeVal}>{totalHoursFormatted}</Text>
                      </View>
                      <View style={styles.incomeBadge}>
                        <Text style={styles.incomeBadgeLabel}>INCOME</Text>
                        <Text style={styles.incomeBadgeVal}>₱{grandTotalRate.toFixed(2)}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.tapToViewText}>Tap to view daily log breakdown ›</Text>
                </TouchableOpacity>
              );
            }}
            ListHeaderComponent={
              <TouchableOpacity
                style={styles.groupedSummaryBtn}
                onPress={() => setIsGroupedModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.groupedSummaryBtnText}>
                  📊 View Grouped Directory Summary
                </Text>
              </TouchableOpacity>
            }
          />
        )}

        {/* MODAL 1: DAILY SALES FINANCIAL DETAIL */}
        <Modal
          visible={!!selectedDailySales}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDailySales(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedDailySales(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.dailyDetailCard}>
                  <Text style={styles.modalTitle}>📅 Daily Sales Details</Text>
                  <Text style={styles.modalSubTitle}>{selectedDailySales?.displayDate}</Text>

                  <View style={styles.statGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Total Sales</Text>
                      <Text style={styles.statValBlue}>₱{selectedDailySales?.totalSales.toFixed(2)}</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Transactions</Text>
                      <Text style={styles.statVal}>{selectedDailySales?.txCount}</Text>
                    </View>
                  </View>

                  <View style={styles.statGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Product Cost</Text>
                      <Text style={styles.statValRed}>₱{selectedDailySales?.totalCost.toFixed(2)}</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Net Profit</Text>
                      <Text style={styles.statValGreen}>₱{selectedDailySales?.totalProfit.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.methodBox}>
                    <Text style={styles.methodBoxTitle}>Payment Method Breakdown:</Text>
                    {selectedDailySales && Object.keys(selectedDailySales.methodMap).length > 0 ? (
                      Object.entries(selectedDailySales.methodMap).map(([mName, mVal]) => (
                        <View key={mName} style={styles.methodRow}>
                          <Text style={styles.methodLabel}>💳 {mName}:</Text>
                          <Text style={styles.methodVal}>₱{mVal.toFixed(2)}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataSub}>No method data.</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtnLarge}
                    onPress={() => setSelectedDailySales(null)}
                  >
                    <Text style={styles.closeBtnLargeText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL 2: DAILY CASH DRAWER LOGS DETAIL */}
        <Modal
          visible={!!selectedDailyDrawer}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDailyDrawer(null)}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedDailyDrawer(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.dailyDetailCardLarge}>
                  <Text style={styles.modalTitle}>💵 Drawer Logs - {selectedDailyDrawer?.displayDate}</Text>

                  <View style={styles.statGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Added Cash</Text>
                      <Text style={styles.statValGreen}>+₱{selectedDailyDrawer?.totalAddedCash.toFixed(2)}</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Cash Expense</Text>
                      <Text style={styles.statValRed}>-₱{selectedDailyDrawer?.totalExpenseCash.toFixed(2)}</Text>
                    </View>
                  </View>

                  <FlatList
                    data={selectedDailyDrawer?.entries || []}
                    keyExtractor={(item) => String(item.id || Math.random())}
                    style={styles.drawerEntriesList}
                    renderItem={({ item }) => {
                      const typeUpper = String(item.type || item.drawer_action_type || 'ADD').toUpperCase();
                      const isSet = typeUpper === 'SET';
                      const isAdd = typeUpper === 'ADD';

                      return (
                        <View style={styles.drawerHistoryRow}>
                          <View style={styles.drawerInfoCol}>
                            <View style={styles.typeBadgeRow}>
                              <View style={[styles.typePill, isSet ? styles.typePillBlue : isAdd ? styles.typePillGreen : styles.typePillRed]}>
                                <Text style={[styles.typePillText, isSet ? styles.typePillTextBlue : isAdd ? styles.typePillTextGreen : styles.typePillTextRed]}>
                                  {typeUpper}
                                </Text>
                              </View>
                              <Text style={styles.drawerDateText}>{formatDate(item.drawer_datetime)}</Text>
                            </View>
                            {item.reason || item.notes ? (
                              <Text style={styles.reasonText}>Reason: {item.reason || item.notes}</Text>
                            ) : null}
                          </View>

                          <Text style={[styles.drawerAmtText, isAdd ? styles.colorGreen : isSet ? styles.colorBlue : styles.colorRed]}>
                            {isAdd ? '+' : isSet ? '' : '-'}₱{Number(item.amount || 0).toFixed(2)}
                          </Text>
                        </View>
                      );
                    }}
                  />

                  <TouchableOpacity
                    style={styles.closeBtnLarge}
                    onPress={() => setSelectedDailyDrawer(null)}
                  >
                    <Text style={styles.closeBtnLargeText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Modal 3: Individual Staff Logs Modal */}
        <UserLogsModal
          visible={isLogsModalVisible}
          person={selectedPerson}
          logs={logs}
          period={selectedPeriod}
          onClose={() => setIsLogsModalVisible(false)}
        />

        {/* Modal 4: Grouped Directory Logs Summary */}
        <GroupedLogsModal
          visible={isGroupedModalVisible}
          people={people}
          logs={logs}
          period={selectedPeriod}
          onClose={() => setIsGroupedModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
  },
  container: {
    flex: 1,
  },
  tabNavContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 3,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  periodBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  periodChipActive: {
    backgroundColor: '#2563EB',
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  dateCol: {
    flex: 0.48,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  dateInput: {
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  drawerSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  groupedSummaryBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  groupedSummaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffBadgesCol: {
    alignItems: 'flex-end',
  },
  hoursBadge: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  hoursBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  hoursBadgeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  incomeBadge: {
    alignItems: 'flex-end',
  },
  incomeBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  incomeBadgeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  tapToViewText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    flex: 0.48,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statCardDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statValBlue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  statValRed: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  statValGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  methodBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  methodBoxDark: {
    backgroundColor: '#334155',
  },
  methodBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  methodLabel: {
    fontSize: 12,
    color: '#475569',
  },
  methodVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  noDataSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  dailySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dailySummaryRowDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  dailyInfoCol: {
    flex: 1,
  },
  dailyDateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dailyTxSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dailyAmountCol: {
    alignItems: 'flex-end',
  },
  dailySalesVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  dailyTapDetailText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  dailyAddedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  dailyExpenseText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 1,
  },
  drawerHistoryRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerInfoCol: {
    flex: 1,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  typePillBlue: {
    backgroundColor: '#DBEAFE',
  },
  typePillGreen: {
    backgroundColor: '#DCFCE7',
  },
  typePillRed: {
    backgroundColor: '#FEE2E2',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typePillTextBlue: {
    color: '#1D4ED8',
  },
  typePillTextGreen: {
    color: '#15803D',
  },
  typePillTextRed: {
    color: '#B91C1C',
  },
  drawerDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  reasonText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
    fontStyle: 'italic',
  },
  drawerAmtText: {
    fontSize: 16,
    fontWeight: '800',
  },
  colorGreen: {
    color: '#15803D',
  },
  colorBlue: {
    color: '#1D4ED8',
  },
  colorRed: {
    color: '#B91C1C',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dailyDetailCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  dailyDetailCardLarge: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  drawerEntriesList: {
    maxHeight: 280,
    marginVertical: 10,
  },
  closeBtnLarge: {
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnLargeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default ReportsScreen;
