/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Coins,
  CheckCircle,
  Eye,
  AlertCircle,
  TrendingUp,
  Building,
  User,
  Activity
} from "lucide-react";
import { InvoiceStatus } from "../types.js";

interface InvoicesViewProps {
  invoices: any[];
  customers: any[];
  companies: any[];
  onCreateInvoice: (data: any) => Promise<any>;
  onPayInvoice: (id: string, data: any) => Promise<any>;
}

export default function InvoicesView({
  invoices = [],
  customers = [],
  companies = [],
  onCreateInvoice,
  onPayInvoice
}: InvoicesViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);

  // Form Fields state
  const [customerId, setCustomerId] = useState("");
  const [taxRate, setTaxRate] = useState<number>(15);
  const [discountRate, setDiscountRate] = useState<number>(0);
  const [notes, setNotes] = useState("");
  
  // Dynamic list subitems
  const [items, setItems] = useState<any[]>([
    { description: "SaaS Enterprise Licensing Contract", quantity: 1, unitPrice: 12000 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { description: "Integration Strategy consultation", quantity: 1, unitPrice: 3500 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, key: string, val: any) => {
    const updated = items.map((itm, idx) => {
      if (idx === index) {
        return {
          ...itm,
          [key]: val
        };
      }
      return itm;
    });
    setItems(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return alert("Required parameters missing!");
    
    // Find matching company associated to this selected customer
    const matchingCust = customers.find(c => c.id === customerId);
    const linkedCompanyId = matchingCust ? matchingCust.companyId : undefined;

    await onCreateInvoice({
      customerId,
      companyId: linkedCompanyId,
      items,
      taxRate,
      discountRate,
      notes
    });

    setIsCreateOpen(false);
    // Reset Form Fields
    setCustomerId("");
    setTaxRate(15);
    setDiscountRate(0);
    setNotes("");
    setItems([{ description: "SaaS Enterprise Licensing Contract", quantity: 1, unitPrice: 12000 }]);
  };

  const handleTriggerPayment = async (invId: string) => {
    if (confirm("Verify and record bank payment confirmation details on this invoice?")) {
      await onPayInvoice(invId, {
        paymentMethod: "Bank Wire Transfer Transfer",
        reference: `WIRE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      });
      // Refresh current views details if currently displayed in detailed layout view
      setViewInvoice(null);
    }
  };

  const handleBaridiMobPayment = async (invId: string) => {
    if (confirm("Confirm payment via BaridiMob? / تأكيد الدفع عن طريق بريدي موب؟")) {
      await onPayInvoice(invId, {
        paymentMethod: "BaridiMob",
        reference: `B-MOB-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      });
      setViewInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top statistics summary header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 border border-slate-100 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Invoiced Amount
          </span>
          <p className="text-xl font-extrabold text-slate-900">
            ${invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString()}
          </p>
          <span className="text-xs text-slate-450">Across {invoices.length} billing files</span>
        </div>

        <div className="space-y-1 font-mono">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Collected Cash
          </span>
          <p className="text-xl font-extrabold text-emerald-600">
            $
            {invoices
              .filter((i) => i.status === InvoiceStatus.PAID)
              .reduce((sum, inv) => sum + (inv.total || 0), 0)
              .toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 font-sans">100% verified status clearance</span>
        </div>

        <div className="flex items-center sm:justify-end shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Issue Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice list table block */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-indigo-500" />
            SaaS Commercial Billings Registry
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Client Portfolio</th>
                  <th className="py-3 px-4">Invoice Date</th>
                  <th className="py-3 px-4 text-right">Total sum</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-405 italic">
                      No invoices registered yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-650">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800">
                            {inv.customer?.firstName} {inv.customer?.lastName}
                          </p>
                          {inv.company && (
                            <p className="text-[10px] text-slate-450 uppercase tracking-wider">
                              🏙️ {inv.company.name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ${(inv.total || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.status === InvoiceStatus.PAID
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : inv.status === InvoiceStatus.SENT
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-slate-150 text-slate-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Payment Confirmation trigger */}
                          {inv.status !== InvoiceStatus.PAID && (
                            <button
                              onClick={() => handleTriggerPayment(inv.id)}
                              className="px-2 py-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-150 font-bold flex items-center gap-1 cursor-pointer"
                              title="Clear outstanding invoices balance"
                            >
                              <Coins className="w-3 h-3 text-emerald-500" />
                              Pay
                            </button>
                          )}
                          {/* Viewer trigger */}
                          <button
                            onClick={() => setViewInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-indigo-650 flex items-center justify-center cursor-pointer"
                            title="Print detailed commercial Invoice layout sheet"
                          >
                            <Eye className="w-4.5 h-4.5 text-slate-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Sheet view sidebar */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          {!viewInvoice ? (
            <div className="py-20 text-center text-slate-400 text-xs italic space-y-2">
              <Eye className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Select any invoice eyeball icon to preview details, apply payments, or run standard printable layout schemas.</p>
            </div>
          ) : (
            <div className="space-y-4 bg-white p-4.5 rounded-xl border border-slate-150 relative text-xs">
              {/* Header Invoice banner info */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-slate-850 text-xs">{viewInvoice.invoiceNumber}</span>
                  <p className="text-[10px] text-slate-450 font-mono">
                    Issue: {new Date(viewInvoice.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
              </div>

              {/* Client addresses block */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Client Meta details</span>
                <p className="font-bold text-slate-900 leading-none">
                  👤 {viewInvoice.customer?.firstName} {viewInvoice.customer?.lastName}
                </p>
                {viewInvoice.company && (
                  <p className="text-slate-500 leading-none">🏙️ {viewInvoice.company.name}</p>
                )}
              </div>

              {/* Item Lines breakdown table */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Item Breakdown</span>
                <div className="divide-y divide-slate-50 font-medium">
                  {viewInvoice.items?.map((itm: any) => (
                    <div key={itm.id} className="py-1.5 flex justify-between items-center text-[11px]">
                      <div className="space-y-0.5">
                        <p className="text-slate-800">{itm.description}</p>
                        <p className="text-[10px] text-slate-450 font-mono">
                          {itm.quantity} qty x ${itm.unitPrice}
                        </p>
                      </div>
                      <span className="font-mono text-slate-900 font-bold">${itm.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aggregated sums calculated */}
              <div className="space-y-1 pt-3 border-t border-slate-100 text-[11px] font-mono">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Subtotal:</span>
                  <span>${viewInvoice.subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Tax ({viewInvoice.taxRate}%):</span>
                  <span>+${viewInvoice.taxAmount}</span>
                </div>
                {viewInvoice.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Discount ({viewInvoice.discountRate}%):</span>
                    <span>-${viewInvoice.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-slate-900 text-xs border-t border-slate-50 pt-1.5">
                  <span className="font-sans">Total Fee Due:</span>
                  <span>${viewInvoice.total?.toFixed(2)}</span>
                </div>
              </div>

              {/* Payments clearing actions layout buttons */}
              {viewInvoice.status !== InvoiceStatus.PAID && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleTriggerPayment(viewInvoice.id)}
                    className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-emerald-650 hover:opacity-90 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Coins className="w-4 h-4" /> Bank Transfer
                  </button>
                  <button
                    onClick={() => handleBaridiMobPayment(viewInvoice.id)}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Coins className="w-4 h-4" /> BaridiMob
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CREATE INVOICE MODAL SHEET */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Issue Commercial Invoice</h3>
                <p className="text-xs text-slate-450">Add line items to calculate total fee due.</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Client Representative *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-slate-50/50 text-slate-700"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>


              {/* Dynamic Subitems Line-Items blocks builder */}
              <div className="space-y-3.5 border-t border-b border-slate-50 py-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="p-1 px-2.5 text-[10px] bg-slate-50 hover:bg-slate-100 hover:text-indigo-650 cursor-pointer rounded border border-slate-200 flex items-center gap-0.5"
                    title="Add subitem column row description"
                  >
                    + Add row
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {items.map((itm, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 text-xs items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          value={itm.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="Item description info placeholder"
                          className="w-full text-xs rounded border border-slate-200 p-1.5 outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          value={itm.quantity}
                          min="1"
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full text-xs rounded border border-slate-200 p-1.5 outline-none font-mono"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          required
                          value={itm.unitPrice}
                          min="0"
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          className="w-full text-xs rounded border border-slate-200 p-1.5 outline-none font-mono"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tax Percentage (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    min="0"
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Discount percentage (%)</label>
                  <input
                    type="number"
                    value={discountRate}
                    min="0"
                    onChange={(e) => setDiscountRate(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Standard terms notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms standard options details"
                  className="w-full text-xs rounded-lg border border-slate-200 outline-none p-2.5 bg-slate-50/50"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-650 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
