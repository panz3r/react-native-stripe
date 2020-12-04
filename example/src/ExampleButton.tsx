import * as React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from './Colors';

export interface ExampleButtonProps {
  disabled?: boolean;

  onPress: () => void;

  title: string;
}

export const ExampleButton: React.FC<ExampleButtonProps> = ({
  disabled,
  onPress,
  title,
}) => {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? Colors.primaryDark : Colors.primary,
        },
        styles.pressable,
      ]}
    >
      <Text style={styles.text}>{title.toUpperCase()}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
