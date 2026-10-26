import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  Alert,
} from 'react-native';
import { DEFAULT_THEME } from '../utils/themeUtils';
import { createDrawerHistory, hashPin, updateUser } from '../services/supabase';
import { openCashDrawerViaPrinter } from '../services/printerService';
import PinModal from '../components/PinModal';

const HomeScreen = ({
  appName = 'People Log',
  theme = DEFAULT_THEME,
  isDarkMode = false,
  people = [],
  orders = [],
  inventory = [],
  drawerHistory = [],
  businessHours = {},
  rolePermissions = [],
  loggedInUser,
  setLoggedInUser,
  onOpenLoginModal,
  onOpenSessionModal,
  onRefreshOrders,
  onRefreshDrawerHistory,
  onNavigateToTransact,
  onNavigateToTransactions,
  onNavigateToItems,
  onNavigateToInventory,
  onNavigateToReports,
  onNavigateToPeople,
  onNavigateToSettings,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('Today');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Modals for Breakdown
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [pendingTargetScreen, setPendingTargetScreen] = useState(null);
  const [isSalesModalVisible, setIsSalesModalVisible] = useState(false);
  const [isTxBreakdownModalVisible, setIsTxBreakdownModalVisible] = useState(false);
  const [isLowStockModalVisible, setIsLowStockModalVisible] = useState(false);

  // Cash Drawer Modal
  const [isCashDrawerModalVisible, setIsCashDrawerModalVisible] = useState(false);
  const [drawerActionType, setDrawerActionType] = useState('set'); // 'set' | 'add' | 'subtract'
  const [drawerAmountInput, setDrawerAmountInput] = useState('');
  const [drawerNotesInput, setDrawerNotesInput] = useState('');
  const [drawerLoading, setDrawerLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (onRefreshOrders) {
      onRefreshOrders();
    }
  }, []);

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const filterOptions = ['Today', 'Yesterday', 'Last 7 days', 'This Month', 'Last Month', 'Date Range'];

  // Check if current user or role has access to feature
  const canAccessModule = (featureKey) => {
    if (loggedInUser && Number(loggedInUser.role) === 1) return true; // Admin role 1 always has full access

    if (loggedInUser) {
      const userRoleNum = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === userRoleNum);
      if (permObj && permObj[featureKey] === true) return true;
    }

    return false;
  };

  const handleNavigateWithAccessCheck = (featureKey, navigateFn) => {
    if (canAccessModule(featureKey)) {
      navigateFn();
    } else {
      setPendingTargetScreen(() => navigateFn);
      setIsPinModalVisible(true);
    }
  };

  // Low stock inventory items calculation
  const lowStockItems = inventory.filter((inv) => {
    if (inv.is_deleted === true || inv.is_delete === true) return false;
    const currentQty = Number(inv.quantity) || 0;
    const warnQty = Number(inv.warning_quantity ?? 5.0);
    return currentQty <= warnQty;
  });

  // Filter orders by active period filter
  const getFilteredOrders = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter((order) => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      if (isNaN(orderDate.getTime())) return false;

      if (selectedFilter === 'Today') {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        );
      }
      if (selectedFilter === 'Yesterday') {
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);
        return (
          orderDate.getFullYear() === yesterday.getFullYear() &&
          orderDate.getMonth() === yesterday.getMonth() &&
          orderDate.getDate() === yesterday.getDate()
        );
      }
      if (selectedFilter === 'Last 7 days') {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }
      if (selectedFilter === 'This Month') {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth()
        );
      }
      if (selectedFilter === 'Last Month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          orderDate.getFullYear() === lastMonthDate.getFullYear() &&
          orderDate.getMonth() === lastMonthDate.getMonth()
        );
      }
      if (selectedFilter === 'Date Range') {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Compute Cash InHand: lastSetValue + drawerAddInFilter - drawerSubInFilter + cashSalesInFilter
  const computeCashInHandFromDrawer = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isDateInFilter = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      if (selectedFilter === 'Today') {
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      }
      if (selectedFilter === 'Yesterday') {
        const yesterday = new Date(todayStart);
        yesterday.setDate(yesterday.getDate() - 1);
        return (
          d.getFullYear() === yesterday.getFullYear() &&
          d.getMonth() === yesterday.getMonth() &&
          d.getDate() === yesterday.getDate()
        );
      }
      if (selectedFilter === 'Last 7 days') {
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return d >= sevenDaysAgo;
      }
      if (selectedFilter === 'This Month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (selectedFilter === 'Last Month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
      }
      if (selectedFilter === 'Date Range') {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      }
      return true;
    };

    // 1. ALWAYS get the last 'set' type value from drawer_history, else 0
    const setEntries = (drawerHistory || []).filter(
      (d) => String(d.type || d.drawer_action_type).toLowerCase() === 'set'
    );
    let lastSetValue = 0;
    if (setEntries.length > 0) {
      lastSetValue = Number(setEntries[setEntries.length - 1].amount) || 0;
    }

    // 2. Sum 'add' and 'subtract' entries in drawerHistory matching active date filter
    let drawerAddInFilter = 0;
    let drawerSubInFilter = 0;

    (drawerHistory || []).forEach((d) => {
      const actionType = String(d.type || d.drawer_action_type || '').toLowerCase();
      if (isDateInFilter(d.drawer_datetime)) {
        if (actionType === 'add') {
          drawerAddInFilter += Number(d.amount) || 0;
        } else if (actionType === 'subtract') {
          drawerSubInFilter += Number(d.amount) || 0;
        }
      }
    });

    // 3. Sum Cash Sales in active date filter
    let cashSalesInFilter = 0;
    filteredOrders.forEach((order) => {
      const status = String(order.status || 'paid').toLowerCase();
      const method = String(order.payment_method || 'cash').toLowerCase();

      if (status !== 'refunded' && status !== 'void' && method === 'cash') {
        cashSalesInFilter += Number(order.total_amount) || 0;
      }
    });

    // Formula: lastSetValue + drawerAddInFilter - drawerSubInFilter + cashSalesInFilter
    return lastSetValue + drawerAddInFilter - drawerSubInFilter + cashSalesInFilter;
  };

  const calculatedCashInHand = computeCashInHandFromDrawer();

  // Helper to get last set value for pre-filling input
  const getLastSetAmountValue = () => {
    const setEntries = (drawerHistory || []).filter(
      (d) => String(d.type || d.drawer_action_type).toLowerCase() === 'set'
    );
    if (setEntries.length > 0) {
      return Number(setEntries[setEntries.length - 1].amount) || 0;
    }
    return 0;
  };

  const handleSelectDrawerAction = (actionType) => {
    setDrawerActionType(actionType);
    if (actionType === 'set') {
      const lastVal = getLastSetAmountValue();
      setDrawerAmountInput(String(lastVal));
    } else {
      setDrawerAmountInput('');
    }
  };

  const handleOpenCashDrawerModal = () => {
    handleSelectDrawerAction('set');
    setIsCashDrawerModalVisible(true);
  };

  const computeMethodBreakdown = () => {
    let cashSales = 0;
    let cardSales = 0;
    let gcashSales = 0;
    let totalSales = 0;

    filteredOrders.forEach((order) => {
      const amount = Number(order.total_amount) || 0;
      const status = String(order.status || 'paid').toLowerCase();
      const method = String(order.payment_method || 'cash').toLowerCase();

      if (status !== 'refunded' && status !== 'void') {
        totalSales += amount;
        if (method === 'cash') cashSales += amount;
        else if (method === 'card') cardSales += amount;
        else if (method === 'gcash') gcashSales += amount;
        else cashSales += amount;
      }
    });

    return { cashSales, cardSales, gcashSales, totalSales };
  };

  const { cashSales, cardSales, gcashSales, totalSales } = computeMethodBreakdown();

  const computeMostBoughtItems = () => {
    const itemMap = {};

    filteredOrders.forEach((order) => {
      const status = String(order.status || 'paid').toLowerCase();
      if (status === 'refunded' || status === 'void') return;

      const items = order.order_items || [];
      items.forEach((lineItem) => {
        const totalQty = Number(lineItem.quantity) || 1;
        const cancelledQty = Number(lineItem.quantity_cancelled) || 0;
        const activeQty = Math.max(0, totalQty - cancelledQty);

        if (activeQty > 0) {
          const name = lineItem.item_name || 'Product Item';
          const unitPrice = Number(lineItem.unit_price) || 0;

          if (!itemMap[name]) {
            itemMap[name] = {
              name,
              qtySold: 0,
              totalAmount: 0,
            };
          }
          itemMap[name].qtySold += activeQty;
          itemMap[name].totalAmount += activeQty * unitPrice;
        }
      });
    });

    const itemList = Object.values(itemMap);
    itemList.sort((a, b) => b.qtySold - a.qtySold);
    return itemList;
  };

  const mostBoughtList = computeMostBoughtItems();

  const computeMetricsFromOrders = () => {
    let sales = totalSales;
    let transactionsCount = filteredOrders.length;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let totalProductCost = 0;

    filteredOrders.forEach((order) => {
      const amount = Number(order.total_amount) || 0;
      const status = String(order.status || 'paid').toLowerCase();

      if (status === 'refunded' || status === 'void' || amount === 0) {
        if (status === 'refunded' || status === 'void') totalRefunds += amount;
      } else {
        totalDiscounts += Number(order.discount_amount) || 0;

        let costVal = Number(order.cost_amount) || Number(order.cost_total) || 0;
        if (costVal === 0 && order.order_items) {
          order.order_items.forEach((li) => {
            const activeQty = Math.max(0, (Number(li.quantity) || 1) - (Number(li.quantity_cancelled) || 0));
            costVal += activeQty * (Number(li.cost_amount) || (Number(li.unit_price || 0) * 0.4));
          });
        }
        totalProductCost += costVal;
      }
    });

    const netProfit = sales - totalProductCost - totalRefunds;

    const formatCurr = (num) =>
      `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return [
      { id: 'sales', label: 'Total Sales 👆', number: formatCurr(sales), isClickable: true, type: 'sales' },
      { id: 'tx', label: 'Transactions 👆', number: String(transactionsCount), isClickable: true, type: 'tx' },
      { id: 'cash', label: 'Cash InHand 👆', number: formatCurr(calculatedCashInHand), isClickable: true, type: 'cash' },
      { id: 'disc', label: 'Discounts', number: formatCurr(totalDiscounts) },
      { id: 'ref', label: 'Refunds', number: formatCurr(totalRefunds) },
      { id: 'profit', label: 'Profit', number: formatCurr(netProfit) },
    ];
  };

  const metrics = computeMetricsFromOrders();

  // Business Hours & Store Status Check
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[currentTime.getDay()];
  const currentDayConfig = businessHours[currentDayName] || { isClosed: false, openTime: '08:00 AM', closeTime: '10:00 PM' };

  const isStoreClosed = currentDayConfig.isClosed;

  const handleSaveDrawerAction = async () => {
    const parsedAmt = Number(drawerAmountInput) || 0;
    if (parsedAmt <= 0 && drawerActionType !== 'set') {
      Alert.alert('Invalid Amount', 'Please enter a valid cash amount.');
      return;
    }

    setDrawerLoading(true);
    try {
      const reasonStr = drawerNotesInput.trim();
      await createDrawerHistory({
        type: drawerActionType,
        amount: parsedAmt,
        reason: reasonStr,
      });

      if (onRefreshDrawerHistory) {
        await onRefreshDrawerHistory();
      }

      // Automatically kick open cash drawer connected via Bluetooth printer
      try {
        await openCashDrawerViaPrinter();
      } catch (_e) {}

      setIsCashDrawerModalVisible(false);
      setDrawerAmountInput('');
      setDrawerNotesInput('');

      const notesMsg = reasonStr ? `\nReason: ${reasonStr}` : '';
      let msg = '';
      if (drawerActionType === 'add') {
        msg = `Added Cash amount of ₱${parsedAmt.toFixed(2)}${notesMsg}`;
      } else if (drawerActionType === 'subtract') {
        msg = `Added Cash expense amount of ₱${parsedAmt.toFixed(2)}${notesMsg}`;
      } else {
        msg = `Starting Cash set to ₱${parsedAmt.toFixed(2)}${notesMsg}`;
      }

      Alert.alert('Cash Drawer Updated! 💵', msg);
    } catch (e) {
      Alert.alert('Drawer Error', e.message);
    } finally {
      setDrawerLoading(false);
    }
  };

  const dtCardBg = theme?.dateTimeCardBg || (isDarkMode ? '#1E293B' : '#1E293B');
  const dtCardFont = theme?.dateTimeCardFont || '#FFFFFF';

  const bgStyle = { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' };
  const cardBgStyle = {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderColor: isDarkMode ? '#334155' : '#E2E8F0',
  };
  const titleTextStyle = { color: isDarkMode ? '#F8FAFC' : '#0F172A' };
  const subTextStyle = { color: isDarkMode ? '#CBD5E1' : '#64748B' };

  const getDrawerAmountLabel = () => {
    if (drawerActionType === 'set') return 'Starting Cash (₱) *:';
    if (drawerActionType === 'subtract') return 'Add Cash Expense (₱) *:';
    return 'Add Cash Amount (₱) *:';
  };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Clickable Low Stock Banner if there are low stock items */}
        {lowStockItems.length > 0 ? (
          <TouchableOpacity
            style={styles.lowStockAlertBanner}
            onPress={() => setIsLowStockModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.lowStockBannerTextCol}>
              <Text style={styles.lowStockBannerTitle}>
                ⚠️ {lowStockItems.length} Inventory Item{lowStockItems.length > 1 ? 's' : ''} Low on Stock!
              </Text>
              <Text style={styles.lowStockBannerSub}>Tap to view inventory below warning limit ›</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Date & Time Widget (With Store Status Badge) */}
        <View style={[styles.dateTimeCard, { backgroundColor: dtCardBg }]}>
          <View style={styles.timeHeader}>
            <Text style={[styles.timeLabel, { color: dtCardFont, opacity: 0.8 }]}>TODAY</Text>
            <View style={[styles.storeStatusBadge, isStoreClosed ? styles.statusClosedRichBg : styles.statusOpenRichBg]}>
              <View style={[styles.statusDot, { backgroundColor: isStoreClosed ? '#FF4D4D' : '#10B981' }]} />
              <Text style={styles.storeStatusWhiteText}>
                {isStoreClosed ? 'STORE CLOSED' : 'STORE OPEN'}
              </Text>
            </View>
          </View>
          <Text style={[styles.timeText, { color: dtCardFont }]}>{formatTime(currentTime)}</Text>
          <Text style={[styles.dateText, { color: dtCardFont, opacity: 0.9 }]}>
            {formatDate(currentTime)}
          </Text>
        </View>

        {/* Filter Section Above Pill Boxes */}
        <View style={styles.filterSection}>
          <View style={styles.overviewHeaderRow}>
            <Text style={[styles.filterTitle, titleTextStyle]}>Overview Filter:</Text>
            <TouchableOpacity onPress={onRefreshOrders} activeOpacity={0.7}>
              <Text style={styles.refreshText}>🔄 Sync Sales ({orders.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {filterOptions.map((option) => {
              const isActive = selectedFilter === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterChip,
                    cardBgStyle,
                    isActive && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(option)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, subTextStyle, isActive && styles.filterChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedFilter === 'Date Range' ? (
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

        {/* 6 Pill Boxes Grid */}
        <View style={styles.pillGrid}>
          {metrics.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.pillBox, cardBgStyle]}
              onPress={() => {
                if (item.type === 'sales') setIsSalesModalVisible(true);
                else if (item.type === 'tx') setIsTxBreakdownModalVisible(true);
                else if (item.type === 'cash') handleOpenCashDrawerModal();
              }}
              disabled={!item.isClickable}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillNumber, titleTextStyle]}>{item.number}</Text>
              <Text style={[styles.pillLabel, subTextStyle]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menus Section */}
        <View style={styles.menuSectionHeader}>
          <Text style={[styles.menuSectionTitle, titleTextStyle]}>Menus</Text>
        </View>

        <View style={styles.menuList}>
          {/* Menu 1: Register */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuRegister, cardBgStyle]}
            onPress={onNavigateToTransact}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconRegisterBg]}>
              <Text style={styles.menuIconText}>🛒</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>Register</Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Process sales, cash, & checkout</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 2: Transactions */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuTransactions, cardBgStyle]}
            onPress={onNavigateToTransactions}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconTransactionsBg]}>
              <Text style={styles.menuIconText}>💳</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>Transactions</Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>View transaction history & sales records</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 3: Items (With Role Access Check) */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuItems, cardBgStyle]}
            onPress={() => handleNavigateWithAccessCheck('items', onNavigateToItems)}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconItemsBg]}>
              <Text style={styles.menuIconText}>📦</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>
                Items {!canAccessModule('items') ? '🔒' : ''}
              </Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Manage categories, item types & products</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 4: Inventory (With Role Access Check) */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuInventory, cardBgStyle]}
            onPress={() => handleNavigateWithAccessCheck('inventory', onNavigateToInventory)}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconInventoryBg]}>
              <Text style={styles.menuIconText}>📊</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>
                Inventory {!canAccessModule('inventory') ? '🔒' : ''}
              </Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Manage stock levels, raw ingredients & units</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 5: Reports (With Role Access Check) */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuReports, cardBgStyle]}
            onPress={() => handleNavigateWithAccessCheck('report', onNavigateToReports)}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconReportsBg]}>
              <Text style={styles.menuIconText}>📈</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>
                Reports {!canAccessModule('report') ? '🔒' : ''}
              </Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Financial sales, product cost & drawer history</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 6: People */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuPeople, cardBgStyle]}
            onPress={onNavigateToPeople}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconPeopleBg]}>
              <Text style={styles.menuIconText}>👥</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>People</Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Staff directory, attendance & logs</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* Menu 7: Settings (Renamed to Settings) */}
          <TouchableOpacity
            style={[styles.menuCard, styles.menuSettings, cardBgStyle]}
            onPress={onNavigateToSettings}
            activeOpacity={0.8}
          >
            <View style={[styles.menuIconCircle, styles.iconSettingsBg]}>
              <Text style={styles.menuIconText}>⚙️</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, titleTextStyle]}>Settings</Text>
              <Text style={[styles.menuSubtitle, subTextStyle]}>Admin settings, app settings & printer</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Security Admin PIN Modal */}
      <PinModal
        visible={isPinModalVisible}
        onClose={() => {
          setIsPinModalVisible(false);
          setPendingTargetScreen(null);
        }}
        onSuccess={(adminUser) => {
          setIsPinModalVisible(false);
          if (pendingTargetScreen) {
            pendingTargetScreen();
            setPendingTargetScreen(null);
          } else if (onNavigateToSettings) {
            onNavigateToSettings();
          }
        }}
        users={people}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  lowStockAlertBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 16,
    padding: 12,
  },
  lowStockBannerTextCol: {
    justifyContent: 'center',
  },
  lowStockBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  lowStockBannerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 2,
  },
  dateTimeCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  storeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusOpenRichBg: {
    backgroundColor: '#059669',
  },
  statusClosedRichBg: {
    backgroundColor: '#DC2626',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  storeStatusWhiteText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  filterSection: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  pillBox: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  pillNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  menuSectionHeader: {
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  menuSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuList: {
    paddingHorizontal: 20,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  menuRegister: {
    borderLeftWidth: 5,
    borderLeftColor: '#2563EB',
  },
  menuTransactions: {
    borderLeftWidth: 5,
    borderLeftColor: '#8B5CF6',
  },
  menuItems: {
    borderLeftWidth: 5,
    borderLeftColor: '#F59E0B',
  },
  menuInventory: {
    borderLeftWidth: 5,
    borderLeftColor: '#3B82F6',
  },
  menuReports: {
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
  },
  menuPeople: {
    borderLeftWidth: 5,
    borderLeftColor: '#06B6D4',
  },
  menuSettings: {
    borderLeftWidth: 5,
    borderLeftColor: '#64748B',
  },
  menuIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconRegisterBg: {
    backgroundColor: '#DBEAFE',
  },
  iconTransactionsBg: {
    backgroundColor: '#F3E8FF',
  },
  iconItemsBg: {
    backgroundColor: '#FEF3C7',
  },
  iconInventoryBg: {
    backgroundColor: '#DBEAFE',
  },
  iconReportsBg: {
    backgroundColor: '#DCFCE7',
  },
  iconPeopleBg: {
    backgroundColor: '#CFFAFE',
  },
  iconSettingsBg: {
    backgroundColor: '#F1F5F9',
  },
  menuIconText: {
    fontSize: 22,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 24,
    fontWeight: '300',
    color: '#94A3B8',
    marginLeft: 8,
  },
});

export default HomeScreen;
