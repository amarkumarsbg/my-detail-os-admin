"use client";

import { jsPDF } from "jspdf";
import type { SubscriptionBillRow } from "@/types";
import { formatCurrency, formatDate, termLabel } from "@/lib/utils";

export function downloadTaxInvoicePdf(
  bill: SubscriptionBillRow,
  organizationName: string
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const x = 48;
  let y = 56;

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("TAX INVOICE", x, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("MY DETAIL OS", x, y);
  y += 28;

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice #: ${bill.billNumber}`, x, y);
  y += 16;
  doc.text(`Date: ${formatDate(bill.createdAt)}`, x, y);
  y += 16;
  doc.text(`Bill to: ${organizationName}`, x, y);
  y += 16;
  doc.text(`Plan: ${bill.planName} · ${bill.termLabel || termLabel(bill.termMonths)}`, x, y);
  y += 28;

  const lines: Array<[string, string]> = [
    ["Base plan", formatCurrency(bill.baseAmount, bill.currency)],
    ["Extra branches", formatCurrency(bill.extraBranchCost, bill.currency)],
    ["Extra users", formatCurrency(bill.extraUserCost, bill.currency)],
    ["Onboarding", formatCurrency(bill.onboardingFee, bill.currency)],
    ["Referral / discount", `-${formatCurrency(bill.referralDiscount, bill.currency)}`],
    [`GST (${bill.gstPercent}%)`, formatCurrency(bill.gstAmount, bill.currency)],
    ["Total payable", formatCurrency(bill.totalAmount, bill.currency)],
  ];

  doc.setDrawColor(226, 232, 240);
  for (const [label, value] of lines) {
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, y);
    doc.setTextColor(15, 23, 42);
    doc.text(value, 547, y, { align: "right" });
    y += 18;
    doc.line(x, y - 12, 547, y - 12);
  }

  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment status: ${bill.paymentStatus ?? "—"}`, x, y);
  y += 14;
  if (bill.txnReference) doc.text(`Txn: ${bill.txnReference}`, x, y);

  y += 36;
  doc.setFontSize(8);
  doc.text("This invoice is generated from the MY DETAIL OS Admin Portal for accounting records.", x, y);

  const safe = bill.billNumber.replace(/[^\w.-]+/g, "_");
  doc.save(`tax-invoice-${safe}.pdf`);
}
