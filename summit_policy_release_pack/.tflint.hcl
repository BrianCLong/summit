config { module = true, force = false }
plugin "aws" { enabled = true, version = "0.30.0", source = "github.com/terraform-linters/tflint-ruleset-aws" }
plugin "google" { enabled = true, version = "0.6.0", source = "github.com/terraform-linters/tflint-ruleset-google" }
plugin "azurerm" { enabled = true, version = "0.22.0", source = "github.com/terraform-linters/tflint-ruleset-azurerm" }
rule "terraform_required_version" { enabled = true }
rule "terraform_required_providers" { enabled = true }
rule "terraform_naming_convention" { enabled = true }
