# React Native Stripe <!-- omit in toc -->

> React Native bindings for the Stripe SDK

- [Installation](#installation)
  - [iOS Setup](#ios-setup)
- [Usage](#usage)
- [Methods](#methods)
  - [init](#init)
  - [initCustomerContext](#initcustomercontext)
  - [initPaymentContext](#initpaymentcontext)
  - [presentPaymentOptionsView](#presentpaymentoptionsview)
  - [pushPaymentOptionsView](#pushpaymentoptionsview)
  - [presentShippingView](#presentshippingview)
  - [pushShippingView](#pushshippingview)
  - [requestPayment](#requestpayment)
- [Contributing](#contributing)
- [License](#license)

----

## Installation

```sh
yarn add @panz3r/react-native-stripe
```

or

```sh
npm install @panz3r/react-native-stripe
```

### iOS Setup

Install required pods using

```sh
npx pod-install --quiet
```

----

## Usage

```ts
import { ReactNativeStripe } from '@panz3r/react-native-stripe';

// Init ReactNativeStripe as soon as your app is ready
await ReactNativeStripe.init({
  publishableKey,
})

// Init a CustomerContext passing an EphemeralKeyProvider function when you are ready to link your user to a Stripe customer
await ReactNativeStripe.initCustomerContext(ephemeralKeyProviderFn);

const ephemeralKeyProviderFn: RNStripeEphemeralKeyProviderFn = async (options) => {
  console.log('ephemeralKeyProviderFn called', options);
  const res = await fetch('<STRIPE_SERVER_URL>/ephemeral_keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  return await res.json();
};

// Init PaymentContext when you need start the checkout flow
await ReactNativeStripe.initPaymentContext({
  // Listener to receive paymentContext updates (optional)
  paymentContextUpdateListener,
  // Function to validate the shipping address and return the shipping methods (iOS only)
  shippingAddressValidator,
  // PaymentContext options
  paymentContextOptions: {
    requiredBillingAddressFields: 'none',
    requiredShippingAddressFields: [
      'name',
      'postalAddress',
    ],
  },
});

// Present Stripe PaymentOptions view
ReactNativeStripe.presentPaymentOptionsView();
// or
ReactNativeStripe.pushPaymentOptionsView();


// Present the Shipping view
ReactNativeStripe.presentShippingView();
// or
ReactNativeStripe.pushShippingView();

// Start the payment process passing a Stripe clientSecret generated on your backend
const completed = await ReactNativeStripe.requestPayment(clientSecret);
// Check if the payment process has been completed -> 'completed' does not mean that the payment was successfull, you should handle this check on your backend using Stripe webhooks
```

----

## Methods

### init

Initialize `ReactNativeStripe` using the provided `initOptions`

```ts
async init(initOptions: RNStripeManagerInitOptions): Promise<boolean>
```

#### RNStripeManagerInitOptions

| Name            | Description                                                                                                                                                                                  | Type            | Required |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------- |
| publishableKey  | Set this to your Stripe publishable API key, obtained from [Stripe dashboard](https://dashboard.stripe.com/apikeys)                                                                          | `string`        | true     |
| appleMerchantId | The Apple Merchant Identifier to use during Apple Pay transactions (**iOS only**). To create one of these, see the guide at [Stripe ApplePay docs](https://stripe.com/docs/mobile/apple-pay) | `string`        | false    |
| theme           | Theme object can be used to visually style Stripe-provided UI (**iOS only**)                                                                                                                 | `RNStripeTheme` | false    |

#### RNStripeTheme

Theme object can be used to visually style Stripe-provided UI (**iOS only**).

See [Stripe iOS docs](https://stripe.com/docs/mobile/ios/standard#theming) for more information.

| Name                     | Description                                  | Type     | Required |
| ------------------------ | -------------------------------------------- | -------- | -------- |
| primaryForegroundColor   | The primary foreground color of this theme   | `string` | false    |
| secondaryForegroundColor | The secondary foreground color of this theme | `string` | false    |
| primaryBackgroundColor   | The primary background color of the theme    | `string` | false    |
| secondaryBackgroundColor | The secondary background color of this theme | `string` | false    |
| accentColor              | The accent color of this theme               | `string` | false    |
| errorColor               | The error color of this theme                | `string` | false    |

### initCustomerContext

Initializes a new Stripe `CustomerContext` with the specified key provider.

Upon initialization, a `CustomerContext` will fetch a new ephemeral key from your backend and use it to prefetch the customer object specified in the key.
Subsequent customer and payment method retrievals will return the prefetched customer and attached payment methods immediately if its age does not exceed 60 seconds.

```ts
async initCustomerContext(ephemeralKeyProviderFn: RNStripeEphemeralKeyProviderFn): Promise<boolean>
```

#### RNStripeEphemeralKeyProviderFn

A function to retrieve a Stripe `EphemeralKey` for the current user from your backend.

See [Stripe docs](https://stripe.com/docs/mobile/ios/basic#ephemeral-key) for more details on how to implement it.

```ts
type RNStripeEphemeralKeyProviderFn = (options: RNStripeEphemeralKeyProviderFnOptions) => Promise<StripeCustomerKeyObject>
```

### initPaymentContext

Initializes a new `PaymentContext` with the active `CustomerContext` and `Theme`, using the provided configuration.

```ts
async initPaymentContext(paymentContextOptions: RNStripePaymentContextOptions): Promise<boolean>;
```

#### RNStripePaymentContextOptions

| Name                         | Description                                                                                                                                                                   | Type                                                                                                | Required |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| paymentContextOptions        | All the options you can set or change around a payment                                                                                                                        | [`RNStripePaymentConfiguration`](#rnstripepaymentconfiguration)                                     | false    |
| paymentContextUpdateListener | Listener function called each time the PaymentContext changes                                                                                                                 | [`RNStripePaymentContextListener`](#rnstripepaymentcontextlistener)                                 | true     |
| shippingAddressValidator     | This function is called after the user enters a shipping address. Validate the returned address and determine the shipping methods available for that address. (**iOS only**) | [`RNStripePaymentContextShippingAddressValidator`](#rnstripepaymentcontextshippingaddressvalidator) | false    |

##### RNStripePaymentConfiguration

| Name                          | Description                                                                                                                                                                  | Type                     | Required | Default        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------- | -------------- |
| paymentAmount                 | The amount of money you’re requesting from the user, in the smallest currency unit for the selected currency. For example, to indicate $10 USD, use `1000` (i.e. 1000 cents) | `number`                 | false    | `undefined`    |
| paymentCurrency               | The three-letter currency code for the currency of the payment (i.e. USD, GBP, JPY, etc)                                                                                     | `number`                 | false    | `'USD'`        |
| paymentCountry                | The two-letter country code for the country where the payment will be processed                                                                                              | `number`                 | false    | `'US'`         |
| requiredBillingAddressFields  | The billing address fields the user must fill out when prompted for their payment details. Can be one of `'none'`, `'postalCode'`, `'full'` or  `'name'`                     | `string`                 | false    | `'postalCode'` |
| requiredShippingAddressFields | The shipping address fields the user must fill out when prompted for their shipping info. Leave undefined if shipping address is not required                                | `RNStripeContactField[]` | false    | `undefined`    |

###### RNStripeContactField

Represent a shipping address field the user must fill out when prompted for their shipping info.

**Note:** `'name'` and `'country'` are always required on Android.

**Note:** `'emailAddress'` is not available on Android and won't be returned as part of RNStripePaymentContextSnapshot `shippingAddress`.

```ts
type RNStripeContactField = 'name' | 'emailAddress' | 'phoneNumber' | 'postalAddress';
```

----

#### RNStripePaymentContextListener

Listener function called each time the PaymentContext changes.

```ts
type RNStripePaymentContextListener = (paymenyContext: RNStripePaymentContextSnapshot) => void;
```

##### RNStripePaymentContextSnapshot

A snapshot of the current PaymentContext.

| Name                   | Description                                                                     | Type                                                |
| ---------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| paymentMethod          | The user’s currently selected payment option. May be `undefined`                | [`RNStripePaymentOption`](#rntripepaymentoption)    |
| shippingAddress        | The user’s shipping address. May be `undefined`                                 | [`RNStripeAddress`](#rnstripeaddress)               |
| shippingMethod         | The user’s currently selected shipping method. May be `undefined`               | [`RNStripeShippingMethod`](#rnstripeshippingmethod) |
| isPaymentReadyToCharge | Whether the payment data is ready for making a charge. Always `true` on **iOS** | `boolean`                                           |

###### RNStripePaymentOption

Represent a user payment option

| Name          | Description                                                                                                                             | Type      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| label         | A string describing the payment method, such as "Apple Pay" or "Visa 4242"                                                              | `string`  |
| image         | A base64 encoded image with a small (32x20 points) logo representing the payment method                                                 | `string`  |
| templateImage | A base64 encoded image with a small (32 x 20 points) logo representing the payment method that can be used as template for tinted icons | `string`  |
| isReusable    | Describes whether this payment option may be used multiple time. If it is not reusable, the payment method must be discarded after use  | `boolean` |

###### RNStripeAddress

Represent a user shipping address

| Name       | Description                                                                         | Type     |
| ---------- | ----------------------------------------------------------------------------------- | -------- |
| name       | The user’s full name (e.g. “Jane Doe”)                                              | `string` |
| phone      | The phone number of the address (e.g. “8885551212”)                                 | `string` |
| email      | The email of the address (e.g. “jane@doe.com”)                                      | `string` |
| line1      | The first line of the user’s street address (e.g. “123 Fake St”)                    | `string` |
| line2      | The apartment, floor number, etc of the user’s street address (e.g. “Apartment 1A”) | `string` |
| city       | The city in which the user resides (e.g. “San Francisco”)                           | `string` |
| postalCode | The postal code in which the user resides (e.g. “90210”)                            | `string` |
| state      | The state in which the user resides (e.g. “CA”)                                     | `string` |
| country    | The ISO country code of the address (e.g. “US”)                                     | `string` |

###### RNStripeShippingMethod

Represent a shipping method

| Name       | Description                                                   | Type     |
| ---------- | ------------------------------------------------------------- | -------- |
| label      | A short, localized description of the shipping method.        | `string` |
| amount     | The shipping method cost as a string (e.g. "5.99").           | `string` |
| detail     | A user-readable description of the shipping method.           | `string` |
| identifier | A unique identifier for the shipping method, used by the app. | `string` |

----

##### RNStripePaymentContextShippingAddressValidator

This function is called after the user enters a shipping address.

Validate the returned address and determine the shipping methods available for that address.

If the address is valid, resolve the promise with an array of [`RNStripeShippingMethod`](#rnstripeshippingmethod). If you don't need to collect a shipping method simply return `null`.
If the address is invalid, reject the promise with an error message describing the issue with the address.

**Note:** Providing an error message is optional—if you omit it, the user will simply see an alert with the message "Invalid Shipping Address".

**Note:** if left `undefined` user inserted addresses will always be considered valid.

**NOTE:** Shipping address validation is currently supported only on `iOS` due to a limitation of the `Stripe Android SDK`.

```ts
type RNStripePaymentContextShippingAddressValidator = (address: RNStripeAddress) => Promise<RNStripeShippingMethod[] | null>;
```

----

### presentPaymentOptionsView

This method creates, configures, and appropriately presents a Stripe PaymentOptionsView on top of the payment context.

It’ll be dismissed automatically when the user is done selecting their payment method.

**Note:** This method will do nothing if it is called while `PaymentContext` is already showing a view controller or in the middle of requesting a payment.

```ts
async presentPaymentOptionsView(): Promise<boolean>;
```

### pushPaymentOptionsView

This creates, configures, and appropriately pushes an PaymentOptionsView onto the navigation stack of the context.

It’ll be popped automatically when the user is done selecting their payment method.

**Note:** This method will do nothing if it is called while `PaymentContext` is already showing a view controller or in the middle of requesting a payment.

```ts
async pushPaymentOptionsView(): Promise<boolean>;
```

----

### presentShippingView

This method creates, configures, and appropriately presents a view controller for collecting shipping address and shipping method on top of the payment context.

It’ll be dismissed automatically when the user is done entering their shipping info.

**Note:** This method will do nothing if it is called while `PaymentContext` is already showing a view controller or in the middle of requesting a payment.

```ts
async presentShippingView(): Promise<boolean>;
```

### pushShippingView

This method creates, configures, and appropriately pushes a view controller for collecting shipping address and shipping method on top of the payment context.

It’ll be dismissed automatically when the user is done entering their shipping info.

**Note:** This method will do nothing if it is called while `PaymentContext` is already showing a view controller or in the middle of requesting a payment.

```ts
async pushShippingView(): Promise<boolean>;
```

----

### requestPayment

Request a payment using the active `PaymentContext`.

`paymentIntentClientSecret` represent the client secret of the `PaymentIntent` to be confirmed.

```ts
async requestPayment(paymentIntentClientSecret: RNStripePaymentIntentClientSecret): Promise<boolean>;
```

#### RNStripePaymentIntentClientSecret

The client secret of the `PaymentIntent` to be confirmed.
It should be created on your backend and it's used to complete the payment on your frontend.

See [Stripe Payments docs](https://stripe.com/docs/payments/accept-a-payment?integration=elements) for more about how to accept a payment and learn about how `client_secret` should be handled.

**WARNING:** It should not be stored, logged, embedded in URLs, or exposed to anyone other than the customer.

```ts
type RNStripePaymentIntentClientSecret = string;
```

----

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

----

Made with :sparkles: & :heart: by [Mattia Panzeri](https://github.com/panz3r) and [contributors](https://github.com/panz3r/react-native-stripe/graphs/contributors)

If you found this project to be helpful, please consider buying me a coffee.

[![buy me a coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoff.ee/4f18nT0Nk)
[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E42WCZ8)
