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
  alis_araci text, -- Payment method
  CONSTRAINT iskonto_alisveris_pkey PRIMARY KEY (id),
  CONSTRAINT iskonto_alisveris_personel_fkey FOREIGN KEY (personel) REFERENCES auth.users(id),
  CONSTRAINT iskonto_alisveris_musteri_fkey FOREIGN KEY (musteri) REFERENCES public.iskonto_listesi(id)
);
CREATE TABLE public.iskonto_listesi (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  plaka text NOT NULL,
  oran_nakit double precision NOT NULL,
  aciklama text,
  aktif boolean NOT NULL DEFAULT true,
  oran_kredi bigint,
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

-- Shift handover workflow
-- Catalog of checklist items the incoming staff must verify about the outgoing staff
CREATE TABLE public.shift_checklist_item (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT shift_checklist_item_pkey PRIMARY KEY (id)
);

-- A single shift handover request created by the incoming staff
CREATE TABLE public.shift_handover (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  incoming_user uuid NOT NULL, -- user starting the shift
  outgoing_user uuid NOT NULL, -- user ending the shift and must approve
  shift_start_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | canceled
  approver_note text,
  approved_at timestamp with time zone,
  CONSTRAINT shift_handover_pkey PRIMARY KEY (id),
  CONSTRAINT shift_handover_incoming_fkey FOREIGN KEY (incoming_user) REFERENCES auth.users(id),
  CONSTRAINT shift_handover_outgoing_fkey FOREIGN KEY (outgoing_user) REFERENCES auth.users(id),
  CONSTRAINT shift_handover_status_check CHECK (status IN ('pending','approved','rejected','canceled'))
);

-- Prevent duplicate pending handovers for the same pair
CREATE UNIQUE INDEX shift_handover_pending_unique
ON public.shift_handover (incoming_user, outgoing_user)
WHERE status = 'pending';

-- Results for each checklist item within a handover
CREATE TABLE public.shift_handover_item (
  handover_id bigint NOT NULL,
  item_id bigint NOT NULL,
  passed boolean NOT NULL,
  note text,
  CONSTRAINT shift_handover_item_pkey PRIMARY KEY (handover_id, item_id),
  CONSTRAINT shift_handover_item_handover_fkey FOREIGN KEY (handover_id) REFERENCES public.shift_handover(id) ON DELETE CASCADE,
  CONSTRAINT shift_handover_item_item_fkey FOREIGN KEY (item_id) REFERENCES public.shift_checklist_item(id)
);