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
  KeyboardAvoidingView,
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

const InventoryScreen = ({ onBack, loggedInUser, rolePermissions = [] }) => {
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
      setInventoryList(inv || []);
      setProductsList(itms || []);
      setModifiersList(mods || []);
      setItemRecipes(iRecipes || []);
      setModRecipes(mRecipes || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const combinedTargetList = [
    ...productsList.map((p) => ({
      id: `item_${p.id}`,
      rawId: p.id,
      type: 'item',
      name: p.name,
    })),
    ...modifiersList.map((m) => ({
      id: `mod_${m.id}`,
      rawId: m.id,
      type: 'modifier',
      name: m.name,
    })),
  ];

  const toggleLinkTarget = (target) => {
    if (target.type === 'item') {
      const exists = linkedItemRecipes.some((r) => String(r.item_id) === String(target.rawId));
      if (exists) {
        setLinkedItemRecipes((prev) => prev.filter((r) => String(r.item_id) !== String(target.rawId)));
      } else {
        setLinkedItemRecipes((prev) => [
          ...prev,
          { item_id: target.rawId, quantity_used: 1.0, itemName: target.name },
        ]);
      }
    } else {
      const exists = linkedModRecipes.some((r) => String(r.modifier_id) === String(target.rawId));
      if (exists) {
        setLinkedModRecipes((prev) => prev.filter((r) => String(r.modifier_id) !== String(target.rawId)));
      } else {
        setLinkedModRecipes((prev) => [
          ...prev,
          { modifier_id: target.rawId, quantity_used: 0.1, modName: target.name },
        ]);
      }
    }
  };

  const updateLinkedQty = (target, qtyVal) => {
    if (target.type === 'item') {
      setLinkedItemRecipes((prev) =>
        prev.map((r) => (String(r.item_id) === String(target.rawId) ? { ...r, quantity_used: qtyVal } : r))
      );
    } else {
      setLinkedModRecipes((prev) =>
        prev.map((r) => (String(r.modifier_id) === String(target.rawId) ? { ...r, quantity_used: qtyVal } : r))
      );
    }
  };

  const toggleEditLinkTarget = (target) => {
    if (target.type === 'item') {
      const exists = editLinkedItemRecipes.some((r) => String(r.item_id) === String(target.rawId));
      if (exists) {
        setEditLinkedItemRecipes((prev) => prev.filter((r) => String(r.item_id) !== String(target.rawId)));
      } else {
        setEditLinkedItemRecipes((prev) => [
          ...prev,
          { item_id: target.rawId, quantity_used: 1.0, itemName: target.name },
        ]);
      }
    } else {
      const exists = editLinkedModRecipes.some((r) => String(r.modifier_id) === String(target.rawId));
      if (exists) {
        setEditLinkedModRecipes((prev) => prev.filter((r) => String(r.modifier_id) !== String(target.rawId)));
      } else {
        setEditLinkedModRecipes((prev) => [
          ...prev,
          { modifier_id: target.rawId, quantity_used: 0.1, modName: target.name },
        ]);
      }
    }
  };

  const updateEditLinkedQty = (target, qtyVal) => {
    if (target.type === 'item') {
      setEditLinkedItemRecipes((prev) =>
        prev.map((r) => (String(r.item_id) === String(target.rawId) ? { ...r, quantity_used: qtyVal } : r))
      );
    } else {
      setEditLinkedModRecipes((prev) =>
        prev.map((r) => (String(r.modifier_id) === String(target.rawId) ? { ...r, quantity_used: qtyVal } : r))
      );
    }
  };

  const handleAddInventory = async () => {
    const trimmed = invName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter an Inventory Item Name.');
      return;
    }
    const parsedQty = Number(invQuantity);
    if (isNaN(parsedQty)) {
      Alert.alert('Invalid Quantity', 'Please enter a valid numeric quantity.');
      return;
    }
    const parsedWarnQty = Number(invWarningQty) || 5.0;

    const exists = inventoryList.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'An inventory item with this name already exists.');
      return;
    }

    setLoadingText('Saving Inventory...');
    setLoading(true);
    try {
      const created = await createInventory({
        name: trimmed,
        quantity: parsedQty,
        measure: invMeasure.trim() || 'pcs',
        warning_quantity: parsedWarnQty,
      });

      if (created && created.id) {
        const itemPayload = linkedItemRecipes.map((r) => ({
          item_id: r.item_id,
          quantity_used: Number(r.quantity_used) || 1.0,
        }));
        const modPayload = linkedModRecipes.map((r) => ({
          modifier_id: r.modifier_id,
          quantity_used: Number(r.quantity_used) || 0.1,
        }));
        await setInventoryRecipes(created.id, itemPayload, modPayload);
      }

      await loadAllInventoryData();

      setInvName('');
      setInvQuantity('10.0');
      setInvMeasure('pcs');
      setInvWarningQty('5.0');
      setLinkedItemRecipes([]);
      setLinkedModRecipes([]);
      setActiveTab('list');
      triggerToast('Inventory item saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingInv(item);
    setEditName(item.name || '');
    setEditQuantity(String(item.quantity || 0.0));
    setEditMeasure(item.measure || 'pcs');
    setEditWarningQty(String(item.warning_quantity ?? 5.0));

    const linkedItms = itemRecipes
      .filter((r) => String(r.inventory_id) === String(item.id))
      .map((r) => {
        const prod = productsList.find((p) => String(p.id) === String(r.item_id));
        return {
          item_id: r.item_id,
          quantity_used: r.quantity_used,
          itemName: prod ? prod.name : 'Product Item',
        };
      });
    setEditLinkedItemRecipes(linkedItms);

    const linkedMods = modRecipes
      .filter((r) => String(r.inventory_id) === String(item.id))
      .map((r) => {
        const mod = modifiersList.find((m) => String(m.id) === String(r.modifier_id));
        return {
          modifier_id: r.modifier_id,
          quantity_used: r.quantity_used,
          modName: mod ? mod.name : 'Flavor/Option',
        };
      });
    setEditLinkedModRecipes(linkedMods);
  };

  const handleSaveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter an Inventory Item Name.');
      return;
    }
    const parsedQty = Number(editQuantity);
    if (isNaN(parsedQty)) {
      Alert.alert('Invalid Quantity', 'Please enter a valid numeric quantity.');
      return;
    }
    const parsedWarnQty = Number(editWarningQty) || 5.0;

    setLoadingText('Saving Inventory...');
    setLoading(true);
    try {
      await updateInventory(editingInv.id, {
        name: trimmed,
        quantity: parsedQty,
        measure: editMeasure.trim() || 'pcs',
        warning_quantity: parsedWarnQty,
      });

      const itemPayload = editLinkedItemRecipes.map((r) => ({
        item_id: r.item_id,
        quantity_used: Number(r.quantity_used) || 1.0,
      }));
      const modPayload = editLinkedModRecipes.map((r) => ({
        modifier_id: r.modifier_id,
        quantity_used: Number(r.quantity_used) || 0.1,
      }));

      await setInventoryRecipes(editingInv.id, itemPayload, modPayload);

      await loadAllInventoryData();
      setEditingInv(null);
      triggerToast('Inventory updated successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Stock Addition Handler (accepts decimals e.g. 0.5)
  const handleOpenQuickStock = (item) => {
    setQuickStockInv(item);
    setQuickAddQtyInput('');
  };

  const handleConfirmQuickAddStock = async () => {
    if (!quickStockInv) return;

    const addedQty = Number(quickAddQtyInput);
    if (isNaN(addedQty) || addedQty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number (e.g., 0.5, 1, 10).');
      return;
    }

    const currentQty = Number(quickStockInv.quantity) || 0;
    const newQty = currentQty + addedQty;

    setLoadingText('Adding Stock...');
    setLoading(true);
    try {
      await updateInventory(quickStockInv.id, { quantity: newQty });
      await loadAllInventoryData();
      setQuickStockInv(null);
      setQuickAddQtyInput('');
      triggerToast(`Added +${addedQty} to ${quickStockInv.name}. New total: ${newQty.toFixed(2)}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = (item) => {
    Alert.alert(
      'Delete Inventory Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingText('Deleting Inventory...');
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

  const renderInventoryCard = ({ item }) => {
    const warnLimit = Number(item.warning_quantity ?? 5.0);
    const isLowStock = Number(item.quantity) <= warnLimit;

    const linkedItemCount = itemRecipes.filter((r) => String(r.inventory_id) === String(item.id)).length;
    const linkedModCount = modRecipes.filter((r) => String(r.inventory_id) === String(item.id)).length;

    return (
      <TouchableOpacity
        style={styles.dataRow}
        onPress={() => handleOpenQuickStock(item)}
        activeOpacity={0.8}
      >
        <View style={styles.dataRowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.dataRowName}>{item.name}</Text>
            {isLowStock ? (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>⚠️ Low Stock (≤{warnLimit})</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.dataRowSub}>
            Stock: <Text style={styles.qtyHighlight}>{Number(item.quantity || 0).toFixed(2)}</Text> {item.measure || 'pcs'}
            {' '} • Warn Level: {warnLimit.toFixed(2)} {item.measure || 'pcs'}
          </Text>
          <Text style={styles.recipeLinkSub}>
            Linked: {linkedItemCount} Products, {linkedModCount} Flavors • <Text style={styles.tapAddStockText}>Tap to Add Stock +</Text>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >

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
        <View style={styles.tabNavContainer}>
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
            data={inventoryList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderInventoryCard}
            contentContainerStyle={styles.scrollContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No inventory stock items created yet.</Text>
                {!isRoleCrew ? (
                  <Text style={styles.emptySub}>Tap "➕ Add Inventory" above to create stock items.</Text>
                ) : null}
              </View>
            }
          />
        )}

        {/* SECTION 2: ADD INVENTORY FORM & COMBINED ONE-PER-ROW LINKING */}
        {activeTab === 'add' && !isRoleCrew && (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.cardSection}>
              <Text style={styles.cardTitle}>Add New Inventory Stock Item</Text>
              <Text style={styles.cardSubtitle}>
                Specify raw ingredient name, initial stock, warning quantity threshold, and linked items.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Inventory Item Name *:</Text>
                <TextInput
                  style={styles.textInputFull}
                  placeholder="e.g. Chicken Raw Pieces, Rice, Honey Garlic Sauce"
                  placeholderTextColor="#94A3B8"
                  value={invName}
                  onChangeText={setInvName}
                />
              </View>

              <View style={styles.threeColRow}>
                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Quantity *:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="10.5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={invQuantity}
                    onChangeText={setInvQuantity}
                  />
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Unit *:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="pcs, kg"
                    placeholderTextColor="#94A3B8"
                    value={invMeasure}
                    onChangeText={setInvMeasure}
                  />
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Warn Qty *:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="5.0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={invWarningQty}
                    onChangeText={setInvWarningQty}
                  />
                </View>
              </View>

              {/* Combined Vertical Link List (One per row) */}
              <View style={styles.recipeBox}>
                <Text style={styles.fieldLabel}>Link to Product Items & Modifiers (One Per Row):</Text>

                <View style={styles.verticalLinkContainer}>
                  {combinedTargetList.length > 0 ? (
                    combinedTargetList.map((target) => {
                      const isLinked = target.type === 'item'
                        ? linkedItemRecipes.some((r) => String(r.item_id) === String(target.rawId))
                        : linkedModRecipes.some((r) => String(r.modifier_id) === String(target.rawId));

                      const linkedObj = target.type === 'item'
                        ? linkedItemRecipes.find((r) => String(r.item_id) === String(target.rawId))
                        : linkedModRecipes.find((r) => String(r.modifier_id) === String(target.rawId));

                      const currentQtyVal = linkedObj ? String(linkedObj.quantity_used) : (target.type === 'item' ? '1.0' : '0.1');

                      return (
                        <View key={target.id} style={styles.linkRowItem}>
                          <View style={styles.linkRowTextCol}>
                            <Text style={styles.linkRowName}>
                              {target.name}
                              {target.type === 'modifier' ? (
                                <Text style={styles.grayModifierText}> - modifier</Text>
                              ) : null}
                            </Text>
                          </View>

                          {isLinked ? (
                            <View style={styles.linkedRowControls}>
                              <Text style={styles.linkedQtyLabel}>Deduct:</Text>
                              <TextInput
                                style={styles.qtyInputMini}
                                keyboardType="numeric"
                                value={currentQtyVal}
                                onChangeText={(val) => updateLinkedQty(target, val)}
                              />
                              <Text style={styles.measureMini}>{invMeasure || 'pcs'}</Text>
                              <TouchableOpacity
                                style={styles.unlinkMiniBtn}
                                onPress={() => toggleLinkTarget(target)}
                              >
                                <Text style={styles.unlinkMiniBtnText}>✕ Unlink</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.linkMiniBtn}
                              onPress={() => toggleLinkTarget(target)}
                            >
                              <Text style={styles.linkMiniBtnText}>+ Link</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyBreakdownText}>No products or modifiers created yet.</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddInventory} activeOpacity={0.8}>
                <Text style={styles.addBtnText}>+ Save Inventory Item & Links</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* MODAL: QUICK STOCK ADDITION (Accepts Decimals) */}
        <Modal visible={!!quickStockInv} transparent animationType="fade" onRequestClose={() => setQuickStockInv(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainerLarge}>
                <Text style={styles.modalTitle}>Add Quantity to {quickStockInv?.name}</Text>
                <Text style={styles.cardSubtitle}>
                  Current quantity: {Number(quickStockInv?.quantity || 0).toFixed(2)} {quickStockInv?.measure || 'pcs'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Enter Quantity to Add (Decimals accepted e.g. 0.5) *:</Text>
                  <TextInput
                    style={styles.textInputFull}
                    placeholder="e.g. 0.5, 1, 10"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={quickAddQtyInput}
                    onChangeText={setQuickAddQtyInput}
                    autoFocus={true}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setQuickStockInv(null)}>
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.btnSave]} onPress={handleConfirmQuickAddStock}>
                    <Text style={styles.btnSaveText}>Add Stock</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT INVENTORY & COMBINED ONE-PER-ROW LINKING */}
        <Modal visible={!!editingInv} transparent animationType="fade" onRequestClose={() => setEditingInv(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                <View style={styles.modalContainerLarge}>
                  <Text style={styles.modalTitle}>Edit Inventory Stock</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Inventory Name *:</Text>
                    <TextInput
                      style={styles.textInputFull}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Inventory name"
                    />
                  </View>

                  <View style={styles.threeColRow}>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Quantity *:</Text>
                      <TextInput
                        style={styles.textInputFull}
                        keyboardType="numeric"
                        value={editQuantity}
                        onChangeText={setEditQuantity}
                      />
                    </View>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Unit *:</Text>
                      <TextInput
                        style={styles.textInputFull}
                        value={editMeasure}
                        onChangeText={setEditMeasure}
                      />
                    </View>
                    <View style={styles.colThird}>
                      <Text style={styles.fieldLabel}>Warn Qty *:</Text>
                      <TextInput
                        style={styles.textInputFull}
                        keyboardType="numeric"
                        value={editWarningQty}
                        onChangeText={setEditWarningQty}
                      />
                    </View>
                  </View>

                  {/* Combined Vertical Link List for Edit Modal */}
                  <View style={styles.recipeBox}>
                    <Text style={styles.fieldLabel}>Linked Product Items & Modifiers (One Per Row):</Text>

                    <View style={styles.verticalLinkContainer}>
                      {combinedTargetList.map((target) => {
                        const isLinked = target.type === 'item'
                          ? editLinkedItemRecipes.some((r) => String(r.item_id) === String(target.rawId))
                          : editLinkedModRecipes.some((r) => String(r.modifier_id) === String(target.rawId));

                        const linkedObj = target.type === 'item'
                          ? editLinkedItemRecipes.find((r) => String(r.item_id) === String(target.rawId))
                          : editLinkedModRecipes.find((r) => String(r.modifier_id) === String(target.rawId));

                        const currentQtyVal = linkedObj ? String(linkedObj.quantity_used) : (target.type === 'item' ? '1.0' : '0.1');

                        return (
                          <View key={target.id} style={styles.linkRowItem}>
                            <View style={styles.linkRowTextCol}>
                              <Text style={styles.linkRowName}>
                                {target.name}
                                {target.type === 'modifier' ? (
                                  <Text style={styles.grayModifierText}> - modifier</Text>
                                ) : null}
                              </Text>
                            </View>

                            {isLinked ? (
                              <View style={styles.linkedRowControls}>
                                <Text style={styles.linkedQtyLabel}>Deduct:</Text>
                                <TextInput
                                  style={styles.qtyInputMini}
                                  keyboardType="numeric"
                                  value={currentQtyVal}
                                  onChangeText={(val) => updateEditLinkedQty(target, val)}
                                />
                                <Text style={styles.measureMini}>{editMeasure || 'pcs'}</Text>
                                <TouchableOpacity
                                  style={styles.unlinkMiniBtn}
                                  onPress={() => toggleEditLinkTarget(target)}
                                >
                                  <Text style={styles.unlinkMiniBtnText}>✕ Unlink</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.linkMiniBtn}
                                onPress={() => toggleEditLinkTarget(target)}
                              >
                                <Text style={styles.linkMiniBtnText}>+ Link</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setEditingInv(null)}>
                      <Text style={styles.btnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.btnSave]} onPress={handleSaveEdit}>
                      <Text style={styles.btnSaveText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: '5%', // 5% Top Padding
  },
  flexOne: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 10,
  },
  backButtonIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#2563EB',
    marginRight: 2,
    marginTop: -2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    padding: 6,
  },
  refreshBtnText: {
    fontSize: 18,
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
    color: '#1D4ED8',
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
    padding: 20,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
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
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
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
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addBtnLarge: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recipeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verticalLinkContainer: {
    marginTop: 4,
  },
  linkRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkRowTextCol: {
    flex: 1,
    marginRight: 8,
  },
  linkRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  grayModifierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontStyle: 'italic',
  },
  linkMiniBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  linkMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  linkedRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedQtyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  qtyInputMini: {
    width: 58,
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    textAlign: 'center',
  },
  measureMini: {
    fontSize: 11,
    color: '#64748B',
    marginHorizontal: 4,
  },
  unlinkMiniBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 4,
  },
  unlinkMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  dataRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    marginRight: 6,
  },
  lowStockBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  dataRowSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  recipeLinkSub: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  tapAddStockText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  qtyHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContainerLarge: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginLeft: 8,
  },
  btnCancel: {
    backgroundColor: '#F1F5F9',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  btnSave: {
    backgroundColor: '#2563EB',
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyBreakdownText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 10,
  },
});

export default InventoryScreen;
