# Secrets with SOPS + age

- `age-keygen -o agekey.txt`
- Put public key into .sops.yaml
- `sops -e secrets/app.env > secrets/app.enc.env`
