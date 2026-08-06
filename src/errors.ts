export class StellarPaywallConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarPaywallConfigError";
  }
}
