-- ============================================================================
-- Migration: latitude/longitude on companies, for the Territory Map.
-- google_place_id and google_maps_raw already exist from the original
-- schema — this only adds what's missing.
-- ============================================================================

alter table companies add column if not exists latitude double precision;
alter table companies add column if not exists longitude double precision;

-- Speeds up "give me every company with coordinates" queries, which is
-- exactly what the Territory Map page runs on every load.
create index if not exists companies_lat_lng_idx on companies(latitude, longitude)
  where latitude is not null and longitude is not null;

notify pgrst, 'reload schema';
