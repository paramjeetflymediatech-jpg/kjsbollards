# KJS Bollards production backend

Production HTTPS API for `uk.co.kjsbollards.app`. GateLink credentials remain on the server and are never shipped in the Android app.

## Safety model

- Verified mapping: Relay 1 Raise, Relay 2 Lower, Relay 3 Stop; Relay 4 is unused.
- Default supervisory movement window is 4.5 seconds and is configurable per bollard.
- Raise/Lower creates a durable PostgreSQL command record. A worker sends Stop when due and recovers overdue Stops after restart.
- STOP bypasses movement-state checks for authorised operators.
- Commissioning, enablement, online status, inactive outputs and optional safety input are checked before movement.
- Physical E-stop, obstruction detection, limit switches, contactor interlocks and motor timeout must remain local and operate without this service.

## Initial deployment

1. Provision a Linux VPS with Docker Engine and Compose.
2. Point DNS `A`/`AAAA` for `api.kjsbollards.co.uk` at the VPS.
3. Copy `.env.example` to `.env`; generate unique database/JWT secrets and add the long-term GateLink key.
4. Set `POSTGRES_PASSWORD` in the shell or a root-only Compose environment file.
5. Run `docker compose up -d --build`.
6. Confirm `https://api.kjsbollards.co.uk/health` returns `{"status":"ok"}`.
7. Seed an administrator from a one-off API container with `KJS_ADMIN_EMAIL`, `KJS_ADMIN_PASSWORD`, and `KJS_ADMIN_NAME` set.
8. Insert the commissioned site/bollard only after physical relay mapping and safety commissioning are signed off.

Never commit `.env`, database dumps, private keys or signing credentials. Restrict SSH, enable unattended security updates, monitor container health and copy encrypted backups off the VPS.
