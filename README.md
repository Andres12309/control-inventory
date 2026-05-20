# Control de inventario — Autorepuestos

App móvil (Expo) para inventario rápido en local, con SQLite offline, sincronización en red local y exportación a Excel.

## Columnas del Excel

| Código de producto | Descripción de producto | Unidad de medida | Stock | Precio proveedor / Costo | Precio de venta al público | Marca | Familia |
|--------------------|-------------------------|------------------|-------|--------------------------|----------------------------|-------|---------|

Al importar se aceptan abreviaturas y variantes (codpro, PRECIO PROV., etc.).

`marca` y `familia` son opcionales. Las familias son configurables (Frenos, Motor, Lubricantes, etc.).

## Inicio rápido

```bash
npm install
npx expo start
```

Escanea el QR con **Expo Go** en Android/iOS.

## Flujo de trabajo recomendado

1. **Antes del inventario**: en *Familias*, revisa o agrega categorías (Frenos, Suspensión, etc.).
2. **Carga catálogo**: importa Excel en *Más* o crea productos en *Catálogo* (códigos siempre en MAYÚSCULAS).
3. **Conteo**: filtra familia → escribe código → si no existe aparece *Crear y contar* → en una pantalla editas stock, costo, PVP y demás → *Guardar y otro código*.
4. **Varios teléfonos**: en un PC de la tienda ejecuta el coordinador LAN (abajo) y en *Más* cada móvil configura la IP y pulsa *Sincronizar*.
5. **Cierre**: *Más* → *Exportar inventario (.xlsx)* y comparte el archivo.

## Sincronización LAN (sin nube)

En un PC conectado al mismo WiFi del local:

```bash
npm run sync-server
```

Copia la URL que muestra (ej. `http://192.168.1.50:8787`) en cada teléfono → pestaña *Más* → *IP del coordinador* → *Sincronizar ahora*.

El servidor fusiona conteos por producto usando la fecha `updated_at` (gana el más reciente).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npx expo start` | App móvil |
| `npm run sync-server` | Coordinador en red local |
| `npm run lint` | Linter |

## Tecnologías

- **expo-sqlite** — base de datos local
- Entrada manual del **código del fabricante/cartón** (ideal para repuestos con distintos códigos de barras)
- **xlsx** — exportación Excel
- **Express + better-sqlite3** — coordinador LAN opcional
