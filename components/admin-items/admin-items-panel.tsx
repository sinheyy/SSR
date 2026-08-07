"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ItemForm, { type EditableItem } from "@/components/admin-items/item-form";
import ItemList from "@/components/admin-items/item-list";

export default function AdminItemsPanel({
  items,
  users,
}: {
  items: EditableItem[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [editingItem, setEditingItem] = useState<EditableItem | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);

  async function handleDelete(id: string) {
    const { error } = await supabase.rpc("delete_item", { target_item_id: id });
    if (error) {
      alert("삭제에 실패했어요");
      return;
    }
    if (editingItem?.id === id) setEditingItem(null);
    router.refresh();
  }

  return (
    <>
      <ItemForm
        key={editingItem?.id ?? `new-${formResetKey}`}
        item={editingItem}
        users={users}
        onDone={() => {
          setEditingItem(null);
          setFormResetKey((k) => k + 1);
        }}
      />
      <ItemList items={items} onEdit={setEditingItem} onDelete={handleDelete} />
    </>
  );
}
