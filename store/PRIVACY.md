# Política de privacidad — Click and get out

**Última actualización:** 15 de septiembre de 2026

## Resumen

Click and get out no recopila, no transmite y no vende ningún dato. La
extensión no realiza ninguna petición de red. No hay servidores, ni cuentas, ni
analítica, ni identificadores de seguimiento.

## Qué datos se guardan

Cuando eliges ocultar un bloque y marcas «Recordar en esta web», la extensión
guarda, asociado al origen de ese sitio (protocolo, host y puerto):

- El **selector CSS** que identifica el bloque elegido.
- Una **etiqueta breve** (máximo 100 caracteres) tomada del texto o del
  `aria-label` de ese bloque, para que puedas reconocer la regla en la lista.
- Si marcas o no la opción de **recuperar el desplazamiento** en ese sitio.
- La fecha en que creaste la regla.

Si no marcas «Recordar en esta web», no se guarda nada: el cambio vive en
memoria y desaparece al recargar la pestaña.

## Dónde se guardan

Exclusivamente en el almacenamiento local de la extensión dentro de tu perfil de
Chrome (`chrome.storage.local`), en tu propio dispositivo. Estos datos:

- **No** se envían a ningún servidor.
- **No** se sincronizan con tu cuenta de Google ni entre dispositivos.
- **No** se comparten con terceros.
- **No** se usan para publicidad, perfilado ni ningún fin distinto de volver a
  ocultar los bloques que elegiste.

## Permisos y por qué se piden

- `activeTab`: acceso temporal a la pestaña activa, solo en el momento en que
  pulsas el icono de la extensión.
- `scripting`: insertar el selector de elementos y aplicar tus reglas.
- `storage`: guardar tus reglas localmente.
- Permisos de sitio opcionales (`http://*/*`, `https://*/*`): **no** se piden al
  instalar. Se solicitan sitio por sitio, únicamente cuando marcas «Recordar en
  esta web». Si te cansa concederlos uno a uno, el enlace «Permitir en todas»
  del menú los pide una sola vez para cualquier web; es una elección tuya y el
  mismo enlace los retira. El acceso concedido no cambia lo que hace la
  extensión: sigue sin haber peticiones de red ni envío de datos.

## Tu control sobre los datos

- El **interruptor** de cada elemento desactiva su regla sin borrarla; el dato
  guardado se conserva hasta que la elimines.
- La **papelera** elimina una regla concreta.
- **Restaurar web** borra todas las reglas guardadas de ese sitio, activas y
  desactivadas.
- Puedes retirar el permiso de un sitio desde `chrome://extensions` →
  **Detalles** → **Acceso al sitio**. Al retirarlo, la extensión deja de
  registrar su script en ese sitio.
- **Desinstalar la extensión** elimina todo su almacenamiento local.

## Código remoto

La extensión no descarga ni ejecuta código remoto. Todo el código se distribuye
dentro del paquete publicado en Chrome Web Store.

## Cambios en esta política

Si en el futuro cambia el tratamiento de datos, esta página se actualizará y la
fecha de la cabecera reflejará la revisión.

## Contacto

Para cualquier duda sobre esta política, abre un *issue* en el repositorio
público del proyecto: https://github.com/gatsbys/click-and-get-out/issues
