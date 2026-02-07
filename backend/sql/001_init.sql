-- =========
-- USERS (mejorada)
-- =========
CREATE TABLE IF NOT EXISTS public.users (
  id              BIGSERIAL PRIMARY KEY,
  role            VARCHAR(20)  NOT NULL DEFAULT 'usuario', -- usuario | propietario | admin
  first_name      VARCHAR(80)  NOT NULL,
  last_name       VARCHAR(80)  NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255) NOT NULL,
  business_name   VARCHAR(120),
  phone           VARCHAR(40),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- (opcional) constraint simple de roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_role_check CHECK (role IN ('usuario','propietario','admin'));
  END IF;
END$$;

-- =========
-- CANCHAS (subidas por el admin, owner_id puede ser NULL)
-- =========
CREATE TABLE IF NOT EXISTS public.canchas (
  id              BIGSERIAL PRIMARY KEY,
  nombre          VARCHAR(140) NOT NULL,
  descripcion     TEXT,
  direccion       VARCHAR(220),
  distrito        VARCHAR(120),
  provincia       VARCHAR(120),
  departamento    VARCHAR(120),

  -- Preparado para "cerca de mí"
  latitud         DOUBLE PRECISION,
  longitud        DOUBLE PRECISION,

  tipo            VARCHAR(20)  NOT NULL, -- Fútbol 5/7/11
  pasto           VARCHAR(20)  NOT NULL, -- Sintético/Híbrido
  precio_hora     NUMERIC(10,2) NOT NULL DEFAULT 0,

  techada         BOOLEAN NOT NULL DEFAULT FALSE,
  iluminacion     BOOLEAN NOT NULL DEFAULT TRUE,
  vestuarios      BOOLEAN NOT NULL DEFAULT FALSE,
  estacionamiento BOOLEAN NOT NULL DEFAULT FALSE,
  cafeteria       BOOLEAN NOT NULL DEFAULT FALSE,

  rating          NUMERIC(3,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  owner_id        BIGINT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_by      BIGINT NULL REFERENCES public.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========
-- IMÁGENES DE CANCHA
-- =========
CREATE TABLE IF NOT EXISTS public.cancha_imagenes (
  id         BIGSERIAL PRIMARY KEY,
  cancha_id  BIGINT NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  orden      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========
-- RECLAMOS (cuando un propietario dice: "esa cancha es mía")
-- =========
CREATE TABLE IF NOT EXISTS public.reclamos_cancha (
  id              BIGSERIAL PRIMARY KEY,
  cancha_id       BIGINT NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  solicitante_id  BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mensaje         TEXT,
  evidencia_url   TEXT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente/aprobado/rechazado
  resuelto_por    BIGINT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_en     TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reclamos_estado_check'
  ) THEN
    ALTER TABLE public.reclamos_cancha
    ADD CONSTRAINT reclamos_estado_check CHECK (estado IN ('pendiente','aprobado','rechazado'));
  END IF;
END$$;

-- =========
-- PLANES / SUSCRIPCIONES (base para PRO)
-- =========
CREATE TABLE IF NOT EXISTS public.planes (
  id              BIGSERIAL PRIMARY KEY,
  codigo          VARCHAR(40) NOT NULL UNIQUE, -- free/pro
  nombre          VARCHAR(80) NOT NULL,
  precio_mensual  NUMERIC(10,2) NOT NULL DEFAULT 0,
  limite_canchas  INT NOT NULL DEFAULT 1,
  permite_estadisticas BOOLEAN NOT NULL DEFAULT FALSE,
  permite_marketing    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suscripciones (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id         BIGINT NOT NULL REFERENCES public.planes(id) ON DELETE RESTRICT,
  estado          VARCHAR(20) NOT NULL DEFAULT 'activa', -- activa/cancelada/pendiente
  inicio          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin             TIMESTAMPTZ,
  proveedor       VARCHAR(40), -- stripe/culqi/mercadopago etc (futuro)
  proveedor_ref   VARCHAR(120)
);

ALTER TABLE public.reservas
ADD COLUMN IF NOT EXISTS payment_ref VARCHAR(120);

-- =========
-- Payment Integrations (Culqi por propietario)
-- =========
CREATE TABLE IF NOT EXISTS public.payment_integrations (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  provider        VARCHAR(20) NOT NULL DEFAULT 'culqi',
  enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  culqi_pk        TEXT NOT NULL,
  culqi_sk_enc    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'suscripciones_estado_check'
  ) THEN
    ALTER TABLE public.suscripciones
    ADD CONSTRAINT suscripciones_estado_check CHECK (estado IN ('activa','cancelada','pendiente'));
  END IF;
END$$;

-- Seed mínimo
INSERT INTO public.planes (codigo, nombre, precio_mensual, limite_canchas, permite_estadisticas, permite_marketing)
VALUES
('free','Free',0,1,false,false),
('pro','Pro',50.00,10,true,true)
ON CONFLICT (codigo) DO NOTHING;
