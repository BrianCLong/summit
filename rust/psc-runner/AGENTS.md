# PSC Runner Rust Crate Guidelines

- Use `rustfmt` defaults for formatting.
- Prefer explicit error types over `anyhow` for library surfaces.
- Keep modules focused; avoid files exceeding ~250 lines when possible.
