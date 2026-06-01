import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../styles/globalStyles';
import theme from '../../styles/theme';

export const CustomAlert = ({ visible, title, message, buttons, onClose, toggle }) => {
  const [toggleOn, setToggleOn] = useState(false);

  const handleClose = () => { setToggleOn(false); onClose?.(); };

  const resolvedButtons = toggle
    ? buttons.map(btn => {
        if (btn._useToggle) return { ...btn, onPress: () => btn.onPress(toggleOn) };
        return btn;
      })
    : buttons;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.alertModalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{title}</Text>
              <Text style={styles.alertMessage}>{message}</Text>

              {toggle && (
                <TouchableOpacity style={a.toggleRow} onPress={() => setToggleOn(v => !v)} activeOpacity={0.7}>
                  <View style={[a.checkbox, toggleOn && a.checkboxOn]}>
                    {toggleOn && <Ionicons name="checkmark" size={13} color="#000" />}
                  </View>
                  <Text style={a.toggleLabel}>{toggle.label}</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.alertButtonContainer, { flexDirection: 'column', alignItems: 'stretch' }]}>
                {resolvedButtons.map((btn, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      { marginBottom: 10, width: '100%', marginHorizontal: 0 },
                      btn.style === 'destructive' ? { backgroundColor: theme.danger } : (btn.style === 'cancel' ? styles.alertCancelButton : styles.alertConfirmButton)
                    ]}
                    onPress={btn.onPress}
                  >
                    <Text style={styles.alertButtonText}>{btn.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const a = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 16,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20, height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: theme.danger,
    borderColor: theme.danger,
  },
  toggleLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontFamily: theme.fontFamily.ui,
    flex: 1,
  },
});

export default CustomAlert;
