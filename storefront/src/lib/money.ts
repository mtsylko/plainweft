export interface Money {
  amount: string;
  currencyCode: string;
}

/** 79 zł, or 79,50 zł when there are cents. Polish formatting, since the store sells in PLN. */
export function formatMoney({ amount, currencyCode }: Money): string {
  const value = Number(amount);
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** A compare-at price only means a sale when it is higher than the price. */
export function isOnSale(price: Money, compareAt: Money | null | undefined): compareAt is Money {
  return !!compareAt && Number(compareAt.amount) > Number(price.amount);
}

/**
 * A cart line's total at a new quantity, from its total at the old one: 3 × 79,99 zł is 239,97 zł,
 * so 2 of them are 159,98 zł. Counted in grosze, so the cents never drift.
 */
export function scaleTotal<M extends Money>(total: M, quantity: number, nextQuantity: number): M {
  const unit = cents(total) / quantity;
  return { ...total, amount: amountOf(Math.round(unit * nextQuantity)) };
}

/** Amounts added up, as a bag's subtotal. All are in `currencyCode`: the store sells in one. */
export function sumMoney(amounts: readonly Money[], currencyCode: string): Money {
  return { amount: amountOf(amounts.reduce((sum, money) => sum + cents(money), 0)), currencyCode };
}

function cents({ amount }: Money): number {
  return Math.round(Number(amount) * 100);
}

function amountOf(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** The lowest of several prices, for "from 79 zł". Assumes one currency, as the store has. */
export function lowestPrice(prices: readonly Money[]): Money | undefined {
  return prices.reduce<Money | undefined>(
    (lowest, price) => (!lowest || Number(price.amount) < Number(lowest.amount) ? price : lowest),
    undefined,
  );
}
