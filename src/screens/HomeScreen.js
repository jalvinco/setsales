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
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { DEFAULT_THEME } from '../utils/themeUtils';
import { createDrawerHistory, hashPin, updateUser } from '../services/supabase';
import { openCashDrawerViaPrinter } from '../services/printerService';
import PinModal from '../components/PinModal';

const HomeScreen = ({
  appName = 'SetSales',
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

  // Animated counting numbers for overview tile amounts
  const [animProgress, setAnimProgress] = useState(1);

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

  // Trigger quick counting number animation when filter or order data changes
  useEffect(() => {
    setAnimProgress(0);
    const duration = 450; // ms duration
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setAnimProgress(progress);

      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [selectedFilter, startDate, endDate, orders, drawerHistory, isSalesModalVisible]);

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
  const lowStockItems = (inventory || []).filter((inv) => {
    if (!inv || inv.is_deleted === true || inv.is_delete === true) return false;
    const currentQty = Number(inv.quantity) || 0;
    const warnQty = Number(inv.warning_quantity ?? 5.0);
    return currentQty <= warnQty;
  });

  // Filter orders by active period filter
  const getFilteredOrders = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return (orders || []).filter((order) => {
      if (!order || !order.created_at) return false;
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
    try {
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

      const setEntries = (drawerHistory || []).filter(
        (d) => d && String(d.type || d.drawer_action_type || '').toLowerCase() === 'set'
      );
      let lastSetValue = 0;
      if (setEntries.length > 0 && setEntries[setEntries.length - 1]) {
        const amt = Number(setEntries[setEntries.length - 1].amount);
        lastSetValue = isNaN(amt) ? 0 : amt;
      }

      let drawerAddInFilter = 0;
      let drawerSubInFilter = 0;

      (drawerHistory || []).forEach((d) => {
        if (!d) return;
        const actionType = String(d.type || d.drawer_action_type || '').toLowerCase();
        if (isDateInFilter(d.drawer_datetime)) {
          if (actionType === 'add') {
            drawerAddInFilter += Number(d.amount) || 0;
          } else if (actionType === 'subtract') {
            drawerSubInFilter += Number(d.amount) || 0;
          }
        }
      });

      let cashSalesInFilter = 0;
      (filteredOrders || []).forEach((order) => {
        if (!order) return;
        const status = String(order.status || 'paid').toLowerCase();
        const method = String(order.payment_method || 'cash').toLowerCase();

        if (status !== 'refunded' && status !== 'void' && method === 'cash') {
          cashSalesInFilter += Number(order.total_amount) || 0;
        }
      });

      return lastSetValue + drawerAddInFilter - drawerSubInFilter + cashSalesInFilter;
    } catch (_e) {
      return 0;
    }
  };

  const calculatedCashInHand = computeCashInHandFromDrawer();

  const getLastSetAmountValue = () => {
    try {
      const setEntries = (drawerHistory || []).filter(
        (d) => d && String(d.type || d.drawer_action_type || '').toLowerCase() === 'set'
      );
      if (setEntries.length > 0 && setEntries[setEntries.length - 1]) {
        const amt = Number(setEntries[setEntries.length - 1].amount);
        return isNaN(amt) ? 0 : amt;
      }
    } catch (_e) {}
    return 0;
  };

  const handleSelectDrawerAction = (actionType) => {
    setDrawerActionType(actionType);
    if (actionType === 'set') {
      const lastVal = getLastSetAmountValue();
      const safeVal = isNaN(lastVal) ? 0 : lastVal;
      setDrawerAmountInput(safeVal > 0 ? String(safeVal) : '');
    } else {
      setDrawerAmountInput('');
    }
  };

  const handleOpenCashDrawerModal = () => {
    try {
      handleSelectDrawerAction('set');
    } catch (_e) {
      setDrawerAmountInput('');
    }
    setIsCashDrawerModalVisible(true);
  };

  // Requirement 1: Dynamic Sales & Payment Method Breakdown
  const computePaymentMethodsBreakdown = () => {
    let grandSales = 0;
    const methodMap = {};

    try {
      (filteredOrders || []).forEach((order) => {
        if (!order) return;
        const amount = Number(order.total_amount) || 0;
        const status = String(order.status || 'paid').toLowerCase();
        const rawMethod = String(order.payment_method || 'Cash').trim();
        const normMethod = rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1).toLowerCase();

        if (status !== 'refunded' && status !== 'void') {
          grandSales += amount;
          if (!methodMap[normMethod]) {
            methodMap[normMethod] = 0;
          }
          methodMap[normMethod] += amount;
        }
      });
    } catch (_e) {}

    const breakdownList = Object.keys(methodMap).map((mName) => ({
      name: mName,
      amount: methodMap[mName],
    }));

    return { grandSales, breakdownList: breakdownList.slice(0, 6) };
  };

  const { grandSales, breakdownList } = computePaymentMethodsBreakdown();

  // Requirement 2: Items Sold calculation
  const computeMostBoughtItems = () => {
    const itemMap = {};
    let totalItemsCount = 0;

    try {
      (filteredOrders || []).forEach((order) => {
        if (!order) return;
        const status = String(order.status || 'paid').toLowerCase();
        if (status === 'refunded' || status === 'void') return;

        const items = order.order_items || [];
        (items || []).forEach((lineItem) => {
          if (!lineItem) return;
          const totalQty = Number(lineItem.quantity) || 1;
          const cancelledQty = Number(lineItem.quantity_cancelled) || 0;
          const activeQty = Math.max(0, totalQty - cancelledQty);

          if (activeQty > 0) {
            totalItemsCount += activeQty;
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
    } catch (_e) {}

    const itemList = Object.values(itemMap);
    itemList.sort((a, b) => b.qtySold - a.qtySold);
    return { itemList, totalItemsCount };
  };

  const { itemList: mostBoughtList, totalItemsCount } = computeMostBoughtItems();

  const computeMetricsFromOrders = () => {
    let sales = grandSales;
    let transactionsCount = filteredOrders.length;
    let totalDiscounts = 0;
    let totalRefunds = 0;
    let totalProductCost = 0;

    (filteredOrders || []).forEach((order) => {
      if (!order) return;
      const amount = Number(order.total_amount) || 0;
      const status = String(order.status || 'paid').toLowerCase();

      if (status === 'refunded' || status === 'void' || amount === 0) {
        if (status === 'refunded' || status === 'void') totalRefunds += amount;
      } else {
        totalDiscounts += Number(order.discount_amount) || 0;

        let costVal = Number(order.cost_amount) || Number(order.cost_total) || 0;
        if (costVal === 0 && order.order_items) {
          (order.order_items || []).forEach((li) => {
            if (!li) return;
            const activeQty = Math.max(0, (Number(li.quantity) || 1) - (Number(li.quantity_cancelled) || 0));
            costVal += activeQty * (Number(li.cost_amount) || (Number(li.unit_price || 0) * 0.4));
          });
        }
        totalProductCost += costVal;
      }
    });

    const netProfit = sales - totalProductCost - totalRefunds;

    // Apply quick counting animation progress (0 -> target)
    const animSales = sales * animProgress;
    const animTx = Math.round(transactionsCount * animProgress);
    const animCash = calculatedCashInHand * animProgress;
    const animDisc = totalDiscounts * animProgress;
    const animRef = totalRefunds * animProgress;
    const animProfit = netProfit * animProgress;

    const formatCurr = (num) =>
      `₱${(Number(num) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return [
      { id: 'sales', label: 'Total Sales 👆', number: formatCurr(animSales), isClickable: true, type: 'sales' },
      { id: 'tx', label: 'Transactions 👆', number: String(animTx), isClickable: true, type: 'tx' },
      { id: 'cash', label: 'Cash InHand 👆', number: formatCurr(animCash), isClickable: true, type: 'cash' },
      { id: 'disc', label: 'Discounts', number: formatCurr(animDisc), isClickable: false },
      { id: 'ref', label: 'Refunds', number: formatCurr(animRef), isClickable: false },
      { id: 'profit', label: 'Profit', number: formatCurr(animProfit), isClickable: false },
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
    if (isNaN(parsedAmt) || (parsedAmt <= 0 && drawerActionType !== 'set')) {
      Alert.alert('Invalid Amount', 'Please enter a valid cash amount.');
      return;
    }

    setDrawerLoading(true);
    try {
      const reasonStr = drawerNotesInput ? String(drawerNotesInput).trim() : '';
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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

        {/* 6 Pill Boxes Grid (Exactly 3 Pill Boxes Per Row) */}
        <View style={styles.pillGrid}>
          {metrics.map((item) => {
            const isClickablePill = item.type === 'sales' || item.type === 'tx' || item.type === 'cash';

            if (isClickablePill) {
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pillBox, cardBgStyle, styles.pillBoxClickable]}
                  onPress={() => {
                    if (item.type === 'sales') {
                      setIsSalesModalVisible(true);
                    } else if (item.type === 'tx') {
                      setIsTxBreakdownModalVisible(true);
                    } else if (item.type === 'cash') {
                      handleOpenCashDrawerModal();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillNumber, titleTextStyle]}>{item.number}</Text>
                  <Text style={[styles.pillLabel, subTextStyle]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }

            return (
              <View key={item.id} style={[styles.pillBox, cardBgStyle, styles.pillBoxDisabled]}>
                <Text style={[styles.pillNumber, titleTextStyle]}>{item.number}</Text>
                <Text style={[styles.pillLabel, subTextStyle]}>{item.label}</Text>
              </View>
            );
          })}
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

          {/* Menu 7: Settings */}
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

      {/* MODAL 1: TOTAL SALES BREAKDOWN BY PAYMENT METHOD (With Animated Number Counting) */}
      {isSalesModalVisible ? (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSalesModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsSalesModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCardLarge}>
                  <Text style={styles.modalTitle}>💰 Sales & Payment Breakdown</Text>
                  <Text style={styles.modalSubTitle}>Filtered Period: {selectedFilter}</Text>

                  <View style={styles.totalSalesMainCard}>
                    <Text style={styles.totalSalesMainLabel}>Total Sales</Text>
                    <Text style={styles.totalSalesMainVal}>
                      ₱{((grandSales || 0) * animProgress).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <Text style={styles.sectionHeaderTitle}>Breakdown by Payment Method:</Text>
                  <View style={styles.pmBreakdownGrid}>
                    {breakdownList.map((pm, idx) => (
                      <View key={idx} style={styles.pmBreakdownCard}>
                        <Text style={styles.pmBreakdownName}>{pm.name}</Text>
                        <Text style={styles.pmBreakdownVal}>
                          ₱{((pm.amount || 0) * animProgress).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    ))}
                    {breakdownList.length === 0 ? (
                      <Text style={styles.emptySubText}>No sales recorded for this period.</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setIsSalesModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}

      {/* MODAL 2: ITEMS SOLD & PRODUCTS BREAKDOWN (With Scrollable List) */}
      {isTxBreakdownModalVisible ? (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setIsTxBreakdownModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsTxBreakdownModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCardLarge}>
                  <Text style={styles.modalTitle}>📦 Items Sold</Text>
                  <Text style={styles.modalSubTitle}>
                    Total Items Sold: {totalItemsCount} across {filteredOrders.length} Transactions
                  </Text>

                  <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollInner}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {mostBoughtList.map((item, idx) => (
                      <View key={idx} style={styles.mostBoughtRow}>
                        <Text style={styles.mostBoughtName}>• {item.name}</Text>
                        <View style={styles.mostBoughtRightCol}>
                          <Text style={styles.mostBoughtQtyHighlight}>{item.qtySold} sold</Text>
                          <Text style={styles.mostBoughtVal}>
                            ₱{(Number(item.totalAmount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {mostBoughtList.length === 0 ? (
                      <Text style={styles.emptySubText}>No items sold for this period.</Text>
                    ) : null}
                  </ScrollView>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setIsTxBreakdownModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}

      {/* MODAL 3: CASH DRAWER MANAGEMENT */}
      {isCashDrawerModalVisible ? (
        <Modal
          visible={true}
          transparent
          animationType="slide"
          onRequestClose={() => setIsCashDrawerModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsCashDrawerModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.drawerCard}>
                  <Text style={styles.modalTitle}>💵 Cash Drawer Management</Text>
                <Text style={styles.modalSubTitle}>
                  Current Cash InHand: ₱{(Number(calculatedCashInHand) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>

                  {/* Action Selector */}
                  <View style={styles.drawerActionRow}>
                    <TouchableOpacity
                      style={[styles.drawerActionBtn, drawerActionType === 'set' && styles.drawerActionBtnActive]}
                      onPress={() => handleSelectDrawerAction('set')}
                    >
                      <Text style={[styles.drawerActionText, drawerActionType === 'set' && styles.drawerActionTextActive]}>
                        ⚙️ Set Starting Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.drawerActionBtn, drawerActionType === 'add' && styles.drawerActionBtnActive]}
                      onPress={() => handleSelectDrawerAction('add')}
                    >
                      <Text style={[styles.drawerActionText, drawerActionType === 'add' && styles.drawerActionTextActive]}>
                        💵 Add Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.drawerActionBtn, drawerActionType === 'subtract' && styles.drawerActionBtnActive]}
                      onPress={() => handleSelectDrawerAction('subtract')}
                    >
                      <Text style={[styles.drawerActionText, drawerActionType === 'subtract' && styles.drawerActionTextActive]}>
                        💸 Add Expense
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>{getDrawerAmountLabel()}</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={drawerAmountInput && !isNaN(Number(drawerAmountInput)) ? String(drawerAmountInput) : ''}
                      onChangeText={(val) => setDrawerAmountInput(val ? val.replace(/[^0-9.]/g, '') : '')}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Reason / Comment (Optional):</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="e.g. Starting shift cash, Petty cash expense"
                      placeholderTextColor="#94A3B8"
                      value={drawerNotesInput}
                      onChangeText={setDrawerNotesInput}
                    />
                  </View>

                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setIsCashDrawerModalVisible(false)}>
                      <Text style={styles.closeBtnText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveDrawerBtn} onPress={handleSaveDrawerAction} disabled={drawerLoading}>
                      {drawerLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveDrawerBtnText}>Confirm Action</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}

      {/* MODAL 4: LOW STOCK INVENTORY ITEMS */}
      {isLowStockModalVisible ? (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setIsLowStockModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsLowStockModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalCardLarge}>
                  <Text style={styles.modalTitle}>⚠️ Low Stock Inventory Items</Text>
                  <Text style={styles.modalSubTitle}>
                    Total Low Stock Items: {lowStockItems.length}
                  </Text>

                  <ScrollView style={styles.modalScroll}>
                    {lowStockItems.map((inv) => (
                      <View key={inv.id} style={styles.lowStockRow}>
                        <Text style={styles.lowStockItemName}>• {inv.name}</Text>
                        <View style={styles.lowStockRightCol}>
                          <Text style={styles.lowStockQtyVal}>
                            {Number(inv.quantity || 0).toFixed(2)} {inv.measure || 'pcs'}
                          </Text>
                          <Text style={styles.lowStockLimitSub}>
                            Limit: {Number(inv.warning_quantity ?? 5).toFixed(2)} {inv.measure || 'pcs'}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {lowStockItems.length === 0 ? (
                      <Text style={styles.emptySubText}>No low stock inventory items.</Text>
                    ) : null}
                  </ScrollView>

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setIsLowStockModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null}

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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  pillBoxClickable: {
    borderColor: '#BFDBFE',
  },
  pillBoxDisabled: {
    opacity: 0.85,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  drawerCard: {
    width: '100%',
    maxWidth: 480,
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
  totalSalesMainCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  totalSalesMainLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  totalSalesMainVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 8,
  },
  pmBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pmBreakdownCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pmBreakdownName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  pmBreakdownVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  modalScroll: {
    maxHeight: 380,
    marginVertical: 6,
  },
  modalScrollInner: {
    paddingBottom: 10,
  },
  mostBoughtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mostBoughtName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  mostBoughtRightCol: {
    alignItems: 'flex-end',
  },
  mostBoughtQtyHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  mostBoughtVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1,
  },
  lowStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lowStockItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  lowStockRightCol: {
    alignItems: 'flex-end',
  },
  lowStockQtyVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  lowStockLimitSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 1,
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 14,
  },
  drawerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  drawerActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  drawerActionBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  drawerActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  drawerActionTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalTextInput: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  saveDrawerBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveDrawerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
