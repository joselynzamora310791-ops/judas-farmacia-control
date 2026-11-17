CREATE OR REPLACE FUNCTION public.dashboard_resumen()
RETURNS JSON LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  hoy DATE := (now() AT TIME ZONE 'America/Managua')::date;
  r JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'gerente') THEN
    RAISE EXCEPTION 'Solo el gerente puede ver el dashboard' USING ERRCODE = '42501';
  END IF;
  SELECT json_build_object(
    'ventas_hoy', COALESCE((SELECT SUM(total) FROM public.ventas WHERE (created_at AT TIME ZONE 'America/Managua')::date = hoy), 0),
    'num_ventas_hoy', (SELECT COUNT(*) FROM public.ventas WHERE (created_at AT TIME ZONE 'America/Managua')::date = hoy),
    'ventas_mes', COALESCE((SELECT SUM(total) FROM public.ventas WHERE date_trunc('month', (created_at AT TIME ZONE 'America/Managua')::date) = date_trunc('month', hoy)), 0),
    'num_ventas_mes', (SELECT COUNT(*) FROM public.ventas WHERE date_trunc('month', (created_at AT TIME ZONE 'America/Managua')::date) = date_trunc('month', hoy)),
    'total_productos', (SELECT COUNT(*) FROM public.productos),
    'valor_inventario', COALESCE((SELECT SUM(precio * existencia) FROM public.productos), 0),
    'stock_bajo', (SELECT COUNT(*) FROM public.productos WHERE existencia <= stock_minimo),
    'por_vencer', (SELECT COUNT(*) FROM public.productos WHERE fecha_vencimiento IS NOT NULL AND fecha_vencimiento < hoy + 30),
    'total_clientes', (SELECT COUNT(*) FROM public.clientes)
  ) INTO r;
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.reporte_ventas_diarias(_desde DATE, _hasta DATE)
RETURNS TABLE (dia DATE, total NUMERIC, num_ventas BIGINT)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (v.created_at AT TIME ZONE 'America/Managua')::date AS dia, SUM(v.total), COUNT(*)
  FROM public.ventas v
  WHERE public.has_role(auth.uid(), 'gerente')
    AND (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
  GROUP BY 1 ORDER BY 1
$$;

CREATE OR REPLACE FUNCTION public.reporte_productos(_desde DATE, _hasta DATE)
RETURNS TABLE (producto_id UUID, codigo TEXT, nombre TEXT, categoria TEXT, cantidad BIGINT, ingresos NUMERIC)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT d.producto_id, p.codigo, COALESCE(p.nombre, MAX(d.producto_nombre)), c.nombre,
         SUM(d.cantidad)::BIGINT, SUM(d.subtotal)
  FROM public.venta_detalles d
  JOIN public.ventas v ON v.id = d.venta_id
  LEFT JOIN public.productos p ON p.id = d.producto_id
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE public.has_role(auth.uid(), 'gerente')
    AND (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
  GROUP BY d.producto_id, p.codigo, p.nombre, c.nombre
  ORDER BY SUM(d.subtotal) DESC
$$;

CREATE OR REPLACE FUNCTION public.reporte_categorias(_desde DATE, _hasta DATE)
RETURNS TABLE (categoria TEXT, cantidad BIGINT, ingresos NUMERIC)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(c.nombre, 'Sin categoría'), SUM(d.cantidad)::BIGINT, SUM(d.subtotal)
  FROM public.venta_detalles d
  JOIN public.ventas v ON v.id = d.venta_id
  LEFT JOIN public.productos p ON p.id = d.producto_id
  LEFT JOIN public.categorias c ON c.id = p.categoria_id
  WHERE public.has_role(auth.uid(), 'gerente')
    AND (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
  GROUP BY 1 ORDER BY 3 DESC
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_resumen() TO authenticated;