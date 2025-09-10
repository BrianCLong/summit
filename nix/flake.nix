{
  description = "Maestro dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs";
  outputs = { self, nixpkgs }: {
    devShells.x86_64-linux.default = let pkgs = import nixpkgs { system="x86_64-linux"; }; in pkgs.mkShell {
      buildInputs = [ pkgs.nodejs_20 pkgs.python312 pkgs.git pkgs.cosign ];
    };
  };
}