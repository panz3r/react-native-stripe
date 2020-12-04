/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import * as React from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { Colors } from './Colors';

export const Header: React.FC<{}> = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={styles.container}>
      <ImageBackground
        accessibilityRole={'image'}
        source={require('./logo.png')}
        style={[
          styles.backgroundLogo,
          {
            backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
          },
        ]}
      />

      <Text
        style={[
          styles.text,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}
      >
        Welcome to
        {'\n'}
        <Text
          style={[
            styles.highlight,
            {
              color: isDarkMode ? Colors.white : Colors.primary,
            },
          ]}
        >
          React Native Stripe
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  backgroundLogo: {
    position: 'absolute',
    top: 0,
    left: -180,
    opacity: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 360,
    width: 360,
  },
  text: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
  },
  highlight: {
    color: Colors.primary,
  },
});
