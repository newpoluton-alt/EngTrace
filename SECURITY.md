# Security policy

EngTrace is a portfolio reference implementation, not a certified safety lifecycle tool. Do not
load confidential engineering data into a public deployment.

Report suspected vulnerabilities privately through GitHub Security Advisories. Never include real
credentials, proprietary requirements or exploit payloads containing customer data.

Production deployments must replace demo header roles with an OIDC provider, enforce PostgreSQL row
level security, use a maintained S3 service, rotate all secrets, scan uploaded files, encrypt data
at rest and in transit, and retain immutable audit events.
