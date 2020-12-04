import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';

import { ReactNativeStripe } from '@panz3r/react-native-stripe';
import type {
  RNStripeAddress,
  RNStripeEphemeralKeyProviderFn,
  RNStripePaymentContextSnapshot,
  RNStripePaymentOption,
  RNStripeShippingMethod,
  RNStripeTheme,
} from '@panz3r/react-native-stripe';

import { Colors } from './Colors';
import { ExampleButton } from './ExampleButton';
import { Header } from './Header';

const ephemeralKeyProviderFn: RNStripeEphemeralKeyProviderFn = async (
  options
) => {
  console.log('ephemeralKeyProviderFn called', options);
  const res = await fetch('<YOUR-STRIPE-SERVER-URL>/ephemeral_keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  return await res.json();
};

const paymentIntentClientSecretProviderFn = async (): Promise<string> => {
  console.log('paymentIntentClientSecretProviderFn called');
  const res = await fetch('<YOUR-STRIPE-SERVER-URL>/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return await res.json();
};

const publishableKey = '<YOUR-STRIPE-PUBLISHABLE-KEY>';

const testStripeTheme: RNStripeTheme = {
  primaryForegroundColor: Colors.primaryDark,
  accentColor: Colors.primary,
};

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const [paymentMethod, setPaymentMethod] = useState<RNStripePaymentOption>();
  const [shippingAddress, setShippingAddress] = useState<RNStripeAddress>();
  const [
    shippingMethod,
    setShippingMethod,
  ] = useState<RNStripeShippingMethod>();
  const [isReadyToPay, setIsReadyToPay] = useState(false);

  const paymentContextUpdateListener = useCallback(
    (paymentContext: RNStripePaymentContextSnapshot) => {
      console.log('paymentContext', paymentContext);
      setPaymentMethod(paymentContext.paymentMethod);
      setShippingAddress(paymentContext.shippingAddress);
      setShippingMethod(paymentContext.shippingMethod);
      setIsReadyToPay(paymentContext.isPaymentReadyToCharge);
    },
    []
  );

  const shippingAddressValidator = useCallback(
    async (address: RNStripeAddress) => {
      const upsGround: RNStripeShippingMethod = {
        identifier: 'ups_ground',
        label: 'UPS Ground',
        amount: '0',
        detail: 'Arrives in 3-5 days',
      };

      const fedEx: RNStripeShippingMethod = {
        identifier: 'fedex',
        label: 'FedEx',
        amount: '5.99',
        detail: 'Arrives tomorrow',
      };

      if (address.country === 'US') {
        return [upsGround, fedEx];
      } else {
        throw Error("We don't ship outside the US");
      }
    },
    []
  );

  useEffect(() => {
    ReactNativeStripe.init({
      publishableKey,
      theme: testStripeTheme,
    })
      .then((initialized) => {
        console.log('isInitialized?', initialized);
        if (!initialized) {
          return false;
        }

        return ReactNativeStripe.initCustomerContext(ephemeralKeyProviderFn);
      })
      .then((initialized) => {
        console.log('isCustomerContextInitialized?', initialized);
        if (!initialized) {
          return false;
        }

        return ReactNativeStripe.initPaymentContext({
          paymentContextUpdateListener,
          shippingAddressValidator,
          paymentContextOptions: {
            requiredBillingAddressFields: 'none',
            requiredShippingAddressFields: [
              'name',
              // 'emailAddress',
              // 'phoneNumber',
              'postalAddress',
            ],
          },
        });
      })
      .then((initialized) => {
        console.log('isPaymentContextInitialized?', initialized);
        return initialized;
      })
      .catch((err) => {
        console.error('Error during RNStripe initialization', err);
      });
  }, [paymentContextUpdateListener, shippingAddressValidator]);

  const handleChooseCard = useCallback(() => {
    ReactNativeStripe.presentPaymentOptionsView();
  }, []);

  const handleChooseShipping = useCallback(() => {
    ReactNativeStripe.presentShippingView();
  }, []);

  const handlePay = useCallback(async () => {
    try {
      const clientSecret = await paymentIntentClientSecretProviderFn();

      const completed = await ReactNativeStripe.requestPayment(clientSecret);

      console.log('Payment completed', completed);
    } catch (err) {
      console.log('Error during requestPayment call', err);
    }
  }, []);

  const styles = isDarkMode ? darkStyles : lightStyles;

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeAreaView}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}
        >
          <Header />

          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Payment Method</Text>

              <Text style={styles.sectionDescription}>
                Open <Text style={styles.highlight}>Stripe</Text> payment
                options view.
              </Text>

              <ExampleButton
                title="Show Card Picker"
                onPress={handleChooseCard}
              />
            </View>

            {paymentMethod ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionSubTitle}>
                  Selected Payment Method
                </Text>

                <Text style={styles.sectionDescription}>
                  Label:{' '}
                  <Text style={styles.highlight}>{paymentMethod.label}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Image:{' '}
                  <Image
                    source={{
                      uri: `data:image/png;base64,${paymentMethod.image}`,
                    }}
                    style={styles.paymentMethodImage}
                  />
                </Text>

                <Text style={styles.sectionDescription}>
                  Template Image:{' '}
                  <MaskedView
                    maskElement={
                      <Image
                        style={styles.paymentMethodTemplateMask}
                        source={{
                          uri: `data:image/png;base64,${paymentMethod.templateImage}`,
                        }}
                      />
                    }
                  >
                    <View style={styles.paymentMethodTemplateView} />
                  </MaskedView>
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Shipping Address & Method</Text>

              <Text style={styles.sectionDescription}>
                Open <Text style={styles.highlight}>Stripe</Text> shipping
                options view.
              </Text>

              <ExampleButton
                title="Show Shipping Picker"
                onPress={handleChooseShipping}
              />
            </View>

            {shippingAddress ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionSubTitle}>
                  Selected Shipping Address
                </Text>

                <Text style={styles.sectionDescription}>
                  Name:{' '}
                  <Text style={styles.highlight}>{shippingAddress.name}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Address:{' '}
                  <Text style={styles.highlight}>{shippingAddress.line1}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Apt:{' '}
                  <Text style={styles.highlight}>{shippingAddress.line2}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Postal Code:{' '}
                  <Text style={styles.highlight}>
                    {shippingAddress.postalCode}
                  </Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  City:{' '}
                  <Text style={styles.highlight}>{shippingAddress.city}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  State:{' '}
                  <Text style={styles.highlight}>{shippingAddress.state}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Country:{' '}
                  <Text style={styles.highlight}>
                    {shippingAddress.country}
                  </Text>
                </Text>
              </View>
            ) : null}

            {shippingMethod ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionSubTitle}>
                  Selected Shipping Method
                </Text>

                <Text style={styles.sectionDescription}>
                  Label:{' '}
                  <Text style={styles.highlight}>{shippingMethod.label}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Amount:{' '}
                  <Text style={styles.highlight}>{shippingMethod.amount}</Text>
                </Text>

                <Text style={styles.sectionDescription}>
                  Detail:{' '}
                  <Text style={styles.highlight}>{shippingMethod.detail}</Text>
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Payment</Text>

              <Text style={styles.sectionDescription}>
                Start <Text style={styles.highlight}>Stripe</Text> payment flow.
              </Text>

              <ExampleButton
                title="Pay"
                onPress={handlePay}
                disabled={!isReadyToPay}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const lightStyles = StyleSheet.create({
  safeAreaView: {
    backgroundColor: Colors.lighter,
    flex: 1,
  },
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  body: {
    backgroundColor: Colors.white,
    borderTopStartRadius: 32,
    borderTopEndRadius: 32,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionSubTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.primaryDark,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.dark,
  },
  highlight: {
    fontWeight: '700',
  },
  paymentMethodImage: {
    height: 40,
    width: 64,
    resizeMode: 'contain',
  },
  paymentMethodTemplateMask: {
    height: 40,
    width: 64,
    resizeMode: 'cover',
  },
  paymentMethodTemplateView: {
    height: 40,
    width: 64,
    backgroundColor: Colors.primary,
  },
});

const darkStyles = StyleSheet.create({
  safeAreaView: {
    backgroundColor: Colors.darker,
    flex: 1,
  },
  scrollView: {
    backgroundColor: Colors.darker,
  },
  body: {
    backgroundColor: Colors.dark,
    borderTopStartRadius: 32,
    borderTopEndRadius: 32,
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  sectionSubTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.white,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
    color: Colors.light,
  },
  highlight: {
    fontWeight: '700',
  },
  paymentMethodImage: {
    height: 40,
    width: 64,
    resizeMode: 'contain',
  },
  paymentMethodTemplateMask: {
    height: 40,
    width: 64,
    resizeMode: 'cover',
  },
  paymentMethodTemplateView: {
    height: 40,
    width: 64,
    backgroundColor: Colors.white,
  },
});
