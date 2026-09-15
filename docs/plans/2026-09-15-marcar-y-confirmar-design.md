# Selector en dos pasos: marcar y confirmar

**Fecha:** 2026-09-15 · **Ámbito:** `content.js` (barra del selector), tests, README y fichas de la tienda.

## Problema

Hoy el primer clic sobre un elemento lo oculta al instante y el marco azul sigue al ratón. Los botones
**Ampliar** / **Reducir** de la barra apenas tienen sentido: para llegar a ellos hay que cruzar la página y
la selección cambia por el camino, y quien hace clic "para probar" ya se ha cargado el bloque.

## Diseño

Un clic **marca**; un segundo gesto **confirma**. Estados del selector:

| Estado | Marco | Ratón | Barra |
|---|---|---|---|
| Señalando | 2 px, sigue al puntero | cambia la selección | **Ocultar** deshabilitado, texto «Señala y haz clic para marcar» |
| Marcado | 3 px con halo y etiqueta «Marcado · otro clic para ocultar» | ya no cambia la selección | **Ocultar** habilitado, aviso «Marcado. Confírmalo con otro clic encima, con Ocultar o con Enter. Esc lo desmarca.» |

Transiciones:

- **Clic** sobre un elemento sin marca → lo marca. Con marca: clic **dentro** del marcado → confirma; clic
  **fuera** → mueve la marca al nuevo elemento (se reinicia la pila de Reducir).
- **Enter** hace lo mismo que el clic sobre la selección actual: marca si no hay marca, confirma si la hay.
- **↑ / Ampliar** sobre un elemento solo señalado lo marca y amplía, para que no se pierda al mover el ratón.
  **↓ / Reducir** solo tiene pila con marca.
- **Ocultar** (botón nuevo, primario, atajo Enter) confirma.
- **Esc** con marca la quita y vuelve a señalar; sin marca cierra el selector, como hasta ahora.
- Al confirmar o al cerrar, se vuelve al estado «señalando». Si la ocultación falla, la marca se conserva
  para poder ampliar y reintentar.

Disposición: bajo el título va una tarjeta con el elemento (tipo y texto completos y, debajo, su etiqueta
HTML, tamaño, si flota y cuántas imágenes, vídeos y enlaces contiene; el aviso de estructura aparece dentro de
la tarjeta) y después la fila `[↑ Ampliar] [↓ Reducir] [↺ Deshacer] … [Ocultar ⏎]`. En anchos ≤ 520 px las
acciones ocupan la primera línea y **Ocultar** pasa a la segunda.

## Alternativas descartadas

- **Enter oculta directamente** (sin marcar): más rápido con teclado, pero rompe la regla única
  «primer gesto marca, segundo confirma» y deja **Ocultar** deshabilitado mientras Enter sí funciona.
- **Botón Cancelar** en la barra: Esc ya lo cubre y la fila no tiene sitio en pantallas estrechas.
- **Marco secundario al pasar el ratón con marca activa**: ruido visual; un clic fuera ya mueve la marca.

## Pruebas

- Primer clic marca (sigue visible, **Ocultar** habilitado, mover el ratón no cambia la descripción);
  segundo clic oculta sin navegar.
- Clic fuera mueve la marca; Esc la quita sin cerrar; Enter marca; **Ocultar** confirma; Esc sin marca cierra.
- Flujos existentes: ↑ + Enter sigue ocultando; Enter sobre lo señalado pasa a necesitar dos pulsaciones.
- La barra sigue cabiendo en 320 px; la tarjeta conserva su altura sin selección y la barra solo crece con el aviso de estructura o la marca.
