import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  fetchInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  fetchItems,
  fetchModifiers,
  fetchItemRecipes,
  fetchItemModifierRecipes,
  setInventoryRecipes,
} from '../services/supabase';

const InventoryScreen = ({ onBack, loggedInUser, rolePermissions = [], isDarkMode = false }) => {
  // Tab state: 'list' | 'add'
  const [activeTab, setActiveTab] = useState('list');

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading Inventory...');
  const [inventoryList, setInventoryList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [modifiersList, setModifiersList] = useState([]);
  const [itemRecipes, setItemRecipes] = useState([]);
  const [modRecipes, setModRecipes] = useState([]);

  const [toastMsg, setToastMsg] = useState('');

  // Add Form
  const [invName, setInvName] = useState('');
  const [invQuantity, setInvQuantity] = useState('10.0');
  const [invMeasure, setInvMeasure] = useState('pcs');
  const [invWarningQty, setInvWarningQty] = useState('5.0');

  // Recipe Linkages for Add Form
  const [linkedItemRecipes, setLinkedItemRecipes] = useState([]);
  const [linkedModRecipes, setLinkedModRecipes] = useState([]);

  // Edit Modal
  const [editingInv, setEditingInv] = useState(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('0.0');
  const [editMeasure, setEditMeasure] = useState('pcs');
  const [editWarningQty, setEditWarningQty] = useState('5.0');
  const [editLinkedItemRecipes, setEditLinkedItemRecipes] = useState([]);
  const [editLinkedModRecipes, setEditLinkedModRecipes] = useState([]);

  // Quick Stock Addition Modal State
  const [quickStockInv, setQuickStockInv] = useState(null);
  const [quickAddQtyInput, setQuickAddQtyInput] = useState('');

  const isRoleCrew = loggedInUser && Number(loggedInUser.role) === 3;

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const loadAllInventoryData = async () => {
    setLoadingText('Loading Inventory Stock...');
    setLoading(true);
    try {
      const [inv, itms, mods, iRecipes, mRecipes] = await Promise.all([
        fetchInventory(),
        fetchItems(),
        fetchModifiers(),
        fetchItemRecipes(),
        fetchItemModifierRecipes(),
      ]);
      setInventoryList(Array.isArray(inv) ? inv : []);
      setProductsList(Array.isArray(itms) ? itms : []);
      setModifiersList(Array.isArray(mods) ? mods : []);
      setItemRecipes(Array.isArray(iRecipes) ? iRecipes : []);
      setModRecipes(Array.isArray(mRecipes) ? mRecipes : []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const combinedTargetList = [
    ...(productsList || []).filter(Boolean).map((p) => ({
      id: `item_${p.id}`,
      rawId: p.id,
      type: 'item',
      name: p.name || 'Product',
    })),
    ...(modifiersList || []).filter(Boolean).map((m) => ({
      id: `mod_${m.id}`,
      rawId: m.id,
      type: 'modifier',
      name: m.name || 'Modifier',
    })),
  ];

  const toggleLinkTarget = (target) => {
    if (!target) return;
    if (target.type === 'item') {
      const exists = (linkedItemRecipes || []).some((r) => r && String(r.item_id) === String(target.rawId));
      if (exists) {
        setLinkedItemRecipes((prev) => (prev || []).filter((r) => r && String(r.item_id) !== String(target.rawId)));
      } else {
        setLinkedItemRecipes((prev) => [
          ...(prev || []),
          { item_id: target.rawId, quantity_used: 1.0, itemName: target.name },
        ]);
      }
    } else {
      const exists = (linkedModRecipes || []).some((r) => r && String(r.modifier_id) === String(target.rawId));
      if (exists) {
        setLinkedModRecipes((prev) => (prev || []).filter((r) => r && String(r.modifier_id) !== String(target.rawId)));
      } else {
        setLinkedModRecipes((prev) => [
          ...(prev || []),
          { modifier_id: target.rawId, quantity_used: 0.1, modName: target.name },
        ]);
      }
    }
  };

  const toggleEditLinkTarget = (target) => {
    if (!target) return;
    if (target.type === 'item') {
      const exists = (editLinkedItemRecipes || []).some((r) => r && String(r.item_id) === String(target.rawId));
      if (exists) {
        setEditLinkedItemRecipes((prev) => (prev || []).filter((r) => r && String(r.item_id) !== String(target.rawId)));
      } else {
        setEditLinkedItemRecipes((prev) => [
          ...(prev || []),
          { item_id: target.rawId, quantity_used: 1.0, itemName: target.name },
        ]);
      }
    } else {
      const exists = (editLinkedModRecipes || []).some((r) => r && String(r.modifier_id) === String(target.rawId));
      if (exists) {
        setEditLinkedModRecipes((prev) => (prev || []).filter((r) => r && String(r.modifier_id) !== String(target.rawId)));
      } else {
        setEditLinkedModRecipes((prev) => [
          ...(prev || []),
          { modifier_id: target.rawId, quantity_used: 0.1, modName: target.name },
        ]);
      }
    }
  };

  const handleUpdateItemQtyUsed = (itemId, val) => {
    const parsed = Number(val) || 0;
    setLinkedItemRecipes((prev) =>
      (prev || []).map((r) => (r && String(r.item_id) === String(itemId) ? { ...r, quantity_used: parsed } : r))
    );
  };

  const handleUpdateModQtyUsed = (modId, val) => {
    const parsed = Number(val) || 0;
    setLinkedModRecipes((prev) =>
      (prev || []).map((r) => (r && String(r.modifier_id) === String(modId) ? { ...r, quantity_used: parsed } : r))
    );
  };

  const handleUpdateEditItemQtyUsed = (itemId, val) => {
    const parsed = Number(val) || 0;
    setEditLinkedItemRecipes((prev) =>
      (prev || []).map((r) => (r && String(r.item_id) === String(itemId) ? { ...r, quantity_used: parsed } : r))
    );
  };

  const handleUpdateEditModQtyUsed = (modId, val) => {
    const parsed = Number(val) || 0;
    setEditLinkedModRecipes((prev) =>
      (prev || []).map((r) => (r && String(r.modifier_id) === String(modId) ? { ...r, quantity_used: parsed } : r))
    );
  };

  const handleAddInventory = async () => {
    const trimmed = invName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Inventory Item Name.');
      return;
    }
    const exists = (inventoryList || []).some((i) => i && i.name && i.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'An inventory item with this name already exists.');
      return;
    }

    setLoadingText('Saving Inventory...');
    setLoading(true);
    try {
      const created = await createInventory({
        name: trimmed,
        quantity: Number(invQuantity) || 0,
        measure: invMeasure.trim() || 'pcs',
        warning_quantity: Number(invWarningQty) || 5.0,
      });

      if (created && created.id) {
        await setInventoryRecipes(created.id, linkedItemRecipes, linkedModRecipes);
      }

      await loadAllInventoryData();
      setInvName('');
      setInvQuantity('10.0');
      setInvWarningQty('5.0');
      setLinkedItemRecipes([]);
      setLinkedModRecipes([]);
      setActiveTab('list');
      triggerToast('Inventory stock item saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (inv) => {
    if (!inv) return;
    setEditingInv(inv);
    setEditName(inv.name || '');
    setEditQuantity(String(inv.quantity || 0));
    setEditMeasure(inv.measure || 'pcs');
    setEditWarningQty(String(inv.warning_quantity ?? 5.0));

    const currentItemRecipes = (itemRecipes || [])
      .filter((r) => r && String(r.inventory_id) === String(inv.id))
      .map((r) => {
        const prod = (productsList || []).find((p) => p && String(p.id) === String(r.item_id));
        return { item_id: r.item_id, quantity_used: Number(r.quantity_used) || 1.0, itemName: prod ? prod.name : 'Product' };
      });

    const currentModRecipes = (modRecipes || [])
      .filter((r) => r && String(r.inventory_id) === String(inv.id))
      .map((r) => {
        const mod = (modifiersList || []).find((m) => m && String(m.id) === String(r.modifier_id));
        return { modifier_id: r.modifier_id, quantity_used: Number(r.quantity_used) || 0.1, modName: mod ? mod.name : 'Modifier' };
      });

    setEditLinkedItemRecipes(currentItemRecipes);
    setEditLinkedModRecipes(currentModRecipes);
  };

  const handleSaveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Inventory Item Name.');
      return;
    }

    setLoadingText('Saving Inventory...');
    setLoading(true);
    try {
      await updateInventory(editingInv.id, {
        name: trimmed,
        quantity: Number(editQuantity) || 0,
        measure: editMeasure.trim() || 'pcs',
        warning_quantity: Number(editWarningQty) || 5.0,
      });

      await setInventoryRecipes(editingInv.id, editLinkedItemRecipes, editLinkedModRecipes);

      await loadAllInventoryData();
      setEditingInv(null);
      triggerToast('Inventory updated successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuickStock = (item) => {
    setQuickStockInv(item);
    setQuickAddQtyInput('');
  };

  const handleSaveQuickAddStock = async () => {
    const parsedAdd = Number(quickAddQtyInput) || 0;
    if (parsedAdd <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive quantity e.g. 0.5 or 10.');
      return;
    }

    const currentQty = Number(quickStockInv.quantity) || 0;
    const newQty = currentQty + parsedAdd;

    setLoadingText('Adding Stock...');
    setLoading(true);
    try {
      await updateInventory(quickStockInv.id, { quantity: newQty });
      await loadAllInventoryData();
      const itemName = quickStockInv.name;
      setQuickStockInv(null);
      setQuickAddQtyInput('');
      triggerToast(`Added +${parsedAdd} to ${itemName}. New total: ${newQty.toFixed(2)}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = (item) => {
    if (!item) return;
    Alert.alert(
      'Delete Inventory Item',
      `Are you sure you want to delete inventory item "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingText('Saving Inventory...');
            setLoading(true);
            try {
              await deleteInventory(item.id);
              await setInventoryRecipes(item.id, [], []);
              await loadAllInventoryData();
              triggerToast('Inventory item deleted!');
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

  const renderInventoryCard = ({ item }) => {
    if (!item) return null;
    const warnLimit = Number(item.warning_quantity ?? 5.0);
    const currentQtyNum = Number(item.quantity) || 0;
    const isLowStock = currentQtyNum <= warnLimit;

    const linkedItemCount = (itemRecipes || []).filter((r) => r && String(r.inventory_id) === String(item.id)).length;
    const linkedModCount = (modRecipes || []).filter((r) => r && String(r.inventory_id) === String(item.id)).length;

    return (
      <TouchableOpacity
        style={[styles.dataRow, cardBgStyle]}
        onPress={() => handleOpenQuickStock(item)}
        activeOpacity={0.8}
      >
        <View style={styles.dataRowInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.dataRowName, titleTextStyle]}>{item.name}</Text>
            {isLowStock ? (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>⚠️ Low Stock (≤{warnLimit})</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.dataRowSub, subTextStyle]}>
            Stock: <Text style={styles.qtyHighlight}>{currentQtyNum.toFixed(2)}</Text> {item.measure || 'pcs'}
            {' '} • Warn Level: {warnLimit.toFixed(2)} {item.measure || 'pcs'}
          </Text>
          <Text style={styles.recipeLinkSub}>
            Linked: {linkedItemCount} Products, {linkedModCount} Modifiers • <Text style={styles.tapAddStockText}>Tap to Add Stock +</Text>
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEdit(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {!isRoleCrew ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteConfirm(item)}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      <View style={styles.flexOne}>
        {loading ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingBarText}>{loadingText}</Text>
          </View>
        ) : null}

        {toastMsg ? (
          <View style={styles.toastBanner}>
            <Text style={styles.toastBannerText}>✅ {toastMsg}</Text>
          </View>
        ) : null}

        {/* Tab Navigation: Stock Directory vs Add Inventory Item */}
        <View style={[styles.tabNavContainer, cardBgStyle]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'list' && styles.tabBtnActive]}
            onPress={() => setActiveTab('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'list' && styles.tabBtnTextActive]}>
              📦 Stock Directory ({inventoryList.length})
            </Text>
          </TouchableOpacity>

          {!isRoleCrew ? (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'add' && styles.tabBtnActive]}
              onPress={() => setActiveTab('add')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === 'add' && styles.tabBtnTextActive]}>
                ➕ Add Inventory
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* SECTION 1: STOCK DIRECTORY LIST */}
        {activeTab === 'list' && (
          <FlatList
            data={(inventoryList || []).filter(Boolean)}
            keyExtractor={(item) => String(item ? item.id : Math.random())}
            renderItem={renderInventoryCard}
            contentContainerStyle={styles.scrollContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyTitle, subTextStyle]}>No inventory stock items created yet.</Text>
                {!isRoleCrew ? (
                  <Text style={[styles.emptySub, subTextStyle]}>Tap "➕ Add Inventory" above to create stock items.</Text>
                ) : null}
              </View>
            }
          />
        )}

        {/* SECTION 2: ADD INVENTORY FORM & COMBINED ONE-PER-ROW LINKING */}
        {activeTab === 'add' && !isRoleCrew && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.cardSection, cardBgStyle]}>
              <Text style={[styles.cardTitle, titleTextStyle]}>Add New Inventory Stock Item</Text>
              <Text style={[styles.cardSubtitle, subTextStyle]}>
                Specify raw ingredient name, initial stock, warning quantity threshold, and linked items.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, subTextStyle]}>Inventory Item Name *:</Text>
                <TextInput
                  style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                  placeholder="e.g. Chicken Raw Pieces, Rice, Sauce"
                  placeholderTextColor="#94A3B8"
                  value={invName}
                  onChangeText={setInvName}
                />
              </View>

              <View style={styles.threeColRow}>
                <View style={styles.colThird}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Quantity *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="10.5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={invQuantity}
                    onChangeText={setInvQuantity}
                  />
                </View>
                <View style={styles.colThird}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Measure Unit *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="pcs / kg / L"
                    placeholderTextColor="#94A3B8"
                    value={invMeasure}
                    onChangeText={setInvMeasure}
                  />
                </View>
                <View style={styles.colThird}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Warning Limit *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="5.0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={invWarningQty}
                    onChangeText={setInvWarningQty}
                  />
                </View>
              </View>

              {/* Combined Linking Section */}
              <Text style={[styles.cardTitleSmall, titleTextStyle]}>🔗 Link Products & Modifiers to this Stock Item:</Text>

              {combinedTargetList.map((target) => {
                const isItem = target.type === 'item';
                const linkedObj = isItem
                  ? linkedItemRecipes.find((r) => String(r.item_id) === String(target.rawId))
                  : linkedModRecipes.find((r) => String(r.modifier_id) === String(target.rawId));
                const isChecked = !!linkedObj;

                return (
                  <View key={target.id} style={[styles.linkTargetRow, isDarkMode && styles.linkTargetRowDark]}>
                    <TouchableOpacity style={styles.linkCheckCol} onPress={() => toggleLinkTarget(target)}>
                      <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                        {isChecked ? <Text style={styles.checkMark}>✓</Text> : null}
                      </View>
                      <View style={styles.targetLabelCol}>
                        <Text style={[styles.targetNameText, titleTextStyle]}>{target.name}</Text>
                        <Text style={[styles.targetBadgeText, isItem ? styles.badgeItem : styles.badgeMod]}>
                          {isItem ? 'PRODUCT' : 'MODIFIER'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {isChecked ? (
                      <View style={styles.qtyUsedInputCol}>
                        <Text style={[styles.qtyUsedLabel, subTextStyle]}>Qty Used:</Text>
                        <TextInput
                          style={[styles.qtyUsedInput, cardBgStyle, titleTextStyle]}
                          keyboardType="numeric"
                          value={String(linkedObj.quantity_used || '')}
                          onChangeText={(val) =>
                            isItem ? handleUpdateItemQtyUsed(target.rawId, val) : handleUpdateModQtyUsed(target.rawId, val)
                          }
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddInventory} activeOpacity={0.8}>
                <Text style={styles.addBtnText}>+ Save Inventory Item</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* MODAL: QUICK STOCK ADDITION */}
        <Modal visible={!!quickStockInv} transparent animationType="fade" onRequestClose={() => setQuickStockInv(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.modalTitle}>Add Quantity to {quickStockInv?.name}</Text>
                <Text style={styles.fieldLabel}>
                  Current quantity: {Number(quickStockInv?.quantity || 0).toFixed(2)} {quickStockInv?.measure || 'pcs'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Enter Quantity to Add (Decimals accepted e.g. 0.5) *:</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    placeholder="e.g. 0.5, 1, 10"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={quickAddQtyInput}
                    onChangeText={setQuickAddQtyInput}
                  />
                </View>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setQuickStockInv(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveQuickAddStock}>
                    <Text style={styles.saveBtnText}>Add Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT INVENTORY STOCK ITEM */}
        <Modal visible={!!editingInv} transparent animationType="fade" onRequestClose={() => setEditingInv(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                <View style={styles.editModalCardLarge}>
                  <Text style={styles.modalTitle}>Edit Inventory Item</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Item Name *:</Text>
                    <TextInput style={styles.modalTextInputFull} value={editName} onChangeText={setEditName} />
                  </View>

                  <View style={styles.threeColRow}>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Stock *:</Text>
                      <TextInput style={styles.modalTextInputFull} keyboardType="numeric" value={editQuantity} onChangeText={setEditQuantity} />
                    </View>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Unit *:</Text>
                      <TextInput style={styles.modalTextInputFull} value={editMeasure} onChangeText={setEditMeasure} />
                    </View>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Warn Limit *:</Text>
                      <TextInput style={styles.modalTextInputFull} keyboardType="numeric" value={editWarningQty} onChangeText={setEditWarningQty} />
                    </View>
                  </View>

                  <Text style={styles.cardTitleSmall}>🔗 Edit Linked Products & Modifiers:</Text>
                  {combinedTargetList.map((target) => {
                    const isItem = target.type === 'item';
                    const linkedObj = isItem
                      ? editLinkedItemRecipes.find((r) => String(r.item_id) === String(target.rawId))
                      : editLinkedModRecipes.find((r) => String(r.modifier_id) === String(target.rawId));
                    const isChecked = !!linkedObj;

                    return (
                      <View key={target.id} style={styles.linkTargetRowModal}>
                        <TouchableOpacity style={styles.linkCheckCol} onPress={() => toggleEditLinkTarget(target)}>
                          <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                            {isChecked ? <Text style={styles.checkMark}>✓</Text> : null}
                          </View>
                          <View style={styles.targetLabelCol}>
                            <Text style={styles.targetNameTextModal}>{target.name}</Text>
                            <Text style={[styles.targetBadgeText, isItem ? styles.badgeItem : styles.badgeMod]}>
                              {isItem ? 'PRODUCT' : 'MODIFIER'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {isChecked ? (
                          <View style={styles.qtyUsedInputCol}>
                            <Text style={styles.qtyUsedLabelModal}>Qty Used:</Text>
                            <TextInput
                              style={styles.qtyUsedInputModal}
                              keyboardType="numeric"
                              value={String(linkedObj.quantity_used || '')}
                              onChangeText={(val) =>
                                isItem ? handleUpdateEditItemQtyUsed(target.rawId, val) : handleUpdateEditModQtyUsed(target.rawId, val)
                              }
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}

                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingInv(null)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
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
  flexOne: {
    flex: 1,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
  },
  loadingBarText: {
    fontSize: 13,
    color: '#2563EB',
    marginLeft: 8,
    fontWeight: '700',
  },
  toastBanner: {
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
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
    marginHorizontal: 4,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardTitleSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  threeColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colThird: {
    flex: 0.31,
  },
  textInputFull: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  linkTargetRowDark: {
    borderBottomColor: '#334155',
  },
  linkCheckCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxBoxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  targetLabelCol: {
    flex: 1,
  },
  targetNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  targetBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  badgeItem: {
    color: '#2563EB',
  },
  badgeMod: {
    color: '#059669',
  },
  qtyUsedInputCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyUsedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  qtyUsedInput: {
    width: 60,
    height: 36,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
  },
  addBtnLarge: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dataRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  dataRowInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  lowStockBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  dataRowSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  qtyHighlight: {
    fontWeight: '800',
    color: '#2563EB',
  },
  recipeLinkSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tapAddStockText: {
    color: '#059669',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
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
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  editModalCardLarge: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalTextInput: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginVertical: 10,
  },
  modalTextInputFull: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  linkTargetRowModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  targetNameTextModal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  qtyUsedLabelModal: {
    fontSize: 10,
    color: '#64748B',
    marginRight: 4,
  },
  qtyUsedInputModal: {
    width: 50,
    height: 32,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default InventoryScreen;
