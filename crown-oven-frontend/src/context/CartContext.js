import { createContext, useState, useContext } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  // cart = { [dishId]: { dish, quantity } }
  const [cart, setCart] = useState({});

  const addToCart = (dish) => {
    setCart((prev) => {
      const existing = prev[dish._id];
      if (existing) {
        return { ...prev, [dish._id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [dish._id]: { dish, quantity: 1 } };
    });
  };

  const removeFromCart = (dishId) => {
    setCart((prev) => {
      const existing = prev[dishId];
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return { ...prev, [dishId]: { ...existing, quantity: existing.quantity - 1 } };
      }
      const updated = { ...prev };
      delete updated[dishId];
      return updated;
    });
  };

  const getQuantity = (dishId) => cart[dishId]?.quantity || 0;

  const cartItems = Object.values(cart);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Display-only estimate (backend recalculates actual total)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0
  );

  const clearCart = () => setCart({});

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, getQuantity, cartItems, cartItemCount, cartTotal, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
export default CartContext;
