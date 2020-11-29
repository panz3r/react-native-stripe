#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <Stripe/Stripe.h>

@interface ReactNativeStripe : RCTEventEmitter <RCTBridgeModule, STPCustomerEphemeralKeyProvider, STPPaymentContextDelegate>

@end
