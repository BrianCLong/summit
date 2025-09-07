{
  description = "IntelGraph/Maestro toolchain";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
  outputs = { self, nixpkgs }: let
    pkgs = import nixpkgs { system = "x86_64-linux"; };
  in {
    devShells.x86_64-linux.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        nodejs_18 pnpm git openssl jq cosign opa k6 gnupg diffoscope
      ];
      shellHook = ''
        export NODE_OPTIONS=--max_old_space_size=4096
        echo "Nix shell ready (Node $(node -v), pnpm $(pnpm -v))"
      '';
    };
  };
}