import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  getPrinterStatus,
  printReceiptViaPrinter,
  printOrderSlipViaPrinter,
} from '../services/printerService';

const ThermalPrintModal = ({
  visible,
  onClose,
  order,
  storeName = 'People Log',
  isTaxEnabled = true,
  taxRate = 5,
  initialType = 'receipt', // 'order' | 'receipt' | 'both'
}) => {
  const [printType, setPrintType] = useState(initialType);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!order) return null;

  const { isConnected, device } = getPrinterStatus();

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    );
  };

  const handlePrint = async () => {
    if (!isConnected) {
      Alert.alert('No Printer Connected', 'Please connect a Bluetooth thermal printer in App Settings first.');
      return;
    }

    setIsPrinting(true);
    try {
      if (printType === 'receipt') {
        await printReceiptViaPrinter(order, storeName, isTaxEnabled, taxRate);
      } else if (printType === 'order') {
        await printOrderSlipViaPrinter(order);
      } else {
        await printOrderSlipViaPrinter(order);
        await printReceiptViaPrinter(order, storeName, isTaxEnabled, taxRate);
      }
      Alert.alert('Printed Successfully 🖨️', `Printed on ${device?.name || 'Bluetooth Printer'}!`);
    } catch (e) {
      Alert.alert('Print Error', e.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const items = order.order_items || [];
  const orderNum = order.order_number || `ORD-${order.id}`;
  const totalAmt = Number(order.total_amount) || 0;
  const subTotalAmt = Number(order.subtotal) || totalAmt;
  const taxAmt = isTaxEnabled ? subTotalAmt * (Number(taxRate || 0) / 100) : 0;
  const payMethod = String(order.payment_method || 'cash').toUpperCase();

  const renderOrderSlipView = () => (
    <View style={styles.thermalPaper}>
      <Text style={styles.monoTextBold}>ORDER #: {orderNum}</Text>
      <Text style={styles.monoText}>DATE: {formatDate(order.created_at)}</Text>
      <Text style={styles.divider}>--------------------------------</Text>

      {items.map((lineItem, idx) => {
        const totalQty = Number(lineItem.quantity) || 1;
        const cancelledQty = Number(lineItem.quantity_cancelled) || 0;
        const activeQty = Math.max(0, totalQty - cancelledQty);
        const mods = lineItem.order_item_modifiers || [];

        if (activeQty <= 0) return null;

        return (
          <View key={idx} style={styles.lineItemBlock}>
            <Text style={styles.itemQtyNameText}>
              {activeQty}x  {lineItem.item_name}
            </Text>
            {mods.length > 0 ? (
              <Text style={styles.itemModText}>
                └─ Flavors: {mods.map((m) => m.modifier_name).join(', ')}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  const renderReceiptView = () => (
    <View style={styles.thermalPaper}>
      <Text style={styles.storeHeaderTitle}>{storeName}</Text>
      <Text style={styles.centerText}>Official Sales Receipt</Text>
      <Text style={styles.divider}>================================</Text>
      <Text style={styles.monoTextBold}>ORDER #: {orderNum}</Text>
      <Text style={styles.monoText}>DATE: {formatDate(order.created_at)}</Text>
      <Text style={styles.divider}>--------------------------------</Text>

      {items.map((lineItem, idx) => {
        const totalQty = Number(lineItem.quantity) || 1;
        const cancelledQty = Number(lineItem.quantity_cancelled) || 0;
        const activeQty = Math.max(0, totalQty - cancelledQty);
        const unitPrice = Number(lineItem.unit_price) || 0;
        const lineTotal = activeQty * unitPrice;
        const mods = lineItem.order_item_modifiers || [];
        const itemDisc = Number(lineItem.discount_amount) || 0;

        if (activeQty <= 0) return null;

        return (
          <View key={idx} style={styles.receiptLineItem}>
            <View style={styles.itemRowSplit}>
              <Text style={styles.itemNameText}>
                {activeQty}x {lineItem.item_name}
              </Text>
              <Text style={styles.itemPriceText}>₱{lineTotal.toFixed(2)}</Text>
            </View>
            {itemDisc > 0 ? (
              <Text style={styles.itemDiscMonoText}>
                └─ Disc: -₱{itemDisc.toFixed(2)}
              </Text>
            ) : null}
            {mods.length > 0 ? (
              <Text style={styles.itemModText}>
                └─ {mods.map((m) => m.modifier_name).join(', ')}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.divider}>--------------------------------</Text>

      <View style={styles.itemRowSplit}>
        <Text style={styles.monoText}>Subtotal:</Text>
        <Text style={styles.monoText}>₱{subTotalAmt.toFixed(2)}</Text>
      </View>

      {Number(order.discount_amount) > 0 ? (
        <View style={styles.itemRowSplit}>
          <Text style={styles.monoText}>Discount:</Text>
          <Text style={styles.monoText}>-₱{Number(order.discount_amount).toFixed(2)}</Text>
        </View>
      ) : null}

      {isTaxEnabled ? (
        <View style={styles.itemRowSplit}>
          <Text style={styles.monoText}>Tax ({taxRate}%):</Text>
          <Text style={styles.monoText}>₱{taxAmt.toFixed(2)}</Text>
        </View>
      ) : null}

      <Text style={styles.divider}>--------------------------------</Text>

      <View style={styles.itemRowSplit}>
        <Text style={styles.grandTotalLabel}>TOTAL AMOUNT:</Text>
        <Text style={styles.grandTotalVal}>₱{totalAmt.toFixed(2)}</Text>
      </View>

      <Text style={styles.divider}>--------------------------------</Text>

      <View style={styles.itemRowSplit}>
        <Text style={styles.monoText}>Payment Method:</Text>
        <Text style={styles.monoTextBold}>{payMethod}</Text>
      </View>

      {payMethod === 'CASH' ? (
        <View>
          <View style={styles.itemRowSplit}>
            <Text style={styles.monoText}>Cash Tendered:</Text>
            <Text style={styles.monoText}>₱{Number(order.payment_amount || totalAmt).toFixed(2)}</Text>
          </View>
          <View style={styles.itemRowSplit}>
            <Text style={styles.monoText}>Change Due:</Text>
            <Text style={styles.monoText}>₱{Math.max(0, Number(order.payment_amount || totalAmt) - totalAmt).toFixed(2)}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.divider}>================================</Text>
      <Text style={styles.centerTextBold}>Thank you for your visit!</Text>
      <Text style={styles.centerText}>Please come again!</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🖨️ Thermal Printer Preview</Text>

              {/* Connected Printer Status Bar */}
              <View style={[styles.printerStatusBanner, isConnected ? styles.printerStatusOnline : styles.printerStatusOffline]}>
                <Text style={[styles.printerStatusText, isConnected ? styles.textOnline : styles.textOffline]}>
                  {isConnected ? `🟢 Connected: ${device?.name}` : '🔴 No Printer Connected'}
                </Text>
              </View>

              {/* Selector Tabs for Print Type */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.typeTabBtn, printType === 'receipt' && styles.typeTabBtnActive]}
                  onPress={() => setPrintType('receipt')}
                >
                  <Text style={[styles.typeTabText, printType === 'receipt' && styles.typeTabTextActive]}>
                    Receipt
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeTabBtn, printType === 'order' && styles.typeTabBtnActive]}
                  onPress={() => setPrintType('order')}
                >
                  <Text style={[styles.typeTabText, printType === 'order' && styles.typeTabTextActive]}>
                    Order Slip
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeTabBtn, printType === 'both' && styles.typeTabBtnActive]}
                  onPress={() => setPrintType('both')}
                >
                  <Text style={[styles.typeTabText, printType === 'both' && styles.typeTabTextActive]}>
                    Both
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable Receipt Preview */}
              <ScrollView style={styles.previewScroll}>
                {printType === 'order' && renderOrderSlipView()}
                {printType === 'receipt' && renderReceiptView()}
                {printType === 'both' && (
                  <View>
                    {renderOrderSlipView()}
                    <View style={styles.cutLine}>
                      <Text style={styles.cutLineText}>✂ - - - - CUT HERE - - - - ✂</Text>
                    </View>
                    {renderReceiptView()}
                  </View>
                )}
              </ScrollView>

              {/* Actions with disabled Print button if no printer is connected */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtnLarge} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.printBtnSmall, (!isConnected || isPrinting) && styles.printBtnDisabled]}
                  onPress={handlePrint}
                  disabled={!isConnected || isPrinting}
                >
                  {isPrinting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.printBtnText}>
                      {isConnected ? 'Print' : 'No Printer'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: '5%',
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  printerStatusBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  printerStatusOnline: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  printerStatusOffline: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  printerStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textOnline: {
    color: '#166534',
  },
  textOffline: {
    color: '#991B1B',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  typeTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeTabBtnActive: {
    backgroundColor: '#2563EB',
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  previewScroll: {
    maxHeight: 340,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thermalPaper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  storeHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  centerText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  centerTextBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  divider: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  monoText: {
    fontSize: 12,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  monoTextBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lineItemBlock: {
    marginVertical: 3,
  },
  itemQtyNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  receiptLineItem: {
    marginVertical: 3,
  },
  itemRowSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemPriceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemDiscMonoText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemModText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cutLine: {
    marginVertical: 12,
    alignItems: 'center',
  },
  cutLineText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelBtnLarge: {
    flex: 0.45,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  printBtnSmall: {
    flex: 0.51,
    height: 44,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  printBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ThermalPrintModal;
