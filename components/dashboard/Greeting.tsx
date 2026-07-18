"use client"

import { useEffect, useState } from "react"

/**
 * Saludo calculado en el reloj del NAVEGADOR del usuario, no en el servidor.
 * (El server de Vercel corre en UTC — decía "Buenos días" a las 10pm de Florida.)
 */
export function Greeting({ name }: { name: string }) {
  // Evita hydration mismatch: primer render neutro, luego el saludo real.
  const [greeting, setGreeting] = useState("Hola")

  useEffect(() => {
    const hour = new Date().getHours()
    setGreeting(hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches")
  }, [])

  return (
    <>
      {greeting}, {name} <span className="inline-block">👋</span>
    </>
  )
}
