ALTER TABLE public.ventas ADD COLUMN demo_lote text, ADD COLUMN demo_ordinal integer, ADD COLUMN usuario_nombre text;
CREATE UNIQUE INDEX ventas_demo_lote_ordinal_unique ON public.ventas(demo_lote, demo_ordinal) WHERE demo_lote IS NOT NULL;
COMMENT ON COLUMN public.ventas.demo_lote IS 'Lote de ventas de demostración; NULL en ventas ordinarias';
COMMENT ON COLUMN public.ventas.usuario_nombre IS 'Nombre del cajero al registrar una demostración, para conservar identificación histórica';