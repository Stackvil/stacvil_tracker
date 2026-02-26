import React, { useState } from 'react';
import { ShoppingCart, Printer, Trash2, Plus, Minus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const POS = () => {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const products = [
        { id: 1, name: 'Standard Service', price: 500 },
        { id: 2, name: 'Premium Service', price: 1000 },
        { id: 3, name: 'Consultation', price: 200 },
        { id: 4, name: 'Documentation', price: 150 },
    ];

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex h-screen bg-gray-100 p-4 gap-4 overflow-hidden">
            {/* Products Section */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                        <motion.button
                            key={product.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addToCart(product)}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-left hover:border-indigo-500 transition-all group"
                        >
                            <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                            <p className="text-indigo-600 font-bold">₹{product.price}</p>
                            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-5 h-5 text-indigo-500" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Cart Section */}
            <div className="w-96 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col overflow-hidden print:hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-indigo-600" />
                        Current Order
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <ShoppingCart className="w-12 h-12 mb-2" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
                                <div className="flex justify-between font-bold text-gray-800 text-sm">
                                    <span>{item.name}</span>
                                    <span>₹{item.price * item.quantity}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded border">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="font-bold">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded border">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-gray-600">Total</span>
                        <span className="text-gray-800">₹{total}</span>
                    </div>
                    <button
                        onClick={handlePrint}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Printer className="w-5 h-5" />
                        Print Ticket
                    </button>
                </div>
            </div>

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block fixed inset-0 bg-white p-8">
                <h1 className="text-2xl font-bold mb-4">STACVIL TRACKER - INVOICE</h1>
                <p className="text-sm text-gray-500 mb-8">Date: {new Date().toLocaleDateString()}</p>
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-800 text-left">
                            <th className="py-2">Item</th>
                            <th className="py-2">Qty</th>
                            <th className="py-2">Price</th>
                            <th className="py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map(item => (
                            <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-2">{item.name}</td>
                                <td className="py-2">{item.quantity}</td>
                                <td className="py-2">₹{item.price}</td>
                                <td className="py-2 text-right">₹{item.price * item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-right text-xl font-bold">
                    Total: ₹{total}
                </div>
            </div>
        </div>
    );
};

export default POS;
