"use client";

import { useCart } from "@/hooks/useCart";
import Image from "next/image";
import Link from "next/link";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" 
        onClick={closeCart}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 flex items-center justify-between border-b border-border">
          <h2 className="text-2xl font-serif font-bold uppercase tracking-widest text-white">Cart</h2>
          <button onClick={closeCart} className="text-foreground-muted hover:text-white transition-colors p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground-muted gap-4">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p className="font-serif uppercase tracking-widest">Your cart is empty.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 border border-border p-4 bg-background-secondary">
                <div className="relative w-24 h-24 bg-background flex-shrink-0">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-border">No Img</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-serif uppercase font-bold text-white leading-tight line-clamp-2">{item.name}</h3>
                    <button onClick={() => removeItem(item.id)} className="text-foreground-muted hover:text-red-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center border border-border bg-background">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 hover:text-gold transition-colors">-</button>
                      <span className="px-2 text-sm font-bold text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 hover:text-gold transition-colors">+</button>
                    </div>
                    <span className="font-bold text-gold">S/ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-border bg-background-secondary">
            <div className="flex justify-between items-center mb-6">
              <span className="font-serif uppercase tracking-widest text-foreground-muted">Subtotal</span>
              <span className="text-2xl font-bold text-white">S/ {totalPrice.toFixed(2)}</span>
            </div>
            <Link href="/checkout" onClick={closeCart}>
              <button className="w-full bg-gold hover:bg-gold-light text-white font-serif uppercase tracking-widest font-bold py-4 transition-colors">
                Checkout
              </button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
