FROM nixos/nix:2.20.4
RUN adduser --disabled-password --gecos '' dev && su - dev -c "nix --version"
USER dev
WORKDIR /work
COPY flake.nix .
RUN nix develop -c true