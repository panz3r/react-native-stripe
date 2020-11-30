import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';

import { ReactNativeStripe } from '@panz3r/react-native-stripe';
import type {
  RNStripeAddress,
  RNStripeEphemeralKeyProviderFn,
  RNStripePaymentContextSnapshot,
  RNStripePaymentOption,
  RNStripeShippingMethod,
  RNStripeTheme,
} from '@panz3r/react-native-stripe';

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
  primaryForegroundColor: 'red',
  accentColor: 'red',
  errorColor: 'green',
};

export default function App() {
  const [paymentMethod, setPaymentMethod] = useState<RNStripePaymentOption>();
  const [shippingAddress, setShippingAddress] = useState<RNStripeAddress>();
  const [
    shippingMethod,
    setShippingMethod,
  ] = useState<RNStripeShippingMethod>();

  const paymentContextUpdateListener = useCallback(
    (paymentContext: RNStripePaymentContextSnapshot) => {
      console.log('paymentContext', paymentContext);
      setPaymentMethod(paymentContext.paymentMethod);
      setShippingAddress(paymentContext.shippingAddress);
      setShippingMethod(paymentContext.shippingMethod);
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

      console.log('Payment completed?', completed);
    } catch (err) {
      console.log('Error during requestPayment call', err);
    }
  }, []);

  return (
    <View style={styles.container}>
      {paymentMethod ? (
        <>
          <Text>Current payment method</Text>

          <View style={styles.paymentMethodContainer}>
            <Image
              source={{ uri: `data:image/png;base64,${paymentMethod.image}` }}
              style={styles.paymentMethodImage}
            />

            <Text>{paymentMethod.label}</Text>
          </View>
        </>
      ) : null}

      <Button title="Show Card Picker" onPress={handleChooseCard} />

      {shippingAddress ? (
        <>
          <Text>Current shipping address</Text>
          <Text>{shippingAddress.name}</Text>
          <Text>{shippingAddress.line1}</Text>
          <Text>{shippingAddress.line2}</Text>
          <Text>
            {shippingAddress.postalCode} {shippingAddress.city}{' '}
            {shippingAddress.state} {shippingAddress.country}
          </Text>
        </>
      ) : null}

      {shippingMethod ? (
        <>
          <Text>Current shipping method</Text>
          <Text>{shippingMethod.label}</Text>
          <Text>{shippingMethod.amount}</Text>
          <Text>{shippingMethod.detail}</Text>
        </>
      ) : null}

      <Button title="Show Shipping Picker" onPress={handleChooseShipping} />

      <Button title="Pay" onPress={handlePay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodImage: {
    height: 30,
    width: 48,
    resizeMode: 'contain',
  },
});
