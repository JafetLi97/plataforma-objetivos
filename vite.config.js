import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: 'base' debe coincidir con el nombre EXACTO de tu repositorio en GitHub.
// La app quedará publicada en: https://<tu-usuario>.github.io/plataforma-objetivos/
// Si tu repo se llama distinto, cambia esta línea (deja las barras /).
export default defineConfig({
  plugins: [react()],
  base: '/plataforma-objetivos/',
})
