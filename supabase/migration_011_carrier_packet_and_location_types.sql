-- ============================================================================
-- Migration: add "Carrier Packet" to the carrier document type enum, and
-- seed two new location types (Apartment, Warehouse with Dock).
--
-- Note: ALTER TYPE ... ADD VALUE must run as its own statement, not
-- combined with other DDL in a way that uses the new value in the same
-- transaction — this file only does that one thing to stay safe.
-- ============================================================================

alter type carrier_document_type add value if not exists 'Carrier Packet';

insert into location_types (name) values
  ('Apartment'), ('Warehouse with Dock')
on conflict (name) do nothing;

notify pgrst, 'reload schema';
