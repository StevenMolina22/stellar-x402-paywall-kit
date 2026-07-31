export class StellarPaywallConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "StellarPaywallConfigError";
  }
}
