import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

export const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  if (!visible) return null;
  
  return (
    <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.alertModalOverlay}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                    <View style={styles.alertContent}>
                        <Text style={styles.alertTitle}>{title}</Text>
                        <Text style={styles.alertMessage}>{message}</Text>
                        <View style={[styles.alertButtonContainer, { flexDirection: 'column', alignItems: 'stretch' }]}>
                            {buttons.map((btn, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.alertButton, 
                                        { marginBottom: 10, width: '100%', marginHorizontal: 0 }, // Full width, spacing
                                        btn.style === 'destructive' ? {backgroundColor: '#EF4444'} : (btn.style === 'cancel' ? styles.alertCancelButton : styles.alertConfirmButton)
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

export default CustomAlert;
