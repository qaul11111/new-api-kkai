# KKAI production image

This directory contains the Dockerfile and runtime helpers used for the KKAI
New API image.

Production images are built manually from a clean `production/kkrich` checkout
with `scripts/kkai/build-manual-release.sh`. The script emits one Linux AMD64
Docker archive and a metadata file under `.local-releases/`.

The Bun and Go build stages use the native build platform and cross-compile the
Go binaries for the requested target. Their pinned image references are
multi-architecture manifest digests, so an Apple Silicon workstation does not
run the Go compiler through user-mode AMD64 emulation. Dependency downloads
remain serialized by default; a non-production cache warm-up may override
`BUN_NETWORK_CONCURRENCY`, while the production script keeps the default of 1.

The final FFmpeg/x264 source build executes target-architecture configure
probes. A full production archive must therefore be built on a trusted native
AMD64 builder. On Apple Silicon, `--target backend` is suitable for local Web
and Go cross-build validation only; it is not a production image and must not
be exported or staged as a release.

There is no production-safe profile default for every live schema. Production
commands must pass `--schema-contract` explicitly after the live schema has
been established:

- `feature` is the current `(9,9,9)` production profile. Use it only after
  schema v9 has been independently observed.
- `bridge` is currently also `(9,9,9)`. The tag remains available for build
  compatibility, but it does not claim that B/C code can run on schema v8.

Without exact v9 evidence, stop; do not omit the explicit profile or use
generic deployment preflight to infer the live schema.

Build the current production profile with:

```bash
scripts/kkai/build-manual-release.sh --schema-contract feature
```

Use it only after the v9 schema gate passes. The
profile is recorded in release metadata and in the image's
`io.kkrich.schema-contract` label. The staging client validates the metadata
value and forwards it to the production controller, which must match it against
the loaded image before accepting the candidate. That generic preflight does
not observe the database schema, so its `ready` result is not compatibility
evidence. The profile cannot be changed at runtime.

The application and `/kkai-migrate` are compiled with
`common.SchemaManagementMode=external`. The image therefore cannot run GORM
AutoMigrate when it starts in the read-only idle slot. Database maintenance is
separate from ordinary application delivery.

When Docker build stages require the operator workstation proxy, pass it
explicitly without changing the image definition:

```bash
BUILD_HTTP_PROXY=http://host.docker.internal:17897 \
BUILD_HTTPS_PROXY=http://host.docker.internal:17897 \
BUILDX_BUILDER=kkai-mirror-builder \
scripts/kkai/build-manual-release.sh --schema-contract bridge
```

Stage the metadata file explicitly with:

```bash
scripts/kkai/deploy-manual-release.sh --stage .local-releases/<version>.json
```

This replaces only the inactive blue/green slot and exposes the candidate on
the production host's loopback interface. It does not switch public traffic;
promotion remains a separate operator action after acceptance. Production
images are built and deployed only through this local/manual path.
