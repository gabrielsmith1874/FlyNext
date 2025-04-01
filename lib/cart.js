export function addToCart(item) {
  let cart = getCart();
  cart.push(item);
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function getCart() {
  if (typeof window === 'undefined') return [];
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

export function removeFromCart(itemId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== itemId);
  localStorage.setItem('cart', JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem('cart');
}
