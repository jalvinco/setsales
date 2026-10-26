import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import PersonDetailModal from '../components/PersonDetailModal';
import PinModal from '../components/PinModal';
import UserLogsModal from '../components/UserLogsModal';
import { DEFAULT_THEME } from '../utils/themeUtils';
import { fetchRolePermissions, updateRolePermissions } from '../services/supabase';

const PeopleScreen = ({
  people = [],
  logs = [],
  appName = 'SetSales',
  theme = DEFAULT_THEME,
  loggedInUser,
  rolePermissions = [],
  isDarkMode = false,
  onToggleStatus,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onBack,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last15');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);

  // Toast message state
  const [toastMsg, setToastMsg] = useState('');

  // Manage People Modal State inside PeopleScreen (Tabs: 'users' | 'permissions')
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [manageActiveTab, setManageActiveTab] = useState('users'); // 'users' | 'permissions'

  const [newName, setNewName] = useState('');
  const [selectedRole, setSelectedRole] = useState(3);
  const [newRate, setNewRate] = useState('100');
  const [newHalfRate, setNewHalfRate] = useState('50');
  const [newExtraRate, setNewExtraRate] = useState('0');
  const [addError, setAddError] = useState('');

  // Editing Person State
  const [editingPerson, setEditingPerson] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState(3);
  const [editRate, setEditRate] = useState('0');
  const [editHalfRate, setEditHalfRate] = useState('0');
  const [editExtraRate, setEditExtraRate] = useState('0');
  const [editError, setEditError] = useState('');

  // Role Permissions State
  const [rolePermissionsList, setRolePermissionsList] = useState([]);
  const [permissionsSuccessMsg, setPermissionsSuccessMsg] = useState('');

  const isAdminUser = loggedInUser && Number(loggedInUser.role) === 1;

  // Permission Check for Manage Button
  const canManagePeople = () => {
    if (isAdminUser) return true;
    if (loggedInUser) {
      const uRole = Number(loggedInUser.role);
      const permObj = (rolePermissions || []).find((r) => Number(r.role) === uRole);
      return permObj && permObj.people === true;
    }
    return false;
  };

  const hasManageAccess = canManagePeople();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isManageModalVisible) {
      loadPermissionsData();
    }
  }, [isManageModalVisible]);

  const loadPermissionsData = async () => {
    try {
      const data = await fetchRolePermissions();
      setRolePermissionsList(data || []);
    } catch (e) {
      console.warn('Error loading permissions:', e);
    }
  };

  const handleOpenManageConsole = () => {
    if (hasManageAccess) {
      setIsManageModalVisible(true);
    } else {
      setIsPinModalVisible(true);
    }
  };

  const handleTogglePermission = async (roleNumber, featureKey) => {
    const roleObj = rolePermissionsList.find((r) => Number(r.role) === Number(roleNumber));
    if (!roleObj) return;

    const newStatus = !roleObj[featureKey];

    try {
      await updateRolePermissions(roleNumber, { [featureKey]: newStatus });
      setRolePermissionsList((prev) =>
        prev.map((r) =>
          Number(r.role) === Number(roleNumber) ? { ...r, [featureKey]: newStatus } : r
        )
      );
      setPermissionsSuccessMsg(`Permissions updated for Role ${roleNumber}!`);
      setTimeout(() => setPermissionsSuccessMsg(''), 3000);
    } catch (e) {
      Alert.alert('Permission Error', e.message);
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

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

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setIsDetailModalVisible(true);
  };

  const handleStatusToggle = (personId) => {
    const person = people.find((p) => p.id === personId || p.recordId === personId);
    if (!person) return;

    const isLoggedIn = person.status === 'Logged In';
    const actionText = isLoggedIn ? 'Out' : 'In';

    if (onToggleStatus) {
      onToggleStatus(personId);
    }

    triggerToast(`${person.name} has logged ${actionText}.`);
  };

  const validateName = (nameStr) => {
    const trimmed = nameStr.trim();
    if (!trimmed) return 'Name cannot be empty';
    if (trimmed.length > 16) return 'Name cannot exceed 16 characters';
    if (!/^[a-zA-Z0-9]+$/.test(trimmed)) return 'Name must contain only letters and numbers (no spaces or special characters)';
    return null;
  };

  const handleAddPersonAction = () => {
    const trimmed = newName.trim();
    const valErr = validateName(trimmed);
    if (valErr) {
      setAddError(valErr);
      return;
    }

    const exists = people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setAddError('A person with this name already exists');
      return;
    }

    if (onAddPerson) {
      onAddPerson(trimmed, selectedRole, newRate, newHalfRate, newExtraRate);
    }
    setNewName('');
    setAddError('');
    Keyboard.dismiss();
    triggerToast(`${trimmed} added (Default PIN is 000000).`);
  };

  const handleOpenEditPerson = (person) => {
    setEditingPerson(person);
    setEditName(person.name || '');
    setEditRole(Number(person.role) || 3);
    setEditRate(String(person.rate || 0));
    setEditHalfRate(String(person.half_rate || 0));
    setEditExtraRate(String(person.extra_rate || 0));
    setEditError('');
  };

  const handleSaveEditPerson = () => {
    const trimmed = editName.trim();
    const valErr = validateName(trimmed);
    if (valErr) {
      setEditError(valErr);
      return;
    }

    if (onEditPerson) {
      onEditPerson(editingPerson.id, trimmed, editRole, editRate, editHalfRate, editExtraRate);
    }
    setEditingPerson(null);
    triggerToast(`Updated ${trimmed}.`);
  };

  const handleDeletePersonConfirm = (person) => {
    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete "${person.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDeletePerson) onDeletePerson(person.id);
            triggerToast('Person deleted from directory');
          },
        },
      ]
    );
  };

  const loggedInCount = people.filter((p) => p.status === 'Logged In').length;
  const loggedOutCount = people.filter((p) => p.status === 'Logged Out').length;

  const bgStyle = { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' };
  const cardBgStyle = {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderColor: isDarkMode ? '#334155' : '#E2E8F0',
  };
  const titleTextStyle = { color: isDarkMode ? '#F8FAFC' : '#0F172A' };
  const subTextStyle = { color: isDarkMode ? '#CBD5E1' : '#64748B' };

  const renderPersonItem = ({ item }) => {
    const isLoggedIn = item.status === 'Logged In';

    return (
      <TouchableOpacity
        style={[styles.personCard, cardBgStyle]}
        onPress={() => handleSelectPerson(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.avatarCircle,
              isLoggedIn ? styles.avatarCircleIn : styles.avatarCircleOut,
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                isLoggedIn ? styles.avatarTextIn : styles.avatarTextOut,
              ]}
            >
              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={[styles.personName, titleTextStyle]}>{item.name}</Text>
            <Text style={[styles.personMeta, subTextStyle]}>
              Last Log: {item.lastLoginFormatted || item.lastUpdated || 'Never'}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              isLoggedIn ? styles.statusBadgeIn : styles.statusBadgeOut,
            ]}
          >
            <View
              style={[
                styles.statusIndicatorDot,
                isLoggedIn ? styles.dotIn : styles.dotOut,
              ]}
            />
            <Text
              style={[
                styles.statusBadgeText,
                isLoggedIn ? styles.badgeTextIn : styles.badgeTextOut,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dtCardBg = theme?.dateTimeCardBg || (isDarkMode ? '#1E293B' : '#1E293B');
  const dtCardFont = theme?.dateTimeCardFont || '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]}>
      {/* Toast Banner for Login/Logout Status */}
      {toastMsg ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastBannerText}>✅ {toastMsg}</Text>
        </View>
      ) : null}

      {/* Date & Time Widget */}
      <View style={[styles.dateTimeCard, { backgroundColor: dtCardBg }]}>
        <View style={styles.timeHeader}>
          <Text style={[styles.timeLabel, { color: dtCardFont, opacity: 0.8 }]}>TODAY</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Text style={[styles.timeText, { color: dtCardFont }]}>{formatTime(currentTime)}</Text>
        <Text style={[styles.dateText, { color: dtCardFont, opacity: 0.9 }]}>
          {formatDate(currentTime)}
        </Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, cardBgStyle]}>
          <Text style={[styles.statNumber, titleTextStyle]}>{people.length}</Text>
          <Text style={[styles.statLabel, subTextStyle]}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxIn]}>
          <Text style={[styles.statNumber, styles.textGreen]}>{loggedInCount}</Text>
          <Text style={styles.statLabel}>Logged In</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxOut, isDarkMode && styles.statBoxOutDark]}>
          <Text style={[styles.statNumber, styles.textGrey]}>{loggedOutCount}</Text>
          <Text style={styles.statLabel}>Logged Out</Text>
        </View>
      </View>

      {/* People List Section Header with Manage Button on Right Side */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, titleTextStyle]}>People Directory</Text>

        {hasManageAccess ? (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleOpenManageConsole}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonIcon}>🔒</Text>
            <Text style={styles.settingsButtonText}>Manage</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setIsPinModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonIcon}>🔒</Text>
            <Text style={styles.settingsButtonText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* People List */}
      <FlatList
        data={people}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPersonItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, subTextStyle]}>No people added yet.</Text>
            <Text style={[styles.emptySubText, subTextStyle]}>
              Tap Manage (🔒) above to add people to directory.
            </Text>
          </View>
        }
      />

      {/* Person Detail Modal */}
      <PersonDetailModal
        visible={isDetailModalVisible}
        person={selectedPerson}
        onClose={() => setIsDetailModalVisible(false)}
        onToggleStatus={(personId) => {
          setIsDetailModalVisible(false);
          handleStatusToggle(personId);
        }}
        onViewLogsHistory={(person, period) => {
          setSelectedPerson(person);
          setSelectedPeriod(period);
          setIsDetailModalVisible(false);
          setIsLogsModalVisible(true);
        }}
      />

      {/* User Logs Modal for Selected Period */}
      <UserLogsModal
        visible={isLogsModalVisible}
        person={selectedPerson}
        logs={logs}
        period={selectedPeriod}
        onClose={() => setIsLogsModalVisible(false)}
      />

      {/* Security PIN Modal */}
      <PinModal
        visible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={(adminUser) => {
          setIsPinModalVisible(false);
          setIsManageModalVisible(true);
        }}
        users={people}
      />

      {/* MODAL: MANAGE PEOPLE & ROLE PERMISSIONS COMBINED */}
      <Modal visible={isManageModalVisible} transparent animationType="slide" onRequestClose={() => setIsManageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.manageCardLarge}>
            <View style={styles.manageHeaderRow}>
              <Text style={styles.manageModalTitle}>🔒 Management Console</Text>
              <TouchableOpacity style={styles.closeBtnMini} onPress={() => setIsManageModalVisible(false)}>
                <Text style={styles.closeBtnMiniText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Submenu Tabs inside Manage Modal (Role Permissions only for Admin) */}
            <View style={styles.tabNavContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, manageActiveTab === 'users' && styles.tabBtnActive]}
                onPress={() => setManageActiveTab('users')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, manageActiveTab === 'users' && styles.tabBtnTextActive]}>
                  👥 Directory Users
                </Text>
              </TouchableOpacity>

              {isAdminUser ? (
                <TouchableOpacity
                  style={[styles.tabBtn, manageActiveTab === 'permissions' && styles.tabBtnActive]}
                  onPress={() => setManageActiveTab('permissions')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabBtnText, manageActiveTab === 'permissions' && styles.tabBtnTextActive]}>
                    🔒 Role Permissions
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              style={styles.manageScroll}
              contentContainerStyle={styles.scrollInnerContent}
              showsVerticalScrollIndicator={true}
            >
              {/* TAB 1: DIRECTORY USERS MANAGEMENT */}
              {manageActiveTab === 'users' && (
                <View>
                  {/* Add Form */}
                  <View style={styles.addCardSection}>
                    <Text style={styles.cardTitle}>Add New Person</Text>

                    <View style={styles.defaultPinBanner}>
                      <Text style={styles.defaultPinBannerText}>
                        🔑 Notice: Default PIN for new accounts is 000000.
                      </Text>
                    </View>

                    <View style={styles.roleContainer}>
                      <Text style={styles.fieldLabel}>Select Role *:</Text>
                      <View style={styles.roleButtonsRow}>
                        <TouchableOpacity
                          style={[styles.roleBtn, selectedRole === 3 && styles.roleBtnActive]}
                          onPress={() => setSelectedRole(3)}
                        >
                          <Text style={[styles.roleBtnText, selectedRole === 3 && styles.roleBtnTextActive]}>
                            Crew (3)
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.roleBtn, selectedRole === 2 && styles.roleBtnActive]}
                          onPress={() => setSelectedRole(2)}
                        >
                          <Text style={[styles.roleBtnText, selectedRole === 2 && styles.roleBtnTextActive]}>
                            Super (2)
                          </Text>
                        </TouchableOpacity>

                        {/* Admin creation allowed only for Admin */}
                        {isAdminUser ? (
                          <TouchableOpacity
                            style={[styles.roleBtn, selectedRole === 1 && styles.roleBtnActive]}
                            onPress={() => setSelectedRole(1)}
                          >
                            <Text style={[styles.roleBtnText, selectedRole === 1 && styles.roleBtnTextActive]}>
                              Admin (1)
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Full Name (Max 16 chars, letters/numbers only) *:</Text>
                      <TextInput
                        style={styles.textInputFull}
                        placeholder="e.g. John123"
                        placeholderTextColor="#94A3B8"
                        maxLength={16}
                        value={newName}
                        onChangeText={setNewName}
                      />
                    </View>

                    <View style={styles.threeColRow}>
                      <View style={styles.colThird}>
                        <Text style={styles.fieldLabel}>Rate (₱):</Text>
                        <TextInput
                          style={styles.textInputFull}
                          keyboardType="numeric"
                          value={newRate}
                          onChangeText={setNewRate}
                        />
                      </View>
                      <View style={styles.colThird}>
                        <Text style={styles.fieldLabel}>Half (₱):</Text>
                        <TextInput
                          style={styles.textInputFull}
                          keyboardType="numeric"
                          value={newHalfRate}
                          onChangeText={setNewHalfRate}
                        />
                      </View>
                      <View style={styles.colThird}>
                        <Text style={styles.fieldLabel}>Extra (₱):</Text>
                        <TextInput
                          style={styles.textInputFull}
                          keyboardType="numeric"
                          value={newExtraRate}
                          onChangeText={setNewExtraRate}
                        />
                      </View>
                    </View>

                    {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

                    <TouchableOpacity style={styles.addBtnLarge} onPress={handleAddPersonAction}>
                      <Text style={styles.addBtnText}>+ Add Person</Text>
                    </TouchableOpacity>
                  </View>

                  {/* List of Directory Users */}
                  <Text style={styles.directoryListTitle}>Directory Members ({people.length}):</Text>
                  {people.map((p) => (
                    <View key={p.id} style={styles.dirUserRow}>
                      <View style={styles.dirUserInfo}>
                        <Text style={styles.dirUserName}>{p.name}</Text>
                        <Text style={styles.dirUserSub}>
                          Role: {Number(p.role) === 1 ? 'Admin (1)' : Number(p.role) === 2 ? 'Super Crew (2)' : 'Crew (3)'} • ₱{p.rate || 0}/hr
                        </Text>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditPerson(p)}>
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePersonConfirm(p)}>
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* TAB 2: ROLE PERMISSIONS MANAGEMENT (Only for Admin) */}
              {manageActiveTab === 'permissions' && isAdminUser && (
                <View style={styles.permissionsTabContainer}>
                  <Text style={styles.cardTitle}>🔒 Role Permissions Settings</Text>
                  <Text style={styles.cardSubtitle}>
                    Configure module access permissions for Super Crew (2) and Crew (3). Admin (1) always has full access.
                  </Text>

                  {[2, 3].map((roleNum) => {
                    const roleObj = rolePermissionsList.find((r) => Number(r.role) === roleNum) || {};
                    const roleLabel = roleNum === 2 ? 'Super Crew (Role 2)' : 'Crew (Role 3)';

                    return (
                      <View key={roleNum} style={styles.permRoleBlock}>
                        <Text style={styles.permRoleTitle}>{roleLabel}</Text>

                        {[
                          { key: 'people', label: '👥 People Directory' },
                          { key: 'report', label: '📈 Reports' },
                          { key: 'inventory', label: '📊 Inventory' },
                          { key: 'items', label: '📦 Items Catalog' },
                          { key: 'settings', label: '⚙️ App Settings' },
                          { key: 'refunds', label: '💸 Order Refunds' },
                        ].map((perm) => {
                          const isAllowed = roleObj[perm.key] === true;
                          return (
                            <View key={perm.key} style={styles.permRow}>
                              <Text style={styles.permRowLabel}>{perm.label}</Text>
                              <Switch
                                value={isAllowed}
                                onValueChange={() => handleTogglePermission(roleNum, perm.key)}
                                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                                thumbColor={isAllowed ? '#2563EB' : '#94A3B8'}
                              />
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}

                  {permissionsSuccessMsg ? <Text style={styles.successText}>{permissionsSuccessMsg}</Text> : null}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDIT PERSON DETAILS WITH ROLE SELECTOR */}
      <Modal visible={!!editingPerson} transparent animationType="fade" onRequestClose={() => setEditingPerson(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContainer}>
              <Text style={styles.editModalTitle}>Edit Person Details</Text>

              <View style={styles.roleContainer}>
                <Text style={styles.fieldLabel}>Role *:</Text>
                <View style={styles.roleButtonsRow}>
                  <TouchableOpacity
                    style={[styles.roleBtn, editRole === 3 && styles.roleBtnActive]}
                    onPress={() => setEditRole(3)}
                  >
                    <Text style={[styles.roleBtnText, editRole === 3 && styles.roleBtnTextActive]}>
                      Crew (3)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleBtn, editRole === 2 && styles.roleBtnActive]}
                    onPress={() => setEditRole(2)}
                  >
                    <Text style={[styles.roleBtnText, editRole === 2 && styles.roleBtnTextActive]}>
                      Super (2)
                    </Text>
                  </TouchableOpacity>

                  {isAdminUser ? (
                    <TouchableOpacity
                      style={[styles.roleBtn, editRole === 1 && styles.roleBtnActive]}
                      onPress={() => setEditRole(1)}
                    >
                      <Text style={[styles.roleBtnText, editRole === 1 && styles.roleBtnTextActive]}>
                        Admin (1)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Full Name (Max 16 chars, letters/numbers only) *:</Text>
                <TextInput
                  style={styles.textInputFull}
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={16}
                />
              </View>

              <View style={styles.threeColRow}>
                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Rate (₱):</Text>
                  <TextInput
                    style={styles.textInputFull}
                    keyboardType="numeric"
                    value={editRate}
                    onChangeText={setEditRate}
                  />
                </View>
                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Half (₱):</Text>
                  <TextInput
                    style={styles.textInputFull}
                    keyboardType="numeric"
                    value={editHalfRate}
                    onChangeText={setEditHalfRate}
                  />
                </View>
                <View style={styles.colThird}>
                  <Text style={styles.fieldLabel}>Extra (₱):</Text>
                  <TextInput
                    style={styles.textInputFull}
                    keyboardType="numeric"
                    value={editExtraRate}
                    onChangeText={setEditExtraRate}
                  />
                </View>
              </View>

              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingPerson(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEditPerson}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  settingsButtonIcon: {
    fontSize: 15,
    marginRight: 5,
  },
  settingsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  userSessionButton: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  userSessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  toastBanner: {
    backgroundColor: '#DCFCE7',
    borderBottomWidth: 1,
    borderBottomColor: '#86EFAC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  toastBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  dateTimeCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 12,
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxIn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statBoxOut: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  statBoxOutDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  textGreen: {
    color: '#059669',
  },
  textGrey: {
    color: '#64748B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  personCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleIn: {
    backgroundColor: '#D1FAE5',
  },
  avatarCircleOut: {
    backgroundColor: '#F1F5F9',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  avatarTextIn: {
    color: '#047857',
  },
  avatarTextOut: {
    color: '#64748B',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  personMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardRight: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
  },
  statusBadgeIn: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeOut: {
    backgroundColor: '#F1F5F9',
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dotIn: {
    backgroundColor: '#16A34A',
  },
  dotOut: {
    backgroundColor: '#9CA3AF',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextIn: {
    color: '#15803D',
  },
  badgeTextOut: {
    color: '#4B5563',
  },
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manageCardLarge: {
    width: '100%',
    maxWidth: 360,
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  manageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtnMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnMiniText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  tabNavContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
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
  manageScroll: {
    flex: 1,
  },
  scrollInnerContent: {
    paddingBottom: 40,
  },
  permissionsTabContainer: {
    paddingBottom: 20,
  },
  addCardSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  defaultPinBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  defaultPinBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  roleContainer: {
    marginBottom: 10,
  },
  roleButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roleBtn: {
    flex: 1,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  roleBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 10,
  },
  threeColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colThird: {
    flex: 0.31,
  },
  textInputFull: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addBtnLarge: {
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  directoryListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  dirUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dirUserInfo: {
    flex: 1,
  },
  dirUserName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dirUserSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  permRoleBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permRoleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  permRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  permRowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  successText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    marginBottom: 8,
  },
  editModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
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

export default PeopleScreen;
