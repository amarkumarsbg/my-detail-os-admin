"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { provisionOrganization } from "@/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProvisionOrgDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    planCode: "STARTER",
    trialDays: "14",
    referralCode: "",
  });

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await provisionOrganization({
        businessName: form.businessName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        planCode: form.planCode || undefined,
        trialDays: form.trialDays ? Number(form.trialDays) : undefined,
        referralCode: form.referralCode.trim() || null,
      });
      const n = result.notified;
      const sent = [
        n?.email ? "email" : null,
        n?.sms ? "SMS" : null,
        n?.whatsapp ? "WhatsApp" : null,
      ].filter(Boolean);
      const fails = [
        !n?.email && n?.errors?.email ? n.errors.email : null,
        !n?.sms && n?.errors?.sms ? `SMS: ${n.errors.sms}` : null,
        !n?.whatsapp && n?.errors?.whatsapp ? `WhatsApp: ${n.errors.whatsapp}` : null,
      ].filter(Boolean);
      onClose();
      onCreated();
      if (sent.length > 0) {
        toast.success(`Organization provisioned. Sent: ${sent.join(", ")}.`);
      } else {
        toast.success("Organization provisioned.");
      }
      if (fails.length > 0) {
        toast.warning(fails.join(" · "));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Provision failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }} onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "var(--card)", borderRadius: 14, border: "1px solid var(--border)", padding: 20, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Direct sales — provision org</div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>Creates a tenant with owner login. Password is the temporary credential to dispatch.</p>
        {(["businessName", "ownerName", "email", "phone", "password"] as const).map((k) => (
          <Input key={k} required type={k === "password" ? "text" : k === "email" ? "email" : "text"} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <Input placeholder="Plan code (STARTER)" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} />
        <Input placeholder="Trial days" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} />
        <Input placeholder="Referral code (optional)" value={form.referralCode} onChange={(e) => setForm({ ...form, referralCode: e.target.value })} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Provisioning…</> : "Provision"}</Button>
        </div>
      </form>
    </div>
  );
}
