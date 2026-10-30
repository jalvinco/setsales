import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { fetchOrders, fetchDrawerHistory, fetchLogs, fetchItems } from '../services/supabase';

const ReportsScreen = ({
  appName = 'SetSales',
  onBack,
  loggedInUser,
  rolePermissions = [],
  isDarkMode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [drawerHistoryList, setDrawerHistoryList] = useState([]);
  const [logsList, setLogsList] = useState([]);

  // Active Report Tab: 'sales' (Financials) | 'drawer' (Cash Drawer) | 'attendance' (Staff Logs)
  const [activeReportTab, setActiveReportTab] = useState('sales');

  // Filter Period: 'today' | 'yesterday' | 'last15' | 'thisMonth' | 'lastMonth' | 'range'
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Daily Detail Modal States
  const [selectedDailySales, setSelectedDailySales] = useState(null);
  const [selectedDailyDrawer, setSelectedDailyDrawer] = useState(null);

  // Role Permissions Checks
  const canAccessFinancials = () => {
    if (loggedInUser && Number(loggedInUser.role) === 1) return true; // Admin role 1
    if (loggedInUser) {
      const uRole = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === uRole);
      return permObj && permObj.report === true;
    }
    return false;
  };

  const canAccessStaffLogs = () => {
    if (loggedInUser && Number(loggedInUser.role) === 1) return true; // Admin role 1
    if (loggedInUser) {
      const uRole = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === uRole);
      return permObj && permObj.people === true;
    }
    return false;
  };

  const showFinancialsTab = canAccessFinancials();
  const showStaffLogsTab = canAccessStaffLogs();

  useEffect(() => {
    loadAllReportData();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadAllReportData = async () => {
    setLoading(true);
    try {
      const [ord, drw, lgs, catalogItems] = await Promise.all([
        fetchOrders(),
        fetchDrawerHistory(),
        fetchLogs(),
        fetchItems(),
      ]);
      setOrdersList(ord || []);
      setDrawerHistoryList(drw || []);
      setLogsList(lgs || []);
      setItemsList(catalogItems || []);
    } catch (e) {
      console.warn('Error loading report data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getLocalDateKey = (isoStr) => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatKeyToDisplayDate = (dateKeyStr) => {
    if (!dateKeyStr) return '';
    const parts = dateKeyStr.split('-');
    if (parts.length < 3) return dateKeyStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const isMultiDayFilter = selectedPeriod !== 'today' && selectedPeriod !== 'yesterday';

  // Filter Orders for Active Period
  const getFilteredOrders = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return ordersList.filter((o) => {
      if (!o || !o.created_at) return false;
      const dDate = new Date(o.created_at);
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
        const fifteenAgo = new Date(todayStart);
        fifteenAgo.setDate(fifteenAgo.getDate() - 15);
        return dDate >= fifteenAgo;
      }
      if (selectedPeriod === 'thisMonth') {
        return dDate.getFullYear() === now.getFullYear() && dDate.getMonth() === now.getMonth();
      }
      if (selectedPeriod === 'lastMonth') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return dDate.getFullYear() === lastMonthDate.getFullYear() && dDate.getMonth() === lastMonthDate.getMonth();
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

  const filteredOrders = getFilteredOrders();

  // Filter Cash Drawer History for Active Period
  const getFilteredDrawerHistory = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return drawerHistoryList.filter((d) => {
      if (!d || !d.drawer_datetime) return false;
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
        const fifteenAgo = new Date(todayStart);
        fifteenAgo.setDate(fifteenAgo.getDate() - 15);
        return dDate >= fifteenAgo;
      }
      if (selectedPeriod === 'thisMonth') {
        return dDate.getFullYear() === now.getFullYear() && dDate.getMonth() === now.getMonth();
      }
      if (selectedPeriod === 'lastMonth') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return dDate.getFullYear() === lastMonthDate.getFullYear() && dDate.getMonth() === lastMonthDate.getMonth();
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
        {loading ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingBarText}>Loading Reports...</Text>
          </View>
        ) : null}

        {/* Submenu Report Tabs Selector */}
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

        {/* Period Selector Chips */}
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

        {/* TAB 1: FINANCIAL SALES REPORT */}
        {activeReportTab === 'sales' && showFinancialsTab && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Grand Total Summary Box */}
            <View style={[styles.cardSection, cardBgStyle]}>
              <Text style={[styles.cardTitle, titleTextStyle]}>Sales & Profit Summary</Text>
              <Text style={[styles.cardSubtitle, subTextStyle]}>Key financial metrics for the selected period.</Text>

              <View style={styles.statGrid}>
                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Total Sales</Text>
                  <Text style={styles.statValBlue}>{formatCurrency(grandFinStats.totalSales)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Transactions</Text>
                  <Text style={[styles.statVal, titleTextStyle]}>{grandFinStats.txCount}</Text>
                </View>
              </View>

              <View style={styles.statGrid}>
                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Product Cost</Text>
                  <Text style={styles.statValRed}>{formatCurrency(grandFinStats.totalCost)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Net Profit</Text>
                  <Text style={styles.statValGreen}>{formatCurrency(grandFinStats.totalProfit)}</Text>
                </View>
              </View>

              <View style={[styles.methodBox, isDarkMode && styles.methodBoxDark]}>
                <Text style={[styles.methodBoxTitle, titleTextStyle]}>Payment Method Breakdown:</Text>
                {Object.keys(grandFinStats.methodMap).length > 0 ? (
                  Object.entries(grandFinStats.methodMap).map(([mName, mVal]) => (
                    <View key={mName} style={styles.methodRow}>
                      <Text style={[styles.methodLabel, subTextStyle]}>💳 {mName}:</Text>
                      <Text style={[styles.methodVal, titleTextStyle]}>{formatCurrency(mVal)}</Text>
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
                      <Text style={styles.dailySalesVal}>{formatCurrency(dayItem.totalSales)}</Text>
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
                  <Text style={styles.statValGreen}>+{formatCurrency(grandDrawerTotals.totalAddedCash)}</Text>
                </View>

                <View style={[styles.statCard, isDarkMode && styles.statCardDark]}>
                  <Text style={[styles.statLabel, subTextStyle]}>Total Cash Expense</Text>
                  <Text style={styles.statValRed}>-{formatCurrency(grandDrawerTotals.totalExpenseCash)}</Text>
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
                      <Text style={styles.dailyAddedText}>+{formatCurrency(dayItem.totalAddedCash)}</Text>
                      <Text style={styles.dailyExpenseText}>-{formatCurrency(dayItem.totalExpenseCash)}</Text>
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
                        <Text style={[styles.drawerReasonText, titleTextStyle]}>{item.reason || item.notes}</Text>
                      ) : null}
                    </View>

                    <Text style={[styles.drawerAmtText, isSet ? styles.statValBlue : isAdd ? styles.statValGreen : styles.statValRed]}>
                      {isSet ? '' : isAdd ? '+' : '-'}{formatCurrency(item.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* TAB 3: STAFF LOGS REPORT */}
        {activeReportTab === 'attendance' && showStaffLogsTab && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.cardSection, cardBgStyle]}>
              <Text style={[styles.cardTitle, titleTextStyle]}>👥 Staff Login & Attendance Logs</Text>
              <Text style={[styles.cardSubtitle, subTextStyle]}>Activity log records across staff members.</Text>

              {logsList.map((log) => (
                <View key={log.id || Math.random()} style={styles.logRow}>
                  <View style={styles.logLeft}>
                    <Text style={[styles.logUserName, titleTextStyle]}>{log.user_name || `User #${log.user_id}`}</Text>
                    <Text style={[styles.logTimeText, subTextStyle]}>{formatDate(log.datetime)}</Text>
                  </View>
                  <View style={[styles.logBadge, log.type === 'In' ? styles.badgeIn : styles.badgeOut]}>
                    <Text style={[styles.logBadgeText, log.type === 'In' ? styles.badgeTextIn : styles.badgeTextOut]}>
                      {log.type === 'In' ? '🟢 Logged In' : '🔴 Logged Out'}
                    </Text>
                  </View>
                </View>
              ))}

              {logsList.length === 0 ? (
                <Text style={styles.noDataSub}>No staff activity logs recorded yet.</Text>
              ) : null}
            </View>
          </ScrollView>
        )}

        {/* MODAL 1: DAILY SALES DETAILS MODAL */}
        <Modal visible={!!selectedDailySales} transparent animationType="fade" onRequestClose={() => setSelectedDailySales(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedDailySales(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCardLarge}>
                  <Text style={styles.modalTitle}>📅 Daily Sales: {selectedDailySales?.displayDate}</Text>
                  <Text style={styles.modalSubTitle}>Transactions Count: {selectedDailySales?.txCount || 0}</Text>

                  <View style={styles.statGrid}>
                    <View style={styles.statCardModal}>
                      <Text style={styles.statLabel}>Total Sales</Text>
                      <Text style={styles.statValBlue}>{formatCurrency(selectedDailySales?.totalSales)}</Text>
                    </View>
                    <View style={styles.statCardModal}>
                      <Text style={styles.statLabel}>Net Profit</Text>
                      <Text style={styles.statValGreen}>{formatCurrency(selectedDailySales?.totalProfit)}</Text>
                    </View>
                  </View>

                  <Text style={styles.methodBoxTitleModal}>Payment Method Breakdown:</Text>
                  {selectedDailySales && selectedDailySales.methodMap && Object.keys(selectedDailySales.methodMap).length > 0 ? (
                    Object.entries(selectedDailySales.methodMap).map(([mName, mVal]) => (
                      <View key={mName} style={styles.methodRowModal}>
                        <Text style={styles.methodLabelModal}>💳 {mName}:</Text>
                        <Text style={styles.methodValModal}>{formatCurrency(mVal)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataSub}>No method data for this date.</Text>
                  )}

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDailySales(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL 2: DAILY CASH DRAWER DETAILS MODAL */}
        <Modal visible={!!selectedDailyDrawer} transparent animationType="fade" onRequestClose={() => setSelectedDailyDrawer(null)}>
          <TouchableWithoutFeedback onPress={() => setSelectedDailyDrawer(null)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCardLarge}>
                  <Text style={styles.modalTitle}>💵 Drawer Logs: {selectedDailyDrawer?.displayDate}</Text>

                  <ScrollView style={styles.modalScroll}>
                    {(selectedDailyDrawer?.entries || []).map((item) => {
                      const typeUpper = String(item.type || item.drawer_action_type || 'ADD').toUpperCase();
                      const isSet = typeUpper === 'SET';
                      const isAdd = typeUpper === 'ADD';

                      return (
                        <View key={item.id || Math.random()} style={styles.drawerHistoryRowModal}>
                          <View style={styles.drawerInfoCol}>
                            <View style={styles.typeBadgeRow}>
                              <View style={[styles.typePill, isSet ? styles.typePillBlue : isAdd ? styles.typePillGreen : styles.typePillRed]}>
                                <Text style={[styles.typePillText, isSet ? styles.typePillTextBlue : isAdd ? styles.typePillTextGreen : styles.typePillTextRed]}>
                                  {typeUpper}
                                </Text>
                              </View>
                              <Text style={styles.drawerDateTextModal}>{formatDate(item.drawer_datetime)}</Text>
                            </View>
                            {item.reason || item.notes ? (
                              <Text style={styles.drawerReasonTextModal}>{item.reason || item.notes}</Text>
                            ) : null}
                          </View>

                          <Text style={[styles.drawerAmtTextModal, isSet ? styles.statValBlue : isAdd ? styles.statValGreen : styles.statValRed]}>
                            {isSet ? '' : isAdd ? '+' : '-'}{formatCurrency(item.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDailyDrawer(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
  },
  loadingBarText: {
    fontSize: 12,
    color: '#2563EB',
    marginLeft: 6,
    fontWeight: '600',
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  drawerSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  statValBlue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  statValRed: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  statValGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  methodBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodBoxDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  methodBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  methodLabel: {
    fontSize: 12,
    color: '#475569',
  },
  methodVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  noDataSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 8,
  },
  dailySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  dailyAddedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  dailyExpenseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  dailyTapDetailText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  drawerHistoryRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerInfoCol: {
    flex: 1,
    paddingRight: 8,
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
  drawerReasonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  drawerAmtText: {
    fontSize: 15,
    fontWeight: '800',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logLeft: {
    flex: 1,
  },
  logUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  logTimeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeIn: {
    backgroundColor: '#DCFCE7',
  },
  badgeOut: {
    backgroundColor: '#FEE2E2',
  },
  logBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextIn: {
    color: '#15803D',
  },
  badgeTextOut: {
    color: '#B91C1C',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  statCardModal: {
    flex: 0.48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodBoxTitleModal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 6,
  },
  methodRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  methodLabelModal: {
    fontSize: 12,
    color: '#475569',
  },
  methodValModal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  drawerHistoryRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  drawerDateTextModal: {
    fontSize: 11,
    color: '#64748B',
  },
  drawerReasonTextModal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  drawerAmtTextModal: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalScroll: {
    maxHeight: 280,
    marginVertical: 6,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default ReportsScreen;
