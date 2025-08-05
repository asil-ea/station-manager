-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.iskonto_alisveris (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  musteri bigint NOT NULL,
  alis_tip text NOT NULL,
  alis_litre double precision NOT NULL,
  alis_tutar double precision NOT NULL,
  iskonto_oran double precision NOT NULL,
  net_tutar double precision NOT NULL,
  litre_fiyat double precision NOT NULL,
  personel uuid NOT NULL,
  aciklama text,
  fatura_foto text,
  CONSTRAINT iskonto_alisveris_pkey PRIMARY KEY (id),
  CONSTRAINT iskonto_alisveris_musteri_fkey FOREIGN KEY (musteri) REFERENCES public.iskonto_listesi(id),
  CONSTRAINT iskonto_alisveris_personel_fkey FOREIGN KEY (personel) REFERENCES auth.users(id)
);
CREATE TABLE public.iskonto_listesi (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  plaka text NOT NULL,
  oran double precision NOT NULL,
  aciklama text,
  aktif boolean NOT NULL DEFAULT true,
  CONSTRAINT iskonto_listesi_pkey PRIMARY KEY (id)
);
CREATE TABLE public.temizlik_gunluk (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  personel uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  aciklama text,
  CONSTRAINT temizlik_gunluk_pkey PRIMARY KEY (id),
  CONSTRAINT temizlik_gunluk_personel_fkey FOREIGN KEY (personel) REFERENCES auth.users(id)
);
CREATE TABLE public.temizlik_gunluk_foto (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  gunluk_id bigint NOT NULL,
  foto text NOT NULL,
  meta_timestamp timestamp with time zone NOT NULL,
  CONSTRAINT temizlik_gunluk_foto_pkey PRIMARY KEY (id),
  CONSTRAINT temizlik_gunluk_foto_gunluk_id_fkey FOREIGN KEY (gunluk_id) REFERENCES public.temizlik_gunluk(id)
);
CREATE TABLE public.temizlik_gunluk_islem (
  gunluk_id bigint NOT NULL,
  islem_id bigint NOT NULL,
  CONSTRAINT temizlik_gunluk_islem_pkey PRIMARY KEY (gunluk_id, islem_id),
  CONSTRAINT temizlik_gunluk_islem_islem_id_fkey FOREIGN KEY (islem_id) REFERENCES public.temizlik_islem(id),
  CONSTRAINT temizlik_gunluk_islem_gunluk_id_fkey FOREIGN KEY (gunluk_id) REFERENCES public.temizlik_gunluk(id)
);
CREATE TABLE public.temizlik_islem (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  islem text,
  aciklama text,
  CONSTRAINT temizlik_islem_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_details (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  uid uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  tel text,
  CONSTRAINT user_details_pkey PRIMARY KEY (id),
  CONSTRAINT user_details_uid_fkey FOREIGN KEY (uid) REFERENCES auth.users(id)
);