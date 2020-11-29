#import "ReactNativeStripe.h"
#import <React/RCTUtils.h>
#import <React/RCTConvert.h>

@implementation ReactNativeStripe {
    STPJSONResponseCompletionBlock customerKeyCompletionBlock;
    
    STPCustomerContext *customerContext;
    
    STPPaymentContext *paymentContext;
    
    NSString *paymentIntentClientSecret;
    
    RCTPromiseResolveBlock requestPaymentPromiseResolver;
    
    RCTPromiseRejectBlock requestPaymentPromiseRejecter;
}

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents
{
    return @[
        @"RNStripeRequestedCustomerKey",
        @"RNStripeRequestedPaymentIntentClientSecret",
        @"RNStripeSelectedPaymentMethodDidChange",
        @"RNStripePaymentIntentStatusChanged"
    ];
}

RCT_EXPORT_METHOD(initWithOptions:(NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: initWithOptions");
    
    if (options[@"publishableKey"] == nil) {
        reject(@"RNStripePublishableKeyRequired", @"A valid Stripe PublishableKey is required", nil);
        return;
    }
    
    [Stripe setDefaultPublishableKey:options[@"publishableKey"]];
    [[STPPaymentConfiguration sharedConfiguration] setPublishableKey:options[@"publishableKey"]];
    
    // Set 'Apple MerchantId' if supplied
    if (options[@"appleMerchantId"] != nil) {
        [[STPPaymentConfiguration sharedConfiguration] setAppleMerchantIdentifier:options[@"appleMerchantId"]];
    }
    
    // Setup default theme if supplied
    if (options[@"theme"] != nil) {
        [self setupDefaultThemeWithOptions:options[@"theme"]];
    }
    
    resolve(@YES);
};


RCT_EXPORT_METHOD(initCustomerContext:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: initCustomerContext");
    
    // Setup STPCustomerContext
    customerContext = [[STPCustomerContext alloc] initWithKeyProvider:self];
    
    resolve(@YES);
}

RCT_EXPORT_METHOD(initPaymentContext:(NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: initPaymentContext");
    
    if (customerContext == nil){
        return reject(@"RNStripeInitPaymentContextError", @"CustomerContext not initialized. Please call initCustomerContext before initPaymentContext is called.", nil);
    }
    
    STPPaymentConfiguration *config = [[STPPaymentConfiguration sharedConfiguration] copy];
    
    if (options[@"requiredBillingAddressFields"] != nil) {
        NSString *requiredBillingAddressFields = options[@"requiredBillingAddressFields"];
        if ([requiredBillingAddressFields isEqualToString:@"none"]) {
            [config setRequiredBillingAddressFields: STPBillingAddressFieldsNone];
        } else if ([requiredBillingAddressFields isEqualToString:@"name"]) {
            [config setRequiredBillingAddressFields: STPBillingAddressFieldsName];
        } else if ([requiredBillingAddressFields isEqualToString:@"postalCode"]) {
            [config setRequiredBillingAddressFields: STPBillingAddressFieldsPostalCode];
        } else if ([requiredBillingAddressFields isEqualToString:@"full"]) {
            [config setRequiredBillingAddressFields: STPBillingAddressFieldsFull];
        } else {
            return reject(@"RNStripeInitPaymentContextError", @"Unsupported requiredBillingAddressFields provided. Please check the value of requiredBillingAddressFields passed to initPaymentContext.", nil);
        }
    }
    
    if (options[@"requiredShippingAddressFields"] != nil) {
        NSArray *requiredShippingAddressFieldsOpt = options[@"requiredShippingAddressFields"];
        NSMutableSet<STPContactField> *requiredShippingAddressFields = [[NSMutableSet alloc] init];
        for (int i=0; i < requiredShippingAddressFieldsOpt.count; i++) {
            NSString *shippingAddressField = requiredShippingAddressFieldsOpt[i];
            if ([shippingAddressField isEqualToString:@"name"]) {
                [requiredShippingAddressFields addObject:STPContactFieldName];
            } else if ([shippingAddressField isEqualToString:@"emailAddress"]) {
                [requiredShippingAddressFields addObject:STPContactFieldEmailAddress];
            } else if ([shippingAddressField isEqualToString:@"phoneNumber"]) {
                [requiredShippingAddressFields addObject:STPContactFieldPhoneNumber];
            } else if ([shippingAddressField isEqualToString:@"postalAddress"]) {
                [requiredShippingAddressFields addObject:STPContactFieldPostalAddress];
            }
        }
        
        [config setRequiredShippingAddressFields:requiredShippingAddressFields];
    }
    
    paymentContext = [[STPPaymentContext alloc] initWithCustomerContext:customerContext
                                                          configuration:config
                                                                  theme:[STPTheme defaultTheme]];
    
    
    paymentContext.delegate = self;
    paymentContext.hostViewController = RCTPresentedViewController();
    
    // Map options to paymentContext
    
    if (options[@"paymentAmount"] != nil) {
        NSNumber *amount = options[@"paymentAmount"];
        paymentContext.paymentAmount = [amount intValue];
    }
    
    if(options[@"paymentCurrency"] != nil) {
        paymentContext.paymentCurrency = options[@"paymentCurrency"];
    }
    
    if(options[@"paymentCountry"] != nil) {
        paymentContext.paymentCountry = options[@"paymentCountry"];
    }
    
    resolve(@YES);
}

/*
 * STPPaymentOptionsViewController methods
 */

RCT_EXPORT_METHOD(presentPaymentOptionsViewController:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: presentPaymentOptionsViewController");
    
    if (paymentContext == nil){
        return reject(@"RNStripePresentPaymentOptionsViewControllerError", @"PaymentContext not initialized. Please call initPaymentContext before presentPaymentOptionsViewController is called.", nil);
    }
    
    [paymentContext presentPaymentOptionsViewController];
    
    resolve(@YES);
}

RCT_EXPORT_METHOD(pushPaymentOptionsViewController:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: pushPaymentOptionsViewController");
    
    if (paymentContext == nil){
        return reject(@"RNStripePushPaymentOptionsViewControllerError", @"PaymentContext not initialized. Please call initPaymentContext before pushPaymentOptionsViewController is called.", nil);
    }
    
    [paymentContext pushPaymentOptionsViewController];
    
    resolve(@YES);
}


/*
 * STPShippingAddressViewController methods
 */

RCT_EXPORT_METHOD(presentShippingViewController:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: presentShippingViewController");
    
    if (paymentContext == nil){
        return reject(@"RNStripePresentShippingViewControllerError", @"PaymentContext not initialized. Please call initPaymentContext before presentShippingViewController is called.", nil);
    }
    
    [paymentContext presentShippingViewController];
    
    resolve(@YES);
}

RCT_EXPORT_METHOD(pushShippingViewController:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: pushShippingViewController");
    
    if (paymentContext == nil){
        return reject(@"RNStripePushShippingViewControllerError", @"PaymentContext not initialized. Please call initPaymentContext before pushShippingViewController is called.", nil);
    }
    
    [paymentContext pushShippingViewController];
    
    resolve(@YES);
}

/*
 * RequestPayment
 */

RCT_EXPORT_METHOD(requestPayment:(NSString *) clientSecret
                  resolver:(RCTPromiseResolveBlock) resolver
                  rejecter:(RCTPromiseRejectBlock) rejecter)
{
    NSLog(@"RNStripe: requestPayment");
    
    if (paymentContext == nil) {
        return rejecter(@"RNStripeRequestPaymentError", @"PaymentContext not initialized. Please call initPaymentContext before requestPayment is called.", nil);
    }
    
    if (clientSecret == nil) {
        return rejecter(@"RNStripeRequestPaymentError", @"paymentIntentClientSecret is required.", nil);
    }
    
    if (requestPaymentPromiseResolver != nil) {
        return rejecter(@"RNStripeRequestPaymentInProgress", @"requestPayment already called, but initialization is not yet completed.", nil);
    }
    
    paymentIntentClientSecret = clientSecret;
    
    requestPaymentPromiseResolver = resolver;
    requestPaymentPromiseRejecter = rejecter;
    
    [paymentContext requestPayment];
}

/*
 * EphemeralKey methods
 */

- (void)createCustomerKeyWithAPIVersion:(NSString *) apiVersion
                             completion:(STPJSONResponseCompletionBlock) completion
{
    NSLog(@"RNStripe: createCustomerKeyWithAPIVersion");
    
    customerKeyCompletionBlock = completion;
    
    [self sendEventWithName:@"RNStripeRequestedCustomerKey"
                       body:@{
                           @"apiVersion": apiVersion
                       }];
}

RCT_EXPORT_METHOD(retrievedCustomerKey:(NSDictionary *) customerKey)
{
    NSLog(@"RNStripe: retrievedCustomerKey");
    
    if (customerKeyCompletionBlock != nil) {
        customerKeyCompletionBlock(customerKey, nil);
    }
}

RCT_EXPORT_METHOD(failedRetrievingCustomerKey)
{
    NSLog(@"RNStripe: failedRetrievingCustomerKey");
    
    if (customerKeyCompletionBlock != nil) {
        NSError *error;
        customerKeyCompletionBlock(nil, error);
    }
}

RCT_EXPORT_METHOD(clearCachedCustomer:(RCTPromiseResolveBlock) resolve
                  rejecter:(RCTPromiseRejectBlock) reject)
{
    NSLog(@"RNStripe: clearCachedCustomer");
    
    if (customerContext != nil) {
        [customerContext clearCache];
    }
    
    resolve(@YES);
}

/*
 * STPPaymentContextDelegate
 */

- (void)paymentIntentStatusChange:(NSString *) status
{
    NSLog(@"RNStripe: paymentIntentStatusChange");
    
    [self sendEventWithName:@"RNStripePaymentIntentStatusChanged"
                       body:@{
                           @"status": status
                       }];
}

- (void)paymentContextDidChange:(STPPaymentContext *) paymentContext
{
    NSLog(@"RNStripe: paymentContextDidChange");
    
    // Checks if a selected method is available
    if (paymentContext.selectedPaymentOption != nil) {
        // Send updated info to JS
        [self sendEventWithName:@"RNStripeSelectedPaymentMethodDidChange"
                           body:@{
                               @"label": paymentContext.selectedPaymentOption.label,
                               @"image": [self UIImageToBase64:paymentContext.selectedPaymentOption.image],
                               @"templateImage": [self UIImageToBase64:paymentContext.selectedPaymentOption.templateImage],
                               @"isReusable": @(paymentContext.selectedPaymentOption.isReusable),
                           }];
    }
}

- (void)paymentContext:(STPPaymentContext *) paymentContext
didUpdateShippingAddress:(STPAddress *) address
            completion:(STPShippingMethodsCompletionBlock) completion
{
    NSLog(@"RNStripe: paymentContextDidUpdateShippingAddress");
    
    // TODO: Send event to JS to allow address validation
    completion(STPShippingStatusValid, nil, nil, nil);
}

- (void)paymentContext:(STPPaymentContext *) paymentContext
   didFinishWithStatus:(STPPaymentStatus) status
                 error:(NSError *) error {
    NSLog(@"RNStripe: paymentContextDidFinishWithStatusError");
    
    if (requestPaymentPromiseResolver != nil && requestPaymentPromiseRejecter != nil) {
        switch (status) {
            case STPPaymentStatusSuccess:
                requestPaymentPromiseResolver(@YES);
                break;
                
            case STPPaymentStatusError:
                requestPaymentPromiseRejecter(@"RNStripeRequestPaymentFailed", error.localizedDescription, error);
                break;
                
            case STPPaymentStatusUserCancellation:
                requestPaymentPromiseResolver(@NO); // Do nothing
        }
        
        requestPaymentPromiseResolver = nil;
        requestPaymentPromiseRejecter = nil;
    }
}

- (void)paymentContext:(nonnull STPPaymentContext *) paymentContext
didCreatePaymentResult:(nonnull STPPaymentResult *) paymentResult
            completion:(nonnull STPPaymentStatusBlock) completion
{
    NSLog(@"RNStripe: paymentContextDidCreatePaymentResult");
    
    if (paymentIntentClientSecret == nil) {
        NSError *error = [NSError errorWithDomain:@"RNStripe"
                                             code:-101
                                         userInfo: @{
                                             NSLocalizedDescriptionKey : NSLocalizedString(@"Missing paymentIntentClientSecret", @""),
                                         }];
        completion(STPPaymentStatusError, error);
        return;
    }
    
    // Assemble the PaymentIntent parameters
    STPPaymentIntentParams* paymentIntentParams = [[STPPaymentIntentParams alloc] initWithClientSecret: paymentIntentClientSecret];
    paymentIntentParams.paymentMethodId = paymentResult.paymentMethod.stripeId;
    
    // Confirm the PaymentIntent
    [[STPPaymentHandler sharedHandler] confirmPayment:paymentIntentParams
                            withAuthenticationContext:paymentContext
                                           completion:^(STPPaymentHandlerActionStatus status, STPPaymentIntent * _Nullable paymentIntent, NSError * _Nullable error) {
        switch (status) {
            case STPPaymentHandlerActionStatusSucceeded:
                completion(STPPaymentStatusSuccess, nil);
                break;
                
            case STPPaymentHandlerActionStatusFailed:
                completion(STPPaymentStatusError, error);
                break;
                
            case STPPaymentHandlerActionStatusCanceled:
                completion(STPPaymentStatusUserCancellation, nil);
                break;
        }
        
        self->paymentIntentClientSecret = nil;
    }];
}

- (void)paymentContext:(STPPaymentContext *) paymentContext
didFailToLoadWithError:(NSError *) error
{
    NSLog(@"RNStripe: paymentContextDidFailToLoadWithError");
    
    if (requestPaymentPromiseResolver != nil && requestPaymentPromiseRejecter != nil) {
        requestPaymentPromiseRejecter(@"RNStripeRequestPaymentFailed", error.localizedDescription, error);
        
        requestPaymentPromiseResolver = nil;
        requestPaymentPromiseRejecter = nil;
    }
}

/*
 * Internal methods
 */

- (void)setupDefaultThemeWithOptions:(NSDictionary*) options
{
    [[STPTheme defaultTheme] setPrimaryBackgroundColor:[RCTConvert UIColor:options[@"primaryBackgroundColor"]]];
    [[STPTheme defaultTheme] setSecondaryBackgroundColor:[RCTConvert UIColor:options[@"secondaryBackgroundColor"]]];
    [[STPTheme defaultTheme] setPrimaryForegroundColor:[RCTConvert UIColor:options[@"primaryForegroundColor"]]];
    [[STPTheme defaultTheme] setSecondaryForegroundColor:[RCTConvert UIColor:options[@"secondaryForegroundColor"]]];
    [[STPTheme defaultTheme] setAccentColor:[RCTConvert UIColor:options[@"accentColor"]]];
    [[STPTheme defaultTheme] setErrorColor:[RCTConvert UIColor:options[@"errorColor"]]];
}

- (NSString *)UIImageToBase64:(UIImage *) image
{
    NSData *imageData = UIImagePNGRepresentation(image);
    return [imageData base64EncodedStringWithOptions:0];
}

@end
