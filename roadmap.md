# Roadmap — Farmacia San Judas SIG

- [x] Eliminar por solicitud las facturas anteriores 000001 y 000003 y sus cinco detalles, restituyendo seis unidades al inventario
- [x] Verificar 30 ventas y 60 detalles conservados, 10 por mes y noviembre con 10 incluso sin filtrar demostración, en teléfono y escritorio

- [x] Cambiar el título a Demostración y mostrar por defecto las 30 ventas, separadas de las ventas ordinarias, sin modificar datos
- [x] Verificar 10 ventas de demostración por mes y conservar acceso al historial completo

- [x] Registrar exactamente 30 ventas de demostración, 10 por mes, sin duplicados y con inventario coherente
- [x] Consultar historial por fecha, mes, producto y cajero; mostrar resumen mensual de demostración
- [x] Verificar facturas, detalles, existencias y consultas en pantalla

- [x] Diagnosticar acceso del cajero: cuenta confirmada, rol cajero y apertura de Ventas verificados; el intento de ingreso falla por credenciales incorrectas
- [ ] Cajero establece una nueva contraseña mediante recuperación o edición por el gerente y verifica ingreso (requiere acción del usuario; no cambiar credenciales sin su autorización)

- [x] Editar nombre, correo y contraseña sin cambiar roles existentes
- [x] Eliminar usuarios con confirmación y bloqueo de eliminación propia
- [x] Probar edición, eliminación y conservación de permisos

- [x] Módulo Análisis ABC de productos (página, gráfico Pareto, tabla, CSV)
- [x] Módulo Usuarios y roles (lista, cambiar rol, crear cajeros/gerentes)
- [x] Pruebas de reglas: permisos por rol, alertas de inventario, clasificación ABC, formato C$
- [x] ABC expresado como contribución al valor de consumo
- [x] Pruebas funcionales completas: login gerente, crear cajero, login cajero, registrar producto, venta, navegación ABC, rutas protegidas
- [x] Dashboard y reportes bloqueados para el cajero también en la base de datos
