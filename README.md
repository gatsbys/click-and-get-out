# Click and get out

Extensión de Chrome en español para ocultar componentes de una web señalándolos con el ratón. Sin compilación, cuentas, servicios externos ni dependencias en producción.

## Instalar

1. Abre `chrome://extensions` en Chrome.
2. Activa **Modo de desarrollador** arriba a la derecha.
3. Pulsa **Cargar descomprimida** y selecciona esta carpeta, `click-and-get-out`, que contiene `manifest.json`.
4. Fija **Click and get out** desde el botón de extensiones (la pieza de puzle).

Si recibes `dist/click-and-get-out.zip`, descomprímelo primero y selecciona la carpeta `click-and-get-out` extraída. Conserva esa carpeta: Chrome carga los archivos desde ahí. No necesitas Node ni instalar paquetes para usar la extensión.

## Actualizar desde la versión anterior

Sustituye los archivos en la misma carpeta que ya cargaste y pulsa **Recargar** en la tarjeta de Click and get out dentro de `chrome://extensions`. Después recarga las webs abiertas. Mantener la misma carpeta conserva el identificador de la extensión y sus reglas guardadas.

La versión **1.2.0** añade un interruptor en cada elemento guardado para desactivar su regla sin borrarla, un botón de papelera para eliminarla y, en la barra flotante, la lista de lo que llevas ocultado en esa visita. Las reglas guardadas con versiones anteriores se conservan y siguen activas.

La versión **1.1.0** incorpora un menú compacto y una barra flotante con tema claro/oscuro automático según el sistema. Los permisos y las reglas siguen siendo los mismos. El selector CSS está disponible como información secundaria al pasar el cursor por la descripción del elemento.

## Quitar un aviso como el de Sport

1. Abre la web, pulsa el icono de Click and get out y elige **Seleccionar elemento**.
2. Señala el aviso. El marco azul muestra exactamente qué bloque vas a ocultar.
3. Si solo se marca el texto, pulsa **↑** para ampliar la selección al contenedor. **↓** vuelve a la selección anterior. También hay botones en la barra.
4. Haz clic o pulsa **Enter** para ocultar. Puedes seguir quitando bloques: la barra los va listando debajo, con la etiqueta **Guardado** o **Esta visita** según el modo, y **Deshacer** retira el último de esa lista.
5. Pulsa **Esc** o **Terminar** para volver a navegar normalmente.

**Recordar en esta web** guarda las reglas para futuras visitas y pide permiso únicamente para ese sitio. Sin marcarlo, el cambio dura hasta recargar esa pestaña. Las reglas se comparten entre páginas del mismo origen (protocolo, host y puerto); `sport.es` y `www.sport.es` son sitios distintos.

Como el permiso es por sitio, cada web nueva estrena su propio diálogo la primera vez que marcas «Recordar». Si prefieres no volver a verlo, el enlace **Permitir en todas** bajo esa opción concede el acceso una sola vez para cualquier web; el mismo enlace pasa a **Quitar** para retirarlo. Sigue siendo opcional: la extensión nunca lo pide por su cuenta.

Cuando una web tiene cambios guardados, el icono de la extensión lleva una marca verde con el número de elementos ocultos en ella; el texto emergente da el detalle. Si no hay nada activo en esa web, el icono queda limpio.

Si al quitar el aviso no puedes desplazarte, activa **Recuperar desplazamiento** en el menú. Es una opción independiente, reversible; también puede recordarse. Ajusta el overflow, la posición y la altura de los contenedores raíz de la página. Si altera su diseño, desactívala.

El menú lista los elementos guardados de la web que tengas abierta, cada uno con un interruptor y una papelera:

- **Interruptor:** desactiva la regla sin borrarla. El elemento vuelve a verse al momento en las pestañas abiertas de ese origen y también en las próximas visitas, hasta que lo actives de nuevo. Si vuelves a ocultar ese mismo elemento con el selector, la regla se reactiva.
- **Papelera:** elimina la regla guardada y vuelve a mostrar sus coincidencias en las páginas abiertas de ese origen.
- **Deshacer:** revierte la última ocultación hecha en esa visita; si esa ocultación reactivó una regla desactivada, la vuelve a desactivar.
- **Restaurar web:** elimina todas las reglas, activas y desactivadas, y el desbloqueo guardados de ese origen; además limpia los cambios temporales de la pestaña actual. Las otras pestañas conservan sus cambios temporales hasta recargarlas.

## Alcance y límites

Oculta elementos que ya están en la página. No detiene descargas de anuncios ni desactiva la detección de bloqueadores. Tampoco recupera contenido que la web no haya entregado.

Intenta identificar bloques por ID, atributos o clases; cuando no hay una identificación única, usa una ruta estructural. La barra avisa si esa ruta depende de la estructura de la página. Si la web cambia su diseño, una regla puede dejar de servir o afectar a un bloque diferente: desactiva o elimina esa regla y vuelve a seleccionarlo. Las reglas se vuelven a aplicar si la web reinserta elementos o cambia su estilo.

El selector trabaja en el documento principal. No selecciona elementos internos de iframes ni de Shadow DOM; puedes seleccionar su contenedor externo cuando sea accesible. Los diálogos nativos en la capa superior, el visor PDF, Chrome Web Store y las páginas internas del navegador no están cubiertos. Algunas webs pueden interferir con el selector o volver a bloquear la navegación mediante JavaScript.

En Sport se ha identificado un banner cuyas clases cambian de prefijo numérico entre cargas. La versión 1.1.2 usa su sufijo semántico estable en lugar de su posición dentro del documento. Las reglas antiguas guardadas por posición se deben volver a seleccionar para adoptar este criterio; no se sustituyen automáticamente por coincidencias de texto. La navegación inferior conserva su regla por ID.

## Privacidad y permisos

- `activeTab`: acceso temporal a la pestaña cuando utilizas la extensión.
- `scripting`: inserta el selector y aplica tus reglas.
- `storage`: guarda las reglas localmente en el perfil de Chrome.
- Permisos opcionales `http/https`: solo se solicitan para los sitios donde eliges recordar cambios, o para todas las webs a la vez si usas **Permitir en todas**.

La marca verde del icono no añade permisos: Chrome solo revela la dirección de una pestaña cuando ya has concedido acceso a ese sitio, que es justo donde puede haber reglas guardadas. En el resto de webs la extensión no ve la dirección y el icono queda sin marca.

No hay peticiones de red, analítica ni envío de datos desde la extensión. Las reglas contienen selectores y una etiqueta breve tomada del bloque seleccionado. No se sincronizan a una cuenta. Restaurar una web limpia sus reglas; el permiso concedido puede retirarse desde **Detalles → Acceso al sitio** en Chrome. Desinstalar elimina el almacenamiento local de la extensión.

Referencia: [permisos de Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) y [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

## Desarrollo y comprobación

Requiere Node 22 o posterior para las herramientas de desarrollo.

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run pack
```

`npm run pack` requiere la utilidad `zip` (incluida en macOS y habitualmente disponible en Linux). Genera tres salidas con los mismos archivos, solo los necesarios para instalar:

- `dist/click-and-get-out/` es esa misma carpeta ya descomprimida, lista para **Cargar descomprimida**. Es la más cómoda para probar: cárgala una vez y después de cada `npm run pack` basta con pulsar **Recargar** en `chrome://extensions`. La ruta no cambia, así que la extensión conserva su identificador y sus reglas guardadas.
- `dist/click-and-get-out.zip` contiene la carpeta `click-and-get-out`. Es el que se comparte para instalar a mano: se descomprime y se carga la carpeta extraída.
- `dist/click-and-get-out-store.zip` tiene `manifest.json` en la raíz del archivo. Es el que acepta Chrome Web Store, que rechaza un ZIP con el manifest dentro de una carpeta.

En Windows puedes comprimir esos archivos manualmente o cargar esta carpeta directamente.

Las pruebas cargan la extensión en Chromium real con un perfil temporal y una página local. Cubren selección de contenedor, clic sin navegación, estilos `!important`, recarga, reinserción, escrituras simultáneas, aislamiento por origen, restauración del scroll, controles del popup, desactivación y borrado de reglas guardadas, lista de ocultados en la barra flotante, y recuperación de cambios. También verifican ambos temas, teclado, tamaño del menú, listas largas, errores, advertencias de selección estructural y ventanas estrechas; generan capturas en `test-results/`. El manifest de prueba concede acceso solamente a la página local; el diálogo nativo para conceder/denegar permisos opcionales y la activación real de `activeTab` desde la barra de Chrome requieren comprobación manual.

Comprobación manual con la extensión instalada: en una web sin permiso previo, probar el modo temporal; después marcar «Recordar», aceptar el permiso de ese sitio y comprobar recarga; en otra web, denegar el permiso y comprobar que el modo temporal sigue disponible.

## Web de demostración

`npm run demo` sirve en `http://localhost:4173` un periódico ficticio, **EL CENIT**, saturado de barra de suscripción, muro de cookies, vídeo flotante, anuncios y contenido patrocinado: nueve bloques pensados para que el selector tenga algo que quitar. `demo/en.html` es la misma edición en inglés, **THE ZENITH**. Ambas comparten `demo/newspaper.css` y `demo/demo.js`; ni el medio, ni las marcas, ni las personas que aparecen existen.

Dos parámetros ayudan a probar casos concretos:

- `?modal=1` abre el aviso de boletín que bloquea el scroll, para comprobar **Recuperar desplazamiento**.
- `?clean=1` esconde el ruido sin la extensión, para comparar de un vistazo.

## Capturas para la ficha

`npm run shots` carga la extensión real en Chromium sobre esa demo y genera en `store/screenshots/es/` y `store/screenshots/en/` las cuatro imágenes a 1280×800 que pide la tienda: la página con el ruido, el selector encuadrando un anuncio, la página ya limpia y el menú con los elementos guardados. De paso comprueba que los nueve bloques de la demo se resuelven con selectores estables; si alguno pasa a depender de la estructura de la página, el script falla.

## Publicación en Chrome Web Store

`store/LISTING.md` reúne los textos de la ficha (título, descripciones, propósito único y justificación de cada permiso) listos para pegar en el Panel de desarrollador. `store/PRIVACY.md` es la política de privacidad, que hay que publicar en una URL pública para poder enlazarla desde la ficha. `store/LISTING.en.md` y `store/PRIVACY.en.md` son sus equivalentes en inglés.

Sube `dist/click-and-get-out-store.zip`, no el otro: la tienda rechaza un ZIP cuyo `manifest.json` no esté en la raíz.
