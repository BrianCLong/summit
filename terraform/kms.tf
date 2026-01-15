module "kms_keys" {
  source   = "./modules/kms"
  for_each = var.kms_keys

  name                    = each.key
  environment             = var.environment
  description             = try(each.value.description, null)
  enable_key_rotation     = try(each.value.enable_key_rotation, true)
  deletion_window_in_days = try(each.value.deletion_window_in_days, 30)
  key_admin_arns          = try(each.value.key_admin_arns, [])
  key_user_arns           = try(each.value.key_user_arns, [])
  aliases                 = length(try(each.value.aliases, [])) > 0 ? each.value.aliases : [format("alias/%s-%s", var.environment, each.key)]
  policy                  = try(each.value.policy, null)
  tags                    = var.tags
}
