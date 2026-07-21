from __future__ import annotations

import re

INJECTION_PATTERNS: dict[str, re.Pattern[str]] = {
    "instruction_override": re.compile(r"ignore\s+(all\s+)?(previous|prior|system)", re.I),
    "prompt_exfiltration": re.compile(
        r"(reveal|print|repeat).{0,24}(system prompt|instructions)", re.I
    ),
    "secret_exfiltration": re.compile(
        r"(api[_ -]?key|password|secret|environment variables?)", re.I
    ),
    "role_impersonation": re.compile(r"(you are now|act as).{0,24}(admin|system|developer)", re.I),
    "tool_coercion": re.compile(r"(execute|run).{0,24}(shell|command|sql|curl)", re.I),
}

ROLE_PERMISSIONS = {
    "viewer": {"read"},
    "engineer": {"read", "propose"},
    "approver": {"read", "propose", "approve"},
    "admin": {"read", "propose", "approve", "admin"},
}


def detect_prompt_injection(text: str) -> str | None:
    for reason, pattern in INJECTION_PATTERNS.items():
        if pattern.search(text):
            return reason
    return None


def can(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role.lower(), set())
