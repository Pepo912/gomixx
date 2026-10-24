# Ruleta Gomixx — guía de instalación

Esta es una primera versión funcional de una ruleta web con códigos de compra de un solo uso y panel privado. Es gratis para probar con el plan gratuito de Supabase y un alojamiento estático gratuito. Los proveedores pueden cambiar sus límites y condiciones.

## Qué hace
- El panel privado crea un código único por pedido.
- El cliente introduce el código y pulsa “Girar”.
- El servidor valida el código, elige el premio, lo marca como usado y registra el resultado en una sola operación.
- El panel privado muestra las últimas 500 jugadas.
- Un código usado no permite otro giro.

**Importante:** el botón “Validar” de la página solo prepara el giro; la verificación real y segura sucede en el servidor cuando el cliente pulsa “Girar”. No se puede obtener un giro válido sin un código generado por el panel.

## 1. Crear el proyecto Supabase
1. Entrá en https://supabase.com/ y creá una cuenta/proyecto.
2. En el proyecto, abrí **SQL Editor**.
3. Copiá y ejecutá todo el archivo `supabase_setup.sql`.
4. En **Project Settings > API** (o Connect/API según la interfaz), copiá la URL del proyecto y la clave pública `anon`/`publishable`.
5. Pegalas en `config.js` en `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
6. No pongas nunca la clave `service_role` en los archivos de la web.

## 2. Crear el usuario administrador
1. En Supabase, abrí **Authentication > Users** y creá/invitá al usuario que usará el panel. Si el proveedor exige confirmar el correo, confirmalo.
2. Copiá el UUID/ID de ese usuario.
3. En SQL Editor ejecutá este comando, reemplazando el UUID por el ID real:

```sql
insert into public.admin_users(user_id)
values ('PEGAR-UUID-DEL-USUARIO')
on conflict (user_id) do nothing;
```

Solo los usuarios cuyo ID esté en `admin_users` pueden crear códigos y consultar resultados. Para darle acceso a tu novia, creá otro usuario y agregá también su UUID a esa tabla.

## 3. Probar en tu computadora
1. Dejá `index.html`, `admin.html`, `styles.css`, `app.js`, `admin.js` y `config.js` en la misma carpeta.
2. Abrí `admin.html` mediante un servidor local o publicalo en un alojamiento estático. Para una prueba rápida, podés usar la extensión Live Server de Visual Studio Code.
3. Iniciá sesión en `admin.html`, generá un código después de confirmar cada compra y enviáselo al cliente.
4. El cliente abre `index.html`, pega el código y pulsa “Girar”.
5. Volvé al panel y pulsá “Actualizar” para ver el resultado.

## 4. Publicar gratis
Podés subir la carpeta a un servicio de alojamiento estático, por ejemplo GitHub Pages o Netlify, siguiendo sus instrucciones actuales. Ambos archivos HTML deben publicarse en el mismo sitio. Si publicás en un repositorio público, recordá que `config.js` contiene la clave pública de Supabase, no una contraseña; la seguridad depende de las funciones y permisos SQL.

## 5. Personalizar los premios
Los premios iniciales se insertan desde `supabase_setup.sql` con el mismo peso (weight = 1). Para cambiar probabilidades, ejecutá SQL en el panel de Supabase. Ejemplo: un premio con peso 2 tiene el doble de probabilidad que otro con peso 1.

```sql
-- Ejemplo: ver los premios
select id, name, description, weight, active, sort_order
from public.prizes
order by sort_order;

-- Ejemplo: cambiar la probabilidad de un premio concreto
update public.prizes set weight = 2 where id = 1;
```

Para desactivar un premio, usá `active = false`. No borres premios que ya hayan sido ganados, porque el historial los referencia.

## Limitaciones y notas
- La ruleta es una base inicial. No verifica automáticamente una transferencia bancaria, un pedido de WhatsApp ni un comprobante: ustedes confirman el pago y generan el código desde el panel.
- El premio queda registrado, pero el canje del premio debe marcarse/controlarse manualmente en esta primera versión.
- El cliente puede ver el premio que devuelve el servidor, pero la animación visual no está vinculada todavía al sector exacto ganador. El resultado oficial es el que se muestra en el mensaje de premio, no el sector donde se detenga la rueda.
- No se ha añadido gestión de clientes, recuperación de contraseñas ni edición de premios desde la interfaz.
- Probá primero con códigos de prueba y premios sin valor antes de usarlo con clientes reales.
