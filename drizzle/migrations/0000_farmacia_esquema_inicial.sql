-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('gerente', 'cajero');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.tiene_acceso(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.existe_gerente()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'gerente')
$$;
GRANT EXECUTE ON FUNCTION public.existe_gerente() TO anon, authenticated;

CREATE POLICY "Ver perfil propio o gerente" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Editar perfil propio o gerente" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'gerente'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "Ver rol propio o gerente" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente asigna roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente modifica roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') AND user_id <> auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente elimina roles de otros" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') AND user_id <> auth.uid());

-- Nuevo usuario: crea perfil; el primero en registrarse es gerente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'nombre', ''), split_part(NEW.email, '@', 1)), NEW.email);
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'gerente') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gerente');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ===== Categorías =====
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal ve categorias" ON public.categorias FOR SELECT TO authenticated USING (public.tiene_acceso(auth.uid()));
CREATE POLICY "Gerente crea categorias" ON public.categorias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente edita categorias" ON public.categorias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gerente')) WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente elimina categorias" ON public.categorias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gerente'));

-- ===== Productos =====
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  existencia INTEGER NOT NULL DEFAULT 0 CHECK (existencia >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX productos_categoria_idx ON public.productos(categoria_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal ve productos" ON public.productos FOR SELECT TO authenticated USING (public.tiene_acceso(auth.uid()));
CREATE POLICY "Gerente crea productos" ON public.productos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente edita productos" ON public.productos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gerente')) WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente elimina productos" ON public.productos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gerente'));
CREATE TRIGGER productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Clientes =====
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cedula TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal ve clientes" ON public.clientes FOR SELECT TO authenticated USING (public.tiene_acceso(auth.uid()));
CREATE POLICY "Personal registra clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.tiene_acceso(auth.uid()));
CREATE POLICY "Gerente edita clientes" ON public.clientes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'gerente')) WITH CHECK (public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Gerente elimina clientes" ON public.clientes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'gerente'));

-- ===== Ventas =====
CREATE TABLE public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ventas_created_idx ON public.ventas(created_at);
CREATE INDEX ventas_usuario_idx ON public.ventas(usuario_id);
GRANT SELECT ON public.ventas TO authenticated;
GRANT ALL ON public.ventas TO service_role;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerente ve todas, cajero las suyas" ON public.ventas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') OR (usuario_id = auth.uid() AND public.tiene_acceso(auth.uid())));

CREATE TABLE public.venta_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  producto_nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);
CREATE INDEX venta_detalles_venta_idx ON public.venta_detalles(venta_id);
CREATE INDEX venta_detalles_producto_idx ON public.venta_detalles(producto_id);
GRANT SELECT ON public.venta_detalles TO authenticated;
GRANT ALL ON public.venta_detalles TO service_role;
ALTER TABLE public.venta_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver detalle de ventas visibles" ON public.venta_detalles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ventas v WHERE v.id = venta_id));

-- Registrar venta: usa el precio real del producto y descuenta existencia
CREATE OR REPLACE FUNCTION public.registrar_venta(_cliente_id UUID, _metodo_pago TEXT, _items JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
  v_total NUMERIC(12,2) := 0;
  v_item JSONB;
  v_qty INTEGER;
  p public.productos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.tiene_acceso(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para registrar ventas';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'La venta no tiene productos';
  END IF;
  IF _metodo_pago NOT IN ('efectivo', 'tarjeta', 'transferencia') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;

  INSERT INTO public.ventas (cliente_id, usuario_id, metodo_pago, total)
  VALUES (_cliente_id, auth.uid(), _metodo_pago, 0) RETURNING id INTO v_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'cantidad')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    SELECT * INTO p FROM public.productos WHERE id = (v_item->>'producto_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
    IF p.existencia < v_qty THEN
      RAISE EXCEPTION 'Existencia insuficiente para "%": disponible %', p.nombre, p.existencia;
    END IF;
    IF p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < (now() AT TIME ZONE 'America/Managua')::date THEN
      RAISE EXCEPTION 'El producto "%" está vencido y no puede venderse', p.nombre;
    END IF;
    INSERT INTO public.venta_detalles (venta_id, producto_id, producto_nombre, cantidad, precio_unitario, subtotal)
    VALUES (v_id, p.id, p.nombre, v_qty, p.precio, p.precio * v_qty);
    UPDATE public.productos SET existencia = existencia - v_qty WHERE id = p.id;
    v_total := v_total + p.precio * v_qty;
  END LOOP;

  UPDATE public.ventas SET total = v_total WHERE id = v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.registrar_venta(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, TEXT, JSONB) TO authenticated;

-- ===== Reportes (respetan los permisos de cada usuario) =====
CREATE OR REPLACE FUNCTION public.reporte_ventas_diarias(_desde DATE, _hasta DATE)
RETURNS TABLE (dia DATE, total NUMERIC, num_ventas BIGINT)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (v.created_at AT TIME ZONE 'America/Managua')::date AS dia, SUM(v.total), COUNT(*)
  FROM public.ventas v
  WHERE (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
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
  WHERE (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
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
  WHERE (v.created_at AT TIME ZONE 'America/Managua')::date BETWEEN _desde AND _hasta
  GROUP BY 1 ORDER BY 3 DESC
$$;

CREATE OR REPLACE FUNCTION public.dashboard_resumen()
RETURNS JSON LANGUAGE sql STABLE SET search_path = public AS $$
  WITH hoy AS (SELECT (now() AT TIME ZONE 'America/Managua')::date AS d)
  SELECT json_build_object(
    'ventas_hoy', COALESCE((SELECT SUM(total) FROM public.ventas, hoy WHERE (created_at AT TIME ZONE 'America/Managua')::date = hoy.d), 0),
    'num_ventas_hoy', (SELECT COUNT(*) FROM public.ventas, hoy WHERE (created_at AT TIME ZONE 'America/Managua')::date = hoy.d),
    'ventas_mes', COALESCE((SELECT SUM(total) FROM public.ventas, hoy WHERE date_trunc('month', (created_at AT TIME ZONE 'America/Managua')::date) = date_trunc('month', hoy.d)), 0),
    'num_ventas_mes', (SELECT COUNT(*) FROM public.ventas, hoy WHERE date_trunc('month', (created_at AT TIME ZONE 'America/Managua')::date) = date_trunc('month', hoy.d)),
    'total_productos', (SELECT COUNT(*) FROM public.productos),
    'valor_inventario', COALESCE((SELECT SUM(precio * existencia) FROM public.productos), 0),
    'stock_bajo', (SELECT COUNT(*) FROM public.productos WHERE existencia <= stock_minimo),
    'por_vencer', (SELECT COUNT(*) FROM public.productos, hoy WHERE fecha_vencimiento IS NOT NULL AND fecha_vencimiento < hoy.d + 30),
    'total_clientes', (SELECT COUNT(*) FROM public.clientes)
  )
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_ventas_diarias(DATE, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reporte_productos(DATE, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reporte_categorias(DATE, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dashboard_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reporte_ventas_diarias(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_productos(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_categorias(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_resumen() TO authenticated;

-- Categorías iniciales de farmacia
INSERT INTO public.categorias (nombre, descripcion) VALUES
  ('Analgésicos', 'Medicamentos para el dolor y la fiebre'),
  ('Antibióticos', 'Requieren receta médica'),
  ('Antigripales', 'Tratamiento de resfriados y gripe'),
  ('Vitaminas y suplementos', 'Multivitamínicos y suplementos'),
  ('Cuidado personal', 'Higiene y cuidado personal'),
  ('Material de curación', 'Gasas, vendas, alcohol y similares');