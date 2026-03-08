"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const CheckoutPage = () => {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleCheckout = async (plan) => {
        setLoading(true);
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan }),
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
            else {
                alert('Failed to initiate checkout');
            }
        }
        catch (error) {
            console.error('Checkout error:', error);
            alert('An error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Upgrade Your Plan</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pro Plan */}
        <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl font-bold mb-2">Pro Plan</h2>
          <p className="text-4xl font-bold mb-4">$99<span className="text-lg font-normal text-gray-500">/mo</span></p>
          <ul className="mb-8 space-y-2">
            <li>✅ Scan unlimited</li>
            <li>✅ 5 agents</li>
            <li>✅ Mid-market SecOps</li>
          </ul>
          <button onClick={() => handleCheckout('pro')} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Upgrade to Pro'}
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="border rounded-lg p-6 shadow-sm hover:shadow-md transition bg-blue-50 border-blue-200">
          <h2 className="text-2xl font-bold mb-2">Enterprise Plan</h2>
          <p className="text-4xl font-bold mb-4">$499<span className="text-lg font-normal text-gray-500">/mo</span></p>
          <ul className="mb-8 space-y-2">
            <li>✅ Multi-tenant</li>
            <li>✅ Custom agents</li>
            <li>✅ IC/Enterprise Support</li>
            <li>✅ Advanced Governance</li>
          </ul>
          <button onClick={() => handleCheckout('ent')} disabled={loading} className="w-full bg-blue-800 text-white py-2 rounded-lg hover:bg-blue-900 disabled:opacity-50">
            {loading ? 'Loading...' : 'Upgrade to Enterprise'}
          </button>
        </div>
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Dashboard: Usage vs Plan</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span>Agent Seats</span>
              <span>3 / 5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span>Storage</span>
              <span>12GB / 100GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '12%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>);
};
exports.default = CheckoutPage;
