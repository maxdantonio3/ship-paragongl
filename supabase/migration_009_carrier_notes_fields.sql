-- ============================================================================
-- Migration: public_notes / private_notes on carriers.
-- Plain text fields on the carrier record itself (distinct from the
-- timestamped Quick Notes log) - not tied to anything yet, per request,
-- but public_notes is intended to eventually show on carrier-facing
-- documents (rate confirmations, etc.) while private_notes stays
-- internal-only.
-- ============================================================================

alter table carriers add column if not exists public_notes text;
alter table carriers add column if not exists private_notes text;

notify pgrst, 'reload schema';
