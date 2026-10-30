import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { fetchOrders, updateOrderItemCancel, updateOrderTotal, fetchItems } from '../services/supabase';
import ThermalPrintModal from '../components/ThermalPrintModal';

const TransactionsScreen = ({
  appName = 'SetSales',
  isTaxEnabled = true,
  taxRate = 5,
  onBack,
  loggedInUser,
  rolePermissions = [],
  isDarkMode = false,
}) => {
  const { width } = useWindowDimensions();
  const numColumns = width >= 600 ? 2 : 1;

  const [loading, setLoading] = useState(false);
  const [ordersList, setOrdersList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('Today');

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  // Thermal Print Modal state
  const [printingOrder, setPrintingOrder] = useState(null);
  const [printType, setPrintType] = useState('receipt');
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);

  const filters = ['Today', 'Yesterday', 'Last 7 days', 'Date Range'];

  const canCancelOrders = () => {
    if (loggedInUser && Number(loggedInUser.role) === 1) return true; // Admin role 1 always allowed
    if (loggedInUser) {
      const uRole = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === uRole);
      return permObj && permObj.refunds === true;
    }
    return true;
  };

  const isRefundAllowed = canCancelOrders();

  useEffect(() => {
    loadOrders();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [data, catalogItems] = await Promise.all([
        fetchOrders(),
        fetchItems(),
      ]);
      setOrdersList(data || []);
      setItemsList(catalogItems || []);
    } catch (e) {
      console.warn('Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTxDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const isToday = (isoStr) => {
    if (!isoStr) return false;
    const d = new Date(isoStr);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isYesterday = (isoStr) => {
    if (!isoStr) return false;
    const d = new Date(isoStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    );
  };

  const getFilteredOrders = () => {
    if (selectedFilter === 'Today') {
      return ordersList.filter((o) => isToday(o.created_at));
    }
    if (selectedFilter === 'Yesterday') {
      return ordersList.filter((o) => isYesterday(o.created_at));
    }
    if (selectedFilter === 'Last 7 days') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return ordersList.filter((o) => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= sevenDaysAgo;
      });
    }
    if (selectedFilter === 'Date Range') {
      if (!startDate || !endDate) return ordersList;
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return ordersList.filter((o) => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      });
    }
    return ordersList;
  };

  const filteredOrders = getFilteredOrders();

  const handleOpenPrintModal = (order, type) => {
    setPrintingOrder(order);
    setPrintType(type);
    setIsPrintModalVisible(true);
  };

  const handleUpdateItemCancelledQty = async (order, lineItem, targetCancelledQty) => {
    if (!isRefundAllowed) {
      Alert.alert('Refunds Restricted', 'Your assigned role does not have permission to cancel orders or items.');
      return;
    }

    const totalQty = Number(lineItem.quantity) || 1;
    const newCancelled = Math.min(totalQty, Math.max(0, targetCancelledQty));

    setLoading(true);
    try {
      await updateOrderItemCancel(lineItem.id, newCancelled);

      const updatedItems = (order.order_items || []).map((item) => {
        if (item.id === lineItem.id) {
          return { ...item, quantity_cancelled: newCancelled };
        }
        return item;
      });

      let newOrderTotal = 0;
      let newCostAmount = 0;
      let newDiscountAmount = 0;

      updatedItems.forEach((item) => {
        const itemTotalQty = Number(item.quantity) || 1;
        const itemCancelledQty = Number(item.quantity_cancelled) || 0;
        const itemActiveQty = Math.max(0, itemTotalQty - itemCancelledQty);
        const unitPrice = Number(item.unit_price) || 0;
        newOrderTotal += itemActiveQty * unitPrice;

        const foundProd = itemsList.find((i) => String(i.id) === String(item.item_id) || i.name === item.item_name);
        const unitCost = foundProd ? Number(foundProd.cost_amount || 0) : unitPrice * 0.4;
        newCostAmount += itemActiveQty * unitCost;

        const itemDiscTotal = Number(item.discount_amount) || 0;
        if (itemTotalQty > 0) {
          newDiscountAmount += (itemDiscTotal / itemTotalQty) * itemActiveQty;
        }
      });

      await updateOrderTotal(order.id, {
        total_amount: newOrderTotal,
        cost_amount: newCostAmount,
        discount_amount: newDiscountAmount,
      });

      await loadOrders();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEntireOrder = (order) => {
    if (!isRefundAllowed) {
      Alert.alert('Refunds Restricted', 'Your assigned role does not have permission to cancel orders.');
      return;
    }

    Alert.alert(
      'Cancel Entire Order',
      `Are you sure you want to cancel ALL items in Order #${order.order_number || order.id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Entire Order',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const items = order.order_items || [];
              for (const lineItem of items) {
                const totalQty = Number(lineItem.quantity) || 1;
                await updateOrderItemCancel(lineItem.id, totalQty);
              }

              await updateOrderTotal(order.id, {
                total_amount: 0,
                cost_amount: 0,
                discount_amount: 0,
              });

              await loadOrders();
              Alert.alert('Order Cancelled', `Order #${order.order_number || order.id} has been fully cancelled.`);
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const bgStyle = { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' };
  const cardBgStyle = {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderColor: isDarkMode ? '#334155' : '#E2E8F0',
  };
  const titleTextStyle = { color: isDarkMode ? '#F8FAFC' : '#0F172A' };
  const subTextStyle = { color: isDarkMode ? '#CBD5E1' : '#64748B' };

  const renderOrderCard = ({ item }) => {
    const items = item.order_items || [];
    const isOrderFullyCancelled = Number(item.total_amount) === 0;
    const isCash = String(item.payment_method || 'cash').toLowerCase() === 'cash';
    const tendered = Number(item.payment_amount || item.total_amount) || Number(item.total_amount) || 0;
    const changeDue = Math.max(0, tendered - Number(item.total_amount || 0));

    return (
      <View style={[styles.txCard, cardBgStyle, numColumns > 1 && styles.txCardTablet]}>
        <View style={styles.txHeader}>
          <View>
            <View style={styles.orderTitleRow}>
              <Text style={[styles.txId, titleTextStyle]}>#{item.order_number || item.id}</Text>
              {isOrderFullyCancelled ? (
                <View style={styles.voidBadge}>
                  <Text style={styles.voidBadgeText}>CANCELLED</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.txDate, subTextStyle]}>{formatTxDate(item.created_at)}</Text>
          </View>
          <View style={styles.txAmountGroup}>
            <Text style={styles.txTotal}>{formatCurrency(item.total_amount)}</Text>
            {Number(item.discount_amount) > 0 ? (
              <Text style={styles.discountBadgeSub}>Disc: -{formatCurrency(item.discount_amount)}</Text>
            ) : null}
            <View style={styles.methodBadge}>
              <Text style={styles.methodText}>{String(item.payment_method || 'cash').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {isCash && tendered > 0 ? (
          <View style={styles.cashTenderedRow}>
            <Text style={styles.cashTenderedText}>
              Tendered: {formatCurrency(tendered)} • Change: {formatCurrency(changeDue)}
            </Text>
          </View>
        ) : null}

        {/* Print Buttons Bar */}
        <View style={styles.printHeaderBar}>
          <TouchableOpacity
            style={styles.printMiniBtn}
            onPress={() => handleOpenPrintModal(item, 'order')}
            activeOpacity={0.8}
          >
            <Text style={styles.printMiniBtnText}>🖨️ Order Slip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.printMiniBtn}
            onPress={() => handleOpenPrintModal(item, 'receipt')}
            activeOpacity={0.8}
          >
            <Text style={styles.printMiniBtnText}>🖨️ Receipt</Text>
          </TouchableOpacity>
        </View>

        {/* Order Items & Modifiers List */}
        <View style={styles.itemsListContainer}>
          <View style={styles.itemsHeaderRow}>
            <Text style={[styles.itemsTitle, subTextStyle]}>Purchased Items ({items.length}):</Text>

            {!isOrderFullyCancelled && isRefundAllowed ? (
              <TouchableOpacity
                style={styles.cancelOrderBtn}
                onPress={() => handleCancelEntireOrder(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelOrderBtnText}>🚫 Cancel Order</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {items.map((lineItem) => {
            const totalQty = Number(lineItem.quantity) || 1;
            const cancelledQty = Number(lineItem.quantity_cancelled) || 0;
            const activeQty = Math.max(0, totalQty - cancelledQty);
            const isFullyCancelled = cancelledQty >= totalQty;
            const isPartiallyCancelled = cancelledQty > 0 && !isFullyCancelled;
            const mods = lineItem.order_item_modifiers || [];
            const itemDisc = Number(lineItem.discount_amount) || 0;

            return (
              <View key={lineItem.id || Math.random()} style={[styles.lineItemCard, isDarkMode && styles.lineItemCardDark]}>
                <View style={styles.lineItemMainRow}>
                  <View style={styles.lineItemTextGroup}>
                    {isFullyCancelled ? (
                      <Text style={styles.textCrossedOut}>
                        • {totalQty}x {lineItem.item_name} (Cancelled)
                      </Text>
                    ) : isPartiallyCancelled ? (
                      <Text style={[styles.lineItemName, titleTextStyle]}>
                        • <Text style={styles.redBoldText}>{activeQty} ({activeQty}x)</Text> {lineItem.item_name}
                      </Text>
                    ) : (
                      <Text style={[styles.lineItemName, titleTextStyle]}>
                        • {totalQty}x {lineItem.item_name}
                      </Text>
                    )}

                    {itemDisc > 0 && !isFullyCancelled ? (
                      <Text style={styles.lineItemDiscText}>
                        └─ Item Disc: -{formatCurrency(itemDisc)}
                      </Text>
                    ) : null}

                    {mods.length > 0 && !isFullyCancelled ? (
                      <Text style={styles.lineItemMods}>
                        Flavors: {mods.map((m) => m.modifier_name).join(', ')}
                      </Text>
                    ) : null}
                  </View>

                  {isRefundAllowed ? (
                    <View style={styles.qtyActionGroup}>
                      <TouchableOpacity
                        style={[styles.stepBtn, cancelledQty === 0 && styles.stepBtnDisabled]}
                        onPress={() => handleUpdateItemCancelledQty(item, lineItem, cancelledQty - 1)}
                        disabled={cancelledQty === 0}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.stepBtn, isFullyCancelled && styles.stepBtnDisabled]}
                        onPress={() => handleUpdateItemCancelledQty(item, lineItem, cancelledQty + 1)}
                        disabled={isFullyCancelled}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cancelAllBtn, isFullyCancelled && styles.cancelAllBtnDisabled]}
                        onPress={() => handleUpdateItemCancelledQty(item, lineItem, totalQty)}
                        disabled={isFullyCancelled}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.cancelAllBtnText}>All</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingBarText}>Loading Sales Records...</Text>
          </View>
        ) : null}

        {/* Filter Bar */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map((f) => {
              const isActive = selectedFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, cardBgStyle, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, subTextStyle, isActive && styles.filterChipTextActive]}>
                    {f}
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

        {/* List of Transactions */}
        <FlatList
          key={`tx_grid_${numColumns}`}
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyTitle, subTextStyle]}>No transaction records found.</Text>
            </View>
          }
        />

        {/* Thermal Print Modal */}
        <ThermalPrintModal
          visible={isPrintModalVisible}
          onClose={() => setIsPrintModalVisible(false)}
          order={printingOrder}
          storeName={appName}
          isTaxEnabled={isTaxEnabled}
          taxRate={taxRate}
          initialType={printType}
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
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
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
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  txCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    marginHorizontal: 4,
  },
  txCardTablet: {
    maxWidth: '49%',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  voidBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  voidBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  txDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  txAmountGroup: {
    alignItems: 'flex-end',
  },
  txTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#059669',
  },
  discountBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 1,
  },
  methodBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 3,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cashTenderedRow: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  cashTenderedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  printHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  printMiniBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  printMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  itemsListContainer: {
    marginTop: 10,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  cancelOrderBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  lineItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  lineItemCardDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  lineItemMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  lineItemName: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '700',
  },
  lineItemDiscText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 10,
    marginTop: 1,
  },
  redBoldText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  textCrossedOut: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  lineItemMods: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 10,
    marginTop: 2,
  },
  qtyActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  cancelAllBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 2,
  },
  cancelAllBtnDisabled: {
    opacity: 0.4,
  },
  cancelAllBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default TransactionsScreen;
