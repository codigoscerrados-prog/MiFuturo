-- 1) Tabla de complejos (centros deportivos)
CREATE TABLE IF NOT EXISTS public.complejos (
  id              BIGSERIAL PRIMARY KEY,
  nombre          VARCHAR(160) NOT NULL,
  descripcion     TEXT,
  direccion       VARCHAR(240),
  distrito        VARCHAR(120),
  provincia       VARCHAR(120),
  departamento    VARCHAR(120),
  latitud         DOUBLE PRECISION,
  longitud        DOUBLE PRECISION,

  -- Amenities del complejo
  techada         BOOLEAN NOT NULL DEFAULT FALSE,
  iluminacion     BOOLEAN NOT NULL DEFAULT TRUE,
  vestuarios      BOOLEAN NOT NULL DEFAULT FALSE,
  estacionamiento BOOLEAN NOT NULL DEFAULT FALSE,
  cafeteria       BOOLEAN NOT NULL DEFAULT FALSE,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  owner_id        BIGINT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_by      BIGINT NULL REFERENCES public.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Relación: una cancha pertenece a un complejo
ALTER TABLE public.canchas
  ADD COLUMN IF NOT EXISTS complejo_id BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'canchas_complejo_fk'
  ) THEN
    ALTER TABLE public.canchas
      ADD CONSTRAINT canchas_complejo_fk
      FOREIGN KEY (complejo_id) REFERENCES public.complejos(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Nota: NO borro columnas antiguas de canchas para no romperte nada.
-- Luego, cuando migres data, podemos limpiar columnas antiguas.
