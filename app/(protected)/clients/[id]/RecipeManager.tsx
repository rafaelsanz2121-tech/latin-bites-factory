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
import { TermTip } from "@/components/ui/TermTip"
import { toast } from "sonner"
import { BookOpen, ChevronDown, ChevronUp, Clock, Flame, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Recipe {
  id: string
  recipe_name: string
  description: string | null
  packaging_spec: string | null
  seasoning_notes: string | null
  allergen_notes: string | null
  special_instructions: string | null
  cooking_notes: string | null
  oven_temp_f: number | null
  oven_duration_minutes: number | null
  is_active: boolean
  products: { name: string; code: string } | null
}

interface Product { id: string; name: string; code: string }

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
  cooking_notes: "",
  oven_temp_f: "",
  oven_duration_minutes: "",
  special_instructions: "",
  seasoning_notes: "",
  packaging_spec: "",
  allergen_notes: "",
}

function RecipeCard({ recipe, canManage, onToggle }: {
  recipe: Recipe
  canManage: boolean
  onToggle: (id: string, active: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      recipe.is_active ? "border-[var(--border)]" : "border-[var(--border)] opacity-60"
    )}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--muted)]/30 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{recipe.recipe_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{recipe.products?.name || "—"}</Badge>
              {recipe.oven_temp_f && (
                <span className="text-xs text-orange-600 font-medium">🌡 {recipe.oven_temp_f}°F</span>
              )}
              {recipe.oven_duration_minutes && (
                <span className="text-xs text-slate-500 flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {recipe.oven_duration_minutes >= 60
                    ? `${Math.floor(recipe.oven_duration_minutes / 60)}h ${recipe.oven_duration_minutes % 60}min`
                    : `${recipe.oven_duration_minutes} min`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={recipe.is_active ? "success" : "secondary"} className="text-xs">
            {recipe.is_active ? "Activa" : "Inactiva"}
          </Badge>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />
            : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-4 space-y-3">

          {/* Oven config highlight */}
          {(recipe.oven_temp_f || recipe.oven_duration_minutes) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Configuración del Horno
              </p>
              <div className="flex gap-6 mt-1">
                {recipe.oven_temp_f && (
                  <div>
                    <p className="text-xs text-orange-600">Temperatura</p>
                    <p className="text-2xl font-bold text-orange-800">{recipe.oven_temp_f}°F</p>
                  </div>
                )}
                {recipe.oven_duration_minutes && (
                  <div>
                    <p className="text-xs text-orange-600">Tiempo</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {recipe.oven_duration_minutes >= 60
                        ? `${Math.floor(recipe.oven_duration_minutes / 60)}h ${recipe.oven_duration_minutes % 60}min`
                        : `${recipe.oven_duration_minutes} min`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {recipe.description && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Descripción</p>
                <p className="text-sm">{recipe.description}</p>
              </div>
            )}
            {recipe.cooking_notes && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Instrucciones de Cocción</p>
                <p className="text-sm whitespace-pre-wrap">{recipe.cooking_notes}</p>
              </div>
            )}
            {recipe.seasoning_notes && (
              <div>
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Sazón / Condimentos</p>
                <p className="text-sm">{recipe.seasoning_notes}</p>
              </div>
            )}
            {recipe.allergen_notes && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">⚠️ Alérgenos</p>
                <p className="text-sm">{recipe.allergen_notes}</p>
              </div>
            )}
            {recipe.packaging_spec && (
              <div>
                <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Empaque</p>
                <p className="text-sm">{recipe.packaging_spec}</p>
              </div>
            )}
            {recipe.special_instructions && (
              <div className="col-span-2">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">📋 Instrucciones Especiales</p>
                <p className="text-sm whitespace-pre-wrap">{recipe.special_instructions}</p>
              </div>
            )}
          </div>

          {canManage && (
            <div className="pt-1 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => onToggle(recipe.id, !recipe.is_active)} className="text-xs">
                {recipe.is_active ? "Desactivar receta" : "Activar receta"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RecipeManager({ clientId, initialRecipes, products, canManage }: Props) {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.product_id) { toast.error("Selecciona un producto"); return }
    if (!form.recipe_name.trim()) { toast.error("El nombre de la receta es requerido"); return }

    setSaving(true)
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        client_id: clientId,
        product_id: form.product_id,
        recipe_name: form.recipe_name.trim(),
        description: form.description || null,
        cooking_notes: form.cooking_notes || null,
        oven_temp_f: form.oven_temp_f ? parseFloat(form.oven_temp_f) : null,
        oven_duration_minutes: form.oven_duration_minutes ? parseInt(form.oven_duration_minutes) : null,
        special_instructions: form.special_instructions || null,
        seasoning_notes: form.seasoning_notes || null,
        packaging_spec: form.packaging_spec || null,
        allergen_notes: form.allergen_notes || null,
        is_active: true,
      })
      .select("id, recipe_name, description, packaging_spec, seasoning_notes, allergen_notes, special_instructions, cooking_notes, oven_temp_f, oven_duration_minutes, is_active, products(name, code)")
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }

    toast.success(`Receta "${form.recipe_name}" guardada ✓`)
    setRecipes((prev) => [...prev, data as unknown as Recipe].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name)))
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("recipes").update({ is_active: active }).eq("id", id)
    if (error) { toast.error(error.message); return }
    setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, is_active: active } : r))
    toast.success(active ? "Receta activada" : "Receta desactivada")
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)] flex items-center gap-1">
            Recetas ({recipes.length})
            <TermTip term="recipe" />
          </CardTitle>
          {canManage && !showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Nueva Receta
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Inline recipe form */}
        {showForm && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200">
              <p className="text-sm font-semibold text-blue-800">Nueva Receta</p>
              <button onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Producto + Nombre */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Producto <span className="text-red-500">*</span></Label>
                  <Select value={form.product_id} onValueChange={(v) => set("product_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nombre de la Receta <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.recipe_name}
                    onChange={(e) => set("recipe_name", e.target.value)}
                    placeholder="Ej. Pork Belly Picante 5 lb"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Descripción general..." rows={2} />
              </div>

              {/* Horno */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Configuración del Horno
                  <TermTip term="setpoint" side="right" />
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-orange-800">Temperatura del Cliente (°F)</Label>
                    <Input type="number" step="1" placeholder="Ej. 375" value={form.oven_temp_f} onChange={(e) => set("oven_temp_f", e.target.value)} />
                    <p className="text-xs text-orange-600">Temperatura que el cliente pidió</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-orange-800">
                      <Clock className="w-3.5 h-3.5" /> Tiempo en Horno (min)
                    </Label>
                    <Input type="number" step="1" min="1" placeholder="Ej. 120" value={form.oven_duration_minutes} onChange={(e) => set("oven_duration_minutes", e.target.value)} />
                    <p className="text-xs text-orange-600">Duración total de cocción</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-orange-800">Instrucciones de Cocción</Label>
                  <Textarea value={form.cooking_notes} onChange={(e) => set("cooking_notes", e.target.value)} placeholder="Ej. Voltear a los 60 min, aplicar glaze al finalizar..." rows={2} />
                </div>
              </div>

              {/* Sazón y alérgenos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Sazón / Condimentos</Label>
                  <Textarea value={form.seasoning_notes} onChange={(e) => set("seasoning_notes", e.target.value)} placeholder="Mezcla de especias, proporciones, ajustes..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-amber-700">⚠️ Alérgenos</Label>
                  <Textarea value={form.allergen_notes} onChange={(e) => set("allergen_notes", e.target.value)} placeholder="Contiene: gluten, soya, lácteos..." rows={3} />
                </div>
              </div>

              {/* Instrucciones especiales + empaque */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Instrucciones Especiales</Label>
                  <Textarea value={form.special_instructions} onChange={(e) => set("special_instructions", e.target.value)} placeholder="Manejo especial, pasos adicionales..." rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Especificación de Empaque</Label>
                  <Input value={form.packaging_spec} onChange={(e) => set("packaging_spec", e.target.value)} placeholder="Ej. Bolsa 5 lb al vacío, caja de 10" />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-blue-200 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setShowForm(false) }}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar Receta"}
              </Button>
            </div>
          </div>
        )}

        {/* Recipe cards list */}
        {!recipes.length && !showForm ? (
          <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)]">
            <BookOpen className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">Sin recetas todavía</p>
            {canManage && <p className="text-xs mt-1">Click "Nueva Receta" para empezar</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} canManage={canManage} onToggle={handleToggle} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
