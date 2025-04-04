interface CartItem {
  id: string;
  [key: string]: any;
}

/**
 * Add an item to the cart
 * @param item - Item to add
 */
export function addToCart(item: CartItem): void {
  const cart = getCart();
  cart.push(item);
  localStorage.setItem('cart', JSON.stringify(cart));
}

/**
 * Get the cart items
 * @returns List of cart items
 */
export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

/**
 * Remove an item from the cart
 * @param itemId - ID of the item to remove
 */
export function removeFromCart(itemId: string): void {
  let cart = getCart();
  cart = cart.filter((item) => item.id !== itemId);
  localStorage.setItem('cart', JSON.stringify(cart));
}

/**
 * Clear the cart
 */
export function clearCart(): void {
  localStorage.removeItem('cart');
}