"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { BookOpen, Plus, X } from "lucide-react"

interface Recipe {
  id: string
  recipe_name: string
  packaging_spec: string | null
  is_active: boolean
  products: { name: string; code: string } | null
}

interface Product {
  id: string
  name: string
  code: string
}

interface Props {
  clientId: string
  initialRecipes: Recipe[]
  products: Product[]
  canManage: boolean
}

const EMPTY_FORM = {
  product_id: "",
  recipe_name: "",
  description: "",
  special_instructions: "",
  seasoning_notes: "",
  packaging_spec: "",
  allergen_notes: "",
}

export function RecipeManager({ clientId, initialRecipes, products, canManage }: Props) {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.product_id) { toast.error("Select a product"); return }
    if (!form.recipe_name.trim()) { toast.error("Recipe name is required"); return }

    setSaving(true)
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        client_id: clientId,
        product_id: form.product_id,
        recipe_name: form.recipe_name.trim(),
        description: form.description || null,
        special_instructions: form.special_instructions || null,
        seasoning_notes: form.seasoning_notes || null,
        packaging_spec: form.packaging_spec || null,
        allergen_notes: form.allergen_notes || null,
        is_active: true,
      })
      .select("id, recipe_name, packaging_spec, is_active, products(name, code)")
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success(`Recipe "${form.recipe_name}" added`)
    setRecipes((prev) => [...prev, data as unknown as Recipe].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name)))
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Recipes ({recipes.length})
          </CardTitle>
          {canManage && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add Recipe
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline recipe creation form */}
        {showForm && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-semibold">New Recipe</p>
              <button
                onClick={handleCancel}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Product <span className="text-red-500">*</span></Label>
                <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Recipe Name <span className="text-red-500">*</span></Label>
                <Input
                  value={form.recipe_name}
                  onChange={(e) => set("recipe_name", e.target.value)}
                  placeholder="e.g. Spicy Chorizo Mix — 5 lb pack"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="General product description..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Special Instructions</Label>
                <Textarea
                  value={form.special_instructions}
                  onChange={(e) => set("special_instructions", e.target.value)}
                  placeholder="Any special handling or processing steps..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Seasoning Notes</Label>
                <Textarea
                  value={form.seasoning_notes}
                  onChange={(e) => set("seasoning_notes", e.target.value)}
                  placeholder="Spice mix, ratios, adjustments..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Allergen Notes</Label>
                <Textarea
                  value={form.allergen_notes}
                  onChange={(e) => set("allergen_notes", e.target.value)}
                  placeholder="Contains: gluten, soy..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Packaging Spec</Label>
                <Input
                  value={form.packaging_spec}
                  onChange={(e) => set("packaging_spec", e.target.value)}
                  placeholder="e.g. 5 lb vacuum-sealed bag, case of 10"
                />
              </div>
            </div>

            <div className="px-4 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} type="button">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Recipe"}
              </Button>
            </div>
          </div>
        )}

        {/* Recipes table */}
        {!recipes.length && !showForm ? (
          <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)]">
            <BookOpen className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No recipes yet</p>
            {canManage && (
              <p className="text-xs mt-1">Click "Add Recipe" to create the first one</p>
            )}
          </div>
        ) : recipes.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
                  <th className="text-left px-4 py-2">Recipe Name</th>
                  <th className="text-left px-4 py-2">Product</th>
                  <th className="text-left px-4 py-2">Packaging</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr
                    key={recipe.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium">{recipe.recipe_name}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className="text-xs">
                        {recipe.products?.name || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[var(--muted-foreground)]">
                      {recipe.packaging_spec || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={recipe.is_active ? "success" : "secondary"}
                        className="text-xs"
                      >
                        {recipe.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
