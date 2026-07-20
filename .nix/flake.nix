{
  description = "benefactor-cc.github.io development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          # This repo is generated GitHub Pages deploy output (Astro source
          # lives elsewhere), so the shell only needs a static file server to
          # preview the built site locally.
          default = pkgs.mkShell {
            packages = with pkgs; [
              git
              python3
            ];

            shellHook = ''
              echo "benefactor-cc.github.io (static deploy output) dev shell (${system})"
              echo "preview locally: python3 -m http.server 8000"
            '';
          };
        });
    };
}
