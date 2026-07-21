from engtrace.providers import S3EvidenceStore


class FakeS3Client:
    def __init__(self) -> None:
        self.request = None

    def put_object(self, **kwargs):
        self.request = kwargs
        return {"VersionId": "v7"}


def test_evidence_store_hashes_every_object_and_preserves_version() -> None:
    client = FakeS3Client()
    stored = S3EvidenceStore(client, "evidence").put(
        "reports/run-7.pdf", b"controlled evidence", "application/pdf"
    )
    assert stored.version_id == "v7"
    assert stored.sha256 == "26184ee3d110f91fd51968c3ad07417a6773c57c60a2baa0a816f9ccb7a31bc6"
    assert client.request["Metadata"]["sha256"] == stored.sha256
