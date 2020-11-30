import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  processColor,
} from 'react-native';

import type {
  RNStripeAddress,
  RNStripeEphemeralKeyProviderFn,
  RNStripeManagerInitOptions,
  RNStripePaymentContextOptions,
  RNStripePaymentIntentClientSecret,
  RNStripeTheme,
} from './types';

const { ReactNativeStripe } = NativeModules;

export class RNStripeManager {
  private readonly stripeEventEmitter = new NativeEventEmitter(
    ReactNativeStripe
  );

  private customerKeySubscription: EmitterSubscription | null = null;

  private paymentMethodSubscription: EmitterSubscription | null = null;

  private shippingInfoSubscription: EmitterSubscription | null = null;

  /**
   * Initialize RNStripeManager.
   *
   * @param {RNStripeManagerInitOptions} initOptions the options to initialize RNStripeManager
   */
  async init({
    appleMerchantId,
    publishableKey,
    theme,
  }: RNStripeManagerInitOptions): Promise<boolean> {
    return ReactNativeStripe.initWithOptions({
      publishableKey,
      appleMerchantId,
      theme: this.processTheme(theme),
    });
  }

  /**
   * Initializes a new CustomerContext with the specified key provider.
   *
   * Upon initialization, a CustomerContext will fetch a new ephemeral key from your backend and use it to prefetch the customer object specified in the key.
   * Subsequent customer and payment method retrievals will return the prefetched customer and attached payment methods immediately if its age does not exceed 60 seconds.
   *
   * @param {RNStripeEphemeralKeyProviderFn} ephemeralKeyProviderFn The RNStripeEphemeralKeyProviderFn function called to retrieve a new ephemeral key.
   */
  async initCustomerContext(
    ephemeralKeyProviderFn: RNStripeEphemeralKeyProviderFn
  ): Promise<boolean> {
    if (!ephemeralKeyProviderFn) {
      throw 'ephemeralKeyProviderFn option is required!';
    }

    if (!this.customerKeySubscription) {
      // Subscribe to ReactNativeStripe events
      this.customerKeySubscription = this.stripeEventEmitter.addListener(
        'RNStripeRequestedCustomerKey',
        async (params: any) => {
          try {
            // Here you should request the ephemeral key
            // from your server (check Stripe documentation)
            const customerKeyObject = await ephemeralKeyProviderFn({
              apiVersion: params.apiVersion,
            });

            // Then return back the key
            ReactNativeStripe.retrievedCustomerKey(customerKeyObject);
          } catch (err) {
            // There was an error retrieving the CustomerKey
            ReactNativeStripe.failedRetrievingCustomerKey();
          }
        }
      );
    }

    return ReactNativeStripe.initCustomerContext();
  }

  /**
   * Initializes a new PaymentContext with the active CustomerContext and Theme, using the provided configuration.
   *
   * @param {RNStripePaymentContextOptions} paymentContextOptions The options to setup a new PaymentContext
   */
  async initPaymentContext({
    paymentContextOptions = {},
    paymentContextUpdateListener,
    shippingAddressValidator,
  }: RNStripePaymentContextOptions): Promise<boolean> {
    this.unsubscribePaymentMethodChanges();
    // Subscribe payment context change listener (passed as option)
    this.paymentMethodSubscription = this.stripeEventEmitter.addListener(
      'RNStripePaymentContextDidChange',
      paymentContextUpdateListener
    );

    this.unsubscribeShippingInfoChanges();
    // Subscribe payment context change listener (passed as option)
    this.shippingInfoSubscription = this.stripeEventEmitter.addListener(
      'RNStripeValidateShippingInfo',
      async (address: RNStripeAddress) => {
        // Validate ShippingAddress
        if (shippingAddressValidator) {
          try {
            const shippingMethods = await shippingAddressValidator(address);
            ReactNativeStripe.shippingAddressIsValid(shippingMethods);
          } catch (error) {
            ReactNativeStripe.shippingAddressIsInvalid(error?.message || null);
          }
        } else {
          ReactNativeStripe.shippingAddressIsValid(null);
        }
      }
    );

    return ReactNativeStripe.initPaymentContext(paymentContextOptions);
  }

  /**
   * This creates, configures, and appropriately presents an PaymentOptionsView on top of the payment context.
   *
   * It’ll be dismissed automatically when the user is done selecting their payment method.
   *
   * @note This method will do nothing if it is called while PaymentContext is already showing a view controller or in the middle of requesting a payment.
   */
  async presentPaymentOptionsView(): Promise<boolean> {
    return ReactNativeStripe.presentPaymentOptionsViewController();
  }

  /**
   * This creates, configures, and appropriately pushes an PaymentOptionsView onto the navigation stack of the context.
   *
   * It’ll be popped automatically when the user is done selecting their payment method.
   *
   * @note This method will do nothing if it is called while PaymentContext is already showing a view controller or in the middle of requesting a payment.
   */
  async pushPaymentOptionsView(): Promise<boolean> {
    return ReactNativeStripe.pushPaymentOptionsViewController();
  }

  /**
   * This creates, configures, and appropriately presents a view controller for collecting shipping address and shipping method on top of the payment context.
   *
   * It’ll be dismissed automatically when the user is done entering their shipping info.
   *
   * @note This method will do nothing if it is called while PaymentContext is already showing a view controller or in the middle of requesting a payment.
   */
  async presentShippingView(): Promise<boolean> {
    return ReactNativeStripe.presentShippingViewController();
  }

  /**
   * This creates, configures, and appropriately pushes a view controller for collecting shipping address and shipping method onto the navigation stack of the payment context.
   *
   * It’ll be popped automatically when the user is done entering their shipping info.
   *
   *  @note This method will do nothing if it is called while PaymentContext is already showing a view controller, or in the middle of requesting a payment.
   */
  async pushShippingView(): Promise<boolean> {
    return ReactNativeStripe.pushShippingViewController();
  }

  /**
   * Request a payment using the active PaymentContext.
   *
   * @param {RNStripePaymentIntentClientSecret} paymentIntentClientSecret The client secret of the PaymentIntent to be confirmed.
   */
  async requestPayment(
    paymentIntentClientSecret: RNStripePaymentIntentClientSecret
  ): Promise<boolean> {
    return ReactNativeStripe.requestPayment(paymentIntentClientSecret);
  }

  destroy() {
    this.unsubscribePaymentMethodChanges();
    this.unsubscribeShippingInfoChanges();
    this.unsubscribeCustomerKeyUpdates();
  }

  // Private

  private unsubscribePaymentMethodChanges() {
    // Remove paymentMethodSubscription if any
    if (this.paymentMethodSubscription) {
      this.paymentMethodSubscription.remove();
      this.paymentMethodSubscription = null;
    }
  }

  private unsubscribeShippingInfoChanges() {
    // Remove shippingInfoSubscription if any
    if (this.shippingInfoSubscription) {
      this.shippingInfoSubscription.remove();
      this.shippingInfoSubscription = null;
    }
  }

  private unsubscribeCustomerKeyUpdates() {
    // Remove customerKeySubscription if any
    if (this.customerKeySubscription) {
      this.customerKeySubscription.remove();
      this.customerKeySubscription = null;
    }
  }

  private processTheme(theme: RNStripeTheme = {}) {
    return Object.keys(theme).reduce((result, key) => {
      let value: string | undefined = theme[key as keyof RNStripeTheme];

      return {
        ...result,
        [key]: value ? processColor(value) : undefined,
      };
    }, {});
  }
}
