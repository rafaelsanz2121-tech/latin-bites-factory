/**
 * Glosario de términos técnicos de inocuidad alimentaria.
 * Cada entrada aparece como tooltip ❓ en los formularios.
 */

export interface GlossaryEntry {
  title: string       // nombre completo en español
  definition: string  // explicación clara y sencilla
  example?: string    // ejemplo opcional
}

export const GLOSSARY: Record<string, GlossaryEntry> = {

  // ── HACCP / INOCUIDAD ──────────────────────────────────────────
  HACCP: {
    title: "HACCP",
    definition: "Análisis de Peligros y Puntos Críticos de Control. Sistema preventivo que identifica, evalúa y controla los peligros que ponen en riesgo la inocuidad de los alimentos.",
    example: "El HACCP exige monitorear temperaturas en cocción y enfriamiento.",
  },
  CCP: {
    title: "Punto Crítico de Control (CCP)",
    definition: "Paso del proceso donde se aplica una medida de control para eliminar o reducir un peligro de inocuidad a un nivel aceptable. Si falla, el producto puede ser inseguro.",
    example: "CCP 1-B: temperatura interna ≥160°F al cocinar cerdo.",
  },
  CCP_1B: {
    title: "CCP 1-B — Cocción",
    definition: "Punto Crítico de Control para cocción completa. La temperatura interna del producto debe alcanzar ≥160°F (71°C) para destruir patógenos como Salmonella y Listeria.",
    example: "Cerdo: temperatura interna 165°F al salir del horno.",
  },
  CCP_1B_1: {
    title: "CCP 1B(1) — Cocción Parcial",
    definition: "Cocción parcial controlada entre 145–150°F (63–66°C). Se permite únicamente cuando el producto seguirá otro proceso de cocción posterior.",
  },
  CCP_1B_2: {
    title: "CCP 1B(2) — Dorado",
    definition: "Proceso de dorado superficial a temperatura interna ≤145°F. El producto no está completamente cocido — requiere cocción adicional antes de servir o vender.",
  },
  CCP_2B: {
    title: "CCP 2-B — Enfriamiento",
    definition: "Punto Crítico de Control para enfriamiento rápido. Regula el tiempo en que el producto caliente baja de temperatura para evitar la zona de peligro bacteriano (40–140°F).",
    example: "Fase 1: de 130°F a 80°F en máximo 1.5 horas.",
  },
  CCP_2B_1: {
    title: "CCP 2B(1) — Seguimiento de Enfriamiento",
    definition: "Registro de seguimiento durante todo el proceso de enfriamiento. Documenta cada fase de reducción de temperatura hasta llegar a ≤40°F.",
  },

  // ── TEMPERATURAS ───────────────────────────────────────────────
  setpoint: {
    title: "Setpoint (Temperatura Configurada)",
    definition: "La temperatura que se fija manualmente en el termostato del horno o equipo. El equipo trata de mantener esta temperatura durante el proceso.",
    example: "Setpoint horno: 375°F — el horno mantiene esa temperatura durante la cocción.",
  },
  internal_temp: {
    title: "Temperatura Interna del Producto",
    definition: "La temperatura medida dentro del producto (no la del horno). Se mide con termómetro calibrado en la parte más gruesa del producto. Esta es la que determina si el CCP se cumplió.",
    example: "Pollo: temperatura superficial puede ser 200°F pero interna 155°F — solo la interna cuenta.",
  },
  danger_zone: {
    title: "Zona de Peligro de Temperatura",
    definition: "Rango de temperatura entre 40°F y 140°F (4°C a 60°C) donde las bacterias se multiplican rápidamente. Los alimentos no deben permanecer en esta zona más de 2 horas en total.",
  },
  chilling_phase1: {
    title: "Fase 1 de Enfriamiento — 130°F a 80°F",
    definition: "Primera fase del enfriamiento rápido. El producto caliente debe bajar de 130°F a ≤80°F en un máximo de 1.5 horas (90 minutos). Si tarda más, es una desviación CCP.",
  },
  chilling_phase2: {
    title: "Fase 2 de Enfriamiento — 80°F a 40°F",
    definition: "Segunda fase del enfriamiento. El producto debe bajar de 80°F a ≤40°F en un máximo de 5 horas adicionales. Si no se logra, el producto puede estar comprometido.",
  },

  // ── THAWING ────────────────────────────────────────────────────
  thawing: {
    title: "Descongelación (Thawing)",
    definition: "Proceso de pasar el producto del estado congelado al refrigerado de forma segura. Debe hacerse en cooler (≤40°F) o bajo agua corriente fría (≤70°F, ≤2 horas). Nunca a temperatura ambiente.",
  },
  thawing_cooler: {
    title: "Descongelación en Cooler",
    definition: "Método de descongelación lento y seguro: el producto se coloca en refrigeración (≤40°F) hasta que se descongela completamente. Puede tardar 24–48 horas pero es el método más seguro.",
  },
  thawing_running_water: {
    title: "Descongelación Bajo Agua Corriente",
    definition: "Método rápido: el producto se descongela bajo agua corriente a ≤70°F. El agua debe fluir continuamente para mantener la temperatura segura. No debe exceder 2 horas fuera del cooler.",
  },

  // ── LOTES ──────────────────────────────────────────────────────
  lot_number: {
    title: "Número de Lote",
    definition: "Código único que identifica un grupo de productos fabricados en las mismas condiciones el mismo día. Permite rastrear el producto si hay un problema de inocuidad.",
    example: "LOT-2026-03-28-001 = primer lote del 28 de marzo de 2026.",
  },
  batch: {
    title: "Batch / Lote de Producción",
    definition: "Cantidad específica de producto fabricado en una misma corrida de producción. Todos los productos del mismo batch comparten el mismo historial de proceso.",
  },
  traceability: {
    title: "Trazabilidad",
    definition: "Capacidad de rastrear un producto a través de todas las etapas de producción: materia prima, proceso, distribución y cliente final. Requerida por USDA para todos los productos cárnicos.",
  },

  // ── CALIDAD / INSPECCIÓN ───────────────────────────────────────
  preop: {
    title: "Inspección Pre-Operacional (Pre-Op)",
    definition: "Revisión obligatoria de limpieza y sanitización de todas las áreas de producción ANTES de comenzar operaciones cada día. Requerida por USDA/FSIS. Cualquier falla debe corregirse antes de producir.",
  },
  receiving: {
    title: "Recepción de Materia Prima",
    definition: "Inspección de ingredientes y materiales al momento de su llegada a la planta. Verifica temperatura, condición del empaque, temperatura del camión y documentación del proveedor.",
  },
  preshipment: {
    title: "Pre-Embarque (Pre-Shipment)",
    definition: "Revisión final del producto terminado antes de enviarlo al cliente. Verifica etiquetado, temperatura, peso, sellado del empaque y que todos los CCPs estén aprobados.",
  },
  calibration: {
    title: "Calibración de Equipos",
    definition: "Proceso de verificar y ajustar equipos de medición (termómetros, básculas) para asegurar que sus lecturas son exactas. Se hace con referencias certificadas. Requerida periódicamente por HACCP.",
    example: "Termómetro en agua con hielo debe leer 32°F ±1°F.",
  },
  deviation: {
    title: "Desviación",
    definition: "Cualquier situación donde un proceso no cumple los parámetros establecidos en el plan HACCP. Debe documentarse, investigarse y tomarse acción correctiva. No siempre significa que el producto es inseguro.",
    example: "Temperatura interna de 155°F en lugar de ≥160°F requerida.",
  },
  capa: {
    title: "Acción Correctiva y Preventiva (CAPA)",
    definition: "Plan de acción para corregir una desviación encontrada (acción correctiva) y evitar que vuelva a ocurrir en el futuro (acción preventiva). Requerida por el plan HACCP para toda desviación.",
  },

  // ── ROLES ──────────────────────────────────────────────────────
  initials: {
    title: "Iniciales del Empleado",
    definition: "Código de 2–4 letras que identifica a quien realizó una verificación o medición. Sirve como firma abreviada en el registro. Ej: Juan García → JG.",
    example: "JG, MR, AL",
  },
  qa: {
    title: "Control de Calidad (QA)",
    definition: "Departamento o persona responsable de verificar que el producto cumple los estándares de inocuidad y calidad. Verifica los logs y aprueba el producto para venta.",
  },
  usda: {
    title: "USDA — Inspección Federal",
    definition: "United States Department of Agriculture. Agencia federal que regula la producción de carne y aves en EE.UU. A través del FSIS, realiza inspecciones en planta y aprueba el establecimiento.",
  },
  fsis: {
    title: "FSIS — Servicio de Inocuidad",
    definition: "Food Safety and Inspection Service. La división del USDA que supervisa la inocuidad de carnes y productos procesados. El inspector de FSIS en planta debe ser notificado de ciertas desviaciones.",
  },

  // ── PRODUCCIÓN ─────────────────────────────────────────────────
  production_order: {
    title: "Orden de Producción",
    definition: "Documento que autoriza y planifica la fabricación de un lote de producto. Incluye el cliente, la receta, la cantidad y el estado del proceso en tiempo real.",
  },
  recipe: {
    title: "Receta del Cliente",
    definition: "Especificaciones exactas de cómo se debe producir el producto para un cliente específico: ingredientes, aderezos, empaque, alérgenos y notas especiales.",
  },

  // ── SANITACIÓN ─────────────────────────────────────────────────
  sanitation: {
    title: "Sanitización",
    definition: "Proceso de reducir microorganismos a niveles seguros mediante el uso de agentes sanitizantes aprobados, después de limpiar la suciedad visible. Es diferente a solo limpiar.",
  },
  ssop: {
    title: "SSOP — Procedimientos de Sanitación",
    definition: "Standard Sanitation Operating Procedures. Procedimientos escritos que describen cómo y cuándo se limpian y sanitizan las áreas y equipos de la planta. Requeridos por USDA.",
  },

  // ── PRODUCTO ───────────────────────────────────────────────────
  chicharron: {
    title: "Chicharrón",
    definition: "Producto de cerdo frito o al horno. Piel o carne de cerdo procesada a alta temperatura. CCP principal: temperatura interna ≥160°F durante cocción.",
  },
  pork_belly: {
    title: "Pork Belly (Panceta de Cerdo)",
    definition: "Corte de cerdo del vientre del animal, alto en grasa. Requiere cocción controlada y enfriamiento rápido post-cocción. Producto principal de Latin Bites Factory.",
  },
  bunuelos: {
    title: "Buñuelos",
    definition: "Producto frito elaborado con masa. El CCP principal es la temperatura del aceite y el tiempo de fritura para asegurar cocción completa.",
  },
}
