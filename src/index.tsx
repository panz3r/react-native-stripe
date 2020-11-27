import { NativeModules } from 'react-native';

type StripeType = {
  multiply(a: number, b: number): Promise<number>;
};

const { Stripe } = NativeModules;

export default Stripe as StripeType;
