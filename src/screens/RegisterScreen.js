import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import {
  fetchCategories,
  fetchItems,
  fetchModifierGroups,
  fetchModifiers,
  fetchItemModifierGroups,
  fetchPaymentMethods,
  createCompleteOrder,
} from '../services/supabase';
import ThermalPrintModal from '../components/ThermalPrintModal';
import { openCashDrawerViaPrinter } from '../services/printerService';

const RegisterScreen = ({
  appName = 'SetSales',
  isTaxEnabled = true,
  taxRate = 5,
  isAutoPrintEnabled = false,
  isDarkMode = false,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [categoriesData, setCategoriesData] = useState([]);
  const [products, setProducts] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [modifiers, setModifiers] = useState([]);
  const [itemModifierGroups, setItemModifierGroups] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);

  // Product Modifier Modal state
  const [selectedProductForMod, setSelectedProductForMod] = useState(null);
  const [activeModGroups, setActiveModGroups] = useState([]);
  const [selectedModifiersState, setSelectedModifiersState] = useState([]);

  // Order Discount Modal State
  const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
  const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [orderDiscountVal, setOrderDiscountVal] = useState(0);

  // Line Item Discount Modal State
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [lineDiscountType, setLineDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [lineDiscountValue, setLineDiscountValue] = useState('');
  const [lineDiscountQty, setLineDiscountQty] = useState('1');

  // Checkout Modal State
  const [isCheckoutModalVisible, setIsCheckoutModalVisible] = useState(false);
  const [activeMethodName, setActiveMethodName] = useState('Cash');
  const [selectedPayMethodObj, setSelectedPayMethodObj] = useState(null);
  const [tenderedAmount, setTenderedAmount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Thermal Print Modal state
  const [addedOrder, setAddedOrder] = useState(null);

  useEffect(() => {
    loadRegisterData();
  }, []);

  const loadRegisterData = async () => {
    setLoading(true);
    try {
      const [cats, itms, mGroups, mods, imGroups, pMethods] = await Promise.all([
        fetchCategories(),
        fetchItems(),
        fetchModifierGroups(),
        fetchModifiers(),
        fetchItemModifierGroups(),
        fetchPaymentMethods(),
      ]);

      const activeCats = Array.isArray(cats) ? cats.filter((c) => c && c.is_active !== false) : [];
      setCategoriesData(activeCats);
      setCategories(['All', ...activeCats.map((c) => (c && c.name ? c.name : 'Category'))]);

      const sortedItems = Array.isArray(itms)
        ? [...itms].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
        : [];

      setProducts(sortedItems);
      setModifierGroups(Array.isArray(mGroups) ? mGroups : []);
      setModifiers(Array.isArray(mods) ? mods : []);
      setItemModifierGroups(Array.isArray(imGroups) ? imGroups : []);

      const activePayMethods = Array.isArray(pMethods) ? pMethods.filter((p) => p && p.is_active !== false) : [];
      setPaymentMethods(activePayMethods);
      if (activePayMethods.length > 0) {
        setActiveMethodName(activePayMethods[0].name || 'Cash');
        setSelectedPayMethodObj(activePayMethods[0]);
      }
    } catch (e) {
      console.warn('Error loading register data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = (products || [])
    .filter((p) => {
      if (!p) return false;
      if (selectedCategory === 'All') return true;
      const catObj = (categoriesData || []).find((c) => c && c.name === selectedCategory);
      return catObj && String(p.category_id) === String(catObj.id);
    })
    .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));

  const handleProductClick = (product) => {
    if (!product) return;
    const linkedGroupIds = (itemModifierGroups || [])
      .filter((img) => img && String(img.item_id) === String(product.id))
      .map((img) => String(img.modifier_group_id));

    const linkedGroups = (modifierGroups || []).filter((mg) => mg && linkedGroupIds.includes(String(mg.id)));

    if (linkedGroups.length > 0) {
      setSelectedProductForMod(product);
      setActiveModGroups(linkedGroups);
      setSelectedModifiersState([]); // Do not preselect any modifiers initially
    } else {
      addToCartDirectly(product, []);
    }
  };

  const handleSelectModifierChoice = (group, mod) => {
    if (!group || !mod) return;

    const isSelected = selectedModifiersState.some((m) => String(m.id) === String(mod.id));
    const currentInGroup = selectedModifiersState.filter((m) => String(m.group_id) === String(group.id));
    const maxAllowed = Number(group.max_selection || 1);

    if (isSelected) {
      setSelectedModifiersState((prev) => prev.filter((m) => String(m.id) !== String(mod.id)));
    } else {
      if (maxAllowed === 1) {
        // Radio behavior: Replace previous option in this group
        setSelectedModifiersState((prev) => [
          ...prev.filter((m) => String(m.group_id) !== String(group.id)),
          mod,
        ]);
      } else {
        // Multi selection with max limit check
        if (currentInGroup.length >= maxAllowed) {
          Alert.alert('Max Limit Reached', `You can select up to ${maxAllowed} options for ${group.name}.`);
          return;
        }
        setSelectedModifiersState((prev) => [...prev, mod]);
      }
    }
  };

  const handleConfirmModifiers = () => {
    for (const group of activeModGroups) {
      const minRequired = Number(group.min_selection || 0);
      const selectedInGroup = selectedModifiersState.filter((m) => String(m.group_id) === String(group.id));
      if (selectedInGroup.length < minRequired) {
        Alert.alert(
          'Required Selection',
          `Please select at least ${minRequired} option(s) for ${group.name}.`
        );
        return;
      }
    }

    if (selectedProductForMod) {
      addToCartDirectly(selectedProductForMod, selectedModifiersState);
    }
    setSelectedProductForMod(null);
    setActiveModGroups([]);
    setSelectedModifiersState([]);
  };

  const addToCartDirectly = (product, selectedMods = []) => {
    if (!product) return;
    const modPriceSum = (selectedMods || []).reduce((sum, m) => sum + (Number(m?.extra_price) || 0), 0);
    const unitPrice = (Number(product.price) || 0) + modPriceSum;

    const cartKey = `${product.id}_${(selectedMods || []).map((m) => (m ? m.id : '')).sort().join('-')}`;

    setCart((prev) => {
      const existingIndex = (prev || []).findIndex((c) => c && c.cartKey === cartKey);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += 1;
        return copy;
      }
      return [
        ...(prev || []),
        {
          cartKey,
          id: product.id,
          name: product.name || 'Product',
          price: unitPrice,
          unitCost: Number(product.cost_amount) || Number(product.price || 0) * 0.4,
          quantity: 1,
          selectedModifiers: selectedMods || [],
          discountAmountPerUnit: 0,
          discountQty: 1,
        },
      ];
    });
  };

  const updateCartItemQty = (cartKey, delta) => {
    setCart((prev) =>
      (prev || [])
        .map((item) => {
          if (item && item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleOpenLineDiscount = (item) => {
    setEditingCartItem(item);
    setLineDiscountType('percent');
    setLineDiscountValue('');
    setLineDiscountQty(String(item.quantity || 1));
  };

  const handleSaveLineDiscount = () => {
    if (!editingCartItem) return;
    const val = Number(lineDiscountValue) || 0;
    const qtyToApply = Math.min(editingCartItem.quantity, Math.max(1, Number(lineDiscountQty) || 1));

    let discPerUnit = 0;
    if (lineDiscountType === 'percent') {
      discPerUnit = (editingCartItem.price * (val / 100));
    } else {
      discPerUnit = val;
    }

    setCart((prev) =>
      (prev || []).map((c) =>
        c && c.cartKey === editingCartItem.cartKey
          ? {
              ...c,
              discountAmountPerUnit: discPerUnit,
              discountQty: qtyToApply,
            }
          : c
      )
    );

    setEditingCartItem(null);
  };

  const calculateSubtotal = () => {
    return (cart || []).reduce((sum, item) => {
      return sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1);
    }, 0);
  };

  const calculateLineDiscountsTotal = () => {
    return (cart || []).reduce((sum, item) => {
      if (!item) return sum;
      const activeDiscQty = Math.min(item.quantity || 1, item.discountQty || item.quantity || 1);
      return sum + (Number(item.discountAmountPerUnit) || 0) * activeDiscQty;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const lineDiscountsTotal = calculateLineDiscountsTotal();
  const subtotalAfterLineDiscounts = Math.max(0, subtotal - lineDiscountsTotal);

  const grandTotalDiscounts = lineDiscountsTotal + orderDiscountVal;
  const taxableAmount = Math.max(0, subtotalAfterLineDiscounts - orderDiscountVal);

  const taxAmount = isTaxEnabled ? taxableAmount * (Number(taxRate || 0) / 100) : 0;
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  const totalOrderCost = (cart || []).reduce((sum, item) => {
    return sum + (Number(item?.unitCost) || 0) * (Number(item?.quantity) || 1);
  }, 0);

  const handleApplyOrderDiscount = () => {
    const val = Number(discountValue) || 0;
    if (val < 0) {
      Alert.alert('Invalid Discount', 'Please enter a valid discount value.');
      return;
    }

    let calculatedDisc = 0;
    if (discountType === 'percent') {
      calculatedDisc = subtotalAfterLineDiscounts * (val / 100);
    } else {
      calculatedDisc = val;
    }

    setOrderDiscountVal(calculatedDisc);
    setIsDiscountModalVisible(false);
  };

  // Additive Cash Tendered Shortcut (e.g. 100 + 100 = 200)
  const handleAddTenderedCash = (addVal) => {
    setTenderedAmount((prev) => (Number(prev) || 0) + addVal);
  };

  // Additive Line Discount Shortcut
  const handleAddLineDiscountVal = (addVal) => {
    setLineDiscountValue((prev) => String((Number(prev) || 0) + addVal));
  };

  // Additive Order Discount Shortcut
  const handleAddOrderDiscountVal = (addVal) => {
    setDiscountValue((prev) => String((Number(prev) || 0) + addVal));
  };

  const handleCompleteCheckout = async () => {
    const isCashMethod = String(activeMethodName || 'cash').toLowerCase() === 'cash';
    const finalTendered = isCashMethod ? Number(tenderedAmount) || grandTotal : grandTotal;

    if (isCashMethod && finalTendered < grandTotal) {
      Alert.alert('Insufficient Payment', `Tendered amount (₱${finalTendered.toFixed(2)}) is less than total (₱${grandTotal.toFixed(2)}).`);
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = await createCompleteOrder({
        order_number: orderNum,
        payment_method: String(activeMethodName || 'cash').toLowerCase(),
        payment_method_id: selectedPayMethodObj ? selectedPayMethodObj.id : null,
        subtotal: subtotal,
        discount_amount: grandTotalDiscounts,
        cost_total: totalOrderCost,
        payment_amount: finalTendered,
        total_amount: grandTotal,
        cartItems: (cart || []).map((c) => {
          const discUnits = Math.min(c.quantity, c.discountQty || c.quantity);
          const lineDiscTotal = (c.discountAmountPerUnit || 0) * discUnits;
          return {
            ...c,
            discountAmountPerUnit: lineDiscTotal / (c.quantity || 1),
          };
        }),
      });

      const fullOrderObj = {
        ...newOrder,
        order_number: orderNum,
        created_at: new Date().toISOString(),
        payment_method: String(activeMethodName || 'cash').toLowerCase(),
        subtotal: subtotal,
        discount_amount: grandTotalDiscounts,
        cost_total: totalOrderCost,
        payment_amount: finalTendered,
        total_amount: grandTotal,
        order_items: (cart || []).map((c) => ({
          item_name: c.name,
          unit_price: c.price,
          quantity: c.quantity,
          discount_amount: (c.discountAmountPerUnit || 0) * Math.min(c.quantity, c.discountQty || c.quantity),
          quantity_cancelled: 0,
          order_item_modifiers: c.selectedModifiers
            ? c.selectedModifiers.map((m) => ({ modifier_name: m.name, extra_price: m.extra_price }))
            : [],
        })),
      };

      setAddedOrder(fullOrderObj);
      setCart([]);
      setOrderDiscountVal(0);
      setIsCheckoutModalVisible(false);
      setTenderedAmount(0);

      // Automatically kick open cash drawer connected via Bluetooth printer if payment method is Cash
      if (isCashMethod) {
        try {
          await openCashDrawerViaPrinter();
        } catch (_e) {}
      }

      Alert.alert(
        'Payment Complete! 🎉',
        `Order #${orderNum} recorded. Change Due: ₱${Math.max(0, finalTendered - grandTotal).toFixed(2)}`
      );
    } catch (e) {
      Alert.alert('Checkout Error', e.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const { width } = useWindowDimensions();
  const numColumns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const leftPanelFlex = width >= 600 ? 0.65 : 0.58;
  const rightPanelFlex = width >= 600 ? 0.35 : 0.42;

  // Live item total calculation for Product Modifier Modal
  const modBasePrice = Number(selectedProductForMod?.price || 0);
  const modExtraSum = (selectedModifiersState || []).reduce(
    (sum, m) => sum + (Number(m?.extra_price) || 0),
    0
  );
  const modalItemTotalPrice = modBasePrice + modExtraSum;

  const bgStyle = { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' };
  const cardBgStyle = {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderColor: isDarkMode ? '#334155' : '#E2E8F0',
  };
  const titleTextStyle = { color: isDarkMode ? '#F8FAFC' : '#0F172A' };
  const subTextStyle = { color: isDarkMode ? '#CBD5E1' : '#64748B' };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={styles.flexOne}>
        <View style={styles.mainLayout}>
          {/* LEFT PANEL: CATEGORIES & PRODUCT GRID */}
          <View style={[styles.leftPanel, bgStyle, { flex: leftPanelFlex }]}>
            {/* Category Filter Chips */}
            <View style={[styles.categoryBar, cardBgStyle]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(categories || []).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, cardBgStyle, isActive && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, subTextStyle, isActive && styles.categoryChipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Product Cards Grid (Responsive 2, 3 or 4 columns on tablets) */}
            <FlatList
              key={`grid_${numColumns}`}
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              numColumns={numColumns}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item }) => {
                if (!item) return null;
                const priceNum = Number(item.price) || 0;
                const iconEmoji = (item.description || '🍗').split(' ')[0] || '🍗';
                const cardWidthPercent = `${Math.floor(100 / numColumns) - 2}%`;

                return (
                  <TouchableOpacity
                    style={[styles.productCard, cardBgStyle, { maxWidth: cardWidthPercent }]}
                    onPress={() => handleProductClick(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.productIcon}>{iconEmoji}</Text>
                    <Text style={[styles.productName, titleTextStyle]} numberOfLines={2}>
                      {item.name || 'Product'}
                    </Text>
                    <Text style={styles.productPrice}>₱{priceNum.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptyText, subTextStyle]}>No products found in this category.</Text>
                </View>
              }
            />
          </View>

          {/* RIGHT PANEL: CART & CHECKOUT */}
          <View style={[styles.rightPanel, cardBgStyle, { flex: rightPanelFlex }]}>
            <View style={styles.cartHeader}>
              <Text style={[styles.cartTitle, titleTextStyle]}>Current Order ({cart.length})</Text>
              {cart.length > 0 ? (
                <TouchableOpacity onPress={() => setCart([])}>
                  <Text style={styles.clearCartText}>Clear All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Cart Items List */}
            <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
              {(cart || []).map((item) => {
                if (!item) return null;
                const lineTotal = item.price * item.quantity;
                const activeDiscUnits = Math.min(item.quantity, item.discountQty || item.quantity);
                const lineDiscTotal = (item.discountAmountPerUnit || 0) * activeDiscUnits;

                return (
                  <View key={item.cartKey} style={styles.cartItemRow}>
                    <View style={styles.cartItemTopRow}>
                      <Text style={[styles.cartItemName, titleTextStyle]}>{item.name}</Text>
                      <Text style={styles.cartLineTotal}>₱{(lineTotal - lineDiscTotal).toFixed(2)}</Text>
                    </View>

                    {item.selectedModifiers && item.selectedModifiers.length > 0 ? (
                      <Text style={styles.cartItemMods}>
                        └─ {item.selectedModifiers.map((m) => (m ? m.name : '')).join(', ')}
                      </Text>
                    ) : null}

                    <View style={styles.cartItemBottomRow}>
                      <View style={styles.cartPriceCol}>
                        <Text style={styles.cartUnitPrice}>₱{item.price.toFixed(2)} each</Text>
                        {lineDiscTotal > 0 ? (
                          <Text style={styles.lineDiscBadgeText}>
                            Disc: -₱{lineDiscTotal.toFixed(2)} ({activeDiscUnits} units)
                          </Text>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => handleOpenLineDiscount(item)}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={styles.lineDiscTouchBtn}
                        >
                          <Text style={styles.itemDiscountBtnText}>✏️ Apply Discount</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cartQtyControls}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartItemQty(item.cartKey, -1)}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.cartQtyText, titleTextStyle]}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateCartItemQty(item.cartKey, 1)}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              {cart.length === 0 ? (
                <View style={styles.emptyCartBox}>
                  <Text style={styles.emptyCartIcon}>🛒</Text>
                  <Text style={[styles.emptyCartText, subTextStyle]}>Cart is empty</Text>
                  <Text style={[styles.emptyCartSub, subTextStyle]}>Tap items on left to add to order</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Bill Summary & Discount Button */}
            <View style={styles.billSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, subTextStyle]}>Subtotal:</Text>
                <Text style={[styles.summaryVal, titleTextStyle]}>₱{subtotal.toFixed(2)}</Text>
              </View>

              {grandTotalDiscounts > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountLabelText}>Total Discounts:</Text>
                  <Text style={styles.discountValText}>-₱{grandTotalDiscounts.toFixed(2)}</Text>
                </View>
              ) : null}

              {isTaxEnabled ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, subTextStyle]}>Tax ({taxRate}%):</Text>
                  <Text style={[styles.summaryVal, titleTextStyle]}>₱{taxAmount.toFixed(2)}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.orderDiscountBtn}
                onPress={() => setIsDiscountModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.orderDiscountBtnText}>
                  🏷️ {orderDiscountVal > 0 ? `Order Disc: -₱${orderDiscountVal.toFixed(2)}` : 'Add Order Discount'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={[styles.grandTotalLabel, titleTextStyle]}>Grand Total:</Text>
                <Text style={styles.grandTotalVal}>₱{grandTotal.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
                disabled={cart.length === 0}
                onPress={() => setIsCheckoutModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.checkoutBtnText}>Checkout (₱{grandTotal.toFixed(2)})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MODAL 1: PRODUCT MODIFIER SELECTION (With Live Item Total Price Preview) */}
        <Modal visible={!!selectedProductForMod} transparent animationType="slide" onRequestClose={() => setSelectedProductForMod(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.checkoutModalCardLarge}>
              <View style={styles.modalHeaderPriceRow}>
                <Text style={styles.modalTitle}>{selectedProductForMod?.name}</Text>
                <View style={styles.pricePreviewBadgeBox}>
                  <Text style={styles.pricePreviewBadgeText}>
                    Item Total: ₱{modalItemTotalPrice.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Customize Options & Modifiers:</Text>

              <ScrollView style={styles.modGroupScroll} showsVerticalScrollIndicator={true}>
                {activeModGroups.map((group) => {
                  const groupMods = (modifiers || []).filter(
                    (m) => m && String(m.group_id) === String(group.id) && m.is_available !== false
                  );
                  const minReq = Number(group.min_selection || 0);
                  const maxAllowed = Number(group.max_selection || 1);

                  return (
                    <View key={group.id} style={styles.modGroupSectionCard}>
                      <View style={styles.modGroupHeaderRow}>
                        <Text style={styles.modGroupTitleText}>{group.name}</Text>
                        <View style={styles.ruleBadgeBox}>
                          <Text style={styles.ruleBadgeText}>
                            {maxAllowed === 1 ? 'Choose 1' : `Choose up to ${maxAllowed}`}
                            {minReq > 0 ? ' (Required)' : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modOptionsRow}>
                        {groupMods.map((mod) => {
                          const isSelected = selectedModifiersState.some((m) => String(m.id) === String(mod.id));
                          const customChipBg = isSelected ? '#2563EB' : '#F1F5F9';
                          const customChipTextColor = isSelected ? '#FFFFFF' : '#1E293B';

                          return (
                            <TouchableOpacity
                              key={mod.id}
                              style={[
                                styles.modChip,
                                { backgroundColor: customChipBg },
                                isSelected && styles.modChipActiveBorder,
                              ]}
                              onPress={() => handleSelectModifierChoice(group, mod)}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.modChipText, { color: customChipTextColor }]}>
                                {isSelected ? '✓ ' : ''}{mod.name} {Number(mod.extra_price) > 0 ? `(+₱${Number(mod.extra_price).toFixed(2)})` : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setSelectedProductForMod(null)}>
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmCheckoutBtn} onPress={handleConfirmModifiers}>
                  <Text style={styles.confirmCheckoutBtnText}>
                    + Add to Order (₱{modalItemTotalPrice.toFixed(2)})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 2: ITEM LINE DISCOUNT (With Additive Shortcuts) */}
        <Modal visible={!!editingCartItem} transparent animationType="fade" onRequestClose={() => setEditingCartItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.checkoutModalCard}>
              <Text style={styles.modalTitle}>Item Discount: {editingCartItem?.name}</Text>
              <Text style={styles.fieldLabel}>Original Price: ₱{Number(editingCartItem?.price || 0).toFixed(2)} each</Text>

              <View style={styles.methodTabRow}>
                <TouchableOpacity
                  style={[styles.methodTabBtn, lineDiscountType === 'percent' && styles.methodTabBtnActive]}
                  onPress={() => setLineDiscountType('percent')}
                >
                  <Text style={[styles.methodTabText, lineDiscountType === 'percent' && styles.methodTabTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTabBtn, lineDiscountType === 'fixed' && styles.methodTabBtnActive]}
                  onPress={() => setLineDiscountType('fixed')}
                >
                  <Text style={[styles.methodTabText, lineDiscountType === 'fixed' && styles.methodTabTextActive]}>
                    Fixed Amount (₱)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Discount Value ({lineDiscountType === 'percent' ? '%' : '₱'}) *:</Text>
                <TextInput
                  style={styles.textInputFullModal}
                  placeholder={lineDiscountType === 'percent' ? '0%' : '₱0.00'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={lineDiscountValue}
                  onChangeText={setLineDiscountValue}
                />
              </View>

              {/* Additive Shortcut Buttons for Line Discount */}
              <Text style={styles.fieldLabelMini}>Tap Shortcut to Add on Top:</Text>
              <View style={styles.numpadGrid}>
                {lineDiscountType === 'percent'
                  ? [5, 10, 20].map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        style={styles.numpadBtn}
                        onPress={() => handleAddLineDiscountVal(pct)}
                      >
                        <Text style={styles.numpadBtnText}>+{pct}%</Text>
                      </TouchableOpacity>
                    ))
                  : [10, 20, 50, 100].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.numpadBtn}
                        onPress={() => handleAddLineDiscountVal(amt)}
                      >
                        <Text style={styles.numpadBtnText}>+₱{amt}</Text>
                      </TouchableOpacity>
                    ))}
              </View>

              <View style={styles.quickCashActionRow}>
                <TouchableOpacity
                  style={[styles.quickCashActionBtn, styles.clearCashBtn]}
                  onPress={() => setLineDiscountValue('0')}
                >
                  <Text style={styles.clearCashBtnText}>Clear Discount</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Apply to Quantity (Max {editingCartItem?.quantity}) *:</Text>
                <TextInput
                  style={styles.textInputFullModal}
                  placeholder="1"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={lineDiscountQty}
                  onChangeText={setLineDiscountQty}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setEditingCartItem(null)}>
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmCheckoutBtn} onPress={handleSaveLineDiscount}>
                  <Text style={styles.confirmCheckoutBtnText}>Apply Discount</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 3: ORDER DISCOUNT (With Additive Shortcuts) */}
        <Modal visible={isDiscountModalVisible} transparent animationType="fade" onRequestClose={() => setIsDiscountModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.checkoutModalCard}>
              <Text style={styles.modalTitle}>Apply Order Discount</Text>
              <Text style={styles.fieldLabel}>Subtotal: ₱{subtotalAfterLineDiscounts.toFixed(2)}</Text>

              <View style={styles.methodTabRow}>
                <TouchableOpacity
                  style={[styles.methodTabBtn, discountType === 'percent' && styles.methodTabBtnActive]}
                  onPress={() => setDiscountType('percent')}
                >
                  <Text style={[styles.methodTabText, discountType === 'percent' && styles.methodTabTextActive]}>
                    Percentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodTabBtn, discountType === 'fixed' && styles.methodTabBtnActive]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text style={[styles.methodTabText, discountType === 'fixed' && styles.methodTabTextActive]}>
                    Fixed Amount (₱)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Discount Value ({discountType === 'percent' ? '%' : '₱'}) *:</Text>
                <TextInput
                  style={styles.textInputFullModal}
                  placeholder={discountType === 'percent' ? '0%' : '₱0.00'}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={discountValue}
                  onChangeText={setDiscountValue}
                />
              </View>

              {/* Additive Shortcut Buttons for Order Discount */}
              <Text style={styles.fieldLabelMini}>Tap Shortcut to Add on Top:</Text>
              <View style={styles.numpadGrid}>
                {discountType === 'percent'
                  ? [5, 10, 20].map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        style={styles.numpadBtn}
                        onPress={() => handleAddOrderDiscountVal(pct)}
                      >
                        <Text style={styles.numpadBtnText}>+{pct}%</Text>
                      </TouchableOpacity>
                    ))
                  : [10, 20, 50, 100].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.numpadBtn}
                        onPress={() => handleAddOrderDiscountVal(amt)}
                      >
                        <Text style={styles.numpadBtnText}>+₱{amt}</Text>
                      </TouchableOpacity>
                    ))}
              </View>

              <View style={styles.quickCashActionRow}>
                <TouchableOpacity
                  style={[styles.quickCashActionBtn, styles.clearCashBtn]}
                  onPress={() => setDiscountValue('0')}
                >
                  <Text style={styles.clearCashBtnText}>Clear Discount</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsDiscountModalVisible(false)}>
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmCheckoutBtn} onPress={handleApplyOrderDiscount}>
                  <Text style={styles.confirmCheckoutBtnText}>Apply Discount</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* MODAL 4: CHECKOUT & ADDITIVE TENDERED AMOUNT SHORTCUTS (With Custom Payment Method Colors) */}
        <Modal visible={isCheckoutModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.checkoutModalCard}>
              <Text style={styles.modalTitle}>Checkout Order (₱{grandTotal.toFixed(2)})</Text>

              {/* Payment Method Selector Tabs */}
              <View style={styles.methodTabRow}>
                {(paymentMethods || []).map((pm) => {
                  if (!pm) return null;
                  const isActive = String(activeMethodName || '').toLowerCase() === String(pm.name || '').toLowerCase();
                  const pmBg = isActive ? '#2563EB' : pm.color || '#F1F5F9';

                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.methodTabBtn,
                        { backgroundColor: pmBg },
                        isActive && styles.methodTabBtnActiveBorder,
                      ]}
                      onPress={() => {
                        setActiveMethodName(pm.name || 'Cash');
                        setSelectedPayMethodObj(pm);
                      }}
                    >
                      <Text style={[styles.methodTabText, isActive && styles.methodTabTextActive]}>
                        {pm.name || 'Cash'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {String(activeMethodName || '').toLowerCase() === 'cash' ? (
                <View style={styles.cashTenderedSection}>
                  <Text style={styles.fieldLabel}>Cash Tendered Amount (₱) *:</Text>

                  <TextInput
                    style={styles.tenderedInputFull}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={tenderedAmount ? String(tenderedAmount) : ''}
                    onChangeText={(val) => setTenderedAmount(Number(val) || 0)}
                  />

                  {/* Additive Quick Cash Shortcuts (Tap 100 twice = 200, 20, 50, 100, 200, 500, 1000) */}
                  <Text style={styles.fieldLabelMini}>Tap Cash Buttons to Add on Top:</Text>
                  <View style={styles.numpadGrid}>
                    {[20, 50, 100, 200, 500, 1000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.numpadBtn}
                        onPress={() => handleAddTenderedCash(amt)}
                      >
                        <Text style={styles.numpadBtnText}>+₱{amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.quickCashActionRow}>
                    <TouchableOpacity
                      style={styles.quickCashActionBtn}
                      onPress={() => setTenderedAmount(grandTotal)}
                    >
                      <Text style={styles.quickCashActionBtnText}>Exact Amount</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickCashActionBtn, styles.clearCashBtn]}
                      onPress={() => setTenderedAmount(0)}
                    >
                      <Text style={styles.clearCashBtnText}>Clear</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.changeDueRow}>
                    <Text style={styles.changeDueLabel}>Change Due:</Text>
                    <Text style={styles.changeDueVal}>
                      ₱{Math.max(0, (Number(tenderedAmount) || 0) - grandTotal).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setIsCheckoutModalVisible(false)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCheckoutBtn}
                  onPress={handleCompleteCheckout}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmCheckoutBtnText}>Complete Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Thermal Print Modal */}
        <ThermalPrintModal
          visible={!!addedOrder}
          onClose={() => setAddedOrder(null)}
          order={addedOrder}
          storeName={appName}
          isTaxEnabled={isTaxEnabled}
          taxRate={taxRate}
          initialType="order"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 0.58,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  categoryBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2563EB',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridContent: {
    padding: 8,
  },
  productCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  productIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
  },
  rightPanel: {
    flex: 0.42,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  cartScroll: {
    flex: 1,
    marginVertical: 8,
  },
  cartItemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    paddingRight: 6,
  },
  cartLineTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  cartItemMods: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 4,
  },
  cartItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  cartPriceCol: {
    flex: 1,
  },
  cartUnitPrice: {
    fontSize: 11,
    color: '#64748B',
  },
  lineDiscBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  lineDiscTouchBtn: {
    paddingVertical: 4,
  },
  itemDiscountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1,
  },
  cartQtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartQtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginHorizontal: 8,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyCartIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyCartText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCartSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  billSummaryBox: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  discountLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  discountValText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  orderDiscountBtn: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  orderDiscountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  grandTotalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
  },
  checkoutBtn: {
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  checkoutModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  checkoutModalCardLarge: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeaderPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricePreviewBadgeBox: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  pricePreviewBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  modGroupScroll: {
    maxHeight: 280,
    marginVertical: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  modGroupSectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modGroupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modGroupTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ruleBadgeBox: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ruleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  modOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modChipActiveBorder: {
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  modChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  methodTabRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  methodTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginRight: 4,
  },
  methodTabBtnActiveBorder: {
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  methodTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  methodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  fieldLabelMini: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  tenderedInputFull: {
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 8,
  },
  textInputFullModal: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inputGroup: {
    marginBottom: 10,
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  numpadBtn: {
    width: '31%',
    height: 38,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 6,
  },
  numpadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  quickCashActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickCashActionBtn: {
    flex: 0.48,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickCashActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  clearCashBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  clearCashBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  changeDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  changeDueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  changeDueVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#15803D',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelModalBtn: {
    flex: 0.4,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmCheckoutBtn: {
    flex: 0.56,
    height: 44,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCheckoutBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

export default RegisterScreen;
