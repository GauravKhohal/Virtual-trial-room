import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useOwner } from '../context/OwnerContext';
import GarmentSwatch from '../components/GarmentSwatch';
import { calculateOfferSavings } from '../data/offers';
import { getCrossSellSuggestions, buildCompleteLookMessage } from '../ai/crossSell';
import { getOptimizerNudge } from '../ai/cartOptimizer';

export default function CartPage() {
  const { cart, removeFromCart, updateCartQuantity, cartTotal, addToCart } = useApp();
  const { offers } = useOwner();
  const navigate = useNavigate();

  const { applicable, totalSavings } = useMemo(
    () => calculateOfferSavings(cart.map((c) => c.product.type), offers),
    [cart, offers]
  );

  const crossSell = useMemo(() => getCrossSellSuggestions(cart), [cart]);
  const completeLookMsg = useMemo(() => buildCompleteLookMessage(cart), [cart]);
  const optimizer = useMemo(() => getOptimizerNudge(cart), [cart]);

  const finalTotal = Math.max(0, cartTotal - totalSavings);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 text-lg">Your cart is empty.</p>
        <button onClick={() => navigate('/catalog')} className="mt-4 px-5 py-2 rounded-full bg-indigo-600 text-white">
          Browse Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>

      <div className="grid md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2 space-y-3">
          {cart.map((item) => (
            <div key={`${item.product.id}-${item.size}`} className="flex items-center gap-4 border border-slate-200 rounded-xl p-3">
              <GarmentSwatch type={item.product.type} colorHex={item.product.colorHex} size="sm" />
              <div className="flex-1">
                <p className="font-medium text-slate-800 text-sm">{item.product.name}</p>
                <p className="text-xs text-slate-500">Size {item.size} · ₹{item.product.price.toLocaleString('en-IN')}</p>
              </div>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateCartQuantity(item.product.id, item.size, Number(e.target.value))}
                className="w-14 border border-slate-300 rounded-md px-2 py-1 text-sm text-center"
              />
              <button
                onClick={() => removeFromCart(item.product.id, item.size)}
                className="text-rose-500 text-xs font-medium hover:underline"
              >
                Remove
              </button>
            </div>
          ))}

          {crossSell.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <h3 className="font-semibold text-indigo-800 text-sm mb-3">Complete your look</h3>
              <div className="flex gap-4 flex-wrap">
                {crossSell.map((s) => (
                  <div key={s.product.id} className="flex flex-col items-center gap-1 w-28 text-center">
                    <GarmentSwatch type={s.product.type} colorHex={s.product.colorHex} size="sm" />
                    <span className="text-[11px] text-slate-600">{s.product.name}</span>
                    <span className="text-[11px] font-semibold text-indigo-700">₹{s.product.price.toLocaleString('en-IN')}</span>
                    <button
                      onClick={() => addToCart(s.product, s.product.sizes[1], 1)}
                      className="text-[11px] px-2 py-1 rounded-full bg-indigo-600 text-white"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
              {completeLookMsg && <p className="text-xs text-indigo-600 mt-3 italic">{completeLookMsg}</p>}
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl p-5 h-fit space-y-4">
          <h2 className="font-semibold text-slate-800">Order Summary</h2>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{cartTotal.toLocaleString('en-IN')}</span>
            </div>
            {totalSavings > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Offer Savings</span>
                <span>-₹{totalSavings.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total</span>
              <span>₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {applicable.length > 0 && (
            <div className="space-y-2">
              {applicable.map((o) => (
                <div key={o.id} className="text-xs bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2">
                  🎉 {o.title}
                </div>
              ))}
            </div>
          )}

          {optimizer && (
            <div className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2">💡 {optimizer.message}</div>
          )}

          <button
            onClick={() => navigate('/booking')}
            className="w-full px-5 py-2.5 rounded-full border border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50"
          >
            Reserve For Trial at Store
          </button>
          <button
            onClick={() => navigate('/checkout')}
            className="w-full px-5 py-2.5 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
