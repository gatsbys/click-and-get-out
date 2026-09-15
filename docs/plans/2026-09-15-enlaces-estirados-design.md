# Enlaces estirados: señalar lo que se ve, no lo que recibe el evento

**Fecha:** 2026-09-15 · **Ámbito:** `content.js` (resolución del elemento bajo el puntero), fixture y test.

## Problema

En as.com el ratón está sobre la foto y el marco rodea el titular. Cada tarjeta es un `<article>` con
`position:relative` y el `<a>` del titular lleva `::after { content:""; position:absolute; inset:0; z-index:1 }`:
una capa invisible que hace clicable toda la tarjeta (el mismo patrón que `stretched-link` de Bootstrap).
Los pseudoelementos no pueden ser objetivo de un evento, así que Chrome atribuye el `pointermove` al `<a>`,
cuya caja (las líneas del titular) ni siquiera contiene el puntero. En la portada de as.com hay más de cien
tarjetas así; la foto nunca es alcanzable y ↑/↓ tampoco llegan a ella porque `figure` es rama hermana.

## Diseño

Una función `under(event)` que devuelve el elemento a seleccionar:

1. Si la caja de `event.target` contiene el puntero, es un toque normal: se usa tal cual.
2. Si no, el toque ha llegado a través de un pseudoelemento. `document.elementsFromPoint` devuelve la pila
   completa bajo ese punto (el `<a>`, la imagen, su envoltorio, la `figure`, la tarjeta…); se toma el primer
   elemento, que no sea la barra del selector, cuya caja sí contiene el puntero. Si no hay ninguno, se conserva
   el original.

Se aplica tanto al mover el ratón como al clic (marcar y confirmar), para que el segundo clic sobre la foto
confirme la foto y no vuelva a marcar el titular. El resto del flujo no cambia: sobre el texto del titular la
caja del `<a>` contiene el puntero y se selecciona el enlace, como siempre.

## Alternativas descartadas

- **Detectar el `::after` por sus estilos** (`position:absolute` + `inset:0`): más específico y más frágil;
  la comprobación de la caja cubre cualquier pseudoelemento que sobresalga.
- **Saltar en Ampliar los ancestros con la misma caja** (imagen → envoltorio → figure): menos pulsaciones, pero
  la barra ya muestra el cambio de elemento y el paso a paso es predecible.
- **Tratar también los `<a>` reales superpuestos** (`position:absolute; inset:0` sin pseudoelemento): la
  caja sí contiene el puntero y distinguir una capa invisible de un elemento vacío legítimo exige heurísticas
  con falsos positivos. Queda como límite conocido.

## Pruebas

La página de prueba incorpora una tarjeta con enlace estirado. Sobre la miniatura y la descripción se
selecciona lo que se ve; sobre el texto del titular, el enlace. Dos clics sobre la miniatura la ocultan
sin navegar y sin tocar el titular; Deshacer la devuelve.
