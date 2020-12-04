package io.github.panz3r.reactnativestripe

import android.app.Activity
import android.content.Intent
import android.util.Log
import androidx.activity.ComponentActivity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.stripe.android.*
import com.stripe.android.model.CardBrand
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.view.BillingAddressFields
import com.stripe.android.view.ShippingInfoWidget
import org.json.JSONException


class ReactNativeStripeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), PaymentSession.PaymentSessionListener {

    private var mStripe: Stripe? = null

    private var ephemeralKeyUpdateListener: EphemeralKeyUpdateListener? = null

    private var mPaymentSession: PaymentSession? = null

    private var mSelectedPaymentMethodId: String? = null

    private var mRequestPaymentPromise: Promise? = null

    private val mActivityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            var handled: Boolean = mPaymentSession?.handlePaymentData(requestCode, resultCode, data)
                    ?: false

            if (!handled) {
                handled = mStripe?.onPaymentResult(requestCode, data, object : ApiResultCallback<PaymentIntentResult> {
                    override fun onError(e: Exception) {
                        mRequestPaymentPromise?.reject("RNStripeRequestPaymentFailed", e.localizedMessage, e)
                        mRequestPaymentPromise = null
                    }

                    override fun onSuccess(result: PaymentIntentResult) {
                        mRequestPaymentPromise?.resolve(result.failureMessage.isNullOrBlank())
                        mRequestPaymentPromise = null
                    }
                }) ?: false
            }

            if (!handled) {
                super.onActivityResult(activity, requestCode, resultCode, data)
            }

        }
    }

    init {
        // Add the listener for `onActivityResult`
        reactContext.addActivityEventListener(mActivityEventListener)
    }

    private fun sendEvent(eventName: String, data: WritableMap?) {
        reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, data)
    }

    override fun getName(): String {
        return "ReactNativeStripe"
    }

    @ReactMethod
    fun initWithOptions(options: ReadableMap, promise: Promise) {
        Log.d("RNStripe", "initWithOptions")

        val publishableKey = options.getString("publishableKey")
        if (publishableKey == null) {
            promise.reject("RNStripePublishableKeyRequired", "A valid Stripe PublishableKey is required")
            return
        }

        mStripe = Stripe(reactApplicationContext, publishableKey)

        PaymentConfiguration.init(reactApplicationContext, publishableKey)

        promise.resolve(true)
    }


    @ReactMethod
    fun initPaymentContext(options: ReadableMap, promise: Promise) {
        Log.d("RNStripe", "initPaymentContext")

        // Configure PaymentSession
        val paymentSessionConfig = PaymentSessionConfig.Builder()

        options.getString("requiredBillingAddressFields")?.let {
            when (it) {
                "none" -> paymentSessionConfig.setBillingAddressFields(BillingAddressFields.None)
                "name" -> paymentSessionConfig.setBillingAddressFields(BillingAddressFields.None)
                "postalCode" -> paymentSessionConfig.setBillingAddressFields(BillingAddressFields.PostalCode)
                "full" -> paymentSessionConfig.setBillingAddressFields(BillingAddressFields.Full)
                else -> paymentSessionConfig.setBillingAddressFields(BillingAddressFields.PostalCode)
            }
        }

        options.getArray("requiredShippingAddressFields")?.let {
            val hiddenShippingFields = mutableSetOf<ShippingInfoWidget.CustomizableShippingField>()
            val requiredShippingFields = it.toArrayList()

            if (!requiredShippingFields.contains("phoneNumber")) {
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.Phone)
            }

            if (!requiredShippingFields.contains("postalAddress")) {
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.Line1)
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.Line2)
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.City)
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.PostalCode)
                hiddenShippingFields.add(ShippingInfoWidget.CustomizableShippingField.State)
            }

            paymentSessionConfig
                    .setShippingInfoRequired(true)
                    .setShippingMethodsRequired(false) // TODO: Find a way to pass ShippingMethodsFactory async
                    .setHiddenShippingInfoFields(*hiddenShippingFields.toTypedArray())
        }
                ?: paymentSessionConfig
                        .setShippingInfoRequired(false)
                        .setShippingMethodsRequired(false)

        // Init PaymentSession
        reactApplicationContext.currentActivity?.runOnUiThread {
            mPaymentSession = PaymentSession(
                    reactApplicationContext.currentActivity as ComponentActivity,
                    paymentSessionConfig.build()
            )

            mPaymentSession?.init(this)
        }

        promise.resolve(true)
    }


    //
    //  EphemeralKey methods
    //

    @ReactMethod
    fun initCustomerContext(promise: Promise) {
        Log.d("RNStripe", "initCustomerContext")

        // Init CustomerSession
        CustomerSession.initCustomerSession(reactApplicationContext, object : EphemeralKeyProvider {
            override fun createEphemeralKey(apiVersion: String, keyUpdateListener: EphemeralKeyUpdateListener) {
                Log.d("RNStripe", "createEphemeralKey")
                ephemeralKeyUpdateListener = keyUpdateListener

                val params = Arguments.createMap()
                params.putString("apiVersion", apiVersion)

                sendEvent("RNStripeRequestedCustomerKey", params)
            }
        })

        promise.resolve(true)
    }

    @ReactMethod
    fun retrievedCustomerKey(customerKey: ReadableMap) {
        Log.d("RNStripe", "retrievedCustomerKey")

        try {
            val customerKeyJson = convertMapToJson(customerKey)
            ephemeralKeyUpdateListener?.onKeyUpdate(customerKeyJson.toString())
        } catch (e: JSONException) {
            Log.e("RNStripe", "JSON Conversion error")
            ephemeralKeyUpdateListener?.onKeyUpdateFailure(-1, "JSON Conversion error")
        }
    }

    @ReactMethod
    fun failedRetrievingCustomerKey() {
        Log.d("RNStripe", "failedRetrievingCustomerKey")

        Log.e("RNStripe", "Failed to retrieve CustomerKey")
        ephemeralKeyUpdateListener?.onKeyUpdateFailure(-1, "Failed to retrieve CustomerKey")
    }

    @ReactMethod
    fun clearCachedCustomer(promise: Promise) {
        Log.d("RNStripe", "clearCachedCustomer")

        CustomerSession.endCustomerSession()

        promise.resolve(true)
    }

    //
    //  PaymentMethod methods
    //

    @ReactMethod
    fun presentPaymentOptionsViewController(promise: Promise) {
        Log.d("RNStripe", "presentPaymentOptionsViewController")

        if (mPaymentSession == null)
            return promise.reject("RNStripePresentPaymentOptionsViewControllerError", "PaymentContext not initialized. Please call initPaymentContext before presentPaymentOptionsViewController is called.")

        mPaymentSession?.presentPaymentMethodSelection()

        promise.resolve(true)
    }

    @ReactMethod
    fun pushPaymentOptionsViewController(promise: Promise) {
        Log.d("RNStripe", "pushPaymentOptionsViewController")

        if (mPaymentSession == null)
            return promise.reject("RNStripePushPaymentOptionsViewControllerError", "PaymentContext not initialized. Please call initPaymentContext before pushPaymentOptionsViewController is called.")

        mPaymentSession?.presentPaymentMethodSelection()

        promise.resolve(true)
    }

    //
    //  ShippingAddress methods
    //

    @ReactMethod
    fun presentShippingViewController(promise: Promise) {
        Log.d("RNStripe", "presentShippingViewController")

        if (mPaymentSession == null)
            return promise.reject("RNStripePresentShippingViewControllerError", "PaymentContext not initialized. Please call initPaymentContext before presentShippingViewController is called.")

        mPaymentSession?.presentShippingFlow()

        promise.resolve(true)
    }

    @ReactMethod
    fun pushShippingViewController(promise: Promise) {
        Log.d("RNStripe", "pushShippingViewController")

        if (mPaymentSession == null)
            return promise.reject("RNStripePushShippingViewControllerError", "PaymentContext not initialized. Please call initPaymentContext before pushShippingViewController is called.")

        mPaymentSession?.presentShippingFlow()

        promise.resolve(true)
    }

    //
    //  Payment methods
    //

    @ReactMethod
    fun requestPayment(clientSecret: String?, promise: Promise) {
        Log.d("RNStripe", "requestPayment")

        if (mPaymentSession == null) {
            return promise.reject("RNStripeRequestPaymentError", "PaymentContext not initialized. Please call initPaymentContext before requestPayment is called.")
        }

        if (clientSecret == null) {
            return promise.reject("RNStripeRequestPaymentError", "paymentIntentClientSecret is required.")
        }

        if (mRequestPaymentPromise != null) {
            return promise.reject("RNStripeRequestPaymentInProgress", "requestPayment already called, but initialization is not yet completed.")
        }

        if (mSelectedPaymentMethodId == null) {
            return promise.reject("RNStripeRequestPaymentError", "A payment method has not been selected. Please call presentPaymentOptionsViewController or pushPaymentOptionsViewController before requestPayment is called.")
        }

        mRequestPaymentPromise = promise

        reactApplicationContext.currentActivity?.runOnUiThread {
            mStripe?.confirmPayment(reactApplicationContext.currentActivity as ComponentActivity,
                    ConfirmPaymentIntentParams.createWithPaymentMethodId(
                            mSelectedPaymentMethodId!!,
                            clientSecret
                    )
            )
        }
    }

    //
    // PaymentSession.PaymentSessionListener
    //

    override fun onCommunicatingStateChanged(isCommunicating: Boolean) {
        // update UI, such as hiding or showing a progress bar
    }

    override fun onError(errorCode: Int, errorMessage: String) {
        // handle error
    }

    override fun onPaymentSessionDataChanged(data: PaymentSessionData) {
        Log.d("RNStripe", "onPaymentSessionDataChanged")

        val paymentContextSnapshot = Arguments.createMap()

        // Checks if a selected method is available
        data.paymentMethod?.let {
            mSelectedPaymentMethodId = it.id

            it.card?.let { card ->
                val cardIconId = card.brand.icon
                val cardIconTemplateId = when (card.brand) {
                    CardBrand.AmericanExpress -> R.drawable.stripe_ic_amex_template_32
                    CardBrand.Discover -> R.drawable.stripe_ic_discover_template_32
                    CardBrand.JCB -> R.drawable.stripe_ic_jcb_template_32
                    CardBrand.DinersClub -> R.drawable.stripe_ic_diners_template_32
                    CardBrand.Visa -> R.drawable.stripe_ic_visa_template_32
                    CardBrand.MasterCard -> R.drawable.stripe_ic_mastercard_template_32
                    CardBrand.UnionPay -> R.drawable.stripe_ic_unionpay_template_32
                    CardBrand.Unknown -> R.drawable.stripe_ic_unknown
                    else -> null
                }

                val resources = reactApplicationContext.currentActivity!!.resources

                paymentContextSnapshot.putMap("paymentMethod", Arguments.makeNativeMap(mapOf(
                        "label" to "${card.brand.displayName} ${card.last4}",
                        "image" to drawableByIdToBase64(resources, cardIconId),
                        "templateImage" to drawableByIdToBase64(resources, cardIconTemplateId),
                        "isReusable" to (it.type?.isReusable ?: false)
                )))
            }
        }

        // Checks if a shipping address is available
        data.shippingInformation?.let {
            paymentContextSnapshot.putMap("shippingAddress", Arguments.makeNativeMap(mapOf(
                    "name" to (it.name ?: ""),
                    "phone" to (it.phone ?: ""),
                    "email" to "", // (it.email ?: ""),
                    "line1" to (it.address?.line1 ?: ""),
                    "line2" to (it.address?.line2 ?: ""),
                    "city" to (it.address?.city ?: ""),
                    "postalCode" to (it.address?.postalCode ?: ""),
                    "state" to (it.address?.state ?: ""),
                    "country" to (it.address?.country ?: "")
            )))
        }

        // Checks if a shipping method has been selected
        data.shippingMethod?.let {
            paymentContextSnapshot.putMap("shippingMethod", Arguments.makeNativeMap(mapOf(
                    "identifier" to it.identifier,
                    "label" to it.label,
                    "amount" to it.amount,
                    "detail" to (it.detail ?: "")
            )))
        }

        paymentContextSnapshot.putBoolean("isPaymentReadyToCharge", data.isPaymentReadyToCharge)

        // Send updated info to JS
        sendEvent("RNStripePaymentContextDidChange", paymentContextSnapshot)
    }
}
