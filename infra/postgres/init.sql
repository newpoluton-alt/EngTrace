-- Local bootstrap for the Compose PostgreSQL service. Production applies the
-- equivalent schema through reviewed migrations against RDS, never initdb.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS engtrace;
SET search_path TO engtrace, public;

CREATE TABLE IF NOT EXISTS organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organizations_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE IF NOT EXISTS projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, slug),
    CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_type text NOT NULL,
    title text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT documents_type_valid CHECK (
        document_type IN ('requirements', 'test', 'risk', 'evidence', 'other')
    )
);

CREATE TABLE IF NOT EXISTS document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_label text NOT NULL,
    object_key text NOT NULL,
    content_sha256 text NOT NULL,
    supersedes_version_id uuid REFERENCES document_versions(id) ON DELETE SET NULL,
    ingestion_status text NOT NULL DEFAULT 'pending',
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_label),
    UNIQUE (organization_id, object_key),
    CONSTRAINT document_versions_sha256_valid CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT document_versions_status_valid CHECK (
        ingestion_status IN ('pending', 'processing', 'indexed', 'quarantined', 'failed')
    )
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    sequence integer NOT NULL,
    page_number integer,
    section_path text,
    start_offset integer,
    end_offset integer,
    content text NOT NULL,
    content_sha256 text NOT NULL,
    trust_state text NOT NULL DEFAULT 'trusted',
    embedding_model text NOT NULL,
    embedding vector(1024),
    content_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(content, ''))
    ) STORED,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_version_id, sequence),
    CONSTRAINT document_chunks_offsets_valid CHECK (
        start_offset IS NULL OR end_offset IS NULL OR start_offset <= end_offset
    ),
    CONSTRAINT document_chunks_trust_state_valid CHECK (
        trust_state IN ('trusted', 'review', 'quarantined')
    )
);

CREATE TABLE IF NOT EXISTS artifacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    artifact_type text NOT NULL,
    external_key text NOT NULL,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'active',
    criticality text NOT NULL DEFAULT 'medium',
    owner_subject text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, artifact_type, external_key),
    CONSTRAINT artifacts_type_valid CHECK (
        artifact_type IN ('requirement', 'test', 'risk', 'evidence')
    ),
    CONSTRAINT artifacts_status_valid CHECK (status IN ('draft', 'active', 'retired')),
    CONSTRAINT artifacts_criticality_valid CHECK (
        criticality IN ('low', 'medium', 'high', 'critical')
    )
);

CREATE TABLE IF NOT EXISTS artifact_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    document_version_id uuid REFERENCES document_versions(id) ON DELETE SET NULL,
    source_chunk_id uuid REFERENCES document_chunks(id) ON DELETE SET NULL,
    revision_number integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    content_sha256 text NOT NULL,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    supersedes_revision_id uuid REFERENCES artifact_revisions(id) ON DELETE SET NULL,
    created_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (artifact_id, revision_number),
    CONSTRAINT artifact_revisions_number_positive CHECK (revision_number > 0),
    CONSTRAINT artifact_revisions_sha256_valid CHECK (content_sha256 ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS trace_edges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    target_artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    source_revision_id uuid REFERENCES artifact_revisions(id) ON DELETE SET NULL,
    target_revision_id uuid REFERENCES artifact_revisions(id) ON DELETE SET NULL,
    relation text NOT NULL,
    state text NOT NULL DEFAULT 'proposed',
    confidence double precision NOT NULL,
    rationale text NOT NULL,
    proposed_by text NOT NULL,
    approved_by text,
    approved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT trace_edges_no_self_link CHECK (source_artifact_id <> target_artifact_id),
    CONSTRAINT trace_edges_relation_valid CHECK (
        relation IN (
            'verifies', 'mitigates', 'supports', 'depends_on', 'conflicts_with', 'derived_from'
        )
    ),
    CONSTRAINT trace_edges_state_valid CHECK (
        state IN ('proposed', 'approved', 'rejected', 'stale')
    ),
    CONSTRAINT trace_edges_confidence_range CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    action text NOT NULL,
    resource_snapshot_sha256 text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    requested_by text NOT NULL,
    decided_by text,
    decision_comment text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    decided_at timestamptz,
    CONSTRAINT approval_requests_status_valid CHECK (
        status IN ('pending', 'approved', 'rejected', 'cancelled')
    ),
    CONSTRAINT approval_requests_four_eyes CHECK (
        decided_by IS NULL OR decided_by <> requested_by
    )
);

CREATE TABLE IF NOT EXISTS audit_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
    actor_subject text NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text NOT NULL,
    previous_sha256 text,
    resulting_sha256 text,
    trace_id text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_project_idx
    ON documents (organization_id, project_id);
CREATE INDEX IF NOT EXISTS document_versions_document_created_idx
    ON document_versions (document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_chunks_version_idx
    ON document_chunks (organization_id, document_version_id, sequence);
CREATE INDEX IF NOT EXISTS document_chunks_fts_idx
    ON document_chunks USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS artifacts_project_type_idx
    ON artifacts (organization_id, project_id, artifact_type);
CREATE INDEX IF NOT EXISTS artifact_revisions_artifact_created_idx
    ON artifact_revisions (artifact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trace_edges_source_idx
    ON trace_edges (organization_id, project_id, source_artifact_id, state);
CREATE INDEX IF NOT EXISTS trace_edges_target_idx
    ON trace_edges (organization_id, project_id, target_artifact_id, state);
CREATE INDEX IF NOT EXISTS approval_requests_pending_idx
    ON approval_requests (organization_id, project_id, requested_at)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS audit_events_resource_idx
    ON audit_events (organization_id, resource_type, resource_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT nullif(current_setting('app.organization_id', true), '')::uuid
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_tenant_isolation ON organizations;
CREATE POLICY organizations_tenant_isolation ON organizations
    USING (id = current_organization_id())
    WITH CHECK (id = current_organization_id());

DO $$
DECLARE
    protected_table text;
BEGIN
    FOREACH protected_table IN ARRAY ARRAY[
        'projects',
        'documents',
        'document_versions',
        'document_chunks',
        'artifacts',
        'artifact_revisions',
        'trace_edges',
        'approval_requests',
        'audit_events'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', protected_table);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', protected_table);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', protected_table);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING '
            || '(organization_id = current_organization_id()) WITH CHECK '
            || '(organization_id = current_organization_id())',
            protected_table
        );
    END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only';
END
$$;

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

COMMENT ON SCHEMA engtrace IS
    'Versioned engineering artifacts, traceability, approvals, provenance, and audit records.';
COMMENT ON COLUMN document_chunks.embedding IS
    '1024-dimensional embedding; model identity is recorded in embedding_model.';
COMMENT ON FUNCTION current_organization_id() IS
    'Tenant context supplied per transaction with SET LOCAL app.organization_id.';
