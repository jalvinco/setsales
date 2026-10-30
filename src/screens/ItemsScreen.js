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
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchItemTypes,
  createItemType,
  updateItemType,
  deleteItemType,
  fetchModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  fetchModifiers,
  createModifier,
  updateModifier,
  deleteModifier,
  fetchItemModifierGroups,
  setItemModifierGroups,
  fetchItems,
  createItem,
  updateItem,
  deleteItem,
  fetchInventory,
  fetchItemRecipes,
  setItemRecipes,
} from '../services/supabase';

const PRESET_ICONS = ['🍗', '🍔', '🍟', '🥤', '🧁', '🥐', '🍕', '🥗', '🍦', '☕', '🍱', '🥪', '🍜', '🍩', '🌮'];

const PRESET_LIGHT_COLORS = [
  { name: 'Light Green', hex: '#DCFCE7' },
  { name: 'Light Blue', hex: '#DBEAFE' },
  { name: 'Light Yellow', hex: '#FEF3C7' },
  { name: 'Light Red', hex: '#FEE2E2' },
  { name: 'Light Grey', hex: '#F1F5F9' },
  { name: 'Light Orange', hex: '#FFEDD5' },
];

const ItemsScreen = ({ onBack, isDarkMode = false }) => {
  // Tab state: 'list' | 'add'
  const [activeTab, setActiveTab] = useState('list');

  // Submenu state inside catalog: 'items' | 'categories' | 'item_types' | 'modifiers'
  const [activeSubmenu, setActiveSubmenu] = useState('items');

  // Loading and Toast states
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Saving...');
  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Data states
  const [categoriesList, setCategoriesList] = useState([]);
  const [itemTypesList, setItemTypesList] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [modifierGroupsList, setModifierGroupsList] = useState([]);
  const [modifiersList, setModifiersList] = useState([]);
  const [itemModGroupMappings, setItemModGroupMappings] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [itemRecipesList, setItemRecipesList] = useState([]);

  // Search & Filters for Items List
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [filterCatId, setFilterCatId] = useState('all');

  // Add Category form
  const [catName, setCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatActive, setEditCatActive] = useState(true);

  // Add Item Type form
  const [typeName, setTypeName] = useState('');
  const [typeColor, setTypeColor] = useState(null);
  const [editingItemType, setEditingItemType] = useState(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeColor, setEditTypeColor] = useState(null);

  // Add Modifier Group & Options form
  const [groupName, setGroupName] = useState('');
  const [groupMin, setGroupMin] = useState('1');
  const [groupMax, setGroupMax] = useState('1');
  const [selectedGroupForMod, setSelectedGroupForMod] = useState(null);
  const [modName, setModName] = useState('');
  const [modExtraPrice, setModExtraPrice] = useState('0');
  const [modColor, setModColor] = useState(null);

  // Edit Modifier Group Modal State
  const [editingModGroup, setEditingModGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupMin, setEditGroupMin] = useState('0');
  const [editGroupMax, setEditGroupMax] = useState('1');

  // Edit Modifier Choice Modal
  const [editingModifier, setEditingModifier] = useState(null);
  const [editModName, setEditModName] = useState('');
  const [editModExtraPrice, setEditModExtraPrice] = useState('0');
  const [editModColor, setEditModColor] = useState(null);

  // Add Item form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCost, setItemCost] = useState('0.00');
  const [itemDesc, setItemDesc] = useState('');
  const [itemIcon, setItemIcon] = useState('🍗');
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [selectedModGroupIds, setSelectedModGroupIds] = useState([]);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('0');
  const [editItemCost, setEditItemCost] = useState('0');
  const [editItemDesc, setEditItemDesc] = useState('');
  const [editItemIcon, setEditItemIcon] = useState('🍗');
  const [editSelectedCatId, setEditSelectedCatId] = useState(null);
  const [editSelectedTypeId, setEditSelectedTypeId] = useState(null);
  const [editSelectedModGroupIds, setEditSelectedModGroupIds] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const loadAllData = async () => {
    setLoadingText('Loading Catalog Data...');
    setLoading(true);
    setErrorMsg('');
    try {
      const [cats, types, itms, modGroups, mods, mappings, inv, recipes] = await Promise.all([
        fetchCategories(),
        fetchItemTypes(),
        fetchItems(),
        fetchModifierGroups(),
        fetchModifiers(),
        fetchItemModifierGroups(),
        fetchInventory(),
        fetchItemRecipes(),
      ]);

      const sortedCats = Array.isArray(cats)
        ? [...cats].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      setCategoriesList(sortedCats);

      const sortedTypes = Array.isArray(types)
        ? [...types].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      setItemTypesList(sortedTypes);

      const sortedItems = Array.isArray(itms)
        ? [...itms].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      setItemsList(sortedItems);

      const sortedModGroups = Array.isArray(modGroups)
        ? [...modGroups].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      setModifierGroupsList(sortedModGroups);

      const sortedMods = Array.isArray(mods)
        ? [...mods].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        : [];
      setModifiersList(sortedMods);

      setItemModGroupMappings(mappings || []);
      setInventoryList(inv || []);
      setItemRecipesList(recipes || []);

      if (sortedCats.length > 0) setSelectedCatId(sortedCats[0].id);
      if (sortedTypes.length > 0) setSelectedTypeId(sortedTypes[0].id);
      if (sortedModGroups.length > 0) setSelectedGroupForMod(sortedModGroups[0].id);
    } catch (err) {
      setErrorMsg('Error connecting to Supabase: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CATEGORY HANDLERS ====================
  const handleAddCategory = async () => {
    const trimmed = catName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter a Category Name.');
      return;
    }
    const exists = categoriesList.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'A category with this name already exists.');
      return;
    }

    setLoadingText('Saving Category...');
    setLoading(true);
    try {
      const created = await createCategory({ name: trimmed });
      setCategoriesList((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setCatName('');
      setActiveTab('list');
      triggerToast('Category saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setEditCatName(cat.name || '');
    setEditCatActive(cat.is_active !== false);
  };

  const handleSaveCategoryEdit = async () => {
    const trimmed = editCatName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter a Category Name.');
      return;
    }
    setLoadingText('Saving Category...');
    setLoading(true);
    try {
      const updated = await updateCategory(editingCategory.id, {
        name: trimmed,
        is_active: editCatActive,
      });
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated, name: trimmed, is_active: editCatActive } : c))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setEditingCategory(null);
      triggerToast('Category saved successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategoryConfirm = (cat) => {
    Alert.alert('Delete Category', `Are you sure you want to delete category "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingText('Saving Category...');
          setLoading(true);
          try {
            await deleteCategory(cat.id);
            setCategoriesList((prev) => prev.filter((c) => c.id !== cat.id));
            triggerToast('Category deleted successfully!');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ==================== ITEM TYPE HANDLERS ====================
  const handleAddItemType = async () => {
    const trimmed = typeName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter an Item Type Name.');
      return;
    }
    const exists = itemTypesList.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'An item type with this name already exists.');
      return;
    }

    setLoadingText('Saving Item Type...');
    setLoading(true);
    try {
      const created = await createItemType({ name: trimmed, color: typeColor });
      setItemTypesList((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setTypeName('');
      setTypeColor(null);
      setActiveTab('list');
      triggerToast('Item Type saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditItemType = (typeObj) => {
    setEditingItemType(typeObj);
    setEditTypeName(typeObj.name || '');
    setEditTypeColor(typeObj.color || null);
  };

  const handleSaveItemTypeEdit = async () => {
    const trimmed = editTypeName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter an Item Type Name.');
      return;
    }
    setLoadingText('Saving Item Type...');
    setLoading(true);
    try {
      const updated = await updateItemType(editingItemType.id, { name: trimmed, color: editTypeColor });
      setItemTypesList((prev) =>
        prev.map((t) => (t.id === editingItemType.id ? { ...t, ...updated, name: trimmed, color: editTypeColor } : t))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setEditingItemType(null);
      triggerToast('Item Type saved successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItemTypeConfirm = (typeObj) => {
    Alert.alert('Delete Item Type', `Are you sure you want to delete item type "${typeObj.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingText('Saving Item Type...');
          setLoading(true);
          try {
            await deleteItemType(typeObj.id);
            setItemTypesList((prev) => prev.filter((t) => t.id !== typeObj.id));
            triggerToast('Item Type deleted successfully!');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ==================== MODIFIER GROUP HANDLERS ====================
  const handleAddModifierGroup = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Modifier Group Name.');
      return;
    }
    const exists = modifierGroupsList.some((g) => g.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'A modifier group with this name already exists.');
      return;
    }

    setLoadingText('Saving Modifier Group...');
    setLoading(true);
    try {
      const created = await createModifierGroup({
        name: trimmed,
        min_selection: Number(groupMin) || 0,
        max_selection: Number(groupMax) || 1,
      });
      setModifierGroupsList((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      if (!selectedGroupForMod) setSelectedGroupForMod(created.id);
      setGroupName('');
      setActiveTab('list');
      triggerToast('Modifier Group saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModifierGroup = (group) => {
    setEditingModGroup(group);
    setEditGroupName(group.name || '');
    setEditGroupMin(String(group.min_selection ?? 0));
    setEditGroupMax(String(group.max_selection ?? 1));
  };

  const handleSaveModifierGroupEdit = async () => {
    const trimmed = editGroupName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Modifier Group Name.');
      return;
    }
    setLoadingText('Saving Modifier Group...');
    setLoading(true);
    try {
      const updated = await updateModifierGroup(editingModGroup.id, {
        name: trimmed,
        min_selection: Number(editGroupMin) || 0,
        max_selection: Number(editGroupMax) || 1,
      });
      setModifierGroupsList((prev) =>
        prev.map((g) => (g.id === editingModGroup.id ? { ...g, ...updated, name: trimmed, min_selection: Number(editGroupMin) || 0, max_selection: Number(editGroupMax) || 1 } : g))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setEditingModGroup(null);
      triggerToast('Modifier Group updated!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModifierChoice = async () => {
    const trimmed = modName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Option/Flavor Name.');
      return;
    }
    if (!selectedGroupForMod) {
      Alert.alert('Required Field Missing', 'Please select a Modifier Group.');
      return;
    }
    const exists = modifiersList.some(
      (m) =>
        String(m.group_id) === String(selectedGroupForMod) &&
        m.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      Alert.alert('Duplicate Name', 'An option/flavor with this name already exists in this group.');
      return;
    }

    setLoadingText('Saving Modifier...');
    setLoading(true);
    try {
      const created = await createModifier({
        group_id: selectedGroupForMod,
        name: trimmed,
        extra_price: Number(modExtraPrice) || 0,
        color: modColor,
      });
      setModifiersList((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setModName('');
      setModExtraPrice('0');
      setModColor(null);
      setActiveTab('list');
      triggerToast('Modifier Choice saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModifierChoice = (mod) => {
    setEditingModifier(mod);
    setEditModName(mod.name || '');
    setEditModExtraPrice(String(mod.extra_price || 0));
    setEditModColor(mod.color || null);
  };

  const handleSaveModifierChoiceEdit = async () => {
    const trimmed = editModName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter Option Name.');
      return;
    }
    setLoadingText('Saving Modifier...');
    setLoading(true);
    try {
      const updated = await updateModifier(editingModifier.id, {
        name: trimmed,
        extra_price: Number(editModExtraPrice) || 0,
        color: editModColor,
      });
      setModifiersList((prev) =>
        prev.map((m) => (m.id === editingModifier.id ? { ...m, ...updated, name: trimmed, extra_price: Number(editModExtraPrice) || 0, color: editModColor } : m))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setEditingModifier(null);
      triggerToast('Modifier saved successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModifierChoiceConfirm = (mod) => {
    Alert.alert('Delete Option', `Are you sure you want to delete option "${mod.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingText('Saving Modifier...');
          setLoading(true);
          try {
            await deleteModifier(mod.id);
            setModifiersList((prev) => prev.filter((m) => m.id !== mod.id));
            triggerToast('Modifier Option deleted!');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleDeleteModifierGroupConfirm = (group) => {
    Alert.alert('Delete Modifier Group', `Are you sure you want to delete modifier group "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingText('Saving Modifier Group...');
          setLoading(true);
          try {
            await deleteModifierGroup(group.id);
            setModifierGroupsList((prev) => prev.filter((g) => g.id !== group.id));
            setModifiersList((prev) => prev.filter((m) => String(m.group_id) !== String(group.id)));
            triggerToast('Modifier Group deleted!');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ==================== ITEM PRODUCT HANDLERS ====================
  const toggleModGroupLink = (groupId) => {
    setSelectedModGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const toggleEditModGroupLink = (groupId) => {
    setEditSelectedModGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleAddItemProduct = async () => {
    const trimmed = itemName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter a Product Item Name.');
      return;
    }
    if (!selectedCatId) {
      Alert.alert('Required Field Missing', 'Please select a Category.');
      return;
    }

    const exists = itemsList.some((i) => i.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      Alert.alert('Duplicate Name', 'An item with this product name already exists.');
      return;
    }

    const parsedPrice = Number(itemPrice) || 0;
    const parsedCost = Number(itemCost) || 0;
    const typeObj = itemTypesList.find((t) => String(t.id) === String(selectedTypeId));
    const itemTypeStr = typeObj ? typeObj.name : 'General';

    const descText = itemDesc.trim();
    const finalDesc = descText ? `${itemIcon} ${descText}` : itemIcon;

    setLoadingText('Saving Item...');
    setLoading(true);
    try {
      const created = await createItem({
        name: trimmed,
        price: parsedPrice,
        cost_amount: parsedCost,
        type: itemTypeStr,
        category_id: selectedCatId,
        item_type_id: selectedTypeId,
        description: finalDesc,
      });

      if (created && created.id) {
        if (selectedModGroupIds.length > 0) {
          await setItemModifierGroups(created.id, selectedModGroupIds);
        }
      }

      setItemsList((prev) => [...prev, created].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setItemName('');
      setItemPrice('');
      setItemCost('0.00');
      setItemDesc('');
      setSelectedModGroupIds([]);
      setActiveTab('list');
      triggerToast('Item saved successfully!');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditItem = (item) => {
    setEditingItem(item);
    setEditItemName(item.name || '');
    setEditItemPrice(String(item.price || 0));
    setEditItemCost(String(item.cost_amount || 0));

    const rawDesc = item.description || '🍗';
    const parts = rawDesc.split(' ');
    const firstPart = parts[0];
    if (PRESET_ICONS.includes(firstPart)) {
      setEditItemIcon(firstPart);
      setEditItemDesc(parts.slice(1).join(' '));
    } else {
      setEditItemIcon('🍗');
      setEditItemDesc(rawDesc);
    }

    setEditSelectedCatId(item.category_id || (categoriesList[0] ? categoriesList[0].id : null));
    setEditSelectedTypeId(item.item_type_id || (itemTypesList[0] ? itemTypesList[0].id : null));

    const linkedGroups = itemModGroupMappings
      .filter((m) => String(m.item_id) === String(item.id))
      .map((m) => m.modifier_group_id);
    setEditSelectedModGroupIds(linkedGroups);
  };

  const handleSaveItemEdit = async () => {
    const trimmed = editItemName.trim();
    if (!trimmed) {
      Alert.alert('Required Field Missing', 'Please enter a Product Item Name.');
      return;
    }
    if (!editSelectedCatId) {
      Alert.alert('Required Field Missing', 'Please select a Category.');
      return;
    }

    const typeObj = itemTypesList.find((t) => String(t.id) === String(editSelectedTypeId));
    const itemTypeStr = typeObj ? typeObj.name : 'General';

    const descText = editItemDesc.trim();
    const finalDesc = descText ? `${editItemIcon} ${descText}` : editItemIcon;

    setLoadingText('Saving Item...');
    setLoading(true);
    try {
      const updated = await updateItem(editingItem.id, {
        name: trimmed,
        price: Number(editItemPrice) || 0,
        cost_amount: Number(editItemCost) || 0,
        type: itemTypeStr,
        category_id: editSelectedCatId,
        item_type_id: editSelectedTypeId,
        description: finalDesc,
      });

      await setItemModifierGroups(editingItem.id, editSelectedModGroupIds);

      await loadAllData();
      setEditingItem(null);
      triggerToast('Item saved successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItemConfirm = (item) => {
    Alert.alert('Delete Item Product', `Are you sure you want to delete product "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoadingText('Saving Item...');
          setLoading(true);
          try {
            await deleteItem(item.id);
            setItemsList((prev) => prev.filter((i) => i.id !== item.id));
            triggerToast('Item product deleted!');
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const filteredItemsList = (itemsList || [])
    .filter((item) => {
      if (filterCatId !== 'all' && String(item.category_id) !== String(filterCatId)) {
        return false;
      }
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* 1. Submenu Chips Selector Bar */}
        <View style={[styles.submenuChipBar, cardBgStyle]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { id: 'items', label: '📦 Items' },
              { id: 'categories', label: '🏷️ Categories' },
              { id: 'item_types', label: '🎯 Item Types' },
              { id: 'modifiers', label: '🎛️ Modifiers' },
            ].map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subChip, activeSubmenu === sub.id && styles.subChipActive]}
                onPress={() => {
                  setActiveSubmenu(sub.id);
                  setActiveTab('list');
                }}
              >
                <Text style={[styles.subChipText, activeSubmenu === sub.id && styles.subChipTextActive]}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 2. Directory List vs Add Entry Tab Bar for Active Submenu */}
        <View style={styles.tabNavContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'list' && styles.tabBtnActive]}
            onPress={() => setActiveTab('list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'list' && styles.tabBtnTextActive]}>
              📋 Directory List
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'add' && styles.tabBtnActive]}
            onPress={() => setActiveTab('add')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === 'add' && styles.tabBtnTextActive]}>
              ➕ Add New Entry
            </Text>
          </TouchableOpacity>
        </View>

        {/* ==================== SUBMENU 1: ITEMS ==================== */}
        {activeSubmenu === 'items' && (
          activeTab === 'list' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.filterRow}>
                <TextInput
                  style={[styles.searchInput, cardBgStyle, titleTextStyle]}
                  placeholder="🔍 Search items..."
                  placeholderTextColor="#94A3B8"
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                />
              </View>

              {filteredItemsList.map((item) => {
                const catObj = categoriesList.find((c) => String(c.id) === String(item.category_id));
                const typeObj = itemTypesList.find((t) => String(t.id) === String(item.item_type_id));

                return (
                  <View key={item.id} style={[styles.dataRow, cardBgStyle]}>
                    <View style={styles.dataRowInfo}>
                      <Text style={[styles.dataRowName, titleTextStyle]}>{item.name}</Text>
                      <Text style={[styles.dataRowSub, subTextStyle]}>
                        Cat: {catObj ? catObj.name : 'Uncategorized'} • Type: {typeObj ? typeObj.name : item.type || 'General'}
                      </Text>
                      <Text style={styles.priceText}>
                        Price: ₱{Number(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Cost: ₱{Number(item.cost_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditItem(item)} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItemConfirm(item)} activeOpacity={0.7} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>Add New Item Product</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Item Product Name *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. 6 Pc. Chicken"
                    placeholderTextColor="#94A3B8"
                    value={itemName}
                    onChangeText={setItemName}
                  />
                </View>

                {/* Requirement 3: Emoji Field for Add Product Item Form */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Emoji Icon *:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {PRESET_ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        style={[styles.selectChip, itemIcon === icon && styles.selectChipActive]}
                        onPress={() => setItemIcon(icon)}
                      >
                        <Text style={styles.selectChipText}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Description / Details (Optional):</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. Crispy fried chicken bucket"
                    placeholderTextColor="#94A3B8"
                    value={itemDesc}
                    onChangeText={setItemDesc}
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.colHalf}>
                    <Text style={[styles.fieldLabel, subTextStyle]}>Selling Price (₱) *:</Text>
                    <TextInput
                      style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={itemPrice}
                      onChangeText={setItemPrice}
                    />
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={[styles.fieldLabel, subTextStyle]}>Product Cost (₱) *:</Text>
                    <TextInput
                      style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={itemCost}
                      onChangeText={setItemCost}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Category *:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {(categoriesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.selectChip, selectedCatId === c.id && styles.selectChipActive]}
                        onPress={() => setSelectedCatId(c.id)}
                      >
                        <Text style={[styles.selectChipText, selectedCatId === c.id && styles.selectChipTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Item Type *:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {(itemTypesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.selectChip, selectedTypeId === t.id && styles.selectChipActive]}
                        onPress={() => setSelectedTypeId(t.id)}
                      >
                        <Text style={[styles.selectChipText, selectedTypeId === t.id && styles.selectChipTextActive]}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Link Modifier Groups:</Text>
                  <View style={styles.modGroupCheckGrid}>
                    {(modifierGroupsList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((mg) => {
                      const isChecked = selectedModGroupIds.includes(mg.id);
                      return (
                        <TouchableOpacity
                          key={mg.id}
                          style={[styles.checkChip, isChecked && styles.checkChipActive]}
                          onPress={() => toggleModGroupLink(mg.id)}
                        >
                          <Text style={[styles.checkChipText, isChecked && styles.checkChipTextActive]}>
                            {isChecked ? '✓ ' : ''}{mg.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddItemProduct} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Save Product Item</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )
        )}

        {/* ==================== SUBMENU 2: CATEGORIES (Alphabetically Sorted) ==================== */}
        {activeSubmenu === 'categories' && (
          activeTab === 'list' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {(categoriesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((cat) => (
                <View key={cat.id} style={[styles.dataRow, cardBgStyle]}>
                  <View style={styles.dataRowInfo}>
                    <Text style={[styles.dataRowName, titleTextStyle]}>{cat.name}</Text>
                    <Text style={[styles.dataRowSub, subTextStyle]}>
                      Status: {cat.is_active !== false ? '🟢 Active' : '🔴 Inactive'}
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditCategory(cat)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCategoryConfirm(cat)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>Add New Category</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Category Name *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. Buckets, Beverages, Sides"
                    placeholderTextColor="#94A3B8"
                    value={catName}
                    onChangeText={setCatName}
                  />
                </View>

                <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddCategory} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Save Category</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )
        )}

        {/* ==================== SUBMENU 3: ITEM TYPES (Alphabetically Sorted) ==================== */}
        {activeSubmenu === 'item_types' && (
          activeTab === 'list' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {(itemTypesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((t) => (
                <View key={t.id} style={[styles.dataRow, cardBgStyle]}>
                  <View style={styles.dataRowInfo}>
                    <View style={styles.rowTypeBadgeGroup}>
                      {t.color ? <View style={[styles.colorIndicatorPill, { backgroundColor: t.color }]} /> : null}
                      <Text style={[styles.dataRowName, titleTextStyle]}>{t.name}</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditItemType(t)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItemTypeConfirm(t)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>Add New Item Type</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Item Type Name *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. Prepared Food, Retail Item"
                    placeholderTextColor="#94A3B8"
                    value={typeName}
                    onChangeText={setTypeName}
                  />
                </View>

                {/* Color Swatch Picker */}
                <View style={styles.colorPickerBlock}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Type Badge Color (Optional):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.swatchCircle, !typeColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                      onPress={() => setTypeColor(null)}
                    >
                      <Text style={styles.clearSwatchText}>✕</Text>
                    </TouchableOpacity>

                    {PRESET_LIGHT_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, typeColor === item.hex && styles.swatchActive]}
                        onPress={() => setTypeColor(item.hex)}
                      />
                    ))}
                  </ScrollView>

                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle, { marginTop: 6 }]}
                    placeholder="e.g. #DBEAFE or leave empty for default"
                    placeholderTextColor="#94A3B8"
                    value={typeColor || ''}
                    onChangeText={setTypeColor}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddItemType} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Save Item Type</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )
        )}

        {/* ==================== SUBMENU 4: MODIFIERS (Alphabetically Sorted) ==================== */}
        {activeSubmenu === 'modifiers' && (
          activeTab === 'list' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {(modifierGroupsList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((group) => {
                const groupMods = (modifiersList || [])
                  .filter((m) => String(m.group_id) === String(group.id))
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                return (
                  <View key={group.id} style={[styles.cardSection, cardBgStyle]}>
                    <View style={styles.groupHeaderRow}>
                      <View style={styles.flexOne}>
                        <Text style={[styles.cardTitle, titleTextStyle]}>{group.name}</Text>
                        <Text style={[styles.cardSubtitle, subTextStyle]}>
                          Rules: Min {group.min_selection || 0}, Max {group.max_selection || 1}
                        </Text>
                      </View>

                      {/* Requirement 3: Edit Modifier Group Button */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditModifierGroup(group)}>
                          <Text style={styles.editBtnText}>Edit Group</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteModifierGroupConfirm(group)}>
                          <Text style={styles.deleteBtnText}>Delete Group</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.fieldLabel, subTextStyle]}>Modifier Choices ({groupMods.length}):</Text>
                    {groupMods.map((mod) => (
                      <View key={mod.id} style={styles.modChoiceRow}>
                        <View style={styles.rowModNameGroup}>
                          {mod.color ? <View style={[styles.colorIndicatorPill, { backgroundColor: mod.color }]} /> : null}
                          <Text style={[styles.modChoiceName, titleTextStyle]}>
                            • {mod.name} {Number(mod.extra_price) > 0 ? `(+₱${Number(mod.extra_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
                          </Text>
                        </View>

                        <View style={styles.actionRow}>
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditModifierChoice(mod)}>
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteModifierChoiceConfirm(mod)}>
                            <Text style={styles.deleteBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Form 1: Add New Modifier Group */}
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>1. Add New Modifier Group</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Modifier Group Name *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. Flavors, Drinks Option"
                    placeholderTextColor="#94A3B8"
                    value={groupName}
                    onChangeText={setGroupName}
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.colHalf}>
                    <Text style={[styles.fieldLabel, subTextStyle]}>Min Selection *:</Text>
                    <TextInput
                      style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                      keyboardType="numeric"
                      value={groupMin}
                      onChangeText={setGroupMin}
                    />
                  </View>

                  <View style={styles.colHalf}>
                    <Text style={[styles.fieldLabel, subTextStyle]}>Max Selection *:</Text>
                    <TextInput
                      style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                      keyboardType="numeric"
                      value={groupMax}
                      onChangeText={setGroupMax}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddModifierGroup} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Save Modifier Group</Text>
                </TouchableOpacity>
              </View>

              {/* Form 2: Add Choice Option to Group */}
              <View style={[styles.cardSection, cardBgStyle]}>
                <Text style={[styles.cardTitle, titleTextStyle]}>2. Add Modifier Choice Option</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Select Group *:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {(modifierGroupsList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((g) => (
                      <TouchableOpacity
                        key={g.id}
                        style={[styles.selectChip, selectedGroupForMod === g.id && styles.selectChipActive]}
                        onPress={() => setSelectedGroupForMod(g.id)}
                      >
                        <Text style={[styles.selectChipText, selectedGroupForMod === g.id && styles.selectChipTextActive]}>
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Option / Flavor Name *:</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="e.g. Honey Garlic, Teriyaki, Extra Cheese"
                    placeholderTextColor="#94A3B8"
                    value={modName}
                    onChangeText={setModName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Extra Price Addition (₱):</Text>
                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle]}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={modExtraPrice}
                    onChangeText={setModExtraPrice}
                  />
                </View>

                {/* Color Swatch Picker */}
                <View style={styles.colorPickerBlock}>
                  <Text style={[styles.fieldLabel, subTextStyle]}>Badge / Option Color (Optional):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.swatchCircle, !modColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                      onPress={() => setModColor(null)}
                    >
                      <Text style={styles.clearSwatchText}>✕</Text>
                    </TouchableOpacity>

                    {PRESET_LIGHT_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.hex}
                        style={[styles.swatchCircle, { backgroundColor: item.hex }, modColor === item.hex && styles.swatchActive]}
                        onPress={() => setModColor(item.hex)}
                      />
                    ))}
                  </ScrollView>

                  <TextInput
                    style={[styles.textInputFull, cardBgStyle, titleTextStyle, { marginTop: 6 }]}
                    placeholder="e.g. #DCFCE7 or leave empty for default"
                    placeholderTextColor="#94A3B8"
                    value={modColor || ''}
                    onChangeText={setModColor}
                    autoCapitalize="characters"
                  />
                </View>

                <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddModifierChoice} activeOpacity={0.8}>
                  <Text style={styles.addBtnText}>+ Save Modifier Choice</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )
        )}

        {/* MODAL: EDIT CATEGORY */}
        <Modal visible={!!editingCategory} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.modalTitle}>Edit Category</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editCatName}
                  onChangeText={setEditCatName}
                  placeholder="Category Name"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Is Active:</Text>
                  <Switch value={editCatActive} onValueChange={setEditCatActive} />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingCategory(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategoryEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT ITEM TYPE WITH COLOR PICKER */}
        <Modal visible={!!editingItemType} transparent animationType="fade" onRequestClose={() => setEditingItemType(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.modalTitle}>Edit Item Type</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editTypeName}
                  onChangeText={setEditTypeName}
                  placeholder="Item Type Name"
                />

                <Text style={styles.fieldLabel}>Type Badge Color:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.swatchCircle, !editTypeColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => setEditTypeColor(null)}
                  >
                    <Text style={styles.clearSwatchText}>✕</Text>
                  </TouchableOpacity>

                  {PRESET_LIGHT_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.hex}
                      style={[styles.swatchCircle, { backgroundColor: item.hex }, editTypeColor === item.hex && styles.swatchActive]}
                      onPress={() => setEditTypeColor(item.hex)}
                    />
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.modalTextInput}
                  value={editTypeColor || ''}
                  onChangeText={setEditTypeColor}
                  placeholder="Hex color e.g. #DBEAFE"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingItemType(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItemTypeEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT MODIFIER GROUP (Requirement 3) */}
        <Modal visible={!!editingModGroup} transparent animationType="fade" onRequestClose={() => setEditingModGroup(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.modalTitle}>Edit Modifier Group</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Group Name *:</Text>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editGroupName}
                    onChangeText={setEditGroupName}
                    placeholder="Group Name"
                  />
                </View>
                <View style={styles.twoColRow}>
                  <View style={styles.colHalf}>
                    <Text style={styles.fieldLabel}>Min Selection:</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      keyboardType="numeric"
                      value={editGroupMin}
                      onChangeText={setEditGroupMin}
                    />
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={styles.fieldLabel}>Max Selection:</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      keyboardType="numeric"
                      value={editGroupMax}
                      onChangeText={setEditGroupMax}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingModGroup(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveModifierGroupEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT MODIFIER CHOICE WITH COLOR PICKER */}
        <Modal visible={!!editingModifier} transparent animationType="fade" onRequestClose={() => setEditingModifier(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.editModalCard}>
                <Text style={styles.modalTitle}>Edit Modifier Option</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editModName}
                  onChangeText={setEditModName}
                  placeholder="Option Name"
                />
                <TextInput
                  style={styles.modalTextInput}
                  value={editModExtraPrice}
                  onChangeText={setEditModExtraPrice}
                  keyboardType="numeric"
                  placeholder="Extra Price (₱)"
                />

                <Text style={styles.fieldLabel}>Option / Badge Color:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.swatchCircle, !editModColor && styles.swatchActive, { backgroundColor: '#FFFFFF' }]}
                    onPress={() => setEditModColor(null)}
                  >
                    <Text style={styles.clearSwatchText}>✕</Text>
                  </TouchableOpacity>

                  {PRESET_LIGHT_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.hex}
                      style={[styles.swatchCircle, { backgroundColor: item.hex }, editModColor === item.hex && styles.swatchActive]}
                      onPress={() => setEditModColor(item.hex)}
                    />
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.modalTextInput}
                  value={editModColor || ''}
                  onChangeText={setEditModColor}
                  placeholder="Hex color e.g. #DCFCE7"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingModifier(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveModifierChoiceEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* MODAL: EDIT ITEM PRODUCT */}
        <Modal visible={!!editingItem} transparent animationType="fade" onRequestClose={() => setEditingItem(null)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <ScrollView contentContainerStyle={styles.modalScrollContainer}>
                <View style={styles.editModalCardLarge}>
                  <Text style={styles.modalTitle}>Edit Product Item</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Item Name *:</Text>
                    <TextInput style={styles.textInputFullModal} value={editItemName} onChangeText={setEditItemName} />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Emoji Icon *:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                      {PRESET_ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon}
                          style={[styles.selectChip, editItemIcon === icon && styles.selectChipActive]}
                          onPress={() => setEditItemIcon(icon)}
                        >
                          <Text style={styles.selectChipText}>{icon}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Description / Details (Optional):</Text>
                    <TextInput
                      style={styles.textInputFullModal}
                      value={editItemDesc}
                      onChangeText={setEditItemDesc}
                      placeholder="e.g. Crispy fried chicken bucket"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <Text style={styles.fieldLabel}>Price (₱) *:</Text>
                      <TextInput style={styles.textInputFullModal} keyboardType="numeric" value={editItemPrice} onChangeText={setEditItemPrice} />
                    </View>
                    <View style={styles.colHalf}>
                      <Text style={styles.fieldLabel}>Cost (₱) *:</Text>
                      <TextInput style={styles.textInputFullModal} keyboardType="numeric" value={editItemCost} onChangeText={setEditItemCost} />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Category *:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                      {(categoriesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.selectChip, editSelectedCatId === c.id && styles.selectChipActive]}
                          onPress={() => setEditSelectedCatId(c.id)}
                        >
                          <Text style={[styles.selectChipText, editSelectedCatId === c.id && styles.selectChipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Item Type *:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                      {(itemTypesList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.selectChip, editSelectedTypeId === t.id && styles.selectChipActive]}
                          onPress={() => setEditSelectedTypeId(t.id)}
                        >
                          <Text style={[styles.selectChipText, editSelectedTypeId === t.id && styles.selectChipTextActive]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Linked Modifier Groups:</Text>
                    <View style={styles.modGroupCheckGrid}>
                      {(modifierGroupsList || []).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map((mg) => {
                        const isChecked = editSelectedModGroupIds.includes(mg.id);
                        return (
                          <TouchableOpacity
                            key={mg.id}
                            style={[styles.checkChip, isChecked && styles.checkChipActive]}
                            onPress={() => toggleEditModGroupLink(mg.id)}
                          >
                            <Text style={[styles.checkChipText, isChecked && styles.checkChipTextActive]}>
                              {isChecked ? '✓ ' : ''}{mg.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingItem(null)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItemEdit}>
                      <Text style={styles.saveBtnText}>Save Item</Text>
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
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  submenuChipBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  subChipActive: {
    backgroundColor: '#2563EB',
  },
  subChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  subChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  filterRow: {
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
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
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colHalf: {
    flex: 0.48,
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
  colorPickerBlock: {
    marginTop: 8,
    marginBottom: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  swatchCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  clearSwatchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
  },
  addBtnLarge: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  rowTypeBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicatorPill: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dataRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  dataRowSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 3,
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
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modChoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowModNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modChoiceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  chipRow: {
    flexDirection: 'row',
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectChipActive: {
    backgroundColor: '#2563EB',
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modGroupCheckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  checkChipActive: {
    backgroundColor: '#2563EB',
  },
  checkChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  checkChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  modalTextInput: {
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ItemsScreen;
