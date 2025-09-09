data "aws_ssm_parameter" "db_password" {
  name            = "/intelgraph/prod/db/password"
  with_decryption = true
}

module "aurora" {
  source          = "../../modules/aurora"
  master_username = "maestro"
  master_password = data.aws_ssm_parameter.db_password.value
}