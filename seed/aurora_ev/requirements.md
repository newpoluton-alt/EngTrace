# Aurora EV battery safety requirements

Baseline: `2026.07`
Classification: synthetic/public-safe

## REQ-BMS-001 v2 — Thermal isolation trigger

The battery management system shall open the main contactors when any module temperature exceeds
60 °C continuously for 5 seconds.

Source anchor: `BMS-SYS-SPEC §4.2.1`
Owner: Battery Safety
Criticality: critical

Previous revision: 65 °C continuously for 10 seconds.

## REQ-BMS-002 — Isolation resistance pre-check

Before closing the main contactors, the controller shall verify pack isolation resistance is at
least 500 Ω/V.

Source anchor: `BMS-SYS-SPEC §4.2.3`
Owner: High Voltage
Criticality: critical

## REQ-BMS-003 — Contactor feedback plausibility

The controller shall compare dual-channel contactor feedback and report a disagreement within
100 ms.

Source anchor: `BMS-SYS-SPEC §4.4.8`
Owner: Controls
Criticality: high

## REQ-CHG-001 v2 — Charge overvoltage shutdown

Charging shall stop within 250 ms when any cell voltage exceeds 4.25 V.

Source anchor: `CHARGE-SPEC §3.7`
Owner: Charging
Criticality: critical

Previous revision: 500 ms at 4.30 V.

## REQ-SW-001 — Safety diagnostic coverage

Safety mechanisms allocated to the BMS software shall demonstrate at least 99% single-point fault
metric coverage.

## REQ-CELL-001 — Thermal propagation containment

A single-cell thermal runaway event shall not propagate to an adjacent module for at least
15 minutes.

## REQ-ENV-001 — Ingress protection after vibration

The assembled pack shall retain IP67 ingress protection after the vibration profile defined in
ISO 6469-1.

## REQ-CYB-001 — Authenticated software update

The controller shall install only manufacturer-signed software images and shall prevent rollback
to a revoked version.
