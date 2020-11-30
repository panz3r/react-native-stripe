/**
 * This type represents a payment method that a user can select and use to pay.
 */
export type RNStripePaymentOption = {
  /** A string describing the payment method, such as “Apple Pay” or “Visa 4242”. */
  label?: string;

  /**
   * A base64 encoded image with a small (32x20 points) logo representing the payment method.
   * For example, the Visa logo for a Visa card, or the Apple Pay logo.
   */
  image?: string;

  /**
   * A base64 encoded image with a small (32 x 20 points) logo representing the payment method that can be used as template for tinted icons.
   */
  templateImage?: string;

  /**
   * Describes whether this payment option may be used multiple times.
   * If it is not reusable, the payment method must be discarded after use.
   */
  isReusable?: boolean;
};

/**
 * Contains an address as represented by the Stripe API
 */
export type RNStripeAddress = {
  /** The user’s full name (e.g. “Jane Doe”) */
  name?: string;

  /** The phone number of the address (e.g. “8885551212”) */
  phone?: string;

  /** The email of the address (e.g. “jane@doe.com”) */
  email?: string;

  /** The first line of the user’s street address (e.g. “123 Fake St”) */
  line1?: string;

  /** The apartment, floor number, etc of the user’s street address (e.g. “Apartment 1A”) */
  line2?: string;

  /** The city in which the user resides (e.g. “San Francisco”) */
  city?: string;

  /** The postal code in which the user resides (e.g. “90210”) */
  postalCode?: string;

  /** The state in which the user resides (e.g. “CA”) */
  state?: string;

  /** The ISO country code of the address (e.g. “US”) */
  country?: string;
};

export type RNStripeTheme = {
  /**
   * The primary background color of the theme.
   *
   * This will be used as the backgroundColor for any views with this theme.
   */
  primaryBackgroundColor?: string;

  /**
   * The secondary background color of this theme.
   *
   * This will be used as the backgroundColor for any supplemental views inside a view with this theme - for example, a UITableView will set it’s cells’ background color to this value.
   */
  secondaryBackgroundColor?: string;

  /**
   * The primary foreground color of this theme.
   *
   * This will be used as the text color for any important labels in a view with this theme (such as the text color for a text field that the user needs to fill out).
   */
  primaryForegroundColor?: string;

  /**
   * The secondary foreground color of this theme.
   *
   * This will be used as the text color for any supplementary labels in a view with this theme (such as the placeholder color for a text field that the user needs to fill out).
   */
  secondaryForegroundColor?: string;

  /**
   * The accent color of this theme.
   *
   * This will be used for any buttons and other elements on a view that are important to highlight.
   */
  accentColor?: string;

  /**
   * The error color of this theme.
   *
   * This will be used for rendering any error messages or views.
   */
  errorColor?: string;
};

export type RNStripeManagerInitOptions = {
  /**
   * Set this to your Stripe publishable API key, obtained from https://dashboard.stripe.com/apikeys.
   *
   * Set this as early as possible in your application’s lifecycle.
   *
   * @warning Make sure not to ship your test API keys to the App Store! This will log a warning if you use your test key in a release build.
   */
  publishableKey: string;

  /**
   * The Apple Merchant Identifier to use during Apple Pay transactions (iOS only).
   * To create one of these, see the guide at https://stripe.com/docs/mobile/apple-pay.
   *
   * You must set this to a valid identifier in order to automatically enable Apple Pay.
   *
   * @warning iOS only.
   */
  appleMerchantId?: string;

  /**
   * Theme object can be used to visually style Stripe-provided UI (iOS only).
   *
   * @warning iOS only.
   *
   * @see https://stripe.com/docs/mobile/ios/standard#theming for more information.
   */
  theme?: RNStripeTheme;
};

export type RNStripeEphemeralKeyProviderFnOptions = {
  apiVersion: string;
};

export type StripeCustomerKeyObject = any;

export type RNStripeEphemeralKeyProviderFn = (
  options: RNStripeEphemeralKeyProviderFnOptions
) => Promise<StripeCustomerKeyObject>;

export type RNStripeCustomerContextOptions = {
  ephemeralKeyProviderFn: RNStripeEphemeralKeyProviderFn;
};

/**
 * Defines a shipping method for delivering physical goods.
 */
export type RNStripeShippingMethod = {
  /** A short, localized description of the shipping method. */
  label: string;

  /** The shipping method cost as a string (e.g. "5.99"). */
  amount: string;

  /** A user-readable description of the shipping method. */
  detail?: string;

  /** A unique identifier for the shipping method, used by the app. */
  identifier?: string;
};

export type RNStripeContactField =
  | 'name'
  | 'emailAddress'
  | 'phoneNumber'
  | 'postalAddress';

export type RNStripePaymentConfiguration = {
  /**
   * The amount of money you’re requesting from the user, in the smallest currency unit for the selected currency.
   *
   * For example, to indicate $10 USD, use `1000` (i.e. 1000 cents).
   *
   * @see https://stripe.com/docs/api/payment_intents/create#create_payment_intent-amount
   *
   * @note This value must be present and greater than zero in order for ApplePay to be automatically enabled.
   *
   * @note You should only set either this or `paymentSummaryItems`, not both. The other will be automatically calculated on demand using your `paymentCurrency`.
   */
  paymentAmount?: number;

  /**
   * The three-letter currency code for the currency of the payment (i.e. USD, GBP, JPY, etc).
   *
   * @default 'USD'
   *
   * @note Changing this property may change the return value of `paymentAmount` or `paymentSummaryItems` (whichever one you didn’t directly set yourself).
   */
  paymentCurrency?: string;

  /**
   * The two-letter country code for the country where the payment will be processed.
   *
   * You should set this to the country your Stripe account is in.
   *
   * @default 'US'
   *
   * @note Changing this property will change the `countryCode` of your ApplePay payment requests.
   */
  paymentCountry?: string;

  /**
   * The billing address fields the user must fill out when prompted for their payment details.
   *
   * These fields will all be present on the returned PaymentMethod from Stripe.
   *
   * @default 'postalCode'
   */
  requiredBillingAddressFields?: 'none' | 'postalCode' | 'full' | 'name';

  /**
   * The shipping address fields the user must fill out when prompted for their shipping info.
   *
   * Leave undefined if shipping address is not required.
   *
   * @default undefined
   */
  requiredShippingAddressFields?: RNStripeContactField[];
};

export type RNStripePaymentContextSnapshot = {
  /** The user’s currently selected payment option. May be undefined. */
  paymentMethod?: RNStripePaymentOption;

  /**
   * The user’s shipping address. May be undefined.
   *
   * You should not rely on the shipping information stored on the Stripe customer for order fulfillment, as your user may change this information if they make multiple purchases.
   * We recommend adding shipping information when you create a charge (which can also help prevent fraud), or saving it to your own database. https://stripe.com/docs/api/payment_intents/create#create_payment_intent-shipping
   *
   * @note by default, your user will still be prompted to verify a prefilled shipping address.
   * To change this behavior, you can set `verifyPrefilledShippingAddress` to `false` in your `RNStripePaymentConfiguration`.
   *
   */
  shippingAddress?: RNStripeAddress;

  /** The user’s currently selected shipping method. May be undefined. */
  shippingMethod?: RNStripeShippingMethod;
};

export type RNStripePaymentContextOptions = {
  /**
   * All the options you can set or change around a payment.
   *
   * The PaymentConfiguration object is provided to the PaymentContext when making a charge.
   * The configuration generally has settings that will not change from payment to payment and thus is reusable, while the context is specific to a single particular payment instance.
   */
  paymentContextOptions?: RNStripePaymentConfiguration;

  /**
   * Listener function called each time the PaymentContext changes.
   */
  paymentContextUpdateListener: (
    paymenyContext: RNStripePaymentContextSnapshot
  ) => void;

  /**
   * This function is called after the user enters a shipping address.
   * Validate the returned address and determine the shipping methods available for that address.
   *
   * If the address is valid, resolve the promise with an array of `RNStripeShippingMethod`. If you don't need to collect a shipping method simply return `null`.
   *
   * If the address is invalid, reject the promise with an error message describing the issue with the address.
   *
   * @note Providing an error message is optional—if you omit it, the user will simply see an alert with the message "Invalid Shipping Address".
   *
   * @note if left `undefined` user inserted addresses will always be considered valid.
   */
  shippingAddressValidator?: (
    address: RNStripeAddress
  ) => Promise<RNStripeShippingMethod[] | null>;
};

/**
 * The client secret of the PaymentIntent to be confirmed.
 *
 * It should be created on your backend and it's used to complete the payment on your frontend.
 *
 * @warning It should not be stored, logged, embedded in URLs, or exposed to anyone other than the customer.
 *
 * @see https://stripe.com/docs/payments/accept-a-payment?integration=elements for more about how to accept a payment and learn about how client_secret should be handled.
 */
export type RNStripePaymentIntentClientSecret = string;
