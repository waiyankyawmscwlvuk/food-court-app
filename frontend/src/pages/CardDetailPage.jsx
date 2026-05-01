import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { cardsAPI, transactionsAPI } from "../services/api";
import {
  ArrowLeft,
  CreditCard,
  ArrowUpCircle,
  ShoppingCart,
  Printer
} from "lucide-react";

import api from "../services/api";

export default function CardDetailPage() {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    Promise.all([cardsAPI.get(id), transactionsAPI.list({ card: id })])
      .then(([cardRes, txnRes]) => {
        setCard(cardRes.data);
        setTransactions(txnRes.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await api.get(`/cards/${id}/print/`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `card_${card.card_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Card PDF downloaded — ready to print!");
    } catch {
      toast.error("Failed to generate printable card.");
    } finally {
      setPrinting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  if (!card) return <p className="text-gray-500">Card not found.</p>;

  return (
    <div>
      <Link
        to="/cards"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} /> Back to Cards
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 font-mono">
                  {card.card_number}
                </p>
                <span
                  className={
                    card.status === "active" ? "badge-active" : "badge-inactive"
                  }
                >
                  {card.status}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{card.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span>{card.customer_phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span>{card.customer_email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{new Date(card.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              disabled={printing}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              {printing ? "Generating..." : "Print Card (PDF)"}
            </button>
          </div>

          <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <p className="text-blue-100 text-sm">Current Balance</p>
            <p className="text-4xl font-bold mt-1">
              {parseFloat(card.balance).toFixed(2)}
            </p>
            <p className="text-blue-200 text-xs mt-2">MMK</p>
          </div>

          {card.qr_code_url && (
            <div className="card text-center">
              <p className="text-sm font-medium text-gray-700 mb-3">QR Code</p>
              <img
                src={card.qr_code_url}
                alt="QR Code"
                className="mx-auto w-40 h-40 object-contain"
              />
              <p className="text-xs text-gray-400 mt-2">{card.uid}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">
            Transaction History ({transactions.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.transaction_type === "topup" ? "bg-green-100" : "bg-red-100"}`}
                  >
                    {txn.transaction_type === "topup" ? (
                      <ArrowUpCircle size={16} className="text-green-600" />
                    ) : (
                      <ShoppingCart size={16} className="text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {txn.transaction_id}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(txn.created_at).toLocaleString()}
                    </p>
                    {txn.payment_method && (
                      <p className="text-xs text-gray-400 capitalize">
                        {txn.payment_method.replace("_", " ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${txn.transaction_type === "topup" ? "text-green-600" : "text-red-600"}`}
                  >
                    {txn.transaction_type === "topup" ? "+" : "-"}
                    {parseFloat(txn.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Bal: {parseFloat(txn.balance_after).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">
                No transactions yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
