"use client";

import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/Modal";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { addItem, updateItem, type LocalItem } from "@/lib/db/offlineStorage";

export default function AddItemModal({
  userId,
  existing,
  onClose,
  onSaved,
  onDelete,
}: {
  userId: string;
  existing?: LocalItem;
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [stock, setStock] = useState(existing ? String(existing.stock_quantity) : "0");
  const [purchasePrice, setPurchasePrice] = useState(
    existing?.purchase_price != null ? String(existing.purchase_price) : ""
  );
  const [sellingPrice, setSellingPrice] = useState(
    existing?.selling_price != null ? String(existing.selling_price) : ""
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    existing?.low_stock_threshold != null ? String(existing.low_stock_threshold) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter the item's name.");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      stock_quantity: Number(stock) || 0,
      purchase_price: purchasePrice ? Number(purchasePrice) : undefined,
      selling_price: sellingPrice ? Number(sellingPrice) : undefined,
      low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
    };

    if (existing) {
      await updateItem(existing.id, payload);
    } else {
      await addItem({ user_id: userId, ...payload });
    }

    setSaving(false);
    showToast(existing ? "Item updated" : "Item added");
    onSaved();
    onClose();
  }

  return (
    <Modal title={existing ? "Edit Item" : "Add Item"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          id="item-name"
          label="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rice (basmati)"
          autoFocus
        />
        <TextField
          id="item-stock"
          label="Stock quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="0"
        />
        <TextField
          id="item-purchase-price"
          label="Purchase price (optional)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(e.target.value)}
          placeholder="0"
        />
        <TextField
          id="item-selling-price"
          label="Selling price (optional)"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          placeholder="0"
        />
        <TextField
          id="item-low-stock"
          label="Low stock warning below (optional)"
          type="number"
          inputMode="decimal"
          min="0"
          step="1"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          placeholder="5"
        />

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-light px-4 py-3 text-senior-sm font-medium text-danger-dark">
            {error}
          </p>
        )}

        <Button type="submit" loading={saving} fullWidth>
          Save Item
        </Button>

        {onDelete && (
          <Button variant="danger" fullWidth onClick={onDelete}>
            Delete item
          </Button>
        )}
      </form>
    </Modal>
  );
}
